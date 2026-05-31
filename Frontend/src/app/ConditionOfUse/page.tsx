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
      title: "Educational use only",
      body: "MediMind Lite is designed to support learning and understanding. It does not provide medical advice, diagnosis or treatment, and it is not a medical device.",
    },
    {
      title: "Not a replacement for healthcare professionals",
      body: "Always speak with a qualified healthcare professional about symptoms, medication, treatment decisions or any personal health concern. Never delay or ignore professional medical advice because of something you have read or generated here. In an emergency, contact your local emergency services.",
    },
    {
      title: "How the AI features work",
      body: "Some features, such as summaries and the learning chatbot, use a third-party artificial intelligence service (OpenAI) to generate responses. When you use these features, the text you submit is sent to that provider so a reply can be produced. AI-generated content is intended to support learning only and may be incomplete or incorrect.",
    },
    {
      title: "Accuracy of information",
      body: "AI-supported explanations may not always be complete or accurate. Always check important information against reliable sources, or with a healthcare professional, before acting on it.",
    },
    {
      title: "Your account and security",
      body: "You are responsible for keeping your account details and password secure, and for any activity that takes place under your account. Please choose a strong password and do not share your login details.",
    },
    {
      title: "Your responsibility",
      body: "You are responsible for the information you choose to enter and for using the platform safely and appropriately. Please avoid entering information that identifies other people, and do not use the service for anything unlawful or harmful.",
    },
    {
      title: "Availability and changes",
      body: "MediMind Lite is an academic project and is provided \u201Cas is\u201D, without guarantees of availability, accuracy or fitness for a particular purpose. Features and these conditions may change as the project develops.",
    },
    {
      title: "Contact",
      body: "If you have any questions about these conditions, contact us at medimindlite@gmail.com.",
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