// /lib/api.ts

/* -------------------------------------------------------------------------- */
/* Legacy API Helper Overview                                                  */
/* This file keeps older imports working while still sending requests through  */
/* the same Next.js backend proxy used by newer API helpers.                   */
/* -------------------------------------------------------------------------- */

export const API_URL = "/api/backend";

/* -------------------------------------------------------------------------- */
/* API Error Types                                                             */
/* These types describe the possible error response shapes returned by the     */
/* backend so the helper can safely read codes and messages.                   */
/* -------------------------------------------------------------------------- */

export type ApiErrorCode = string;

type BackendErrorDetail =
  | string
  | {
      code?: string;
      message?: string;
      [key: string]: unknown;
    };

type BackendErrorResponse = {
  detail?: BackendErrorDetail;
  message?: string;
};

/* -------------------------------------------------------------------------- */
/* HTTP Fallback Messages                                                      */
/* These messages are used when the backend does not return a clear error      */
/* message. They keep user-facing errors understandable.                       */
/* -------------------------------------------------------------------------- */

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "The request was not valid. Please check your details and try again.",
  401: "You are not authorised. Please sign in again.",
  403: "You do not have permission to do this.",
  404: "The requested item could not be found.",
  409: "There is a conflict with existing information.",
  422: "Some details are missing or invalid.",
  429: "Too many attempts. Please wait and try again.",
  500: "The server had a problem. Please try again later.",
};

/* -------------------------------------------------------------------------- */
/* API Error Class                                                             */
/* This custom error keeps the HTTP status and backend error code together so  */
/* older pages can react to failed requests consistently.                      */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message?: string) {
    super(message ?? FALLBACK_MESSAGES[status] ?? "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/* Object Type Guard                                                           */
/* This helper checks whether an unknown value is a plain object before trying */
/* to read properties from it.                                                 */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/* -------------------------------------------------------------------------- */
/* Response Body Reader                                                        */
/* This helper reads backend responses safely, supporting JSON, plain text,    */
/* and empty responses without crashing.                                       */
/* -------------------------------------------------------------------------- */

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/* -------------------------------------------------------------------------- */
/* Backend Error Parser                                                        */
/* This function extracts the best available code and message from backend     */
/* errors, then falls back to a status-based message if needed.                */
/* -------------------------------------------------------------------------- */

function getErrorInfo(data: unknown, status: number) {
  const fallbackCode = `REQUEST_FAILED_${status}`;
  const fallbackMessage = FALLBACK_MESSAGES[status] ?? "Something went wrong. Please try again.";

  if (!isRecord(data)) {
    return { code: fallbackCode, message: fallbackMessage };
  }

  const body = data as BackendErrorResponse;
  const detail = body.detail;

  if (typeof detail === "string") {
    return { code: detail, message: detail };
  }

  if (isRecord(detail)) {
    const code =
      typeof detail.code === "string" && detail.code.trim()
        ? detail.code
        : fallbackCode;

    const message =
      typeof detail.message === "string" && detail.message.trim()
        ? detail.message
        : fallbackMessage;

    return { code, message };
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return { code: fallbackCode, message: body.message };
  }

  return { code: fallbackCode, message: fallbackMessage };
}

/* -------------------------------------------------------------------------- */
/* Backwards-Compatible Fetch Helper                                           */
/* This helper builds the backend proxy URL, includes cookies, handles JSON or */
/* FormData bodies, and throws ApiError when the request fails.                */
/* -------------------------------------------------------------------------- */

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  /* ------------------------------------------------------------------------ */
  /* Request URL Preparation                                                   */
  /* Paths are normalised so callers can pass either /auth/me or a full proxy  */
  /* path without accidentally duplicating /api/backend.                       */
  /* ------------------------------------------------------------------------ */

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = cleanPath.startsWith("/api/backend")
    ? cleanPath
    : `${API_URL}${cleanPath}`;

  /* ------------------------------------------------------------------------ */
  /* Request Body Detection                                                    */
  /* FormData should not receive a manual JSON content type. Normal request   */
  /* bodies get application/json so the backend can parse them correctly.      */
  /* ------------------------------------------------------------------------ */

  const bodyIsFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(!bodyIsFormData && init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Response Handling                                                         */
  /* The response body is parsed first. Failed responses become ApiError, while*/
  /* successful responses are returned using the expected generic type.        */
  /* ------------------------------------------------------------------------ */

  const data = await readBody(res);

  if (!res.ok) {
    const { code, message } = getErrorInfo(data, res.status);
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}
