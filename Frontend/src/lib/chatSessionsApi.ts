import type { ChatMsg } from "@/src/lib/chatApi";

/**
 * Marks where a chat was created from.
 *
 * learning_workspace = chat started from Learning Workspace notes/reflection/confidence
 * direct_chat = chat started directly from Chatbots page
 */
export type ChatSource = "learning_workspace" | "direct_chat";

/**
 * Payload used when creating a backend chat session.
 *
 * Frontend sends noteId.
 * Backend receives note_id.
 */
export type CreateChatSessionPayload = {
  title?: string;
  messages?: ChatMsg[];
  source?: ChatSource;
  noteId?: string | number | null;
};

/**
 * Frontend-friendly chat session type.
 *
 * Backend uses snake_case.
 * Frontend uses camelCase.
 */
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

/**
 * Raw FastAPI response shape.
 */
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

type ApiErrorBody = {
  detail?: string | { code?: string; message?: string; action?: string };
  message?: string;
};

/**
 * Keeps old chats safe.
 *
 * If source is missing, the frontend treats the chat as direct_chat.
 */
function normaliseSource(value: unknown): ChatSource {
  return value === "learning_workspace" ? "learning_workspace" : "direct_chat";
}

/**
 * Converts backend snake_case fields into frontend camelCase fields.
 */
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

/**
 * Safely reads JSON, plain text, or empty backend responses.
 */
async function readResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Extracts useful backend error messages.
 */
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

/**
 * Shared fetch helper.
 *
 * All requests go through the Next.js backend proxy so cookies still work.
 */
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

/**
 * Gets all saved chat sessions for the logged-in user.
 */
export async function listChatSessions(): Promise<BackendChatSession[]> {
  const data = await apiFetch<RawBackendChatSession[]>("/chat-sessions");
  return data.map(normaliseSession);
}

/**
 * Creates a new saved chat session.
 */
export async function createBackendChatSession(
  payload: CreateChatSessionPayload
): Promise<BackendChatSession> {
  const body = {
    title: payload.title,
    messages: payload.messages ?? [],

    // Backend expects this exact source field.
    source: payload.source ?? "direct_chat",

    // Backend expects snake_case note_id.
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

/**
 * Gets one saved chat session.
 */
export async function getBackendChatSession(
  id: string | number
): Promise<BackendChatSession> {
  const data = await apiFetch<RawBackendChatSession>(
    `/chat-sessions/${encodeURIComponent(String(id))}`
  );

  return normaliseSession(data);
}

/**
 * Adds one message to an existing saved chat.
 */
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

/**
 * Updates a saved chat.
 *
 * Used for rename and favourite/unfavourite.
 */
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

/**
 * Renames one saved chat.
 */
export async function renameBackendChatSession(
  id: string | number,
  title: string
): Promise<BackendChatSession> {
  return updateBackendChatSession(id, { title });
}

/**
 * Adds/removes one chat from favourites.
 */
export async function toggleBackendChatSessionFavourite(
  id: string | number,
  isFavorite: boolean
): Promise<BackendChatSession> {
  return updateBackendChatSession(id, { isFavorite });
}

/**
 * Deletes one saved chat.
 */
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