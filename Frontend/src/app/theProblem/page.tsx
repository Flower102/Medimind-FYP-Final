/* eslint-disable @next/next/no-img-element */

"use client";

// src/app/theProblem/page.tsx

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

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200">
      {children}
    </div>
  );
}

function IconWarning() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 2 21h20L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5M8 13h8M8 17h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21a5 5 0 0 0-10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M20 21a4 4 0 0 0-5-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  "rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-950";

/* ----------------------------- Main page component ----------------------------- */

export default function TheProblemPage() {
  const { t } = useI18n();

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const problems = useMemo(
    () => [
      {
        title: tt("problem.card.1.title", "Information Overload"),
        quote: tt(
          "problem.card.1.quote",
          "I searched my symptoms online and ended up more scared and confused than when I started."
        ),
        person: tt("problem.card.1.person", "Sarah, nursing student"),
        description: tt(
          "problem.card.1.desc",
          "The internet is full of medical content, but not all of it is reliable, personalised, or easy to understand. People often spend hours reading dense articles, conflicting advice, and clinical language that was never written for them."
        ),
        icon: <IconWarning />,
      },
      {
        title: tt("problem.card.2.title", "The Jargon Wall"),
        quote: tt(
          "problem.card.2.quote",
          "My discharge notes might as well have been written in another language."
        ),
        person: tt("problem.card.2.person", "James, patient managing type 2 diabetes"),
        description: tt(
          "problem.card.2.desc",
          "Medical terms can create a barrier between professionals and the people trying to understand their care. Words like myocardial infarction, idiopathic, or pharmacokinetics can feel intimidating without clear explanations."
        ),
        icon: <IconDocument />,
      },
      {
        title: tt("problem.card.3.title", "Low Confidence and Anxiety"),
        quote: tt(
          "problem.card.3.quote",
          "I nodded at everything the doctor said, but I had no idea what was happening."
        ),
        person: tt("problem.card.3.person", "Maya, first-year medical student"),
        description: tt(
          "problem.card.3.desc",
          "When people do not understand health information, they may avoid asking questions, disengage from learning, feel anxious, or leave appointments unsure about what to do next."
        ),
        icon: <IconUsers />,
      },
    ],
    [tt]
  );

  const consequenceItems = useMemo(
    () => [
      tt("problem.why.item.1", "Misunderstood advice"),
      tt("problem.why.item.2", "Lower confidence"),
      tt("problem.why.item.3", "More anxiety"),
      tt("problem.why.item.4", "Harder learning"),
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
              {tt("problem.hero.pill", "Understanding the crisis")}
            </p>

            <h1 className={`mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${headingText}`}>
              {tt("problem.hero.titleBefore", "The hidden crisis in")}{" "}
              <span className="text-blue-600 dark:text-blue-200">
                {tt("problem.hero.titleHighlight", "health literacy")}
              </span>
            </h1>

            <p className={`mt-5 text-lg leading-relaxed ${mutedText}`}>
              {tt(
                "problem.hero.desc",
                "Millions of people make important decisions about their health while feeling confused, overwhelmed, or unsure. MediMind Lite was created to make health information easier to understand."
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/features" className={primaryButton}>
                {tt("problem.hero.primaryCta", "Discover the Features")}
              </Link>

              <Link href="/aboutUs" className={outlineButton}>
                {tt("problem.hero.secondaryCta", "About MediMind Lite")}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
            <img
              src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80"
              alt={tt("problem.hero.imageAlt", "Healthcare consultation")}
              className="h-80 w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Challenge cards section */}
      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="text-center">
            <h2 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
              {tt("problem.challenges.title", "Real challenges people face")}
            </h2>

            <p className={`mx-auto mt-3 max-w-2xl ${mutedText}`}>
              {tt(
                "problem.challenges.subtitle",
                "These are common problems for patients, students, carers, and families trying to understand health information."
              )}
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {problems.map((problem) => (
              <article key={problem.title} className={`${cardBase} p-6`}>
                <div className="flex flex-col gap-5 md:flex-row">
                  <IconBox>{problem.icon}</IconBox>

                  <div>
                    <h3 className={`text-xl font-semibold ${headingText}`}>
                      {problem.title}
                    </h3>

                    <p className="mt-3 font-medium leading-relaxed text-blue-700 dark:text-blue-200">
                      “{problem.quote}”
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      — {problem.person}
                    </p>

                    <p className={`mt-4 text-sm leading-relaxed ${mutedText}`}>
                      {problem.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Consequences section */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
              {tt("problem.why.eyebrow", "Why it matters")}
            </p>

            <h2 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
              {tt(
                "problem.why.title",
                "Confusing health information can affect confidence and care"
              )}
            </h2>

            <p className={`mt-5 leading-relaxed ${mutedText}`}>
              {tt(
                "problem.why.desc",
                "When health information is too complex, people may leave appointments unsure, misunderstand instructions, or feel unable to ask questions."
              )}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {consequenceItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className={`font-semibold ${headingText}`}>{item}</div>

                  <p className={`mt-2 text-sm ${mutedText}`}>
                    {tt(
                      "problem.why.itemDesc",
                      "Clear explanations can help people feel more prepared and informed."
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
            <img
              src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80"
              alt={tt("problem.why.imageAlt", "Doctor supporting a patient")}
              className="h-96 w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Patient section */}
      <section className="bg-slate-50 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
              <img
                src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=80"
                alt={tt("problem.patient.imageAlt", "Patient reading health information")}
                className="h-80 w-full object-cover"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-200">
                {tt("problem.patient.eyebrow", "For patients")}
              </p>

              <h2 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
                {tt(
                  "problem.patient.title",
                  "Managing a long-term condition should not feel like a full-time job"
                )}
              </h2>

              <p className={`mt-5 leading-relaxed ${mutedText}`}>
                {tt(
                  "problem.patient.desc1",
                  "People living with long-term conditions often need to understand appointments, medication, letters, symptoms, and lifestyle advice. That can become overwhelming very quickly."
                )}
              </p>

              <p className={`mt-4 leading-relaxed ${mutedText}`}>
                {tt(
                  "problem.patient.desc2",
                  "MediMind Lite helps by turning difficult information into clear, structured learning that people can revisit at their own pace."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution CTA section */}
      <section className="mx-auto max-w-6xl px-6 py-14 text-center">
        <h2 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headingText}`}>
          {tt("problem.solution.title", "There is a better way")}
        </h2>

        <p className={`mx-auto mt-3 max-w-2xl ${mutedText}`}>
          {tt(
            "problem.solution.desc",
            "MediMind Lite does not replace professional medical advice. It supports learning by helping people understand, remember, and reflect on health information."
          )}
        </p>

        <div className="mt-7">
          <Link href="/features" className={primaryButton}>
            {tt("problem.solution.cta", "Discover the Features")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-10">
        <Footer />
      </div>
    </main>
  );
}