// frontend/src/lib/notesApi.ts

/* -------------------------------------------------------------------------- */
/* Notes API Import                                                            */
/* All note requests use the shared apiFetch helper so they go through the     */
/* Next.js backend proxy with authentication cookies included.                 */
/* -------------------------------------------------------------------------- */

import { apiFetch } from "./apiFetch";

/* -------------------------------------------------------------------------- */
/* Note Types                                                                  */
/* These types describe the frontend note shape, the raw backend note shape,   */
/* and the payload used when creating or updating notes.                       */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Note Normalisation Helper                                                   */
/* This converts backend snake_case fields and nullable values into the safer  */
/* frontend Note type used by pages and components.                            */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Backend Payload Converter                                                   */
/* This converts frontend camelCase fields into the snake_case format expected */
/* by the FastAPI notes endpoint.                                              */
/* -------------------------------------------------------------------------- */

function toBackendPayload(payload: NotePayload) {
  return {
    title: payload.title,
    content: payload.content,
    reflection: payload.reflection,
    confidence: payload.confidence,
    is_favorite: payload.isFavorite,
  };
}

/* -------------------------------------------------------------------------- */
/* Create Note Request                                                         */
/* Saves a new learning note in the backend database and returns the normalised*/
/* note so the Learning Workspace can update immediately.                      */
/* -------------------------------------------------------------------------- */

export async function createNote(
  payload: Required<Pick<NotePayload, "content">> & NotePayload
): Promise<Note> {
  const data = await apiFetch<RawNote>("/notes", {
    method: "POST",
    json: toBackendPayload(payload),
  });

  return normaliseNote(data);
}

/* -------------------------------------------------------------------------- */
/* List Notes Request                                                          */
/* Loads all saved notes for the signed-in user and normalises every item for  */
/* frontend display.                                                           */
/* -------------------------------------------------------------------------- */

export async function listNotes(): Promise<Note[]> {
  const data = await apiFetch<RawNote[]>("/notes", {
    method: "GET",
  });

  return data.map(normaliseNote);
}

/* -------------------------------------------------------------------------- */
/* Get Single Note Request                                                     */
/* Loads one note by id, usually when a page needs to open or edit a specific  */
/* saved note.                                                                 */
/* -------------------------------------------------------------------------- */

export async function getNote(noteId: string): Promise<Note> {
  const data = await apiFetch<RawNote>(`/notes/${encodeURIComponent(noteId)}`, {
    method: "GET",
  });

  return normaliseNote(data);
}

/* -------------------------------------------------------------------------- */
/* Update Note Request                                                         */
/* Sends note edits to the backend, including content, reflection, confidence, */
/* and favourite status when those fields are provided.                        */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Delete Note Request                                                         */
/* Deletes one saved note from the backend and returns a simple success object */
/* so the page can remove it from local state.                                 */
/* -------------------------------------------------------------------------- */

export async function deleteNote(noteId: string): Promise<{ ok: true }> {
  await apiFetch<unknown>(`/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
  });

  return { ok: true };
}
