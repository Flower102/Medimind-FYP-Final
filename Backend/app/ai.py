# backend/app/ai.py

"""
Server-side AI endpoints.

OpenAI calls happen here, never in the frontend.

Supports:
- Normal JSON chat requests
- multipart/form-data chat requests with uploaded files
- Uploaded images
- Uploaded document files
- Structured AI replies with suggestions

Improved error handling:
- Every expected error has a code
- Every error has a plain-English message
- Every error includes a next-step action
"""

from __future__ import annotations

import base64
import json
from typing import Any
import httpx 
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field

from .deps import get_current_user
from .settings import settings
from . import models

router = APIRouter(prefix="/ai", tags=["AI"])


# ---------------------------------------------------------
# Upload limits
# ---------------------------------------------------------

MAX_UPLOAD_FILES = 5
MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


# ---------------------------------------------------------
# Shared error helper
# ---------------------------------------------------------

def raise_api_error(status_code: int, code: str, message: str, action: str):
    """
    Raises consistent API errors.

    Frontend can read:
      detail.code
      detail.message
      detail.action
    """

    raise HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "message": message,
            "action": action,
        },
    )


# ---------------------------------------------------------
# Request/Response Schemas
# ---------------------------------------------------------

class ChatMsg(BaseModel):
    """
    One message in the chat history.

    The frontend normally sends:
    - user
    - assistant

    developer is allowed in case you later add internal instructions.
    """

    role: str = Field(..., description="developer | user | assistant")
    content: str


class ChatRequest(BaseModel):
    """
    Main chat request shape.

    Optional learning context comes from Learning Workspace:
    - note
    - reflection
    - confidence
    """

    messages: list[ChatMsg]
    note: str | None = None
    reflection: str | None = None
    confidence: int | None = None


class ChatResponse(BaseModel):
    """
    Response sent back to the frontend chatbot page.
    """

    reply: str
    suggestions: list[str] = []


# ---------------------------------------------------------
# Pydantic v1/v2 compatibility helper
# ---------------------------------------------------------

def validate_chat_request(raw: Any) -> ChatRequest:
    """
    Supports both Pydantic v2 and v1.
    """

    try:
        return ChatRequest.model_validate(raw)  # Pydantic v2
    except AttributeError:
        return ChatRequest.parse_obj(raw)  # Pydantic v1


# ---------------------------------------------------------
# Request validation helpers
# ---------------------------------------------------------

def validate_chat_messages(req: ChatRequest):
    """
    Checks the chat request before calling OpenAI.
    """

    if not req.messages:
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "AI_MESSAGES_REQUIRED",
            "No chat message was provided.",
            "Please type a question or send a note from the Learning Workspace.",
        )

    allowed_roles = {"user", "assistant", "developer"}

    for message in req.messages:
        if message.role not in allowed_roles:
            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "AI_INVALID_MESSAGE_ROLE",
                "A chat message has an invalid role.",
                "Message roles must be user, assistant, or developer. Please check the frontend payload.",
            )

        if not (message.content or "").strip():
            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "AI_EMPTY_MESSAGE",
                "One of the chat messages is empty.",
                "Please type a clear question before sending the message.",
            )

    if req.confidence is not None and (req.confidence < 1 or req.confidence > 10):
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "AI_INVALID_CONFIDENCE",
            "The confidence rating is outside the allowed range.",
            "Please use a confidence rating between 1 and 10.",
        )


async def validate_uploaded_file(file: UploadFile):
    """
    Checks one uploaded file before sending it to OpenAI.

    This gives the user a clearer error before the upstream API rejects it.
    """

    filename = file.filename or "uploaded-file"

    # Read bytes once for size validation.
    file_bytes = await file.read()

    # Reset file pointer so the next helper can read it again.
    await file.seek(0)

    if len(file_bytes) == 0:
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "AI_EMPTY_FILE",
            f"The uploaded file '{filename}' is empty.",
            "Please upload a file that contains text or an image, then try again.",
        )

    if len(file_bytes) > MAX_SINGLE_FILE_BYTES:
        raise_api_error(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "AI_FILE_TOO_LARGE",
            f"The uploaded file '{filename}' is too large.",
            "Please upload a file smaller than 20 MB.",
        )


# ---------------------------------------------------------
# Request parser
# ---------------------------------------------------------

async def parse_chat_request(request: Request) -> tuple[ChatRequest, list[UploadFile]]:
    """
    Accepts either:
    - application/json
    - multipart/form-data

    The chatbot page uses multipart when files are attached.
    """

    content_type = request.headers.get("content-type", "").lower()

    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
        except Exception as exc:
            print("Form parse error:", exc)

            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "BAD_FORM_DATA",
                "The uploaded form data could not be read.",
                "Please make sure python-multipart is installed in the backend environment and try again.",
            )

        payload_raw = form.get("payload")

        if not payload_raw or not isinstance(payload_raw, str):
            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "MISSING_PAYLOAD",
                "The upload request is missing the chat payload.",
                "Please make sure the frontend sends a FormData field named 'payload'.",
            )

        try:
            raw = json.loads(payload_raw)
            chat_request = validate_chat_request(raw)
            validate_chat_messages(chat_request)
        except HTTPException:
            raise
        except Exception as exc:
            print("Payload parse error:", exc)

            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "BAD_CHAT_PAYLOAD",
                "The chat payload was not valid JSON.",
                "Please check the frontend payload format and try again.",
            )

        uploaded_files: list[UploadFile] = []

        for item in form.getlist("files"):
            # FastAPI/Starlette UploadFile classes can differ, so use duck typing.
            if hasattr(item, "filename") and hasattr(item, "read"):
                uploaded_files.append(item)

        if len(uploaded_files) > MAX_UPLOAD_FILES:
            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "AI_TOO_MANY_FILES",
                "Too many files were uploaded.",
                "Please upload up to 5 files at a time.",
            )

        for uploaded_file in uploaded_files:
            await validate_uploaded_file(uploaded_file)

        print(
            "AI uploaded files received:",
            [getattr(f, "filename", "unknown") for f in uploaded_files],
        )

        return chat_request, uploaded_files

    try:
        raw = await request.json()
        chat_request = validate_chat_request(raw)
        validate_chat_messages(chat_request)
        return chat_request, []
    except HTTPException:
        raise
    except Exception as exc:
        print("JSON parse error:", exc)

        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "BAD_JSON_BODY",
            "The request body could not be read.",
            "Please send either valid JSON or multipart/form-data.",
        )


# ---------------------------------------------------------
# AI response parser
# ---------------------------------------------------------

def safe_parse_ai_json(text: str) -> ChatResponse:
    """
    The prompt asks OpenAI to return JSON.

    If JSON parsing fails, this function still returns a useful reply instead
    of crashing the whole chat flow.
    """

    cleaned = text.strip()

    # Remove markdown JSON fences if the model adds them.
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(cleaned)

        reply = data.get("reply")
        suggestions = data.get("suggestions", [])

        if not isinstance(reply, str) or not reply.strip():
            reply = (
                "Sorry, I could not format the answer correctly. "
                "Please try asking again with a shorter or clearer question."
            )

        if not isinstance(suggestions, list):
            suggestions = []

        clean_suggestions = [
            item.strip()
            for item in suggestions
            if isinstance(item, str) and item.strip()
        ][:4]

        return ChatResponse(reply=reply.strip(), suggestions=clean_suggestions)

    except Exception:
        return ChatResponse(
            reply=cleaned or "Sorry, I could not generate a response. Please try again.",
            suggestions=[
                "Can you explain it more simply?",
                "Can you summarise the key points?",
                "What should I ask next?",
            ],
        )


# ---------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------

def build_developer_instructions(has_uploaded_files: bool) -> str:
    """
    Builds the system/developer instruction for the AI.

    Important:
    The response must be JSON because the frontend expects:
      reply
      suggestions
    """

    file_rules = """
File rules:
- The user uploaded one or more files or images.
- Analyse the attached content directly when possible.
- Never say "I cannot read the file directly here" if a file was provided and processed.
- If a file cannot be processed, explain exactly why and suggest what the user should upload instead.
""" if has_uploaded_files else """
File rules:
- If no file was uploaded, do not pretend that you saw a file.
"""

    return f"""
You are MediMind Lite's learning coach.

Return valid JSON only.

Return exactly this JSON shape:
{{
  "reply": "Your full answer here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}}

The reply should use this structure where helpful:

Answer
Give a clear, helpful answer to the user's question first. Explain the topic in simple English.

Key information
- Give the most important facts, examples, or points.
- Include practical details where useful.
- For health topics, explain what different choices mean in real life.

Helpful examples
Give simple examples, such as foods, symptoms, habits, questions to ask a doctor, or steps to follow, depending on what the user asked.

What to remember
Give a short recap near the end only.

Next steps
- Give practical next steps.
- Suggest what the user could ask next or do next.

Important note
This is educational support only, not medical advice. For urgent symptoms, contact a medical professional or emergency service.

Style rules:
- Use simple English.
- Be detailed enough to be useful.
- Do not make the whole answer only a summary.
- Do not start with "Short summary".
- Use headings and bullet points where helpful.
- Avoid huge dense blocks of text.
- Put clickable follow-up ideas only inside the suggestions array.
- Suggestions should be short helpful questions the user can click.

{file_rules}
""".strip()


def build_learning_context(req: ChatRequest) -> str:
    """
    Adds Learning Workspace context if the user came from that page.
    """

    context_parts: list[str] = []

    if req.note:
        context_parts.append(f"USER NOTES:\n{req.note}")

    if req.reflection:
        context_parts.append(f"USER REFLECTION:\n{req.reflection}")

    if req.confidence is not None:
        context_parts.append(f"CONFIDENCE 1-10:\n{req.confidence}")

    if not context_parts:
        return ""

    return "Learning context:\n\n" + "\n\n".join(context_parts)


def build_recent_conversation(req: ChatRequest) -> str:
    """
    Keeps only the latest 20 messages to avoid sending huge histories.
    """

    safe_messages: list[str] = []

    for msg in req.messages[-20:]:
        if msg.role not in ("user", "assistant", "developer"):
            continue

        safe_messages.append(f"{msg.role.upper()}:\n{msg.content}")

    return "\n\n".join(safe_messages)


# ---------------------------------------------------------
# File helpers
# ---------------------------------------------------------

async def image_to_data_url(file: UploadFile) -> str:
    """
    Converts an uploaded image into a data URL for OpenAI vision input.
    """

    file_bytes = await file.read()
    mime_type = file.content_type or "image/png"
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


async def upload_file_to_openai(file: UploadFile) -> str:
    """
    Uploads a non-image file to OpenAI and returns the file id.

    For Responses API file inputs, OpenAI recommends using purpose='user_data'
    for files that will be passed as model inputs.
    """

    if not settings.OPENAI_API_KEY:
        raise_api_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "OPENAI_API_KEY_MISSING",
            "The AI service is not configured on the backend.",
            "Add OPENAI_API_KEY to your backend .env file, restart FastAPI, and try again.",
        )

    file_bytes = await file.read()

    filename = file.filename or "uploaded-file"
    mime_type = file.content_type or "application/octet-stream"

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
    }

    files = {
        "file": (filename, file_bytes, mime_type),
    }

    data = {
        "purpose": "user_data",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OPENAI_TIMEOUT_SECONDS) as client:
            response = await client.post(
                "https://api.openai.com/v1/files",
                headers=headers,
                files=files,
                data=data,
            )
    except httpx.RequestError as exc:
        print("OpenAI file upload network error:", exc)

        raise_api_error(
            status.HTTP_502_BAD_GATEWAY,
            "OPENAI_FILE_UPLOAD_NETWORK_ERROR",
            "The backend could not upload the file to the AI service.",
            "Please check your internet connection and try again. If it continues, check the backend terminal logs.",
        )

    if response.status_code >= 400:
        print("OpenAI file upload error:", response.status_code, response.text)

        raise_api_error(
            status.HTTP_502_BAD_GATEWAY,
            "OPENAI_FILE_UPLOAD_ERROR",
            "The AI service rejected the uploaded file.",
            "Please try a smaller PDF or image file. If you uploaded a Word, Excel, or PowerPoint file and it fails, convert it to PDF and try again.",
        )

    try:
        return response.json()["id"]
    except Exception:
        print("Bad OpenAI file upload response:", response.text)

        raise_api_error(
            status.HTTP_502_BAD_GATEWAY,
            "OPENAI_FILE_UPLOAD_BAD_RESPONSE",
            "The AI service returned an unexpected file upload response.",
            "Please try again. If it continues, check the backend terminal logs.",
        )


# ---------------------------------------------------------
# OpenAI call
# ---------------------------------------------------------

async def call_openai_responses(
    req: ChatRequest,
    uploaded_files: list[UploadFile],
) -> ChatResponse:
    """
    Calls the OpenAI Responses API.

    Images are sent as input_image.
    Non-image files are uploaded first, then sent as input_file.
    """

    if not settings.OPENAI_API_KEY:
        raise_api_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "OPENAI_API_KEY_MISSING",
            "The AI service is not configured on the backend.",
            "Add OPENAI_API_KEY to your backend .env file, restart FastAPI, and try again.",
        )

    has_uploaded_files = len(uploaded_files) > 0

    developer_instructions = build_developer_instructions(has_uploaded_files)
    learning_context = build_learning_context(req)
    recent_conversation = build_recent_conversation(req)

    latest_user_message = (
        req.messages[-1].content
        if req.messages
        else "Please help me understand this."
    )

    uploaded_file_names = [
        getattr(uploaded_file, "filename", "uploaded-file")
        for uploaded_file in uploaded_files
    ]

    file_context = ""

    if uploaded_file_names:
        file_context = "Uploaded files:\n" + "\n".join(
            f"- {name}" for name in uploaded_file_names
        )

    text_prompt = f"""
{learning_context}

{file_context}

Recent conversation:
{recent_conversation}

Latest user message:
{latest_user_message}
""".strip()

    content: list[dict[str, Any]] = [
        {
            "type": "input_text",
            "text": text_prompt,
        }
    ]

    for uploaded_file in uploaded_files:
        content_type = uploaded_file.content_type or ""

        if content_type.startswith("image/"):
            image_data_url = await image_to_data_url(uploaded_file)

            content.append(
                {
                    "type": "input_image",
                    "image_url": image_data_url,
                    "detail": "auto",
                }
            )

        else:
            file_id = await upload_file_to_openai(uploaded_file)

            content.append(
                {
                    "type": "input_file",
                    "file_id": file_id,
                }
            )

    payload = {
        "model": settings.OPENAI_MODEL,
        "instructions": developer_instructions,
        "input": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "temperature": 0.4,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OPENAI_TIMEOUT_SECONDS) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                json=payload,
                headers=headers,
            )
    except httpx.TimeoutException as exc:
        print("OpenAI timeout error:", exc)

        raise_api_error(
            status.HTTP_504_GATEWAY_TIMEOUT,
            "OPENAI_TIMEOUT",
            "The AI service took too long to respond.",
            "Please try again with a shorter message or fewer files.",
        )
    except httpx.RequestError as exc:
        print("OpenAI network error:", exc)

        raise_api_error(
            status.HTTP_502_BAD_GATEWAY,
            "OPENAI_NETWORK_ERROR",
            "The backend could not connect to the AI service.",
            "Please check your internet connection and try again. If it continues, check the backend terminal logs.",
        )

    if response.status_code >= 400:
        print("OpenAI Responses error:", response.status_code, response.text)

        raise_api_error(
            status.HTTP_502_BAD_GATEWAY,
            "OPENAI_UPSTREAM_ERROR",
            "The AI service returned an error while generating the response.",
            "Please try again in a moment. If you uploaded a file, try a smaller PDF or image.",
        )

    data = response.json()

    output_text = data.get("output_text", "")

    # Some Responses API outputs are nested, so this safely extracts them.
    if not output_text:
        try:
            output_items = data.get("output", [])
            text_parts: list[str] = []

            for item in output_items:
                for content_item in item.get("content", []):
                    if content_item.get("type") in ("output_text", "text"):
                        text_value = content_item.get("text", "")
                        if text_value:
                            text_parts.append(text_value)

            output_text = "\n".join(text_parts).strip()
        except Exception:
            output_text = ""

    if not output_text:
        print("Bad OpenAI response:", data)

        raise_api_error(
            status.HTTP_502_BAD_GATEWAY,
            "OPENAI_BAD_RESPONSE",
            "The AI service returned an empty or unreadable response.",
            "Please try again with a clearer question. If you uploaded a file, try re-uploading it.",
        )

    return safe_parse_ai_json(output_text)


# ---------------------------------------------------------
# Route
# ---------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    current_user: models.User = Depends(get_current_user),
):
    """
    Main chatbot endpoint.

    Requires login because the app uses protected learning features.
    """

    req, files = await parse_chat_request(request)

    result = await call_openai_responses(req, files)

    return result