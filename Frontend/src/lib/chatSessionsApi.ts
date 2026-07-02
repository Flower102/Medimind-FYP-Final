import type { ChatMsg } from "@/src/lib/chatApi";

/* -------------------------------------------------------------------------- */
/* Chat Session Types                                                          */
/* These types describe saved chat sessions, including where they were created */
/* and how backend response fields are shaped before normalisation.            */
/* -------------------------------------------------------------------------- */

export type ChatSource = "learning_workspace" | "direct_chat";

export type CreateChatSessionPayload = {
  title?: string;
  messages?: ChatMsg[];
  source?: ChatSource;
  noteId?: string | number | null;
};

export type BackendChatSession = {
  id: string;
  title: string;
  messages?: ChatMsg[];
  isFavorite: boolean;
  source: ChatSource;
  noteId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type RawBackendChatSession = {
  id: string | number;
  title?: string;
  messages?: ChatMsg[];

  is_favorite?: boolean;
  isFavorite?: boolean;

  source?: string | null;

  note_id?: string | number | null;
  noteId?: string | number | null;

  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
};

/* -------------------------------------------------------------------------- */
/* API Error Shape                                                             */
/* This type represents the structured error format returned by FastAPI. The   */
/* helper functions below use it to build readable error messages.             */
/* -------------------------------------------------------------------------- */

type ApiErrorBody = {
  detail?: string | { code?: string; message?: string; action?: string };
  message?: string;
};

/* -------------------------------------------------------------------------- */
/* Chat Source Normalisation                                                   */
/* Older saved chats may not include a source value. This helper keeps them    */
/* safe by treating missing or unknown sources as direct chat sessions.        */
/* -------------------------------------------------------------------------- */

function normaliseSource(value: unknown): ChatSource {
  return value === "learning_workspace" ? "learning_workspace" : "direct_chat";
}

/* -------------------------------------------------------------------------- */
/* Chat Session Normalisation                                                  */
/* FastAPI may return snake_case or older camelCase fields. This helper        */
/* converts the response into the consistent frontend BackendChatSession type. */
/* -------------------------------------------------------------------------- */

function normaliseSession(session: RawBackendChatSession): BackendChatSession {
  const rawNoteId = session.noteId ?? session.note_id ?? null;

  return {
    id: String(session.id),
    title: session.title || "New AI Learning Chat",
    messages: Array.isArray(session.messages) ? session.messages : [],
    isFavorite: Boolean(session.is_favorite ?? session.isFavorite),
    source: normaliseSource(session.source),
    noteId:
      rawNoteId === null || rawNoteId === undefined ? null : String(rawNoteId),
    createdAt: session.createdAt ?? session.created_at,
    updatedAt: session.updatedAt ?? session.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/* Response Body Reader                                                        */
/* This helper reads JSON, plain text, or empty responses from the backend so  */
/* request handling works with both normal and no-content responses.           */
/* -------------------------------------------------------------------------- */

async function readResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/* -------------------------------------------------------------------------- */
/* Error Message Builder                                                       */
/* This function turns backend error details into readable messages for the    */
/* chat pages, using status-specific fallbacks when needed.                    */
/* -------------------------------------------------------------------------- */

function getErrorMessage(data: unknown, status: number) {
  const errorData = data as ApiErrorBody;
  const detail = errorData.detail;

  if (typeof detail === "string") return detail;

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && typeof detail.action === "string") {
      return `${detail.message} ${detail.action}`;
    }

    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.code === "string") return detail.code;
  }

  if (typeof errorData.message === "string") return errorData.message;

  if (status === 401) {
    return "You are not signed in. Please sign in again, then try again.";
  }

  if (status === 403) {
    return "You do not have permission to access this chat.";
  }

  if (status === 404) {
    return "This saved chat was not found. It may have been deleted. Please refresh your chat list.";
  }

  if (status === 500) {
    return "The server had a problem. Please check the backend terminal logs.";
  }

  return `Request failed with status ${status}`;
}

/* -------------------------------------------------------------------------- */
/* Chat Sessions Fetch Helper                                                  */
/* All chat-session requests use the Next.js backend proxy with cookies. This  */
/* keeps authentication working while centralising response and error handling.*/
/* -------------------------------------------------------------------------- */

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`/api/backend${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 204) {
    return {} as T;
  }

  const data = await readResponseBody(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res.status));
  }

  return data as T;
}

/* -------------------------------------------------------------------------- */
/* List Saved Chat Sessions                                                    */
/* Loads all saved chats for the signed-in user and normalises them before the */
/* page displays chat history or favourites.                                  */
/* -------------------------------------------------------------------------- */

export async function listChatSessions(): Promise<BackendChatSession[]> {
  const data = await apiFetch<RawBackendChatSession[]>("/chat-sessions");
  return data.map(normaliseSession);
}

/* -------------------------------------------------------------------------- */
/* Create Saved Chat Session                                                   */
/* Creates a new backend chat session, converting frontend noteId into the     */
/* backend's expected note_id field and preserving the chat source.            */
/* -------------------------------------------------------------------------- */

export async function createBackendChatSession(
  payload: CreateChatSessionPayload
): Promise<BackendChatSession> {
  const body = {
    title: payload.title,
    messages: payload.messages ?? [],

    source: payload.source ?? "direct_chat",

    note_id:
      payload.noteId === null ||
      payload.noteId === undefined ||
      payload.noteId === ""
        ? null
        : Number(payload.noteId),
  };

  const data = await apiFetch<RawBackendChatSession>("/chat-sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return normaliseSession(data);
}

/* -------------------------------------------------------------------------- */
/* Get One Saved Chat Session                                                  */
/* Loads one saved chat by id. This is used when opening an existing chat from */
/* the chat list, favourites, or a direct URL.                                 */
/* -------------------------------------------------------------------------- */

export async function getBackendChatSession(
  id: string | number
): Promise<BackendChatSession> {
  const data = await apiFetch<RawBackendChatSession>(
    `/chat-sessions/${encodeURIComponent(String(id))}`
  );

  return normaliseSession(data);
}

/* -------------------------------------------------------------------------- */
/* Add Message to Saved Chat                                                   */
/* Saves one user or assistant message into an existing backend chat session   */
/* so the conversation can be restored later.                                  */
/* -------------------------------------------------------------------------- */

export async function addBackendChatSessionMessage(
  id: string | number,
  message: ChatMsg
): Promise<void> {
  await apiFetch<unknown>(
    `/chat-sessions/${encodeURIComponent(String(id))}/messages`,
    {
      method: "POST",
      body: JSON.stringify(message),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Update Saved Chat Session                                                   */
/* Applies editable changes such as renaming a chat or changing its favourite  */
/* state, then normalises the updated backend response.                        */
/* -------------------------------------------------------------------------- */

export async function updateBackendChatSession(
  id: string | number,
  patch: {
    title?: string;
    isFavorite?: boolean;
  }
): Promise<BackendChatSession> {
  const body: {
    title?: string;
    is_favorite?: boolean;
  } = {};

  if (patch.title !== undefined) {
    body.title = patch.title;
  }

  if (patch.isFavorite !== undefined) {
    body.is_favorite = patch.isFavorite;
  }

  const data = await apiFetch<RawBackendChatSession>(
    `/chat-sessions/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );

  return normaliseSession(data);
}

/* -------------------------------------------------------------------------- */
/* Rename Saved Chat                                                           */
/* A small wrapper around updateBackendChatSession used when only the title    */
/* needs to be changed.                                                       */
/* -------------------------------------------------------------------------- */

export async function renameBackendChatSession(
  id: string | number,
  title: string
): Promise<BackendChatSession> {
  return updateBackendChatSession(id, { title });
}

/* -------------------------------------------------------------------------- */
/* Toggle Chat Favourite                                                       */
/* A small wrapper around updateBackendChatSession used when the user adds or  */
/* removes a chat from favourites.                                             */
/* -------------------------------------------------------------------------- */

export async function toggleBackendChatSessionFavourite(
  id: string | number,
  isFavorite: boolean
): Promise<BackendChatSession> {
  return updateBackendChatSession(id, { isFavorite });
}

/* -------------------------------------------------------------------------- */
/* Delete Saved Chat                                                           */
/* Removes one saved chat session from the backend and returns a simple ok     */
/* result so pages can update their local list.                               */
/* -------------------------------------------------------------------------- */

export async function deleteBackendChatSession(
  id: string | number
): Promise<{ ok: true }> {
  await apiFetch<unknown>(
    `/chat-sessions/${encodeURIComponent(String(id))}`,
    {
      method: "DELETE",
    }
  );

  return { ok: true };
}
