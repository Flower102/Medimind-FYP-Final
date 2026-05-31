// src/app/page.tsx
// Landing page with hydration-safe PublicNav loading.
// Fixes:
// 1. PublicNav hydration mismatch by loading it client-side only.
// 2. "Explore features" and "View features" buttons stay white on hover.
// 3. Feature buttons use transparent background with a soft white hover glow.

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import Footer from "../components/Footer";
import { useI18n } from "../i18n/I18nProvider";

const PublicNav = dynamic(() => import("../components/PublicNav"), {
  ssr: false,
});

/* ----------------------------- Icon components ----------------------------- */

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
      {children}
    </div>
  );
}

function BulletIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
      {children}
    </div>
  );
}

function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3v2a3 3 0 0 0 2 3v1a3 3 0 0 0 3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3v2a3 3 0 0 1-2 3v1a3 3 0 0 1-3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 8h1m-1 4h1m4-4h1m-1 4h1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19a2 2 0 0 0 2 2h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 2h14v18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M8 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
      <path
        d="M19 14l.7 2.6L22 17l-2.3.4L19 20l-.7-2.6L16 17l2.3-.4L19 14Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 21a5 5 0 0 0-10 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 21a4 4 0 0 0-5-3.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 11a3 3 0 1 0-2.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-7-4.6-9.3-9A5.7 5.7 0 0 1 12 5.4 5.7 5.7 0 0 1 21.3 12c-2.3 4.4-9.3 9-9.3 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2 20 6v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ----------------------------- FAQ content ----------------------------- */

const FAQ_ITEMS = [
  {
    qKey: "faq.1.q",
    qFallback: "What is MediMind Lite?",
    aKey: "faq.1.a",
    aFallback:
      "MediMind Lite helps you learn and remember health information using summaries, quizzes, and reflections.",
  },
  {
    qKey: "faq.2.q",
    qFallback: "Is this medical advice?",
    aKey: "faq.2.a",
    aFallback:
      "No. It is educational support only and not a replacement for professional medical advice.",
  },
  {
    qKey: "faq.3.q",
    qFallback: "How does email verification work?",
    aKey: "faq.3.a",
    aFallback:
      "After sign up, you verify your email with a 6-digit code before signing in.",
  },
  {
    qKey: "faq.4.q",
    qFallback: "Can I use it on mobile and laptop?",
    aKey: "faq.4.a",
    aFallback: "Yes — you can access the same account from different devices.",
  },
  {
    qKey: "faq.5.q",
    qFallback: "How is my data handled?",
    aKey: "faq.5.a",
    aFallback:
      "Your information should be treated carefully and protected. Avoid sharing sensitive details unnecessarily.",
  },
];

/* ----------------------------- Shared styles ----------------------------- */

const pageShell =
  "min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50";

const headingText = "text-slate-950 dark:text-white";
const mutedText = "text-slate-600 dark:text-slate-200";

const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700";

const featuresGhostButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold !text-slate-900 shadow-sm transition-colors hover:bg-slate-50 hover:!text-slate-950 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-white/45 dark:bg-transparent dark:!text-white dark:hover:border-white/70 dark:hover:bg-white/10 dark:hover:!text-white dark:active:bg-white/15 dark:focus-visible:ring-white/60";
const cardBase =
  "rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900";

/* ----------------------------- Main page component ----------------------------- */

export default function LandingPage() {
  const { t } = useI18n();
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const heroImg =
    "https://images.unsplash.com/photo-1770215624975-12e0db0b83ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

  const everyoneImg =
    "https://images.unsplash.com/photo-1702648159122-1cf410e0a3c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const featureCards = useMemo(
    () => [
      {
        title: tt("landing.features.ai.title", "AI summaries"),
        desc: tt(
          "landing.features.ai.desc",
          "Turn complex medical notes into clear, easy-to-understand summaries tailored to your needs."
        ),
        icon: <IconBrain />,
      },
      {
        title: tt("landing.features.quiz.title", "Interactive quizzes"),
        desc: tt(
          "landing.features.quiz.desc",
          "Test your knowledge with gentle quizzes that help you remember important health information."
        ),
        icon: <IconSparkle />,
      },
      {
        title: tt("landing.features.reflect.title", "Personal reflections"),
        desc: tt(
          "landing.features.reflect.desc",
          "Write down your thoughts and track your confidence as you learn at your own pace."
        ),
        icon: <IconBook />,
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
            <h1
              className={`text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${headingText}`}
            >
              {tt(
                "landing.hero.title",
                "Understand your health information with confidence"
              )}
            </h1>

            <p className={`mt-5 text-lg leading-relaxed ${mutedText}`}>
              {tt(
                "landing.hero.subtitle",
                "MediMind helps you learn and remember important health information through AI summaries, interactive quizzes, and personal reflections — designed for everyone."
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/signup" className={primaryButton}>
                {tt("landing.hero.getStarted", "Get started")}
              </Link>

              <Link href="/features" className={featuresGhostButton}>
                {tt("landing.hero.features", "Explore features")}
              </Link>
            </div>
          </div>

          <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700 sm:h-80 lg:h-80">
            <Image
              src={heroImg}
              alt={tt("landing.hero.imageAlt", "Healthcare learning")}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
              priority
            />
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-14">
          <h2
            className={`text-center text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}
          >
            {tt("landing.how.title", "How MediMind supports your learning")}
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <div key={card.title} className={`${cardBase} p-6`}>
                <FeatureIcon>{card.icon}</FeatureIcon>

                <h3 className={`mt-5 text-lg font-semibold ${headingText}`}>
                  {card.title}
                </h3>

                <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Designed for everyone */}
      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700 sm:h-80 lg:h-80">
              <Image
                src={everyoneImg}
                alt={tt("landing.everyone.imageAlt", "Designed for everyone")}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
              />
            </div>

            <div>
              <h2
                className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}
              >
                {tt("landing.everyone.title", "Designed for everyone")}
              </h2>

              <div className="mt-6 space-y-5">
                {[
                  {
                    icon: <IconUsers />,
                    title: tt("landing.everyone.allAges.title", "All ages welcome"),
                    desc: tt(
                      "landing.everyone.allAges.desc",
                      "Whether you are young or elderly, MediMind adapts to your learning needs."
                    ),
                  },
                  {
                    icon: <IconHeart />,
                    title: tt(
                      "landing.everyone.cognitive.title",
                      "Cognitive support"
                    ),
                    desc: tt(
                      "landing.everyone.cognitive.desc",
                      "Simple design with clear buttons and reduced visual clutter for easier understanding."
                    ),
                  },
                  {
                    icon: <IconBook />,
                    title: tt(
                      "landing.everyone.carers.title",
                      "Carers and families"
                    ),
                    desc: tt(
                      "landing.everyone.carers.desc",
                      "Help loved ones understand their health with shared learning tools."
                    ),
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <BulletIcon>{item.icon}</BulletIcon>

                    <div>
                      <div className={`font-semibold ${headingText}`}>
                        {item.title}
                      </div>
                      <div className={`mt-1 text-sm ${mutedText}`}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety card */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-950">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <IconShield />
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${headingText}`}>
                  {tt("landing.trust.title", "Safe, secure, and trustworthy")}
                </h3>

                <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>
                  {tt(
                    "landing.trust.desc",
                    "Your health information is private and protected. MediMind is designed for educational purposes to help you understand and remember health information. It is not a replacement for professional medical advice, diagnosis, or treatment."
                  )}
                </p>

                <p className={`mt-3 text-sm ${mutedText}`}>
                  {tt(
                    "landing.trust.note",
                    "Always consult with your healthcare provider about your health concerns and treatment options."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2
          className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}
        >
          {tt("faq.title", "Frequently asked questions")}
        </h2>

        <p className={`mt-2 max-w-2xl ${mutedText}`}>
          {tt("faq.subtitle", "Quick answers to help you get started.")}
        </p>

        <div className="mt-8 space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const open = faqOpen === index;
            const question = tt(item.qKey, item.qFallback);
            const answer = tt(item.aKey, item.aFallback);

            return (
              <div
                key={item.qKey}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors dark:border-slate-700 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpen(open ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className={`font-semibold ${headingText}`}>
                    {question}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    <IconChevronDown open={open} />
                  </span>
                </button>

                {open && (
                  <div className={`px-6 pb-6 leading-relaxed ${mutedText}`}>
                    {answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2
            className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}
          >
            {tt("landing.cta.title", "Start learning with confidence today")}
          </h2>

          <p className={`mt-3 ${mutedText}`}>
            {tt(
              "landing.cta.subtitle",
              "Join MediMind and take control of your health education journey."
            )}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/signup" className={primaryButton}>
              {tt("landing.cta.button", "Get started free")}
            </Link>

            <Link href="/features" className={featuresGhostButton}>
              View features
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