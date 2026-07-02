"use client";

/* -------------------------------------------------------------------------- */
/* Conditions Page Imports                                                     */
/* These imports provide the shared public navigation, footer, and translation */
/* helper used to render the legal information page.                           */
/* -------------------------------------------------------------------------- */

import PublicNav from "../../components/PublicNav";
import Footer from "../../components/Footer";
import { useI18n } from "../../i18n/I18nProvider";

/* -------------------------------------------------------------------------- */
/* Translation Fallback Helper                                                 */
/* This helper prevents missing translation keys from appearing on screen. It  */
/* returns a readable fallback whenever the translated value is unavailable.    */
/* -------------------------------------------------------------------------- */

function safeText(value: string, key: string, fallback: string) {
  if (!value || value === key) return fallback;
  return value;
}

/* -------------------------------------------------------------------------- */
/* Conditions of Use Page                                                      */
/* This page explains the rules and limitations of MediMind Lite in simple     */
/* language so users understand how the app should and should not be used.     */
/* -------------------------------------------------------------------------- */

export default function ConditionOfUsePage() {
  /* ------------------------------------------------------------------------ */
  /* Translation Setup                                                         */
  /* The page title uses the i18n system but falls back to English if the      */
  /* translation key is missing.                                               */
  /* ------------------------------------------------------------------------ */

  const { t } = useI18n();

  const title = safeText(
    t("conditions.title"),
    "conditions.title",
    "Conditions of Use"
  );

  /* ------------------------------------------------------------------------ */
  /* Conditions Content                                                        */
  /* Each object represents one visible legal section. Keeping the text in an  */
  /* array makes the page easier to update and render consistently.            */
  /* ------------------------------------------------------------------------ */

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
      {/* -------------------------------------------------------------------- */}
      {/* Shared Public Navigation                                              */}
      {/* The public navigation gives users access to the main public pages and */}
      {/* keeps the legal page consistent with the rest of the site.            */}
      {/* -------------------------------------------------------------------- */}

      <PublicNav />

      {/* -------------------------------------------------------------------- */}
      {/* Conditions Content Card                                               */}
      {/* This central card contains the page title and each conditions section  */}
      {/* in a readable layout with light and dark mode support.                */}
      {/* -------------------------------------------------------------------- */}

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950! dark:text-white!">
            {title}
          </h1>

          {/* ---------------------------------------------------------------- */}
          {/* Conditions Section List                                           */}
          {/* The array is rendered into repeated heading and paragraph blocks, */}
          {/* keeping all legal sections visually consistent.                   */}
          {/* ---------------------------------------------------------------- */}

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

      {/* -------------------------------------------------------------------- */}
      {/* Page Footer                                                           */}
      {/* The shared footer closes the public page and keeps contact/navigation */}
      {/* information consistent across the website.                            */}
      {/* -------------------------------------------------------------------- */}

      <div className="mx-auto max-w-3xl px-6 pb-12">
        <Footer />
      </div>
    </main>
  );
}
