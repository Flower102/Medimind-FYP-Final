"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* Sign Up Page. Creates new accounts, validates registration details, starts email verification, and manages page-level accessibility options. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";


import MediMindLogo from "../../../../MediMindLogo";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { useI18n } from "../../../i18n/I18nProvider";

import { apiFetch, ApiError } from "@/src/lib/apiFetch";


/* -------------------------------------------------------------------------- */
/* Icon Dots Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconDots() {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon Moon Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Icon Sun Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconSun() {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

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


/* -------------------------------------------------------------------------- */
/* Safe Text Helper */
/* Keeps validation, detection, or text-cleaning logic separate from the main render code. */
/* -------------------------------------------------------------------------- */

function safeText(value: string, key: string, fallback: string) {
  if (!value || value === key) return fallback;
  return value;
}

/* -------------------------------------------------------------------------- */
/* Apply Dark Mode Helper */
/* Connects browser-level settings or events to the React component state. */
/* -------------------------------------------------------------------------- */

function applyDarkMode(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

/* -------------------------------------------------------------------------- */
/* Subscribe To Dark Mode Helper */
/* Connects browser-level settings or events to the React component state. */
/* -------------------------------------------------------------------------- */

function subscribeToDarkMode(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mm:storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mm:storage", callback);
  };
}

/* -------------------------------------------------------------------------- */
/* Get Dark Mode Snapshot Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getDarkModeSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("mm_dark") === "1";
}

/* -------------------------------------------------------------------------- */
/* Get Dark Mode Server Snapshot Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getDarkModeServerSnapshot() {
  return false;
}


/* -------------------------------------------------------------------------- */
/* Auth Settings Menu Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function AuthSettingsMenu() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const { t } = useI18n();

  /* -------------------------------------------------------------------------- */
  /* State Values */
  /* Stores temporary page data such as form fields, loading flags, selected items, modal state, and feedback messages. */
  /* -------------------------------------------------------------------------- */

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const dark = useSyncExternalStore(
    subscribeToDarkMode,
    getDarkModeSnapshot,
    getDarkModeServerSnapshot
  );

  /* -------------------------------------------------------------------------- */
  /* Side Effects */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    applyDarkMode(dark);
  }, [dark]);

  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

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

  /* -------------------------------------------------------------------------- */
  /* Toggle Dark Mode Handler */
  /* Handles this user action and keeps the backend data and visible UI in sync. */
  /* -------------------------------------------------------------------------- */

  function toggleDarkMode() {
    const nextDark = !dark;

    window.localStorage.setItem("mm_dark", nextDark ? "1" : "0");
    applyDarkMode(nextDark);
    window.dispatchEvent(new Event("mm:storage"));

    setMenuOpen(false);
  }

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

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
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {safeText(t("nav.home"), "nav.home", "Home")}
          </Link>

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

          <div className="rounded-xl px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {safeText(t("language.label"), "language.label", "Language")}
            </div>

            {/*
              Language Selector
              Lets the user change language from the authentication page.
            */}
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Validate Name Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function validateName(label: string, name: string) {
  const v = name.trim();

  if (!v) return `${label} is required.`;
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(v)) {
    return `${label} can only include letters, spaces, hyphens, or apostrophes.`;
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* Validate Email Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function validateEmail(email: string) {
  const v = email.trim().toLowerCase();

  if (!v) return "Email is required.";
  if (v.length < 6) return "Email is too short (e.g., name@gmail.com).";
  if (!v.includes("@")) return "Email must include an @ symbol (e.g., name@gmail.com).";

  const parts = v.split("@");

  if (parts.length !== 2) return "Email format is invalid.";

  const local = parts[0];
  const domain = parts[1];

  if (local.length < 2) return "Email name is too short (e.g., john@gmail.com).";
  if (!domain.includes(".")) return "Email domain must include a dot (e.g., gmail.com).";

  const domainParts = domain.split(".");

  if (domainParts.length < 2) return "Email must include a valid domain (e.g., gmail.com).";

  const mainDomain = domainParts[0];
  const tld = domainParts.slice(1).join(".");

  if (mainDomain.length < 2) return "Email domain name is invalid (e.g., gmail.com).";
  if (!/^[a-z0-9.-]+$/.test(mainDomain)) return "Email domain contains invalid characters.";
  if (!/^[a-z]{2,}(\.[a-z]{2,})*$/.test(tld)) {
    return "Top-level domain must be valid (e.g., .com, .co.uk, .ac.uk).";
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* Password Rules Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function passwordRules(password: string) {
  return {
    minLen: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\\/]/.test(password),
  };
}

/* -------------------------------------------------------------------------- */
/* Validate Password Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function validatePassword(password: string) {
  if (!password) return "Password is required.";

  const r = passwordRules(password);
  const missing: string[] = [];

  if (!r.minLen) missing.push("at least 8 characters");
  if (!r.hasUpper || !r.hasLower) missing.push("uppercase + lowercase letters");
  if (!r.hasNumber) missing.push("a number");
  if (!r.hasSpecial) missing.push("a special character (e.g., ! @ # $ %)");

  if (missing.length) return `Please include ${missing.join(", ")}.`;
  return "";
}


/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function SignUpPage() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const { t } = useI18n();
  const router = useRouter();

  /* -------------------------------------------------------------------------- */
  /* State Values */
  /* Stores temporary page data such as form fields, loading flags, selected items, modal state, and feedback messages. */
  /* -------------------------------------------------------------------------- */

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const [touched, setTouched] = useState({
    firstName: false,
    surname: false,
    email: false,
    password: false,
  });

  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [debugError, setDebugError] = useState<string | null>(null);

  /* -------------------------------------------------------------------------- */
  /* Side Effects */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const saved = localStorage.getItem("mm_signup_draft");
    if (!saved) return;

    try {
      const v = JSON.parse(saved);
      setFirstName(v.firstName ?? "");
      setSurname(v.surname ?? "");
      setEmail(v.email ?? "");
      setPassword(v.password ?? "");
    } catch {
    }
  }, []);

  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      "mm_signup_draft",
      JSON.stringify({ firstName, surname, email, password })
    );
  }, [firstName, surname, email, password]);

  /* -------------------------------------------------------------------------- */
  /* Rules Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const rules = useMemo(() => passwordRules(password), [password]);

  /* -------------------------------------------------------------------------- */
  /* Password Strength Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const passwordStrength = useMemo(() => {
    let score = 0;

    if (rules.minLen) score++;
    if (rules.hasUpper && rules.hasLower) score++;
    if (rules.hasNumber) score++;
    if (rules.hasSpecial) score++;

    return score;
  }, [rules]);

  /* -------------------------------------------------------------------------- */
  /* Strength Label Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Medium";
    if (passwordStrength === 3) return "Strong";
    return "Very strong";
  }, [password, passwordStrength]);

  /* -------------------------------------------------------------------------- */
  /* First Name Error Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const firstNameError = useMemo(
    () => (touched.firstName ? validateName("First name", firstName) : ""),
    [touched.firstName, firstName]
  );

  /* -------------------------------------------------------------------------- */
  /* Surname Error Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const surnameError = useMemo(
    () => (touched.surname ? validateName("Surname", surname) : ""),
    [touched.surname, surname]
  );

  /* -------------------------------------------------------------------------- */
  /* Email Error Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : ""),
    [touched.email, email]
  );

  /* -------------------------------------------------------------------------- */
  /* Password Error Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : ""),
    [touched.password, password]
  );

  const inputBase =
    "mt-2 w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:ring-2 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500";

  const okBorder =
    "border-gray-300 focus:ring-gray-900 dark:border-slate-700 dark:focus:ring-blue-400";

  const badBorder =
    "border-red-300 focus:ring-red-600 dark:border-red-500 dark:focus:ring-red-400";

  const validateAll = () => {
    const errors: string[] = [];

    const f = validateName("First name", firstName);
    const s = validateName("Surname", surname);
    const e = validateEmail(email);
    const p = validatePassword(password);

    if (f) errors.push(f);
    if (s) errors.push(s);
    if (e) errors.push(e);
    if (p) errors.push(p);

    return errors;
  };

  const mapSignupErrorToMessage = (code: string) => {
    switch (code) {
      case "AUTH_EMAIL_IN_USE":
        return "This email is already in use. Please sign in instead.";

      case "AUTH_PASSWORD_TOO_SHORT":
        return "Password is too short. It must be at least 8 characters.";

      case "AUTH_PASSWORD_TOO_LONG":
        return "Password is too long. Please choose a shorter password.";

      case "AUTH_PASSWORD_NEEDS_MIXED_CASE":
        return "Password must include both uppercase and lowercase letters.";

      case "AUTH_PASSWORD_NEEDS_NUMBER":
        return "Password must include at least one number (0–9).";

      case "AUTH_PASSWORD_NEEDS_SYMBOL":
        return "Password must include at least one special character (e.g., ! @ #).";

      case "VALIDATION_ERROR":
        return "Some details were invalid. Please double-check your inputs.";

      case "NETWORK_ERROR":
        return "We couldn’t connect to the server. Please try again in a moment.";

      default:
        return "Something went wrong. Please try again.";
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ firstName: true, surname: true, email: true, password: true });
    setSubmitErrors([]);
    setDebugError(null);

    const errors = validateAll();

    if (errors.length > 0) {
      setSubmitErrors(errors);
      return;
    }

    setBusy(true);

    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        json: {
          first_name: firstName.trim(),
          surname: surname.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      router.push(`/auth/verifyemail?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      localStorage.removeItem("mm_signup_draft");
    } catch (err) {
      if (err instanceof ApiError) {
        const friendly = err.message || mapSignupErrorToMessage(err.code);
        setSubmitErrors([friendly]);

        if (process.env.NODE_ENV === "development") {
          setDebugError(`Debug: status=${err.status} code=${err.code}`);
        } else {
          setDebugError(null);
        }
      } else {
        setSubmitErrors(["Something went wrong. Please try again."]);
        setDebugError(null);
      }
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /* Authentication Page Shell */
  /* Wraps the authentication screen with the page background and responsive layout. */
  /* -------------------------------------------------------------------------- */

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 transition-colors dark:bg-slate-950">
      <div className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white text-gray-700 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:grid-cols-2">
        <div className="absolute right-6 top-6 z-20">
          {/*
            Authentication Settings Menu
            Provides theme and language controls without leaving the auth page.
          */}
          <AuthSettingsMenu />
        </div>

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
                t("signup.leftTagline"),
                "signup.leftTagline",
                "Understand your medical notes in a clearer, structured way."
              )}
            </div>
          </div>

        

          <div className="mt-8 text-xs text-gray-500 dark:text-slate-400">
            {safeText(
              t("auth.disclaimer"),
              "auth.disclaimer",
              "Educational support only — not medical advice."
            )}
          </div>
        </section>

        <section className="p-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
              <span>{safeText(t("signup.step"), "signup.step", "Step 1 of 2")}</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold text-gray-900 dark:text-white">
            {safeText(t("signup.title"), "signup.title", "Create your account")}
          </h1>

          <p className="mt-2 text-gray-600 dark:text-slate-300">
            {safeText(t("signup.subtitle"), "signup.subtitle", "Please enter your details")}
          </p>

          {submitErrors.length > 0 && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="font-semibold">
                {safeText(
                  t("errors.fixFollowing"),
                  "errors.fixFollowing",
                  "Please fix the following:"
                )}
              </div>

              <ul className="mt-2 list-disc space-y-1 pl-5">
                {submitErrors.map((err, i) => (
                  <li key={`${err}-${i}`}>{err}</li>
                ))}
              </ul>

              {debugError && <div className="mt-3 text-xs opacity-70">{debugError}</div>}
            </div>
          )}

          {/*
            Authentication Form
            Collects the user details needed for this authentication step.
          */}
          <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                {safeText(t("signup.firstName"), "signup.firstName", "First name")}
              </label>

              <input
                type="text"
                placeholder={safeText(
                  t("signup.firstNamePlaceholder"),
                  "signup.firstNamePlaceholder",
                  "Please enter your first name"
                )}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => setTouched((x) => ({ ...x, firstName: true }))}
                className={`${inputBase} ${firstNameError ? badBorder : okBorder}`}
              />

              {firstNameError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                  {firstNameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                {safeText(t("signup.surname"), "signup.surname", "Surname")}
              </label>

              <input
                type="text"
                placeholder={safeText(
                  t("signup.surnamePlaceholder"),
                  "signup.surnamePlaceholder",
                  "Please enter your surname"
                )}
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                onBlur={() => setTouched((x) => ({ ...x, surname: true }))}
                className={`${inputBase} ${surnameError ? badBorder : okBorder}`}
              />

              {surnameError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                  {surnameError}
                </p>
              )}
            </div>

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
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((x) => ({ ...x, email: true }))}
                className={`${inputBase} ${emailError ? badBorder : okBorder}`}
              />

              {emailError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                {safeText(t("common.password"), "common.password", "Password")}
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={safeText(
                    t("signup.passwordPlaceholder"),
                    "signup.passwordPlaceholder",
                    "Create a strong password"
                  )}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((x) => ({ ...x, password: true }))}
                  className={`${inputBase} pr-12 ${passwordError ? badBorder : okBorder}`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
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

              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength === 1
                        ? "w-1/4 bg-red-500"
                        : passwordStrength === 2
                          ? "w-2/4 bg-yellow-500"
                          : passwordStrength === 3
                            ? "w-3/4 bg-blue-500"
                            : passwordStrength === 4
                              ? "w-full bg-green-600"
                              : "w-0"
                    }`}
                  />
                </div>

                {password && (
                  <div className="mt-2 text-xs font-medium text-gray-700 dark:text-slate-300">
                    {strengthLabel}
                  </div>
                )}
              </div>

              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-slate-400">
                <li className={rules.minLen ? "text-green-700 dark:text-green-300" : ""}>
                  • At least 8 characters
                </li>

                <li
                  className={
                    rules.hasUpper && rules.hasLower
                      ? "text-green-700 dark:text-green-300"
                      : ""
                  }
                >
                  • Uppercase + lowercase letters
                </li>

                <li className={rules.hasNumber ? "text-green-700 dark:text-green-300" : ""}>
                  • At least one number (0–9)
                </li>

                <li className={rules.hasSpecial ? "text-green-700 dark:text-green-300" : ""}>
                  • At least one special character (! @ # $ % ^ & * etc.)
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {busy
                ? "Creating..."
                : safeText(t("signup.submit"), "signup.submit", "Create account")}
            </button>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-300">
              {safeText(
                t("signup.alreadyHave"),
                "signup.alreadyHave",
                "Already have an account?"
              )}{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/signin")}
                className="font-medium text-gray-700 underline transition hover:text-gray-950 dark:text-white dark:hover:text-blue-200"
              >
                {safeText(t("signup.logIn"), "signup.logIn", "Log in")}
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
