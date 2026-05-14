"use client";

/**
 * src/app/ConditionOfUse/page.tsx
 * Conditions of Use page.
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

export default function ConditionOfUsePage() {
  const { t } = useI18n();

  const title = safeText(
    t("conditions.title"),
    "conditions.title",
    "Conditions of Use"
  );

  const sections = [
    {
      title: safeText(
        t("conditions.educationalTitle"),
        "conditions.educationalTitle",
        "Educational use only"
      ),
      body: safeText(
        t("conditions.educationalBody"),
        "conditions.educationalBody",
        "MediMind Lite is designed to support learning and understanding. It does not provide medical advice, diagnosis, or treatment."
      ),
    },
    {
      title: safeText(
        t("conditions.medicalAdviceTitle"),
        "conditions.medicalAdviceTitle",
        "Not a replacement for healthcare professionals"
      ),
      body: safeText(
        t("conditions.medicalAdviceBody"),
        "conditions.medicalAdviceBody",
        "Always speak with a qualified healthcare professional about symptoms, medication, treatment decisions, or personal health concerns."
      ),
    },
    {
      title: safeText(
        t("conditions.userResponsibilityTitle"),
        "conditions.userResponsibilityTitle",
        "Your responsibility"
      ),
      body: safeText(
        t("conditions.userResponsibilityBody"),
        "conditions.userResponsibilityBody",
        "You are responsible for the information you choose to enter and for using the platform safely and appropriately."
      ),
    },
    {
      title: safeText(
        t("conditions.accuracyTitle"),
        "conditions.accuracyTitle",
        "Accuracy of information"
      ),
      body: safeText(
        t("conditions.accuracyBody"),
        "conditions.accuracyBody",
        "AI-supported explanations may not always be complete or correct. Check important information with reliable sources or a healthcare professional."
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900! transition-colors dark:bg-slate-950 dark:text-white!">
      {/* Shared navigation */}
      <PublicNav />

      {/* Conditions content card */}
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