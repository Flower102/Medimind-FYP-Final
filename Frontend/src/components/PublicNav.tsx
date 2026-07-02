"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* Public Navigation Component. Provides the shared public navigation bar, language switcher, account actions, profile display, and theme controls. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/src/i18n/I18nProvider";

/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type CurrentUser = {
  id: number;
  email: string;
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

/* -------------------------------------------------------------------------- */
/* Brand Icon Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function BrandIcon() {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/30 dark:bg-blue-500">
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 5.5C5 3.6 6.6 2 8.5 2h7C17.4 2 19 3.6 19 5.5v5.8c0 1.9-1.6 3.5-3.5 3.5h-4.8L6.9 18.4C6.2 19 5 18.5 5 17.5v-12Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon User Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconUser() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

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
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
/* Static Page Data */
/* Stores reusable labels, routes, lists, or settings that stay the same while the component renders. */
/* -------------------------------------------------------------------------- */

const publicNavItems = [
  {
    href: "/",
    labelKey: "publicNav.home",
    fallback: "Home",
  },
  {
    href: "/theProblem",
    labelKey: "publicNav.problem",
    fallback: "The Problem",
  },
  {
    href: "/features",
    labelKey: "publicNav.features",
    fallback: "Features",
  },
  {
    href: "/aboutUs",
    labelKey: "publicNav.aboutContact",
    fallback: "About / Contact",
  },
];

/* -------------------------------------------------------------------------- */
/* Get Initial Dark Mode Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getInitialDarkMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("mm_dark") === "1";
}

/* -------------------------------------------------------------------------- */
/* Apply Dark Mode Helper */
/* Connects browser-level settings or events to the React component state. */
/* -------------------------------------------------------------------------- */

function applyDarkMode(isDark: boolean) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

/* -------------------------------------------------------------------------- */
/* Get Display Name Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getDisplayName(user: CurrentUser) {
  const fullName = `${user.first_name ?? ""} ${user.surname ?? ""}`.trim();

  return (
    user.display_name?.trim() ||
    fullName ||
    user.email.split("@")[0] ||
    "Your account"
  );
}

/* -------------------------------------------------------------------------- */
/* Get Initial Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getInitial(user: CurrentUser) {
  return getDisplayName(user).charAt(0).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Get Avatar Url Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getAvatarUrl(url?: string | null) {
  if (!url) return "";

  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return `/api/backend${url}`;

  return url;
}

/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function PublicNav() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  /* -------------------------------------------------------------------------- */
  /* State Values */
  /* Stores temporary page data such as form fields, loading flags, selected items, modal state, and feedback messages. */
  /* -------------------------------------------------------------------------- */

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(getInitialDarkMode);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const translatedPublicNavItems = publicNavItems.map((item) => ({
    href: item.href,
    label: tt(item.labelKey, item.fallback),
  }));

  const navItems = user
    ? [
        ...translatedPublicNavItems,
        {
          href: "/dashboard",
          label: tt("publicNav.dashboard", "Dashboard"),
        },
      ]
    : translatedPublicNavItems;

  /* -------------------------------------------------------------------------- */
  /* Side Effects */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/backend/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const data = (await res.json()) as CurrentUser;

        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setCheckingUser(false);
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    applyDarkMode(dark);
    window.localStorage.setItem("mm_dark", dark ? "1" : "0");
    window.dispatchEvent(new Event("mm:storage"));
  }, [dark]);

  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    function handleStorageChange() {
      const savedDark = window.localStorage.getItem("mm_dark") === "1";
      setDark(savedDark);
      applyDarkMode(savedDark);
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("mm:storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("mm:storage", handleStorageChange);
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }

      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* Sign Out And Go Home Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  async function signOutAndGoHome() {
    try {
      await fetch("/api/backend/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setAccountOpen(false);
      router.replace("/");
      router.refresh();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Switch Account Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  async function switchAccount() {
    try {
      await fetch("/api/backend/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setAccountOpen(false);
      router.replace("/auth/signin");
      router.refresh();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950">
      {/*
        Navigation Content Container
        Aligns brand, links, account menu, settings menu, and mobile controls.
      */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        {/*
          Public Brand Link
          Shows the MediMind logo and returns users to the landing page.
        */}
        <Link href="/" className="flex items-center gap-3">
          <BrandIcon />

          <div className="leading-tight">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              MediMind Lite
            </div>

            <div className="text-xs font-medium text-slate-500 dark:text-slate-300">
              {tt("publicNav.tagline", "Learn health with confidence")}
            </div>
          </div>
        </Link>

        {/*
          Desktop Public Links
          Displays public navigation links on larger screens.
        */}
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25 dark:bg-blue-500"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/*
          Public Utility Controls
          Groups account access, theme settings, language switcher, and mobile menu controls.
        */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={accountRef}>
            {/*
              Signed-Out Account Entry
              Shows the sign-in button when no user is currently authenticated.
            */}
            {!user ? (
              <Link
                href="/auth/signin"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                aria-label={tt("publicNav.signIn", "Sign in")}
              >
                <IconUser />
              </Link>
            ) : (
              <>
                {/*
                  Mobile Menu Button
                  Opens or closes the mobile public navigation menu.
                */}
                <button
                  type="button"
                  onClick={() => setAccountOpen((value) => !value)}
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  aria-label={tt(
                    "publicNav.openAccountMenu",
                    "Open account menu"
                  )}
                  aria-expanded={accountOpen}
                >
                  {user.avatar_url ? (
                    <span
                      className="h-full w-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${getAvatarUrl(user.avatar_url)})`,
                      }}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-blue-600 text-sm font-bold text-white">
                      {getInitial(user)}
                    </span>
                  )}
                </button>

                {/*
                  Signed-In Account Dropdown
                  Shows profile, switch-account, and sign-out actions for authenticated users.
                */}
                {accountOpen && (
                  <div
                    className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                    style={{ zIndex: 9999 }}
                  >
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-bold text-white">
                          {user.avatar_url ? (
                            <span
                              className="h-full w-full bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${getAvatarUrl(
                                  user.avatar_url
                                )})`,
                              }}
                            />
                          ) : (
                            getInitial(user)
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {getDisplayName(user)}
                          </div>

                          <div className="truncate text-xs text-slate-500 dark:text-slate-300">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <Link
                        href="/settings"
                        onClick={() => setAccountOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        {tt("account.profile", "Profile")}
                      </Link>

                      <button
                        type="button"
                        onClick={switchAccount}
                        className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        {tt("account.switchAccount", "Switch account")}
                      </button>

                      <button
                        type="button"
                        onClick={signOutAndGoHome}
                        className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {tt("account.signOut", "Sign out")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              aria-label={tt(
                "publicNav.openSettingsMenu",
                "Open settings menu"
              )}
              aria-expanded={settingsOpen}
            >
              <IconDots />
            </button>

            {/*
              Public Settings Dropdown
              Shows theme and language controls in the public navigation.
            */}
            {settingsOpen && (
              <div
                className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                style={{ zIndex: 9999 }}
              >
                {/*
                  Mobile Menu Toggle
                  Opens the mobile public menu on smaller screens.
                */}
                <button
                  type="button"
                  onClick={() => {
                    setDark((value) => !value);
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="text-blue-600 dark:text-blue-300">
                    {dark ? <IconSun /> : <IconMoon />}
                  </span>

                  <span>
                    {dark
                      ? tt("publicNav.lightMode", "Light mode")
                      : tt("publicNav.darkMode", "Dark mode")}
                  </span>
                </button>

                <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

                <div className="rounded-xl px-4 py-3">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                    {tt("publicNav.language", "Language")}
                  </div>

                  <LanguageSwitcher />
                </div>
              </div>
            )}
          </div>

          {checkingUser && (
            <span className="sr-only">
              {tt("publicNav.checkingAccount", "Checking account")}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
