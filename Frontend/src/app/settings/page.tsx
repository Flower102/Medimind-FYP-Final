// /src/app/settings/page.tsx
"use client";

/**
 * Settings page.
 *
 * This page lets the user:
 * - Update profile information
 * - Change password
 * - Change appearance/accessibility options
 * - Sign out
 *
 * API errors now use the shared apiFetch helper, so backend messages like:
 *   detail.message
 * show as plain English text.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accessibility,
  CheckCircle2,
  Eye,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  Shield,
  SunMoon,
  Type,
  UserCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useI18n } from "@/src/i18n/I18nProvider";
import { apiFetch, getApiErrorMessage } from "@/src/lib/apiFetch";

type CurrentUser = {
  id: number;
  email: string;
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type TextSize = "normal" | "large" | "extra-large";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

async function getCurrentUser() {
  return apiFetch<CurrentUser>("/auth/me", {
    method: "GET",
    cache: "no-store",
  });
}

async function updateProfile(payload: {
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
}) {
  return apiFetch<CurrentUser>("/auth/me", {
    method: "PATCH",
    json: payload,
  });
}

async function changePassword(payload: {
  current_password: string;
  new_password: string;
}) {
  return apiFetch<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    json: payload,
  });
}

async function signOut() {
  return apiFetch<{ ok: boolean }>("/auth/signout", {
    method: "POST",
  });
}

async function signOutAllDevices() {
  return apiFetch<{ ok: boolean }>("/auth/signout-all", {
    method: "POST",
  });
}

function validatePassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function getStoredBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;

  const value = window.localStorage.getItem(key);

  if (value === null) return fallback;

  return value === "1";
}

function setStoredBool(key: string, value: boolean) {
  window.localStorage.setItem(key, value ? "1" : "0");
  window.dispatchEvent(new Event("mm:storage"));
}

function getStoredTextSize(): TextSize {
  if (typeof window === "undefined") return "normal";

  const value = window.localStorage.getItem("mm_text_size");

  if (value === "large" || value === "extra-large") return value;

  return "normal";
}

function setStoredTextSize(value: TextSize) {
  window.localStorage.setItem("mm_text_size", value);
  window.dispatchEvent(new Event("mm:storage"));
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const [user, setUser] = useState<CurrentUser | null>(null);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [darkMode, setDarkMode] = useState(true);
  const [speechOff, setSpeechOff] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>("normal");

  const showSavedMessage = useCallback((message: string) => {
    setSavedMessage(message);

    window.setTimeout(() => {
      setSavedMessage("");
    }, 1800);
  }, []);

  const syncUserForm = useCallback((currentUser: CurrentUser) => {
    setFirstName(currentUser.first_name ?? "");
    setSurname(currentUser.surname ?? "");
    setDisplayName(currentUser.display_name ?? "");
  }, []);

  const loadUser = useCallback(async () => {
    setIsLoadingUser(true);
    setError("");

    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);
      syncUserForm(currentUser);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingUser(false);
    }
  }, [syncUserForm]);

  useEffect(() => {
    loadUser();

    setDarkMode(getStoredBool("mm_dark", true));
    setSpeechOff(getStoredBool("mm_speech_off", true));
    setHighContrast(getStoredBool("mm_high_contrast", false));
    setReduceMotion(getStoredBool("mm_reduce_motion", false));
    setTextSize(getStoredTextSize());
  }, [loadUser]);

  const handleSaveProfile = useCallback(async () => {
    setIsSavingProfile(true);
    setError("");

    try {
      const updatedUser = await updateProfile({
        first_name: firstName.trim() || null,
        surname: surname.trim() || null,
        display_name: displayName.trim() || null,
      });

      setUser(updatedUser);
      syncUserForm(updatedUser);

      showSavedMessage(tx("settings.status.profileUpdated", "Profile updated."));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSavingProfile(false);
    }
  }, [displayName, firstName, showSavedMessage, surname, syncUserForm, tx]);

  const handleChangePassword = useCallback(async () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(tx("settings.error.fillPasswordFields", "Fill in all password fields."));
      return;
    }

    if (!validatePassword(newPassword)) {
      setError(
        tx(
          "settings.error.weakPassword",
          "New password must be at least 8 characters and include uppercase, lowercase, one number, and one special character."
        )
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        tx(
          "settings.error.passwordMismatch",
          "New password and confirm password do not match."
        )
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showSavedMessage(
        tx(
          "settings.status.passwordChanged",
          "Password changed. Please sign in again."
        )
      );

      window.setTimeout(() => {
        router.push("/auth/signin");
      }, 1000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  }, [confirmPassword, currentPassword, newPassword, router, showSavedMessage, tx]);

  const handleToggleDarkMode = useCallback(() => {
    const next = !darkMode;

    setDarkMode(next);
    setStoredBool("mm_dark", next);

    showSavedMessage(tx("settings.status.appearanceUpdated", "Appearance updated."));
  }, [darkMode, showSavedMessage, tx]);

  const handleToggleSpeech = useCallback(() => {
    const next = !speechOff;

    setSpeechOff(next);
    setStoredBool("mm_speech_off", next);

    showSavedMessage(
      next
        ? tx("settings.status.speechOff", "Speech controls turned off.")
        : tx("settings.status.speechOn", "Speech controls turned on.")
    );
  }, [showSavedMessage, speechOff, tx]);

  const handleToggleHighContrast = useCallback(() => {
    const next = !highContrast;

    setHighContrast(next);
    setStoredBool("mm_high_contrast", next);

    showSavedMessage(
      tx("settings.status.highContrastUpdated", "High contrast preference updated.")
    );
  }, [highContrast, showSavedMessage, tx]);

  const handleToggleReduceMotion = useCallback(() => {
    const next = !reduceMotion;

    setReduceMotion(next);
    setStoredBool("mm_reduce_motion", next);

    showSavedMessage(tx("settings.status.motionUpdated", "Motion preference updated."));
  }, [reduceMotion, showSavedMessage, tx]);

  const handleTextSizeChange = useCallback(
    (value: TextSize) => {
      setTextSize(value);
      setStoredTextSize(value);

      showSavedMessage(tx("settings.status.textSizeUpdated", "Text size updated."));
    },
    [showSavedMessage, tx]
  );

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setError("");

    try {
      await signOut();
      router.push("/");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSigningOut(false);
    }
  }, [router]);

  const handleSignOutAllDevices = useCallback(async () => {
    setIsSigningOut(true);
    setError("");

    try {
      await signOutAllDevices();
      router.push("/");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSigningOut(false);
    }
  }, [router]);

  if (isLoadingUser) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tx("settings.loading", "Loading settings...")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="overflow-hidden rounded-3xl border border-blue-200 bg-linear-to-r from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {tx("settings.hero.pill", "Account settings")}
            </div>

            <h1 className="mt-4 text-3xl font-semibold">
              {tx("settings.hero.title", "Settings")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-blue-50">
              {tx(
                "settings.hero.desc",
                "Manage your profile, appearance, accessibility, privacy information, and security."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={loadUser}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            {tx("common.refresh", "Refresh")}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      )}

      {savedMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100">
          <CheckCircle2 className="h-4 w-4" />
          {savedMessage}
        </div>
      )}

      <Card>
        <SectionHeader
          icon={<UserCircle className="h-6 w-6" />}
          title={tx("settings.profile.title", "Profile")}
          description={tx("settings.profile.desc", "Edit your account profile information.")}
        />

        <div className="mx-auto mt-6 grid w-full max-w-2xl gap-4">
          <InputField
            label={tx("settings.profile.firstName", "First name")}
            value={firstName}
            onChange={setFirstName}
            placeholder={tx("settings.profile.firstNamePlaceholder", "First name")}
          />

          <InputField
            label={tx("settings.profile.surname", "Surname")}
            value={surname}
            onChange={setSurname}
            placeholder={tx("settings.profile.surnamePlaceholder", "Surname")}
          />

          <InputField
            label={tx("account.profileModal.displayName", "Display name")}
            value={displayName}
            onChange={setDisplayName}
            placeholder={tx("account.profileModal.displayName", "Display name")}
          />

          <ReadOnlyField
            label={tx("settings.profile.email", "Email")}
            value={user?.email ?? tx("settings.notAvailable", "Not available")}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSavingProfile
              ? tx("common.saving", "Saving...")
              : tx("settings.profile.save", "Save profile")}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<Shield className="h-6 w-6" />}
          title={tx("settings.password.title", "Change password")}
          description={tx("settings.password.desc", "Update your password securely.")}
        />

        <div className="mx-auto mt-6 grid w-full max-w-3xl gap-4">
          <PasswordField
            label={tx("settings.password.current", "Current password")}
            value={currentPassword}
            onChange={setCurrentPassword}
          />

          <PasswordField
            label={tx("settings.password.new", "New password")}
            value={newPassword}
            onChange={setNewPassword}
          />

          <PasswordField
            label={tx("settings.password.confirm", "Confirm password")}
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          <PasswordRules password={newPassword} />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            {tx("settings.password.save", "Save password")}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<SunMoon className="h-6 w-6" />}
          title={tx("settings.appearance.title", "Appearance")}
          description={tx(
            "settings.appearance.desc",
            "Adjust how MediMind looks on your device."
          )}
        />

        <div className="mt-6 space-y-4">
          <SettingToggle
            icon={<Monitor className="h-4 w-4" />}
            title={tx("settings.appearance.darkMode", "Dark mode")}
            description={tx(
              "settings.appearance.darkModeDesc",
              "Switch between dark and light appearance."
            )}
            checked={darkMode}
            onChange={handleToggleDarkMode}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
              <Type className="h-4 w-4 text-blue-600 dark:text-blue-300" />
              {tx("settings.appearance.textSize", "Text size")}
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tx(
                "settings.appearance.textSizeDesc",
                "Choose a comfortable reading size. This changes the app text size immediately."
              )}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["normal", "large", "extra-large"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleTextSizeChange(size)}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition",
                    textSize === size
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  {size === "normal"
                    ? tx("settings.textSize.normal", "Normal")
                    : size === "large"
                      ? tx("settings.textSize.large", "Large")
                      : tx("settings.textSize.extraLarge", "Extra large")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<Accessibility className="h-6 w-6" />}
          title={tx("settings.accessibility.title", "Accessibility")}
          description={tx(
            "settings.accessibility.desc",
            "Make the app easier to read and use."
          )}
        />

        <div className="mt-6 space-y-4">
          <SettingToggle
            icon={
              speechOff ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )
            }
            title={tx("settings.accessibility.speech", "Speech controls")}
            description={tx(
              "settings.accessibility.speechDesc",
              "When turned on, clicking normal page text will read it aloud."
            )}
            checked={!speechOff}
            onChange={handleToggleSpeech}
          />

          <SettingToggle
            icon={<Eye className="h-4 w-4" />}
            title={tx("settings.accessibility.highContrast", "High contrast")}
            description={tx(
              "settings.accessibility.highContrastDesc",
              "Increases page contrast slightly for readability."
            )}
            checked={highContrast}
            onChange={handleToggleHighContrast}
          />

          <SettingToggle
            icon={<Accessibility className="h-4 w-4" />}
            title={tx("settings.accessibility.reduceMotion", "Reduce motion")}
            description={tx(
              "settings.accessibility.reduceMotionDesc",
              "Reduces animations and transitions across the app."
            )}
            checked={reduceMotion}
            onChange={handleToggleReduceMotion}
          />
        </div>
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-950">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {tx("settings.privacy.title", "Privacy and educational use")}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {tx(
            "settings.privacy.desc1",
            "MediMind is for educational support only. It does not replace medical advice, diagnosis, or treatment. Always speak to a healthcare professional for medical decisions."
          )}
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {tx(
            "settings.privacy.desc2",
            "Your learning notes, quizzes, confidence ratings, favourites, and chat sessions are used to support your learning experience inside the app."
          )}
        </p>
      </Card>

      <Card>
        <SectionHeader
          icon={<Shield className="h-6 w-6" />}
          title={tx("settings.security.title", "Security")}
          description={tx(
            "settings.security.desc",
            "Sign out from this browser or all devices."
          )}
        />

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {tx("settings.security.signOut", "Sign out")}
          </button>

          <button
            type="button"
            onClick={handleSignOutAllDevices}
            disabled={isSigningOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            {tx("settings.security.signOutAll", "Sign out all devices")}
          </button>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {tx(
            "settings.security.signOutAllNote",
            "Sign out all devices revokes all refresh tokens for this account."
          )}
        </p>
      </Card>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
      />
    </label>
  );
}

function PasswordRules({ password }: { password: string }) {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const rules = [
    {
      label: tx("settings.password.rule.length", "At least 8 characters"),
      ok: password.length >= 8,
    },
    {
      label: tx("settings.password.rule.capital", "One capital letter"),
      ok: /[A-Z]/.test(password),
    },
    {
      label: tx("settings.password.rule.lowercase", "One lowercase letter"),
      ok: /[a-z]/.test(password),
    },
    {
      label: tx("settings.password.rule.number", "One number"),
      ok: /\d/.test(password),
    },
    {
      label: tx("settings.password.rule.special", "One special character"),
      ok: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
        {tx("settings.password.requirements", "Password requirements")}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={
              rule.ok
                ? "text-green-700 dark:text-green-300"
                : "text-slate-500 dark:text-slate-400"
            }
          >
            {rule.ok ? "✓" : "•"} {rule.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 wrap-break-word text-sm font-medium text-slate-900 dark:text-slate-50">
        {value}
      </div>
    </div>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 text-blue-600 dark:text-blue-300">{icon}</div>

        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}