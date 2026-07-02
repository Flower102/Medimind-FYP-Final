"use client";

/* -------------------------------------------------------------------------- */
/* Language Switcher Imports                                                   */
/* These imports provide local state, translation context, and the list of      */
/* supported languages displayed in the dropdown.                              */
/* -------------------------------------------------------------------------- */

import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { LANGUAGES } from "../i18n/translations";

/* -------------------------------------------------------------------------- */
/* Language Switcher Component                                                 */
/* This component lets the user choose the active language for the interface.   */
/* It reads and updates the language through the shared i18n provider.          */
/* -------------------------------------------------------------------------- */

export default function LanguageSwitcher() {
  /* ------------------------------------------------------------------------ */
  /* Component State                                                           */
  /* The language comes from global i18n state, while the open flag controls   */
  /* whether the dropdown menu is visible.                                     */
  /* ------------------------------------------------------------------------ */

  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  const currentLang = lang || "en";

  return (
    <div className="relative">
      {/* -------------------------------------------------------------------- */}
      {/* Dropdown Trigger                                                      */}
      {/* This button shows the current language code and opens or closes the   */}
      {/* language list when the user clicks it.                               */}
      {/* -------------------------------------------------------------------- */}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
        aria-label="Change language"
      >
        {currentLang.toUpperCase()} <span aria-hidden>▾</span>
      </button>

      {/* -------------------------------------------------------------------- */}
      {/* Language Options Menu                                                 */}
      {/* When open, this menu lists every supported language and updates the   */}
      {/* globl language setting when the user selects one.           */}
      {/* -------------------------------------------------------------------- */}

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ zIndex: 9999 }}
        >
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => {
                setLang(language.code);
                setOpen(false);
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span className="font-bold">{language.code.toUpperCase()}</span>{" "}
              <span className="text-slate-500 dark:text-slate-300">
                — {language.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
