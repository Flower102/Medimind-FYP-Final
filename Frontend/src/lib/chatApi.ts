// Frontend/src/lib/chatApi.ts

export type ChatMsg = {
  role: "user" | "assistant" | "developer";
  content: string;
};

export type SendChatPayload = {
  messages: ChatMsg[];
  note?: string;
  reflection?: string;
  confidence?: number;
};

export type SendChatResponse = {
  session_id?: number;
  reply: string;
  suggestions?: string[];
};

export async function sendChatMessage(
  payload: SendChatPayload,
  files: File[] = []
): Promise<SendChatResponse> {
  const formData = new FormData();

  // Send the chat payload as JSON inside FormData because files may also be uploaded.
  formData.append("payload", JSON.stringify(payload));

  // Attach uploaded files, if there are any.
  files.forEach((file) => {
    formData.append("files", file);
  });

  /**
   * Browser calls Next.js:
   *   /api/backend/ai/chat
   *
   * Generic proxy forwards to FastAPI:
   *   http://127.0.0.1:8000/ai/chat
   *
   * This keeps cookies/auth working for localhost and network IP.
   */
  const res = await fetch("/api/backend/ai/chat", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error("AI chat request failed:", {
      status: res.status,
      responseText,
    });

    throw new Error(responseText || "Chat request failed");
  }

  return JSON.parse(responseText) as SendChatResponse;
}