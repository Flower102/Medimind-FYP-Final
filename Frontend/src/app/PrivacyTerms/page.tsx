"use client";

/* -------------------------------------------------------------------------- */
/* Privacy Notice Imports                                                      */
/* These imports provide shared public layout pieces and access to translated  */
/* text used by the privacy notice page.                                       */
/* -------------------------------------------------------------------------- */

import PublicNav from "../../components/PublicNav";
import Footer from "../../components/Footer";
import { useI18n } from "../../i18n/I18nProvider";

/* -------------------------------------------------------------------------- */
/* Translation Fallback Helper                                                 */
/* This helper keeps the page readable even when a translation key has not been */
/* added yet by returning a safe English fallback.                             */
/* -------------------------------------------------------------------------- */

function safeText(value: string, key: string, fallback: string) {
  if (!value || value === key) return fallback;
  return value;
}

/* -------------------------------------------------------------------------- */
/* Privacy Notice Page                                                         */
/* This page explains what information MediMind Lite collects, why it is used, */
/* and what choices the user has about their data.                             */
/* -------------------------------------------------------------------------- */

export default function PrivacyTermsPage() {
  /* ------------------------------------------------------------------------ */
  /* Translation Setup                                                         */
  /* The title is pulled from the i18n provider and falls back to English when */
  /* the translation is missing.                                               */
  /* ------------------------------------------------------------------------ */

  const { t } = useI18n();

  const title = safeText(t("privacy.title"), "privacy.title", "Privacy Notice");

  /* ------------------------------------------------------------------------ */
  /* Privacy Content                                                           */
  /* Each item represents one visible privacy section. Some sections use a     */
  /* paragraph, while others use a list for easier reading.                    */
  /* ------------------------------------------------------------------------ */

  const sections = [
    {
      title: "Who we are",
      body: "MediMind Lite is an educational web application created as part of an academic project. It is provided for learning and demonstration purposes.",
    },
    {
      title: "What we collect",
      list: [
        "Account details you provide, such as your name and email address.",
        "Learning content you choose to create, such as notes, reflections, confidence ratings, quiz results and chat history.",
        "Basic technical information needed to keep you signed in and to operate the service securely.",
      ],
    },
    {
      title: "Why we collect it",
      body: "We use this information to provide the service, support sign-in and authentication, save your history, display your dashboard and support your learning experience. Because some of the content you choose to enter may relate to your health, we treat it as sensitive. The basis for processing this content is your consent, which you give when you choose to create an account and save content.",
    },
    {
      title: "How AI features use your information",
      body: "When you request a summary or use the learning chatbot, the text you submit is sent to a third-party AI provider (OpenAI) so a response can be generated. We send only the content needed for that feature \u2014 such as your note and its reflection \u2014 and only when you actively request it. Because this content leaves our system, please avoid entering details that directly identify you or other people. The provider processes this text under its own terms, which you should review if you have any concerns.",
    },
    {
      title: "Health-related information",
      body: "You decide what to enter. The service does not require a medical record, and we recommend entering only what you are comfortable storing for learning purposes.",
    },
    {
      title: "Security",
      body: "Your password is stored as a secure hash, never in plain text. Access to your saved information is restricted to your signed-in account, and information is transmitted over a secure (HTTPS) connection.",
    },
    {
      title: "How long we keep your information",
      body: "We keep your account and learning content while your account is active. If you delete your account, your account and the content stored with it are removed.",
    },
    {
      title: "Your rights",
      body: "You can access the information held about you, correct your profile details, delete your notes, favourites and chat history, and delete your account and its associated data at any time from the Settings page. You can also withdraw consent by deleting your content or your account. If you need help, contact medimindlite@gmail.com.",
    },
    {
      title: "Cookies and local storage",
      body: "MediMind Lite uses only the cookies or local storage needed to keep you signed in and to remember your accessibility preferences (such as text size and theme). It does not use advertising or tracking cookies.",
    },
    {
      title: "Contact",
      body: "For any questions about this notice or your data, contact medimindlite@gmail.com.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900! transition-colors dark:bg-slate-950 dark:text-white!">
      {/* -------------------------------------------------------------------- */}
      {/* Shared Public Navigation                                              */}
      {/* The shared navigation gives the privacy page the same public site     */}
      {/* structure as the landing, features, and conditions pages.             */}
      {/* -------------------------------------------------------------------- */}

      <PublicNav />

      {/* -------------------------------------------------------------------- */}
      {/* Privacy Content Card                                                  */}
      {/* This card holds the privacy notice content in a focused reading area  */}
      {/* with styling for both light and dark mode.                            */}
      {/* -------------------------------------------------------------------- */}

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950! dark:text-white!">
            {title}
          </h1>

          {/* ---------------------------------------------------------------- */}
          {/* Privacy Section List                                              */}
          {/* Each privacy section is rendered from the data array. Paragraphs  */}
          {/* and bullet lists are supported so the content stays readable.     */}
          {/* ---------------------------------------------------------------- */}

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-slate-950! dark:text-white!">
                  {section.title}
                </h2>

                {section.body && (
                  <p className="mt-2 leading-relaxed text-slate-600! dark:text-slate-200!">
                    {section.body}
                  </p>
                )}

                {section.list && (
                  <ul className="mt-2 list-disc space-y-2 pl-6 leading-relaxed text-slate-600! dark:text-slate-200!">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* Page Footer                                                           */}
      {/* The footer provides consistent public-page ending content and keeps   */}
      {/* the page aligned with the rest of the MediMind site.                  */}
      {/* -------------------------------------------------------------------- */}

      <div className="mx-auto max-w-3xl px-6 pb-12">
        <Footer />
      </div>
    </main>
  );
}
