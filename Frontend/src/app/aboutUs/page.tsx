/* eslint-disable @next/next/no-img-element */

"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* About Us Page. Explains the purpose, values, educational focus, and academic context behind MediMind Lite. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import Footer from "../../components/Footer";
import { useI18n } from "../../i18n/I18nProvider";

/* -------------------------------------------------------------------------- */
/* Dynamic Component Loading */
/* Loads a component on the client when server rendering would create hydration or browser-only issues. */
/* -------------------------------------------------------------------------- */

const PublicNav = dynamic(() => import("../../components/PublicNav"), {
  ssr: false,
});


/* -------------------------------------------------------------------------- */
/* Icon Circle Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconCircle({ children }: { children: ReactNode }) {
  /* -------------------------------------------------------------------------- */
  /* Rendered Interface */
  /* Builds the visible layout using the state, handlers, and derived values prepared above. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon Heart Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-7-4.6-9.3-9A5.7 5.7 0 0 1 12 5.4 5.7 5.7 0 0 1 21.3 12c-2.3 4.4-9.3 9-9.3 9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon Shield Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 20 6v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon Book Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconBook() {
  /* -------------------------------------------------------------------------- */
  /* Rendered Interface */
  /* Builds the visible layout using the state, handlers, and derived values prepared above. */
  /* -------------------------------------------------------------------------- */

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19a2 2 0 0 0 2 2h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 2h14v18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon Mail Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon Phone Icon */
/* Renders a small reusable SVG or icon wrapper used to keep the page visuals consistent. */
/* -------------------------------------------------------------------------- */

function IconPhone() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}


const pageShell =
  "min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50";

const headingText = "text-slate-950 dark:text-white";
const mutedText = "text-slate-600 dark:text-slate-200";

const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700";

const outlineButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold !text-slate-900 shadow-sm transition-colors hover:bg-slate-50 hover:!text-slate-950 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-white/45 dark:bg-transparent dark:!text-white dark:hover:border-white/70 dark:hover:bg-white/10 dark:hover:!text-white dark:active:bg-white/15 dark:focus-visible:ring-white/60";
  
const cardBase =
  "rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900";


/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function AboutUsPage() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const { t } = useI18n();

  /* -------------------------------------------------------------------------- */
  /* Tt Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  /* -------------------------------------------------------------------------- */
  /* Values Derived Value */
  /* Prepares computed data from state or props so the rendered UI stays simple and efficient. */
  /* -------------------------------------------------------------------------- */

  const values = useMemo(
    () => [
      {
        icon: <IconBook />,
        title: tt("aboutPage.values.1.title", "Education first"),
        text: tt(
          "aboutPage.values.1.text",
          "MediMind Lite supports learning, revision, reflection, and understanding."
        ),
      },
      {
        icon: <IconShield />,
        title: tt("aboutPage.values.2.title", "Safety and trust"),
        text: tt(
          "aboutPage.values.2.text",
          "The app reminds users to speak with qualified professionals about personal health concerns."
        ),
      },
      {
        icon: <IconHeart />,
        title: tt("aboutPage.values.3.title", "Human-centred design"),
        text: tt(
          "aboutPage.values.3.text",
          "The interface is simple and supportive so users can focus on understanding."
        ),
      },
    ],
    [tt]
  );

  /* -------------------------------------------------------------------------- */
  /* Rendered Interface */
  /* Builds the visible layout using the state, handlers, and derived values prepared above. */
  /* -------------------------------------------------------------------------- */

  return (
    <main className={pageShell}>
      <PublicNav />

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mt-6 inline-flex rounded-full border border-sky-300 bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 dark:border-sky-300/60 dark:bg-sky-500 dark:text-white">
              {tt("aboutPage.hero.pill", "About MediMind Lite")}
            </p>

            <h1 className={`mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${headingText}`}>
              {tt(
                "aboutPage.hero.title",
                "Making health information easier to understand"
              )}
            </h1>

            <p className={`mt-5 text-lg leading-relaxed ${mutedText}`}>
              {tt(
                "aboutPage.hero.desc",
                "MediMind Lite is an educational health learning platform designed to help people simplify complex medical information, build confidence, and learn at their own pace."
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/features" className={primaryButton}>
                {tt("aboutPage.hero.primaryCta", "View Features")}
              </Link>

              <Link href="/auth/signup" className={outlineButton}>
                {tt("aboutPage.hero.secondaryCta", "Join Early Access")}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
            <img
              src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80"
              alt={tt("aboutPage.hero.imageAlt", "Healthcare learning and support")}
              className="h-80 w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
                {tt("aboutPage.mission.eyebrow", "Our mission")}
              </p>

              <h2 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
                {tt(
                  "aboutPage.mission.title",
                  "Helping people feel less overwhelmed by health information"
                )}
              </h2>

              <p className={`mt-5 leading-relaxed ${mutedText}`}>
                {tt(
                  "aboutPage.mission.desc1",
                  "Health information can be difficult to understand, especially when it includes unfamiliar terms, long documents, or confusing explanations. MediMind Lite turns complex content into clearer notes, summaries, quizzes, and reflections."
                )}
              </p>

              <p className={`mt-4 leading-relaxed ${mutedText}`}>
                {tt(
                  "aboutPage.mission.desc2",
                  "The goal is not to replace healthcare professionals. The goal is to help users prepare better questions, understand key ideas, and feel more confident when learning about health."
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-950">
              <IconCircle>
                <IconHeart />
              </IconCircle>

              <h3 className={`mt-5 text-xl font-semibold ${headingText}`}>
                {tt(
                  "aboutPage.mission.cardTitle",
                  "Built for clarity, confidence, and care."
                )}
              </h3>

              <p className={`mt-3 leading-relaxed ${mutedText}`}>
                {tt(
                  "aboutPage.mission.cardDesc",
                  "MediMind Lite supports patients, students, carers, and curious learners who want health information to feel less intimidating and more manageable."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
            {tt("aboutPage.values.eyebrow", "What guides the project")}
          </p>

          <h2 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
            {tt("aboutPage.values.title", "Designed with responsibility")}
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {values.map((item) => (
            <div key={item.title} className={`${cardBase} p-6`}>
              <IconCircle>{item.icon}</IconCircle>

              <h3 className={`mt-5 font-semibold ${headingText}`}>{item.title}</h3>

              <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
              {tt("aboutPage.academic.eyebrow", "Academic project note")}
            </p>

            <h2 className={`mt-3 text-2xl font-semibold tracking-tight ${headingText}`}>
              {tt(
                "aboutPage.academic.title",
                "Built as a digital health learning project"
              )}
            </h2>

            <p className={`mt-4 leading-relaxed ${mutedText}`}>
              {tt(
                "aboutPage.academic.desc1",
                "MediMind Lite was created as part of an academic digital project exploring how AI-supported learning tools can help people understand health information more clearly."
              )}
            </p>

            <p className={`mt-3 leading-relaxed ${mutedText}`}>
              {tt(
                "aboutPage.academic.desc2",
                "It is not a medical device and does not provide medical advice, diagnosis, or treatment."
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
              {tt("aboutPage.contact.eyebrow", "Contact us")}
            </p>

            <h2 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
              {tt("aboutPage.contact.title", "Get in touch with MediMind Lite")}
            </h2>

            <p className={`mt-5 leading-relaxed ${mutedText}`}>
              {tt(
                "aboutPage.contact.desc",
                "For questions about the project, early access, or feedback, you can contact the MediMind Lite team using the details below."
              )}
            </p>

            <div className="mt-6 space-y-4">
              <div className={`${cardBase} flex gap-4 p-5`}>
                <IconCircle>
                  <IconMail />
                </IconCircle>

                <div>
                  <h3 className={`font-semibold ${headingText}`}>
                    {tt("aboutPage.contact.email", "Email")}
                  </h3>
                  <p className={`mt-1 ${mutedText}`}>medimindlite@gmail.com</p>
                </div>
              </div>

              <div className={`${cardBase} flex gap-4 p-5`}>
                <IconCircle>
                  <IconPhone />
                </IconCircle>

                <div>
                  <h3 className={`font-semibold ${headingText}`}>
                    {tt("aboutPage.contact.phone", "Phone")}
                  </h3>
                  <p className={`mt-1 ${mutedText}`}>07-555-38509</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
            <img
              src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80"
              alt={tt("aboutPage.contact.imageAlt", "Contact and support")}
              className="h-80 w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-blue-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-950">
            <h2 className={`font-semibold ${headingText}`}>
              {tt("aboutPage.safety.title", "Important safety note")}
            </h2>

            <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>
              {tt(
                "aboutPage.safety.desc",
                "MediMind Lite is an educational tool. It does not provide medical advice, diagnosis, or treatment. Always speak to a qualified healthcare professional about personal health concerns, symptoms, medication, or treatment decisions."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-12 pt-10">
        <Footer />
      </div>
    </main>
  );
}