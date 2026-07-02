"use client";

/**
 * I am the shared top header used across public pages.
 * I reuse the exact "Fusion-like" layout:
 * - left disclaimer
 * - center brand + logo
 * - right search + sign-in icon + language dropdown
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import MediMindLogo from "../../MediMindLogo";

// keep tiny icons inline so I don't need extra packages.
function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  // Allow pages to decide if search should show (e.g. maybe hide it on Terms/Privacy).
  showSearch?: boolean;
};

export default function SiteHeader({ showSearch = true }: Props) {
  const { t, lang, setLang } = useI18n();

  // Keep search local to the header (it’s UI-only for now).
  const [search, setSearch] = useState("");

  // Toggle the language dropdown here.
  const [langOpen, setLangOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-[#fbfaf7]/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid grid-cols-3 items-center">
          {/* show small disclaimer text on the left */}
          <div className="flex items-start gap-2 text-sm text-gray-400">
            <span className="hidden sm:inline">{t("header.support")}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{t("header.disclaimer")}</span>
          </div>

          {/* keep the brand in the center */}
          <div className="flex justify-center">
            <Link href="/" className="inline-flex items-center gap-3 hover:opacity-90">
              <MediMindLogo size={52} />
              <span className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
                {t("brand.name")} Lite
              </span>

            </Link>
          </div>

          {/* keep actions on the right */}
          <div className="flex items-center justify-end gap-3">
            {/* optionally show the search bar */}
            {showSearch && (
              <div className="hidden md:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("header.searchPlaceholder")}
                  className="w-56 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                <span className="text-gray-500">
                  <IconSearch />
                </span>
              </div>
            )}

            {/* link the user icon to sign-in */}
            <Link
              href="/auth/signin"
              className="rounded-full border border-gray-200 bg-white p-2 shadow-sm hover:bg-gray-50 transition"
              aria-label={t("header.signInAria")}
            >
              <span className="text-gray-700">
                <IconUser />
              </span>
            </Link>

            {/* show the language dropdown here */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition"
                aria-label="Language"
              >
                <span className="font-medium">{lang.toUpperCase()}</span>
                <IconChevronDown />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {(
                    [
                      ["en", "English"],
                      ["es", "Español"],
                      ["fr", "Français"],
                    ] as const
                  ).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setLang(code);
                        setLangOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition"
                    >
                      <span className="font-medium">{code}</span>{" "}
                      <span className="text-gray-500">— {label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
