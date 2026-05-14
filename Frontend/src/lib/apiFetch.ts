// Frontend/src/lib/apiFetch.ts

/**
 * Shared API fetch helper for the MediMind frontend.
 *
 * The browser calls:
 *   /api/backend/...
 *
 * Next.js proxy forwards to FastAPI:
 *   http://127.0.0.1:8000/...
 *
 * This keeps httpOnly cookies working across the app.
 */

export type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  headers?: HeadersInit;
  cache?: RequestCache;
  signal?: AbortSignal;
};

type BackendErrorDetail =
  | string
  | {
      code?: string;
      message?: string;
      [key: string]: unknown;
    };

type BackendErrorBody = {
  detail?: BackendErrorDetail;
  message?: string;
};

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  REQUEST_FAILED: "The request failed. Please try again.",

  AUTH_MISSING_TOKEN: "You are not signed in. Please sign in again.",
  AUTH_INVALID_TOKEN: "Your session has expired or is invalid. Please sign in again.",
  AUTH_USER_NOT_FOUND: "No account was found with these details.",
  AUTH_EMAIL_IN_USE: "This email address is already registered. Please sign in instead.",
  AUTH_INVALID_CREDENTIALS:
    "The email or password is incorrect. Please check your details and try again.",
  AUTH_EMAIL_NOT_VERIFIED:
    "Your email address has not been verified yet. Please check your email for the verification code.",
  AUTH_LOCKED_TRY_LATER:
    "Too many failed sign-in attempts. Please wait a few minutes and try again.",
  AUTH_CURRENT_PASSWORD_INCORRECT: "Your current password is incorrect.",

  AUTH_PASSWORD_TOO_SHORT: "Password is too short. It must be at least 8 characters.",
  AUTH_PASSWORD_TOO_LONG: "Password is too long. Please choose a shorter password.",
  AUTH_PASSWORD_NEEDS_MIXED_CASE:
    "Password must include both uppercase and lowercase letters.",
  AUTH_PASSWORD_NEEDS_NUMBER: "Password must include at least one number.",
  AUTH_PASSWORD_NEEDS_SYMBOL:
    "Password must include at least one special character.",
  AUTH_PASSWORD_SAME_AS_OLD:
    "Your new password cannot be the same as your current password. Please choose a different password.",

  AUTH_MISSING_REFRESH: "Your session has expired. Please sign in again.",
  AUTH_INVALID_REFRESH: "Your session is invalid. Please sign in again.",
  AUTH_REFRESH_REVOKED: "Your session is no longer active. Please sign in again.",
  AUTH_REFRESH_EXPIRED: "Your session has expired. Please sign in again.",
  AUTH_REFRESH_REUSE_DETECTED:
    "For your security, this session has been ended. Please sign in again.",

  RESET_CODE_INVALID: "The reset code is incorrect. Please check the code and try again.",
  RESET_CODE_MISSING: "No reset code was found. Please request a new password reset code.",
  RESET_CODE_EXPIRED: "This reset code has expired. Please request a new code.",
  RESET_TOO_MANY_ATTEMPTS: "Too many reset attempts. Please wait and try again later.",

  GOOGLE_AUTH_NOT_CONFIGURED: "Google sign-in is not set up correctly yet.",
  GOOGLE_AUTH_FAILED: "Google sign-in could not be completed. Please try again.",
  GOOGLE_USERINFO_FAILED:
    "Google sign-in worked, but we could not read your Google account details.",
  GOOGLE_MISSING_ACCOUNT_INFO:
    "Google did not return the account information needed to sign you in.",

  AVATAR_INVALID_FILE_TYPE:
    "Please upload a valid image file. Supported formats are JPG, PNG, and WebP.",
  AVATAR_FILE_TOO_LARGE:
    "The profile picture is too large. Please upload an image smaller than 2 MB.",

  USERNAME_ALREADY_TAKEN: "This username is already taken. Please choose another one.",

  VALIDATION_ERROR: "Some details are missing or invalid. Please check the form and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SERVER_ERROR: "The server had a problem. Please try again later.",
};

function friendlyFallbackFromStatus(status: number) {
  switch (status) {
    case 400:
      return "The request was not valid. Please check your details and try again.";
    case 401:
      return "You are not authorised. Please sign in again.";
    case 403:
      return "You do not have permission to do this.";
    case 404:
      return "The requested item could not be found.";
    case 409:
      return "There is a conflict with existing information.";
    case 422:
      return "Some details are missing or invalid.";
    case 429:
      return "Too many attempts. Please wait and try again.";
    case 500:
      return "The server had a problem. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class ApiError extends Error {
  code: string;
  status: number;
  data: unknown;

  constructor(code: string, message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function readResponseBody(res: Response): Promise<unknown> {
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
  const fallbackMessage = friendlyFallbackFromStatus(status);

  if (!isRecord(data)) {
    return {
      code: fallbackCode,
      message: fallbackMessage,
    };
  }

  const body = data as BackendErrorBody;
  const detail = body.detail;

  if (typeof detail === "string") {
    const code = detail;
    return {
      code,
      message: FRIENDLY_ERROR_MESSAGES[code] ?? detail ?? fallbackMessage,
    };
  }

  if (isRecord(detail)) {
    const code =
      typeof detail.code === "string" && detail.code.trim()
        ? detail.code
        : fallbackCode;

    const message =
      typeof detail.message === "string" && detail.message.trim()
        ? detail.message
        : FRIENDLY_ERROR_MESSAGES[code] ?? fallbackMessage;

    return { code, message };
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return {
      code: fallbackCode,
      message: body.message,
    };
  }

  return {
    code: fallbackCode,
    message: fallbackMessage,
  };
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

/**
 * Main API helper.
 *
 * Use like:
 *   await apiFetch("/auth/me")
 *
 * Or:
 *   await apiFetch("/auth/signup", {
 *     method: "POST",
 *     json: { email, password }
 *   })
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const hasJson = typeof options.json !== "undefined";

  const res = await fetch(`/api/backend${cleanPath}`, {
    method: options.method ?? "GET",
    credentials: "include",
    cache: options.cache ?? "no-store",
    signal: options.signal,
    headers: {
      ...(hasJson ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    body: hasJson ? JSON.stringify(options.json) : undefined,
  });

  const data = await readResponseBody(res);

  if (!res.ok) {
    const { code, message } = getErrorInfo(data, res.status);
    throw new ApiError(code, message, res.status, data);
  }

  return data as T;
}