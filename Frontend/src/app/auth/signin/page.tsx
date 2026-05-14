"use client";

// src/app/auth/signin/page.tsx
// I keep this page self-contained so the sign-in page has its own three-dot settings menu.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import ReactiveMascot, { FocusMode } from "../../../components/ReactiveMascot";
import MediMindLogo from "../../../../MediMindLogo";
import { useI18n } from "../../../i18n/I18nProvider";
import LanguageSwitcher from "../../../components/LanguageSwitcher";

/* ----------------------------- Menu icons ----------------------------- */

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

/* ----------------------------- Shared helpers ----------------------------- */

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

/* ----------------------------- Three-dot settings menu ----------------------------- */

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

/* ----------------------------- Validation helpers ----------------------------- */

function validateEmail(email: string) {
  const value = email.trim();

  if (!value) return "Please enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Please enter a valid email address, for example name@example.com.";
  }

  return "";
}

function validatePassword(password: string) {
  if (!password) return "Please enter your password.";
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return "";
}

function getSigninErrorMessage(code: string) {
  switch (code) {
    case "AUTH_USER_NOT_FOUND":
      return {
        message: "No account exists with this email address. Please create an account first.",
        showSignup: true,
      };

    case "AUTH_INVALID_CREDENTIALS":
      return {
        message:
          "The email or password you entered is incorrect. Please check your details and try again.",
        showSignup: false,
      };

    case "AUTH_EMAIL_NOT_VERIFIED":
      return {
        message:
          "Your email address has not been verified yet. Please check your email for the verification code.",
        showSignup: false,
      };

    case "AUTH_LOCKED_TRY_LATER":
      return {
        message: "Too many failed sign-in attempts. Please wait a few minutes and try again.",
        showSignup: false,
      };

    case "AUTH_MISSING_TOKEN":
    case "AUTH_INVALID_TOKEN":
      return {
        message: "Your session has expired. Please sign in again.",
        showSignup: false,
      };

    default:
      return {
        message: "Something went wrong while signing you in. Please try again.",
        showSignup: false,
      };
  }
}

/* ----------------------------- Page component ----------------------------- */

export default function SignInPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>("none");

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [submitError, setSubmitError] = useState("");
  const [showSignupButton, setShowSignupButton] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : ""),
    [email, touched.email]
  );

  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : ""),
    [password, touched.password]
  );

  // I keep the input styles dark-mode friendly.
  const inputBase =
    "mt-2 w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:ring-2 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500";

  const okBorder =
    "border-gray-300 focus:ring-gray-900 dark:border-slate-700 dark:focus:ring-blue-400";

  const badBorder =
    "border-red-300 focus:ring-red-600 dark:border-red-500 dark:focus:ring-red-400";

  function validateAll() {
    const errors: string[] = [];

    const emailMessage = validateEmail(email);
    const passwordMessage = validatePassword(password);

    if (emailMessage) errors.push(emailMessage);
    if (passwordMessage) errors.push(passwordMessage);

    return errors;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTouched({
      email: true,
      password: true,
    });

    setSubmitError("");
    setShowSignupButton(false);

    const clientErrors = validateAll();

    if (clientErrors.length > 0) {
      setSubmitError(clientErrors.join(" "));
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/backend/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code =
          typeof data?.detail?.code === "string"
            ? data.detail.code
            : typeof data?.detail === "string"
              ? data.detail
              : "AUTH_UNKNOWN_ERROR";

        const backendMessage =
          typeof data?.detail?.message === "string"
            ? data.detail.message
            : "";

        const mapped = getSigninErrorMessage(code);

        setSubmitError(backendMessage || mapped.message);
        setShowSignupButton(mapped.showSignup);
        return;
      }

      router.replace("/dashboard");
    } catch {
      setSubmitError(
        "Could not connect to the server. Please check that the backend is running and try again."
      );
      setShowSignupButton(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 transition-colors dark:bg-slate-950">
      <div className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white text-gray-700 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:grid-cols-2">
        {/* I replaced the old ENG button with the three-dot menu. */}
        <div className="absolute right-6 top-6 z-20">
          <AuthSettingsMenu />
        </div>

        {/* I keep the left panel for the logo and mascot. */}
        <section className="flex flex-col justify-between bg-gray-100 p-10 transition-colors dark:bg-slate-950">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 hover:opacity-90">
              <MediMindLogo size={30} />

              <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                {safeText(t("brand.name"), "brand.name", "MediMind")} Lite
              </span>
            </Link>

            <div className="mt-2 text-gray-600 dark:text-slate-300">
              {safeText(
                t("auth.leftTagline"),
                "auth.leftTagline",
                "Understand your medical notes in a clearer, structured way."
              )}
            </div>
          </div>

          <div className="mt-10">
            <ReactiveMascot focusMode={focusMode} />
          </div>

          <div className="mt-8 text-xs text-gray-500 dark:text-slate-400">
            {safeText(
              t("auth.disclaimer"),
              "auth.disclaimer",
              "Educational support only — not medical advice."
            )}
          </div>
        </section>

        {/* I keep the right panel for the sign-in form. */}
        <section className="p-10">
          <h1 className="text-4xl font-semibold text-gray-900 dark:text-white">
            {safeText(t("signin.title"), "signin.title", "Welcome back!")}
          </h1>

          <p className="mt-2 text-gray-600 dark:text-slate-300">
            {safeText(t("signin.subtitle"), "signin.subtitle", "Please enter your details")}
          </p>

          {submitError && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="font-semibold">
                {safeText(
                  t("errors.fixFollowing"),
                  "errors.fixFollowing",
                  "Please fix the following:"
                )}
              </div>

              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{submitError}</li>
              </ul>

              {showSignupButton && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => router.push("/auth/signup")}
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    {safeText(t("cta.createAccount"), "cta.createAccount", "Create account")}
                  </button>
                </div>
              )}
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
            {/* I keep the email field here. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                {safeText(t("common.email"), "common.email", "Email")}
              </label>

              <input
                type="email"
                placeholder={safeText(
                  t("common.emailPlaceholder"),
                  "common.emailPlaceholder",
                  "name@gmail.com"
                )}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubmitError("");
                  setShowSignupButton(false);
                }}
                onBlur={() => setTouched((x) => ({ ...x, email: true }))}
                onFocus={() => setFocusMode("email")}
                className={`${inputBase} ${emailError ? badBorder : okBorder}`}
              />

              {emailError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                  {emailError}
                </p>
              )}
            </div>

            {/* I keep the password field here. */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                  {safeText(t("common.password"), "common.password", "Password")}
                </label>

                <Link
                  className="text-sm text-gray-700 underline dark:text-slate-300"
                  href="/auth/forgot-password"
                >
                  {safeText(t("signin.forgot"), "signin.forgot", "Forgot password?")}
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={safeText(
                    t("common.passwordPlaceholder"),
                    "common.passwordPlaceholder",
                    "••••••••"
                  )}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setSubmitError("");
                    setShowSignupButton(false);
                  }}
                  onBlur={() => setTouched((x) => ({ ...x, password: true }))}
                  onFocus={() => setFocusMode("password")}
                  className={`${inputBase} pr-12 ${
                    passwordError ? badBorder : okBorder
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={
                    showPassword
                      ? safeText(t("signin.hidePassword"), "signin.hidePassword", "Hide password")
                      : safeText(t("signin.showPassword"), "signin.showPassword", "Show password")
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              {passwordError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                  {passwordError}
                </p>
              )}
            </div>

            {/* I keep the submit button here. */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >                      
              {busy
                ? "Signing in..."
                : safeText(t("signin.submit"), "signin.submit", "Log in")}
            </button>

            {/* I keep the Google login section here. */}
            <div className="mt-6">
              <div className="flex items-center gap-5">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  OR
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/api/backend/auth/google/login";
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800"
                aria-label={safeText(
                  t("signin.googleAria"),
                  "signin.googleAria",
                  "Log in with Google"
                )}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303C33.676 32.659 29.22 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.819C14.655 16.108 19.01 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4c-7.68 0-14.38 4.337-17.694 10.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.118 0 9.802-1.967 13.338-5.168l-6.162-5.214C29.11 35.091 26.676 36 24 36c-5.199 0-9.646-3.318-11.279-7.946l-6.52 5.02C9.48 39.556 16.227 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303a11.98 11.98 0 0 1-4.127 5.618l.003-.002 6.162 5.214C36.91 39.189 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
                  />
                </svg>

                <span>{safeText(t("signin.google"), "signin.google", "Continue with Google")}</span>
              </button>
            </div>

            {/* I use router.push here so the sign-up navigation is direct. */}
            <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-300">
              {safeText(t("signin.noAccount"), "signin.noAccount", "Don’t have an account?")}{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/signup")}
                className="font-medium text-gray-700 underline transition hover:text-gray-950 dark:text-white dark:hover:text-blue-200"
              >
                {safeText(t("signin.signUp"), "signin.signUp", "Sign up")}
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}