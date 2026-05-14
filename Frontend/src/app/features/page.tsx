/* eslint-disable @next/next/no-img-element */

"use client";

// src/app/features/page.tsx

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import Footer from "../../components/Footer";
import { useI18n } from "../../i18n/I18nProvider";

const PublicNav = dynamic(() => import("../../components/PublicNav"), {
  ssr: false,
});

/* ----------------------------- Icon components ----------------------------- */

function IconCheck() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
      ✓
    </span>
  );
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200">
      {children}
    </div>
  );
}

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19a2 2 0 0 0 2 2h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 2h14v18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.4-4.2A8 8 0 1 1 21 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16v-5M12 16V8M16 16v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l1.2 4.4L18 8l-4.8 1.6L12 14l-1.2-4.4L6 8l4.8-1.6L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M19 14l.7 2.6L22 17l-2.3.4L19 20l-.7-2.6L16 17l2.3-.4L19 14Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconQuiz() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 8h8M8 12h5M8 16h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ----------------------------- Shared styles ----------------------------- */

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

/* ----------------------------- Main page component ----------------------------- */

export default function FeaturesPage() {
  const { t } = useI18n();

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const features = useMemo(
    () => [
      {
        title: tt("features.card.1.title", "Health Notes"),
        eyebrow: tt("features.card.1.eyebrow", "Organise complex information"),
        description: tt(
          "features.card.1.desc",
          "Transform complex medical documents, discharge letters, or study materials into clean, structured notes automatically."
        ),
        bullets: [
          tt("features.card.1.bullet.1", "Auto-organised by topic and condition"),
          tt("features.card.1.bullet.2", "Highlights key medical terms with simple definitions"),
          tt("features.card.1.bullet.3", "Syncs across devices when you log in"),
        ],
        icon: <IconBook />,
      },
      {
        title: tt("features.card.2.title", "Personal Health Reflections"),
        eyebrow: tt("features.card.2.eyebrow", "Journal with purpose"),
        description: tt(
          "features.card.2.desc",
          "Write about your symptoms, concerns, moods, and progress. MediMind Lite uses prompts to help you explain what matters before appointments."
        ),
        bullets: [
          tt("features.card.2.bullet.1", "Guided reflection prompts by condition"),
          tt("features.card.2.bullet.2", "Mood-aware journaling support"),
          tt("features.card.2.bullet.3", "Build a personal health timeline"),
        ],
        icon: <IconMessage />,
      },
      {
        title: tt("features.card.3.title", "Confidence Tracking"),
        eyebrow: tt("features.card.3.eyebrow", "See your progress"),
        description: tt(
          "features.card.3.desc",
          "Know which topics you understand well and which areas need more attention, so you can build confidence gradually."
        ),
        bullets: [
          tt("features.card.3.bullet.1", "Confidence dashboard by topic"),
          tt("features.card.3.bullet.2", "Weekly progress reports"),
          tt("features.card.3.bullet.3", "Update your confidence ratings anytime"),
        ],
        icon: <IconChart />,
      },
      {
        title: tt("features.card.4.title", "AI-Powered Summaries"),
        eyebrow: tt("features.card.4.eyebrow", "Plain-English explanations"),
        description: tt(
          "features.card.4.desc",
          "Paste a medical article, report, textbook chapter, or health page and receive a clearer explanation matched to your level."
        ),
        bullets: [
          tt("features.card.4.bullet.1", "Simplifies clinical language"),
          tt("features.card.4.bullet.2", "Adjustable reading level"),
          tt("features.card.4.bullet.3", "Designed for patients, students, and carers"),
        ],
        icon: <IconSparkle />,
      },
      {
        title: tt("features.card.5.title", "Auto-Generated Quizzes"),
        eyebrow: tt("features.card.5.eyebrow", "Remember what you learn"),
        description: tt(
          "features.card.5.desc",
          "Turn your health notes into quizzes in seconds. Spaced repetition helps you review at the right time."
        ),
        bullets: [
          tt("features.card.5.bullet.1", "Quizzes generated from your notes"),
          tt("features.card.5.bullet.2", "Spaced repetition for long-term learning"),
          tt("features.card.5.bullet.3", "Progress reports to track improvement"),
        ],
        icon: <IconQuiz />,
      },
    ],
    [tt]
  );

  const steps = useMemo(
    () => [
      {
        number: "1",
        title: tt("features.how.step.1.title", "Add your content"),
        text: tt("features.how.step.1.text", "Paste notes, medical letters, articles, or study material."),
      },
      {
        number: "2",
        title: tt("features.how.step.2.title", "Learn at your level"),
        text: tt("features.how.step.2.text", "MediMind Lite explains the content clearly and highlights key terms."),
      },
      {
        number: "3",
        title: tt("features.how.step.3.title", "Review and build confidence"),
        text: tt("features.how.step.3.text", "Use quizzes, reflections, and confidence tracking to keep improving."),
      },
    ],
    [tt]
  );

  const feedback = useMemo(
    () => [
      {
        quote: tt(
          "features.feedback.1.quote",
          "MediMind Lite turned my clinical notes into something I actually understood."
        ),
        name: tt("features.feedback.1.name", "Amara"),
        role: tt("features.feedback.1.role", "Nursing student"),
      },
      {
        quote: tt(
          "features.feedback.2.quote",
          "The summaries helped me feel more prepared before speaking to my consultant."
        ),
        name: tt("features.feedback.2.name", "David"),
        role: tt("features.feedback.2.role", "Patient managing a long-term condition"),
      },
      {
        quote: tt(
          "features.feedback.3.quote",
          "It could help patients engage with educational material more confidently."
        ),
        name: tt("features.feedback.3.name", "Dr Priya S."),
        role: tt("features.feedback.3.role", "GP and healthcare educator"),
      },
    ],
    [tt]
  );

  return (
    <main className={pageShell}>
      <PublicNav />

      {/* Hero section */}
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mt-6 inline-flex rounded-full border border-sky-300 bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 dark:border-sky-300/60 dark:bg-sky-500 dark:text-white">
              {tt("features.hero.pill", "Powerful features")}
            </p>

            <h1 className={`mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${headingText}`}>
              {tt(
                "features.hero.title",
                "Learn health smarter with tools that make information clearer"
              )}
            </h1>

            <p className={`mt-5 text-lg leading-relaxed ${mutedText}`}>
              {tt(
                "features.hero.desc",
                "MediMind Lite helps users understand health information through notes, summaries, reflections, quizzes, and confidence tracking."
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/signup" className={primaryButton}>
                {tt("features.hero.primaryCta", "Get Early Access")}
              </Link>

              <Link href="/theProblem" className={outlineButton}>
                {tt("features.hero.secondaryCta", "Explore The Problem")}
              </Link>
            </div>
          </div>

          <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80"
              alt={tt("features.hero.imageAlt", "Person using digital health technology")}
              className="h-80 w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Intro section */}
      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <h2 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
            {tt("features.intro.title", "Not just features — practical learning support")}
          </h2>

          <p className={`mx-auto mt-3 max-w-2xl ${mutedText}`}>
            {tt(
              "features.intro.subtitle",
              "Every feature is designed to help people feel less overwhelmed and more confident when learning about health."
            )}
          </p>
        </div>
      </section>

      {/* Main features grid */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`${cardBase} p-6 transition hover:-translate-y-1 hover:shadow-md`}
            >
              <IconCircle>{feature.icon}</IconCircle>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
                {feature.eyebrow}
              </p>

              <h3 className={`mt-2 text-xl font-semibold ${headingText}`}>
                {feature.title}
              </h3>

              <p className={`mt-3 text-sm leading-relaxed ${mutedText}`}>
                {feature.description}
              </p>

              <div className="mt-5 space-y-3">
                {feature.bullets.map((bullet) => (
                  <div key={bullet} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <IconCheck />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* How it works section */}
      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
              <img
                src="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80"
                alt={tt("features.how.imageAlt", "Healthcare professional explaining information")}
                className="h-80 w-full object-cover"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
                {tt("features.how.eyebrow", "How it works")}
              </p>

              <h2 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
                {tt(
                  "features.how.title",
                  "From confusing information to clearer understanding"
                )}
              </h2>

              <div className="mt-6 space-y-5">
                {steps.map((step) => (
                  <div key={step.number} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {step.number}
                    </div>

                    <div>
                      <h3 className={`font-semibold ${headingText}`}>{step.title}</h3>
                      <p className={`mt-1 text-sm ${mutedText}`}>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example feedback section */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center">
          <h2 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
            {tt("features.feedback.title", "Example early user feedback")}
          </h2>

          <p className={`mt-2 ${mutedText}`}>
            {tt(
              "features.feedback.subtitle",
              "These example comments show the type of impact MediMind Lite is designed to support."
            )}
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {feedback.map((item) => (
            <div key={item.name} className={`${cardBase} p-6`}>
              <div className="text-yellow-400">★★★★★</div>

              <p className={`mt-4 text-sm leading-relaxed ${mutedText}`}>
                “{item.quote}”
              </p>

              <p className={`mt-5 font-semibold ${headingText}`}>{item.name}</p>

              <p className="text-sm text-slate-500 dark:text-slate-300">{item.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl bg-blue-600 px-6 py-10 text-center shadow-lg sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {tt("features.cta.title", "Ready to experience these features?")}
          </h2>

          <p className="mt-3 text-white">
            {tt(
              "features.cta.desc",
              "Join early access and start learning health information with more confidence."
            )}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              {tt("features.cta.primary", "Join Early Access")}
            </Link>

            <Link
              href="/aboutUs"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 px-7 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              {tt("features.cta.secondary", "Why Choose MediMind?")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-10">
        <Footer />
      </div>
    </main>
  );
}