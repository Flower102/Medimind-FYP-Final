// /src/app/auth/forgot-password/page.tsx

"use client";

// I keep the forgot-password page translated and theme-aware here.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { useI18n } from "../../../i18n/I18nProvider";

type Step = 1 | 2 | 3;

/* ----------------------------- I keep the menu icons here ----------------------------- */

function IconDots() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 8.5 8.5 0 1 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5 5l-1.4-1.4M20.4 20.4 19 19M19 5l1.4-1.4M3.6 20.4 5 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/* ----------------------------- I keep shared helpers here ----------------------------- */

function safeText(value: string, key: string, fallback: string) {
  if (!value || value === key) return fallback;
  return value;
}

function applyDarkMode(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function subscribeToDarkMode(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mm:storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mm:storage", callback);
  };
}

function getDarkModeSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("mm_dark") === "1";
}

function getDarkModeServerSnapshot() {
  return false;
}

/* ----------------------------- I keep the three-dot menu inside this page ----------------------------- */

function AuthSettingsMenu() {
  const { t } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // I read the saved theme without calling setState inside an effect.
  const dark = useSyncExternalStore(
    subscribeToDarkMode,
    getDarkModeSnapshot,
    getDarkModeServerSnapshot
  );

  // I keep the document class synced with the saved theme.
  useEffect(() => {
    applyDarkMode(dark);
  }, [dark]);

  // I close the dropdown when I click outside it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function toggleDarkMode() {
    const nextDark = !dark;

    window.localStorage.setItem("mm_dark", nextDark ? "1" : "0");
    applyDarkMode(nextDark);
    window.dispatchEvent(new Event("mm:storage"));

    setMenuOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="Open settings menu"
        aria-expanded={menuOpen}
      >
        <IconDots />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl transition-colors dark:border-slate-700 dark:bg-slate-900">
          {/* I keep the home link at the top of the menu. */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {safeText(t("nav.home"), "nav.home", "Home")}
          </Link>

          {/* I keep the theme toggle below home. */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span className="text-blue-600 dark:text-blue-300">
              {dark ? <IconSun /> : <IconMoon />}
            </span>

            <span>
              {dark
                ? safeText(t("theme.light"), "theme.light", "Light mode")
                : safeText(t("theme.dark"), "theme.dark", "Dark mode")}
            </span>
          </button>

          <div className="my-2 border-t border-slate-100 dark:border-slate-700" />

          {/* I keep the language switcher inside the menu. */}
          <div className="rounded-xl px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {safeText(t("language.label"), "language.label", "Language")}
            </div>

            <LanguageSwitcher />
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- I keep backend error handling here ----------------------------- */

function getErrorMessage(code: string, tt: (key: string, fallback: string) => string) {
  switch (code) {
    case "RESET_CODE_INVALID":
      return tt(
        "forgot.error.resetCodeInvalid",
        "The reset code is incorrect. Please check the code and try again."
      );

    case "RESET_CODE_EXPIRED":
      return tt(
        "forgot.error.resetCodeExpired",
        "This reset code has expired. Please request a new code."
      );

    case "RESET_TOO_MANY_ATTEMPTS":
      return tt("forgot.error.tooManyAttempts", "Too many attempts. Please wait and try again.");

    case "AUTH_PASSWORD_TOO_SHORT":
      return tt("forgot.error.passwordTooShort", "Password must be at least 8 characters.");

    case "AUTH_PASSWORD_NEEDS_MIXED_CASE":
      return tt(
        "forgot.error.passwordNeedsMixedCase",
        "Password must include uppercase and lowercase letters."
      );

    case "AUTH_PASSWORD_NEEDS_NUMBER":
      return tt(
        "forgot.error.passwordNeedsNumber",
        "Password must include at least one number."
      );

    case "AUTH_PASSWORD_NEEDS_SYMBOL":
      return tt(
        "forgot.error.passwordNeedsSymbol",
        "Password must include at least one special character."
      );

    case "AUTH_PASSWORD_SAME_AS_OLD":
      return tt(
        "forgot.error.passwordSameAsOld",
        "Your new password cannot be the same as your current password. Please choose a different password."
      );

    default:
      return tt("forgot.error.unknown", "Something went wrong. Please try again.");
  }
}

/* ----------------------------- I keep backend response parsing here ----------------------------- */

/* ----------------------------- I keep backend response parsing here ----------------------------- */

async function readApiError(res: Response) {
  const data = await res.json().catch(() => ({}));

  const code =
    typeof data?.detail?.code === "string"
      ? data.detail.code
      : typeof data?.detail === "string"
        ? data.detail
        : `HTTP_${res.status}`;

  const message =
    typeof data?.detail?.message === "string"
      ? data.detail.message
      : typeof data?.message === "string"
        ? data.message
        : "";

  return { code, message };
}

/* ----------------------------- I keep password validation here ----------------------------- */

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function isStrongPassword(password: string) {
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}

/* ----------------------------- I keep the page component here ----------------------------- */

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();

  const tt = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const stepDescription =
    step === 1
      ? tt(
          "forgot.step1.description",
          "Enter your email address and we will send you a reset code."
        )
      : step === 2
        ? tt("forgot.step2.description", "Enter the 6-digit code sent to your email.")
        : tt("forgot.step3.description", "Create a new secure password.");

  /* Step 1: I request the reset code. */
  async function requestCode() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError(tt("forgot.error.emailRequired", "Please enter your email address."));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(tt("forgot.error.emailInvalid", "Please enter a valid email address."));
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/backend/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

     if (!res.ok) {
        const apiError = await readApiError(res);
        throw new Error(apiError.message || getErrorMessage(apiError.code, tt));
      }

      setMessage(
        tt(
          "forgot.success.codeSent",
          "If an account exists for this email, a reset code has been sent."
        )
      );
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err instanceof Error ? err.message : "UNKNOWN_ERROR", tt));
    } finally {
      setBusy(false);
    }
  }

  /* Step 2: I verify the reset code. */
  async function verifyCode() {
    setError("");
    setMessage("");

    if (code.trim().length !== 6) {
      setError(tt("forgot.error.codeRequired", "Please enter the 6-digit reset code."));
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/backend/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });

      if (!res.ok) {
        const apiError = await readApiError(res);
        throw new Error(apiError.message || getErrorMessage(apiError.code, tt));
      }

      setMessage(tt("forgot.success.codeVerified", "Code verified. Please create a new password."));
      setStep(3);

     
    } catch (err) {
      setError(getErrorMessage(err instanceof Error ? err.message : "UNKNOWN_ERROR", tt));
    } finally {
      setBusy(false);
    }
  }

  /* Step 3: I reset the password. */
  async function resetPassword() {
    setError("");
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setError(
        tt("forgot.error.passwordRequired", "Please enter and confirm your new password.")
      );
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setError(
        tt(
          "forgot.error.passwordWeak",
          "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
        )
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(tt("forgot.error.passwordMismatch", "The passwords do not match."));
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/backend/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
      const apiError = await readApiError(res);
      throw new Error(apiError.message || getErrorMessage(apiError.code, tt));
    }

    setMessage(tt("forgot.success.passwordReset", "Your password has been reset. You can now sign in."));

    window.setTimeout(() => {
      router.push("/auth/signin");
    }, 1200);
    } catch (err) {
      setError(getErrorMessage(err instanceof Error ? err.message : "UNKNOWN_ERROR", tt));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 transition-colors dark:bg-slate-950">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        {/* I keep the three-dot settings menu in the top-right corner. */}
        <div className="absolute right-6 top-6 z-20">
          <AuthSettingsMenu />
        </div>

        <h1 className="pr-14 text-3xl font-semibold text-gray-900 dark:text-white">
          {tt("forgot.title", "Reset password")}
        </h1>

        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          {stepDescription}
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
            {message}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {step === 1 && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {tt("forgot.emailLabel", "Email address")}
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:ring-2 focus:ring-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-400"
                  placeholder={tt("forgot.emailPlaceholder", "you@example.com")}
                />
              </label>

              <button
                type="button"
                onClick={requestCode}
                disabled={busy}
                className="w-full rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {busy
                  ? tt("forgot.sending", "Sending...")
                  : tt("forgot.sendCode", "Send reset code")}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {tt("forgot.codeLabel", "Reset code")}
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-xl tracking-[0.4em] text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:ring-2 focus:ring-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-400"
                  placeholder={tt("forgot.codePlaceholder", "000000")}
                />
              </label>

              <button
                type="button"
                onClick={verifyCode}
                disabled={busy}
                className="w-full rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {busy
                  ? tt("forgot.checking", "Checking...")
                  : tt("forgot.verifyCode", "Verify code")}
              </button>

              <button
                type="button"
                onClick={requestCode}
                disabled={busy}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              >
                {tt("forgot.resendCode", "Resend code")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setStep(1);
                }}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              >
                {tt("forgot.backToEmail", "Back to email")}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <PasswordInput
                label={tt("forgot.newPasswordLabel", "New password")}
                value={newPassword}
                show={showNewPassword}
                showLabel={tt("forgot.show", "Show")}
                hideLabel={tt("forgot.hide", "Hide")}
                onChange={setNewPassword}
                onToggleShow={() => setShowNewPassword((value) => !value)}
              />

              <PasswordInput
                label={tt("forgot.confirmPasswordLabel", "Confirm password")}
                value={confirmPassword}
                show={showConfirmPassword}
                showLabel={tt("forgot.show", "Show")}
                hideLabel={tt("forgot.hide", "Hide")}
                onChange={setConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((value) => !value)}
              />

              <PasswordRules password={newPassword} tt={tt} />

              {confirmPassword && newPassword !== confirmPassword && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {tt("forgot.passwordsDoNotMatch", "The passwords do not match.")}
                </div>
              )}

              {confirmPassword && newPassword === confirmPassword && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
                  {tt("forgot.passwordsMatch", "The passwords match.")}
                </div>
              )}

              <button
                type="button"
                onClick={resetPassword}
                disabled={busy}
                className="w-full rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {busy
                  ? tt("forgot.saving", "Saving...")
                  : tt("forgot.resetPassword", "Reset password")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setStep(2);
                }}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              >
                {tt("forgot.backToCode", "Back to code")}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-300">
          {tt("forgot.rememberedPassword", "Remembered your password?")}{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-gray-900 underline dark:text-white"
          >
            {tt("forgot.signIn", "Sign in")}
          </Link>
        </p>
      </div>
    </main>
  );
}

/* ----------------------------- I keep the password input reusable here ----------------------------- */

function PasswordInput({
  label,
  value,
  show,
  showLabel,
  hideLabel,
  onChange,
  onToggleShow,
}: {
  label: string;
  value: string;
  show: boolean;
  showLabel: string;
  hideLabel: string;
  onChange: (value: string) => void;
  onToggleShow: () => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
        {label}
      </span>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-16 text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:ring-2 focus:ring-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-400"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {show ? hideLabel : showLabel}
        </button>
      </div>
    </label>
  );
}

/* ----------------------------- I keep the live password rules reusable here ----------------------------- */

function PasswordRules({
  password,
  tt,
}: {
  password: string;
  tt: (key: string, fallback: string) => string;
}) {
  const checks = getPasswordChecks(password);

  const rules = [
    {
      label: tt("forgot.rule.length", "At least 8 characters"),
      ok: checks.length,
    },
    {
      label: tt("forgot.rule.uppercase", "One uppercase letter"),
      ok: checks.uppercase,
    },
    {
      label: tt("forgot.rule.lowercase", "One lowercase letter"),
      ok: checks.lowercase,
    },
    {
      label: tt("forgot.rule.number", "One number"),
      ok: checks.number,
    },
    {
      label: tt("forgot.rule.special", "One special character"),
      ok: checks.special,
    },
  ];

  return (
    <div className="rounded-xl bg-gray-50 p-4 text-sm transition-colors dark:bg-slate-950">
      <div className="mb-2 font-medium text-gray-700 dark:text-slate-200">
        {tt("forgot.rulesTitle", "Password must include:")}
      </div>

      <ul className="space-y-1">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={
              rule.ok ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-300"
            }
          >
            {rule.ok ? "✓" : "•"} {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}