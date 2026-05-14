// frontend/src/lib/notesApi.ts

/**
 * Notes API functions.
 *
 * The browser calls:
 *   /api/backend/notes
 *
 * Next.js proxy forwards to FastAPI:
 *   http://127.0.0.1:8000/notes
 *
 * This keeps httpOnly auth cookies working.
 */

import { apiFetch } from "./apiFetch";

export type Note = {
  id: string;
  userId: string;
  title?: string | null;
  content: string;
  reflection?: string | null;
  confidence: number;
  isFavorite: boolean;
};

type RawNote = {
  id: number | string;
  user_id: number | string;
  title?: string | null;
  content: string;
  reflection?: string | null;
  confidence?: number | null;
  is_favorite?: boolean | null;
};

export type NotePayload = {
  title?: string | null;
  content?: string;
  reflection?: string | null;
  confidence?: number;
  isFavorite?: boolean;
};

function normaliseNote(note: RawNote): Note {
  return {
    id: String(note.id),
    userId: String(note.user_id),
    title: note.title ?? null,
    content: note.content ?? "",
    reflection: note.reflection ?? "",
    confidence: typeof note.confidence === "number" ? note.confidence : 5,
    isFavorite: Boolean(note.is_favorite),
  };
}

function toBackendPayload(payload: NotePayload) {
  return {
    title: payload.title,
    content: payload.content,
    reflection: payload.reflection,
    confidence: payload.confidence,
    is_favorite: payload.isFavorite,
  };
}

export async function createNote(
  payload: Required<Pick<NotePayload, "content">> & NotePayload
): Promise<Note> {
  const data = await apiFetch<RawNote>("/notes", {
    method: "POST",
    json: toBackendPayload(payload),
  });

  return normaliseNote(data);
}

export async function listNotes(): Promise<Note[]> {
  const data = await apiFetch<RawNote[]>("/notes", {
    method: "GET",
  });

  return data.map(normaliseNote);
}

export async function getNote(noteId: string): Promise<Note> {
  const data = await apiFetch<RawNote>(`/notes/${encodeURIComponent(noteId)}`, {
    method: "GET",
  });

  return normaliseNote(data);
}

export async function updateNote(
  noteId: string,
  patch: NotePayload
): Promise<Note> {
  const data = await apiFetch<RawNote>(`/notes/${encodeURIComponent(noteId)}`, {
    method: "PUT",
    json: toBackendPayload(patch),
  });

  return normaliseNote(data);
}

export async function deleteNote(noteId: string): Promise<{ ok: true }> {
  await apiFetch<unknown>(`/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
  });

  return { ok: true };
}