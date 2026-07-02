
"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* Email Verification Page. Verifies the six-digit email code after signup and lets users request a new verification code when needed. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, ApiError } from "@/src/lib/apiFetch";

/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type SuccessMessage = null | "RESENT_OK" | "VERIFIED_OK";

/* -------------------------------------------------------------------------- */
/* Map Verify Error To Message Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function mapVerifyErrorToMessage(code: string) {
  switch (code) {
    case "NETWORK_ERROR":
    case "BACKEND_CONNECTION_FAILED":
      return "We could not connect to the server. Please check that the backend is running, then try again.";

    case "VALIDATION_ERROR":
    case "REQUEST_FAILED_422":
      return "The code format is invalid. Please enter the 6-digit code exactly as shown in your email.";

    case "AUTH_USER_NOT_FOUND":
      return "No account was found for this email address. Please go back to sign up and create your account again.";

    case "AUTH_VERIFY_CODE_EXPIRED":
      return "That verification code has expired. Please request a new code and use the newest one from your email.";

    case "AUTH_VERIFY_CODE_INVALID":
      return "That verification code is incorrect. Please check your email and enter the latest 6-digit code.";

    case "AUTH_TOO_MANY_ATTEMPTS":
      return "Too many incorrect attempts have been made. Please wait a few minutes, then request a new code.";

    case "AUTH_NO_VERIFY_CODE":
      return "There is no active verification code for this email. Please request a new code.";

    case "AUTH_EMAIL_IN_USE":
      return "This email is already linked to an account. Please try signing in instead.";

    case "REQUEST_FAILED_500":
    case "INTERNAL_SERVER_ERROR":
      return "The server had a problem while verifying your email. Please try again. If it continues, check the backend terminal logs.";

    default:
      return "Something went wrong while verifying your email. Please try again or request a new code.";
  }
}

/* -------------------------------------------------------------------------- */
/* Get Error Code Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getErrorCode(error: unknown) {
  if (error instanceof ApiError) return error.code;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "UNKNOWN_ERROR";
}

/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function VerifyEmailPage() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const router = useRouter();
  const params = useSearchParams();

  const emailFromQuery = (params.get("email") ?? "").trim().toLowerCase();

  /* -------------------------------------------------------------------------- */
  /* State Values */
  /* Stores temporary page data such as form fields, loading flags, selected items, modal state, and feedback messages. */
  /* -------------------------------------------------------------------------- */

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState<SuccessMessage>(null);
  const [error, setError] = useState<string | null>(null);

  const [isResending, setIsResending] = useState(false);

  /* -------------------------------------------------------------------------- */
  /* Email Looks Valid Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const emailLooksValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailFromQuery);
  }, [emailFromQuery]);

  /* -------------------------------------------------------------------------- */
  /* Code Looks Valid Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const codeLooksValid = useMemo(() => /^\d{6}$/.test(code), [code]);

  const codeComplete = code.length === 6;

  /* -------------------------------------------------------------------------- */
  /* Side Effects */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => setMessage(null), 5000);

    return () => window.clearTimeout(timer);
  }, [message]);

  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!error) return;

    const timer = window.setTimeout(() => setError(null), 7000);

    return () => window.clearTimeout(timer);
  }, [error]);

  const onVerify = async () => {
    setMessage(null);
    setError(null);

    if (!emailLooksValid) {
      setError(
        "The email address is missing or invalid. Please go back to sign up and enter your email again."
      );
      return;
    }

    if (!codeLooksValid) {
      setError("Please enter the full 6-digit verification code from your email.");
      return;
    }

    setBusy(true);

    try {
      await apiFetch("/auth/verify", {
        method: "POST",
        json: {
          email: emailFromQuery,
          code,
        },
      });

      setMessage("VERIFIED_OK");

      window.setTimeout(() => {
        router.push("/auth/signin");
      }, 900);
    } catch (error: unknown) {
      const code = getErrorCode(error);
      setError(mapVerifyErrorToMessage(code));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setMessage(null);
    setError(null);

    if (!emailLooksValid) {
      setError(
        "The email address is missing or invalid. Please go back to sign up and enter your email again."
      );
      return;
    }

    setIsResending(true);

    try {
      await apiFetch("/auth/resend-verification", {
        method: "POST",
        json: {
          email: emailFromQuery,
        },
      });

      setMessage("RESENT_OK");
      setCode("");
    } catch (error: unknown) {
      const code = getErrorCode(error);
      setError(mapVerifyErrorToMessage(code));
    } finally {
      setIsResending(false);
    }
  };

  const isVerifyDisabled = busy || !codeLooksValid || !emailLooksValid;

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /* Verify Email Page Shell */
  /* Wraps the verification form and guidance text in one focused page layout. */
  /* -------------------------------------------------------------------------- */

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 transition-colors dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-3xl font-semibold text-blue-600">
            MediMind Lite
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Learn health with confidence
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
            <span>Step 2 of 2</span>
            <span>Almost there!</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
            <div className="h-2 w-full bg-blue-500" />
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h16v12H4V6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-600 dark:text-blue-300"
                />
                <path
                  d="M4 7l8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-600 dark:text-blue-300"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Verify Your Email
            </h1>

            <p className="leading-relaxed text-gray-600 dark:text-slate-300">
              We sent a 6-digit verification code to{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {emailFromQuery || "your email address"}
              </span>
              .
            </p>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              Enter the code below to complete your registration.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-center font-medium text-gray-900 dark:text-white">
              Enter Verification Code
            </label>

            <div className="flex justify-center">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "").slice(0, 6);

                  setCode(value);
                  setError(null);
                  setMessage(null);
                }}
                placeholder="______"
                className="w-72 rounded-xl border border-gray-300 px-4 py-4 text-center text-xl tracking-[0.6em] text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                aria-label="Verification code"
              />
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-slate-400">
              Enter all 6 digits to continue.
            </p>
          </div>

          {codeComplete && !error && !message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-900/60 dark:bg-blue-950/40">
              <p className="font-medium text-blue-800 dark:text-blue-100">
                ✓ Code received. Click verify to complete setup.
              </p>
            </div>
          )}

          {/*
            Verification Error Message
            Shows readable feedback when the code is invalid, expired, or the backend cannot verify it.
          */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/60 dark:bg-red-950/40">
              <p className="font-medium leading-6 text-red-800 dark:text-red-100">
                {error}
              </p>
            </div>
          )}

          {/*
            Resend Success Message
            Confirms that a new verification code request was accepted.
          */}
          {message === "RESENT_OK" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="font-medium text-gray-800 dark:text-slate-100">
                A new code has been sent. Please check your inbox and spam folder.
              </p>
            </div>
          )}

          {message === "VERIFIED_OK" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900/60 dark:bg-green-950/40">
              <p className="font-medium text-green-800 dark:text-green-100">
                Email verified successfully. Redirecting to sign in…
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onVerify}
            disabled={isVerifyDisabled}
            className={[
              "w-full rounded-xl py-4 text-lg font-semibold transition",
              isVerifyDisabled
                ? "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-slate-800 dark:text-slate-500"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
            ].join(" ")}
          >
            {busy ? "Verifying..." : "Verify and Complete Setup"}
          </button>

          <div className="space-y-3 pt-2 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Didn&apos;t receive the code?
            </p>

            <button
              type="button"
              onClick={onResend}
              disabled={isResending || !emailLooksValid}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900"
            >
              {isResending ? "Sending new code..." : "Resend verification code"}
            </button>

            {isResending && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Please check your inbox in a few moments.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-blue-50/40 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
            <p className="font-medium text-gray-900 dark:text-white">
              Having trouble?
            </p>

            <ul className="list-inside list-disc space-y-1">
              <li>Check your spam or junk folder.</li>
              <li>Make sure you used the correct email address.</li>
              <li>Use the newest code if you requested more than one.</li>
              <li>Wait a few minutes before requesting another code.</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 text-base text-gray-700 hover:underline dark:text-slate-200"
          >
            <span aria-hidden="true">←</span> Back to sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
