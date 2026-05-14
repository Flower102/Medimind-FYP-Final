// /lib/api.ts

/**
 * Backwards-compatible API helper.
 *
 * Some older pages may import from:
 *   /lib/api
 *
 * Newer pages should use:
 *   /src/lib/apiFetch
 *
 * This file still uses the Next.js proxy:
 *   /api/backend/...
 */

export const API_URL = "/api/backend";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = cleanPath.startsWith("/api/backend")
    ? cleanPath
    : `${API_URL}${cleanPath}`;

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

  const data = await readBody(res);

  if (!res.ok) {
    const { code, message } = getErrorInfo(data, res.status);
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}