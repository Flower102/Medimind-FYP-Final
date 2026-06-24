// /src/components/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  Bot,
  BookOpen,
  Camera,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Settings as SettingsIcon,
  Star,
  Sun,
  TrendingUp,
  UserCircle,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../i18n/I18nProvider";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

type ShellUser = {
  id: number;
  email: string;
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type TextSize = "normal" | "large" | "extra-large";

const TEXT_SIZE_VALUES = ["normal", "large", "extra-large"] as const;

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event("mm:storage"));
  } catch {
    // localStorage can fail in restricted browser modes.
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: Event) => {
    if (event.type === "storage" || event.type === "mm:storage") {
      callback();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("mm:storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("mm:storage", onStorage);
  };
}

function useLSBool(key: string, defaultValue: boolean) {
  const getSnapshot = useCallback(() => {
    const value = lsGet(key);
    if (value === null) return defaultValue;
    return value === "1";
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const previous = getSnapshot();
      const resolved =
        typeof next === "function"
          ? (next as (prev: boolean) => boolean)(previous)
          : next;

      lsSet(key, resolved ? "1" : "0");
    },
    [getSnapshot, key]
  );

  return [value, setValue] as const;
}

function useLSString<T extends string>(
  key: string,
  defaultValue: T,
  allowedValues: readonly T[]
) {
  const getSnapshot = useCallback(() => {
    const value = lsGet(key);
    if (value && allowedValues.includes(value as T)) return value as T;
    return defaultValue;
  }, [allowedValues, defaultValue, key]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T) => {
      lsSet(key, next);
    },
    [key]
  );

  return [value, setValue] as const;
}

function getShellUserName(user: ShellUser | null, fallback: string) {
  const displayName = user?.display_name?.trim();
  const fullName = `${user?.first_name ?? ""} ${user?.surname ?? ""}`.trim();
  const emailName = user?.email?.split("@")[0]?.trim();

  return displayName || fullName || emailName || fallback;
}

function getShellUserInitials(user: ShellUser | null) {
  const display = user?.display_name?.trim()?.[0] ?? "";
  const first = user?.first_name?.trim()?.[0] ?? "";
  const last = user?.surname?.trim()?.[0] ?? "";
  const initials = display || `${first}${last}`.trim();

  if (initials) return initials.toUpperCase();

  return user?.email?.[0]?.toUpperCase() ?? "U";
}

function getShellAvatarSrc(user: ShellUser | null) {
  const url = user?.avatar_url;

  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/backend")) return url;
  if (url.startsWith("/uploads")) return `/api/backend${url}`;

  return url;
}

function notifyUserUpdated(user: ShellUser) {
  if (typeof window === "undefined") return;

  const displayName = getShellUserName(user, user.email);

  try {
    window.localStorage.setItem("mm_display_name", displayName);
    window.localStorage.setItem("mm_avatar_url", user.avatar_url ?? "");
  } catch {
    // localStorage can fail in restricted browser modes.
  }

  // This event keeps AppShell, the sidebar account card, the profile modal,
  // and the Settings page using the same latest user details.
  window.dispatchEvent(
    new CustomEvent<ShellUser>("mm:user-updated", {
      detail: user,
    })
  );

  // Also refresh components that already listen to your app storage event.
  window.dispatchEvent(new Event("mm:storage"));
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const tAny = useCallback(
    (keys: string[], fallback: string) => {
      for (const key of keys) {
        const value = t(key);
        if (value !== key) return value;
      }

      return fallback;
    },
    [t]
  );

  const nav: NavItem[] = useMemo(
    () => [
      {
        href: "/",
        label: tt("shell.nav.home", "Home"),
        icon: <Home className="h-5 w-5" />,
      },
      {
        href: "/dashboard",
        label: tt("shell.nav.dashboard", "Dashboard"),
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        href: "/learning_workspace",
        label: tt("shell.nav.learning", "Learning"),
        icon: <BookOpen className="h-5 w-5" />,
      },
      {
        href: "/chatbots",
        label: tt("shell.nav.chatbots", "Chatbots"),
        icon: <Bot className="h-5 w-5" />,
      },
      {
        href: "/favourites",
        label: tt("shell.nav.favourites", "Favourites"),
        icon: <Star className="h-5 w-5" />,
      },
      {
        href: "/progress",
        label: tt("shell.nav.progress", "Progress"),
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        href: "/settings",
        label: tt("shell.nav.settings", "Settings"),
        icon: <SettingsIcon className="h-5 w-5" />,
      },
    ],
    [tt]
  );

  const [speechOff, setSpeechOff] = useLSBool("mm_speech_off", true);
  const [dark, setDark] = useLSBool("mm_dark", true);
  const [highContrast] = useLSBool("mm_high_contrast", false);
  const [reduceMotion] = useLSBool("mm_reduce_motion", false);
  const [textSize] = useLSString<TextSize>(
    "mm_text_size",
    "normal",
    TEXT_SIZE_VALUES
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useLSBool(
    "mm_sidebar_collapsed",
    false
  );
  const [sidebarOpen, setSidebarOpen] = useLSBool(
    "mm_sidebar_open_tmp",
    false
  );

  const [currentUser, setCurrentUser] = useState<ShellUser | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<
    string | null
  >(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [topSettingsOpen, setTopSettingsOpen] = useState(false);

  const topSettingsRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const closeMobile = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/backend/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = (await res.json()) as ShellUser;

      setCurrentUser(data);
      setDisplayNameDraft(data.display_name ?? "");
    } catch {
      // If the session is missing/expired, protected pages can handle this elsewhere.
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleUserUpdated(event: Event) {
      const updatedUser = (event as CustomEvent<ShellUser>).detail;

      if (!updatedUser) {
        loadCurrentUser();
        return;
      }

      setCurrentUser(updatedUser);
      setDisplayNameDraft(updatedUser.display_name ?? "");
    }

    window.addEventListener("mm:user-updated", handleUserUpdated);

    return () => {
      window.removeEventListener("mm:user-updated", handleUserUpdated);
    };
  }, [loadCurrentUser]);

  useEffect(() => {
    if (!pendingAvatarPreview) return;

    return () => {
      URL.revokeObjectURL(pendingAvatarPreview);
    };
  }, [pendingAvatarPreview]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!accountMenuRef.current) return;

      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const sizeMap = {
      normal: "16px",
      large: "18px",
      "extra-large": "20px",
    } as const;

    document.documentElement.style.fontSize = sizeMap[textSize];
  }, [textSize]);

  useEffect(() => {
    document.documentElement.style.filter = highContrast ? "contrast(1.1)" : "";
  }, [highContrast]);

  useEffect(() => {
    const styleId = "mm-reduce-motion-style";
    const existing = document.getElementById(styleId);

    if (!reduceMotion) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.001ms !important;
      }
    `;

    document.head.appendChild(style);
  }, [reduceMotion]);

  useEffect(() => {
    if (speechOff) {
      window.speechSynthesis?.cancel();
      return;
    }

    function handleSpeechClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest("button, a, input, textarea, select");
      if (interactive) return;

      const text = target.innerText?.trim();
      if (!text) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;

      window.speechSynthesis.speak(utterance);
    }

    document.addEventListener("click", handleSpeechClick);

    return () => {
      document.removeEventListener("click", handleSpeechClick);
      window.speechSynthesis?.cancel();
    };
  }, [speechOff]);

  useEffect(() => {
    if (!topSettingsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!topSettingsRef.current) return;

      if (!topSettingsRef.current.contains(event.target as Node)) {
        setTopSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [topSettingsOpen]);

  const isActive = useCallback(
    (href: string) =>
      pathname === href || (href !== "/" && pathname.startsWith(href + "/")),
    [pathname]
  );

  const onNavClick = useCallback(() => {
    closeMobile();
    setAccountMenuOpen(false);
  }, [closeMobile]);

  const handleSidebarSignOut = useCallback(async () => {
    try {
      await fetch("/api/backend/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/";
    }
  }, []);

  const handleSwitchAccount = useCallback(async () => {
    try {
      await fetch("/api/backend/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/auth/signin";
    }
  }, []);

  const handleAvatarSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setPendingAvatarFile(file);
      setPendingAvatarPreview(URL.createObjectURL(file));

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    },
    []
  );

  const closeProfileModal = useCallback(() => {
    setProfileModalOpen(false);
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setDisplayNameDraft(currentUser?.display_name ?? "");
  }, [currentUser]);

  const handleSaveProfile = useCallback(async () => {
    setIsSavingProfile(true);

    try {
      let updatedUser: ShellUser | null = null;

      const profileRes = await fetch("/api/backend/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayNameDraft.trim() || null,
        }),
      });

      if (!profileRes.ok) return;

      updatedUser = (await profileRes.json()) as ShellUser;

      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append("avatar", pendingAvatarFile);

        const avatarRes = await fetch("/api/backend/auth/avatar", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!avatarRes.ok) return;

        updatedUser = (await avatarRes.json()) as ShellUser;
      }

      setCurrentUser(updatedUser);
      setDisplayNameDraft(updatedUser.display_name ?? "");
      notifyUserUpdated(updatedUser);
      setPendingAvatarFile(null);
      setPendingAvatarPreview(null);
      setProfileModalOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  }, [displayNameDraft, pendingAvatarFile]);

  const buttonBase =
    "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-sm transition " +
    "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 " +
    "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800";

  const sideBase =
    "border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

  const contentMaxWidth = pathname.startsWith("/chatbot_InteractionPage")
    ? "w-full"
    : pathname.startsWith("/chatbots")
      ? "w-full"
      : "max-w-5xl";

  const accountLabel = tAny(["account.accountLabel", "shell.account"], "Account");
  const profileLabel = tAny(["account.profile", "shell.profile"], "Profile");
  const switchAccountLabel = tAny(
    ["account.switchAccount", "shell.switchAccount"],
    "Switch account"
  );
  const signOutLabel = tAny(["account.signOut", "shell.signOut"], "Sign out");
  const savingLabel = tAny(["common.saving", "shell.saving"], "Saving...");

  const sidebarAvatarSrc = getShellAvatarSrc(currentUser);
  const modalAvatarSrc = pendingAvatarPreview || getShellAvatarSrc(currentUser);
  const shellUserName = getShellUserName(currentUser, accountLabel);

  function renderAccountBlock() {
    return (
      <div
        ref={accountMenuRef}
        className="relative shrink-0 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <button
          type="button"
          onClick={() => setAccountMenuOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label={tAny(
            ["account.openAccountMenu", "publicNav.openAccountMenu"],
            "Open account menu"
          )}
          aria-expanded={accountMenuOpen}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {sidebarAvatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sidebarAvatarSrc}
                alt={tt("account.profileModal.avatar", "Profile avatar")}
                className="h-full w-full object-cover"
              />
            ) : currentUser ? (
              getShellUserInitials(currentUser)
            ) : (
              <UserCircle className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {shellUserName}
            </div>

            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {accountLabel}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

        {accountMenuOpen && (
          <div className="absolute bottom-20 left-3 right-3 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                setProfileModalOpen(true);
                setAccountMenuOpen(false);
                loadCurrentUser();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <UserCircle className="h-5 w-5" />
              {profileLabel}
            </button>

            <button
              type="button"
              onClick={handleSwitchAccount}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <UserCircle className="h-5 w-5" />
              {switchAccountLabel}
            </button>

            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

            <button
              type="button"
              onClick={handleSidebarSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-5 w-5" />
              {signOutLabel}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <aside
          className={clsx(
            "hidden h-full md:flex md:flex-col",
            sideBase,
            sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-64 shrink-0"
          )}
        >
          <div className="shrink-0 px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold text-blue-700 dark:text-blue-400">
                  {tt("shell.brand", "MediMind Lite")}
                </div>

                <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">
                  {tt("shell.tagline", "Learn health with confidence")}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                aria-label={tt("shell.collapseSidebar", "Collapse sidebar")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
            <div className="space-y-1">
              {nav.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                  >
                    <span
                      className={clsx(
                        active
                          ? "text-white"
                          : "text-slate-600 dark:text-slate-300"
                      )}
                    >
                      {item.icon}
                    </span>

                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {renderAccountBlock()}
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeMobile}
              aria-hidden="true"
            />

            <aside
              className={clsx(
                "absolute left-0 top-0 flex h-full w-72 flex-col",
                sideBase
              )}
            >
              <div className="shrink-0 px-6 py-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xl font-semibold text-blue-700 dark:text-blue-400">
                      {tt("shell.brand", "MediMind Lite")}
                    </div>

                    <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">
                      {tt("shell.tagline", "Learn health with confidence")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeMobile}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    aria-label={tt("shell.closeSidebar", "Close sidebar")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
                <div className="space-y-1">
                  {nav.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavClick}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                        )}
                      >
                        <span
                          className={clsx(
                            active
                              ? "text-white"
                              : "text-slate-600 dark:text-slate-300"
                          )}
                        >
                          {item.icon}
                        </span>

                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {renderAccountBlock()}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950 md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={clsx(buttonBase, "md:hidden")}
              >
                <Menu className="h-4 w-4" />
                {tt("shell.menu", "Menu")}
              </button>

              {sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className={clsx(buttonBase, "hidden md:inline-flex")}
                >
                  <Menu className="h-4 w-4" />
                  {tt("shell.menu", "Menu")}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSpeechOff((current) => !current)}
                className={buttonBase}
              >
                {speechOff ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}

                <span className="hidden sm:inline">
                  {speechOff
                    ? tt("shell.speechOff", "Speech off")
                    : tt("shell.speechOn", "Speech on")}
                </span>
              </button>

              <div ref={topSettingsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTopSettingsOpen((current) => !current)}
                  className={buttonBase}
                  aria-label={tAny(
                    ["shell.openSettingsMenu", "publicNav.openSettingsMenu"],
                    "Open settings menu"
                  )}
                  aria-expanded={topSettingsOpen}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {topSettingsOpen && (
                  <div className="absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setDark((current) => !current);
                        setTopSettingsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <span className="text-blue-600 dark:text-blue-300">
                        {dark ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Moon className="h-4 w-4" />
                        )}
                      </span>

                      <span>
                        {dark
                          ? tt("shell.lightMode", "Light mode")
                          : tt("shell.darkMode", "Dark mode")}
                      </span>
                    </button>

                    <div className="my-3 border-t border-slate-200 dark:border-slate-700" />

                    <div className="rounded-xl px-4 py-3">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                        {tt("shell.language", "Language")}
                      </div>

                      <LanguageSwitcher />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-4 md:px-8">
            <div className={clsx("mx-auto min-h-full", contentMaxWidth)}>
              {children}
            </div>
          </main>
        </div>
      </div>

      {profileModalOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {tt("account.profileModal.title", "Profile")}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {tt(
                    "account.profileModal.desc",
                    "Update your profile picture and display name."
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeProfileModal}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label={tt(
                  "account.profileModal.close",
                  "Close profile"
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-4xl font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {modalAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={modalAvatarSrc}
                      alt={tt("account.profileModal.avatar", "Profile avatar")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getShellUserInitials(currentUser)
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900 shadow-md transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
                  aria-label={tt(
                    "account.profileModal.uploadAvatar",
                    "Upload profile picture"
                  )}
                >
                  <Camera className="h-5 w-5" />
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarSelected}
                  className="hidden"
                />
              </div>

              <div className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">
                {shellUserName}
              </div>

              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {currentUser?.email ??
                  tt(
                    "account.profileModal.emailNotAvailable",
                    "Email not available"
                  )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {tt("account.profileModal.displayName", "Display name")}
                </div>

                <input
                  value={displayNameDraft}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  placeholder={tt(
                    "account.profileModal.displayName",
                    "Display name"
                  )}
                  className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingProfile
                  ? savingLabel
                  : tt("account.profileModal.saveProfile", "Save profile")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}