"use client";

/**
 * src/app/PrivacyTerms/page.tsx
 * Privacy Notice page.
 * Fixes dark-mode text contrast and uses Tailwind canonical important classes.
 */

import PublicNav from "../../components/PublicNav";
import Footer from "../../components/Footer";
import { useI18n } from "../../i18n/I18nProvider";

/* ----------------------------- Translation fallback helper ----------------------------- */

function safeText(value: string, key: string, fallback: string) {
  if (!value || value === key) return fallback;
  return value;
}

/* ----------------------------- Page component ----------------------------- */

export default function PrivacyTermsPage() {
  const { t } = useI18n();

  const title = safeText(t("privacy.title"), "privacy.title", "Privacy Notice");

  const sections = [
    {
      title: safeText(
        t("privacy.collectTitle"),
        "privacy.collectTitle",
        "Information we collect"
      ),
      body: safeText(
        t("privacy.collectBody"),
        "privacy.collectBody",
        "MediMind Lite may collect account details, learning content you choose to enter, and basic usage information needed to provide the service."
      ),
    },
    {
      title: safeText(
        t("privacy.whyTitle"),
        "privacy.whyTitle",
        "Why we use information"
      ),
      body: safeText(
        t("privacy.whyBody"),
        "privacy.whyBody",
        "We use information to provide educational learning features, keep your account working, improve the experience, and support safety and security."
      ),
    },
    {
      title: safeText(
        t("privacy.securityTitle"),
        "privacy.securityTitle",
        "Security"
      ),
      body: safeText(
        t("privacy.securityBody"),
        "privacy.securityBody",
        "We aim to protect your information using reasonable security measures. Avoid adding unnecessary sensitive information."
      ),
    },
    {
      title: safeText(
        t("privacy.rightsTitle"),
        "privacy.rightsTitle",
        "Your rights"
      ),
      body: safeText(
        t("privacy.rightsBody"),
        "privacy.rightsBody",
        "You may request help with your account information or ask questions about how your information is handled."
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900! transition-colors dark:bg-slate-950 dark:text-white!">
      {/* Shared navigation */}
      <PublicNav />

      {/* Privacy content card */}
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950! dark:text-white!">
            {title}
          </h1>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-slate-950! dark:text-white!">
                  {section.title}
                </h2>

                <p className="mt-2 leading-relaxed text-slate-600! dark:text-slate-200!">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mx-auto max-w-3xl px-6 pb-12">
        <Footer />
      </div>
    </main>
  );
}