
"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* Progress Page. Shows learning progress, quiz performance, confidence trends, goals, recent activity, and detail popups. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Heart,
  Loader2,
  RefreshCw,
  Star,
  Target,
  Trophy,
  X,
  Sparkles,
  ArrowRight,
  Lightbulb,
} from "lucide-react";

import {
  getProgressSummary,
  type ProgressSummary,
} from "@/src/lib/progressApi";

import { useI18n } from "@/src/i18n/I18nProvider";


/* -------------------------------------------------------------------------- */
/* Card Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Get Error Message Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
}

/* -------------------------------------------------------------------------- */
/* Format Percent Helper */
/* Formats values into readable text before they are shown in the interface. */
/* -------------------------------------------------------------------------- */

function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value || 0))}%`;
}

/* -------------------------------------------------------------------------- */
/* Format Confidence Helper */
/* Formats values into readable text before they are shown in the interface. */
/* -------------------------------------------------------------------------- */

function formatConfidence(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}/10`;
}

/* -------------------------------------------------------------------------- */
/* Get Score Message Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getScoreMessage(
  score: number,
  tx: (key: string, fallback: string) => string
) {
  if (score >= 80) {
    return tx(
      "progress.score.strong",
      "Strong result. Keep reviewing to maintain it."
    );
  }

  if (score >= 60) {
    return tx(
      "progress.score.good",
      "Good progress. A little more practice could push this higher."
    );
  }

  if (score >= 40) {
    return tx(
      "progress.score.some",
      "Some understanding is there, but this topic needs more revision."
    );
  }

  return tx(
    "progress.score.revisit",
    "This looks like a topic to revisit carefully."
  );
}


/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function ProgressPage() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  /* -------------------------------------------------------------------------- */
  /* State Values */
  /* Stores temporary page data such as form fields, loading flags, selected items, modal state, and feedback messages. */
  /* -------------------------------------------------------------------------- */

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [openModal, setOpenModal] = useState<
    "quizScores" | "confidence" | "goals" | null
  >(null);


  /* -------------------------------------------------------------------------- */
  /* Load Progress Handler */
  /* Loads the latest backend data and updates the page state used by the interface. */
  /* -------------------------------------------------------------------------- */

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getProgressSummary();
      setSummary(data);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* -------------------------------------------------------------------------- */
  /* Side Effects */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);


  /* -------------------------------------------------------------------------- */
  /* Conditional UI State */
  /* Shows a focused loading, error, empty, or success view before the main interface is displayed. */
  /* -------------------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tx("progress.loading", "Loading progress...")}
        </div>
      </div>
    );
  }


  /* -------------------------------------------------------------------------- */
  /* Conditional UI State */
  /* Shows a focused loading, error, empty, or success view before the main interface is displayed. */
  /* -------------------------------------------------------------------------- */

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-lg font-semibold text-red-600">
            {tx("progress.error.title", "Could not load progress")}
          </div>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error ||
              tx("progress.error.noData", "Progress data was not available.")}
          </p>

          <button
            type="button"
            onClick={loadProgress}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            {tx("common.tryAgain", "Try again")}
          </button>
        </Card>
      </div>
    );
  }


  const hasQuizScores = summary.quizScorePoints.length > 0;
  const hasConfidencePoints = summary.confidencePoints.length > 0;
  const hasRecentQuizzes = summary.recentQuizzes.length > 0;

  const latestQuiz = summary.recentQuizzes[0];
  const latestScore = latestQuiz?.scorePercent ?? null;

  const bestQuizScore =
    summary.recentQuizzes.length > 0
      ? Math.max(...summary.recentQuizzes.map((quiz) => quiz.scorePercent ?? 0))
      : 0;

  const quizCompletionRate =
    summary.totalQuizzes > 0
      ? Math.round((summary.completedQuizzes / summary.totalQuizzes) * 100)
      : 0;

  const totalFavourites = summary.favouriteNotes + summary.favouriteChats;

  const nextStepHref = summary.reminderNote?.id
    ? `/learning_workspace?noteId=${encodeURIComponent(summary.reminderNote.id)}`
    : "/learning_workspace";

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /* Progress Page Shell */
  /* Organises the progress hero, summary cards, charts, goals, recent quizzes, and modals. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-8 pb-10">
      {/*
        Progress Hero Header
        Introduces the progress page and gives the user a refresh control.
      */}
      <div className="overflow-hidden rounded-3xl border border-blue-200 bg-linear-to-r from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {tx("progress.hero.pill", "Learning progress")}
            </div>

            <h1 className="mt-4 text-3xl font-semibold">
              {tx("progress.hero.title", "Your Learning Progress")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
              {tx(
                "progress.hero.desc",
                "Track your notes, quizzes, confidence, favourites, and learning improvement over time."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={loadProgress}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            {tx("common.refresh", "Refresh")}
          </button>
        </div>
      </div>

      {/*
        Progress Summary Cards
        Displays the main counts and averages that summarise the user’s learning activity.
      */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label={tx("progress.stats.totalNotes", "Total notes")}
          value={summary.totalNotes}
          helper={tx("progress.stats.savedNotes", "Saved learning notes")}
        />

        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={tx("progress.stats.completedQuizzes", "Completed quizzes")}
          value={summary.completedQuizzes}
          helper={`${summary.totalQuizzes} ${tx(
            "progress.stats.quizAttemptsCreated",
            "quiz attempts created"
          )}`}
        />

        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label={tx("progress.stats.averageQuizScore", "Average quiz score")}
          value={formatPercent(summary.averageQuizScore)}
          helper={tx(
            "progress.stats.acrossCompletedQuizzes",
            "Across completed quizzes"
          )}
        />

        <StatCard
          icon={<Brain className="h-5 w-5" />}
          label={tx("progress.stats.averageConfidence", "Average confidence")}
          value={formatConfidence(summary.averageConfidence)}
          helper={tx("progress.stats.fromSavedNotes", "From saved notes")}
        />
      </div>

      <Card className="bg-slate-50 p-7 dark:bg-slate-950">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Sparkles className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {tx("progress.motivation.title", "Motivation")}
            </h2>

            <div className="mt-6 max-w-4xl space-y-8">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  {tx("progress.motivation.speechTitle", "Motivational message")}
                </div>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {summary.motivationMessage}
                </p>
              </div>

              <div className="w-full max-w-3xl rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Lightbulb className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-50">
                      {tx(
                        "progress.insight.suggestedNextStep",
                        "Suggested next step"
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {summary.suggestedNextStep}
                    </p>
                  </div>
                </div>

                <Link
                  href={nextStepHref}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {tx("progress.continueLearning", "Continue learning")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/*
        Recent Quiz History Card
        Lists recent completed quizzes so the user can review results and learning patterns.
      */}
      {/*
        Learning Goals Card
        Shows progress toward goals so the user can see what to focus on next.
      */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Heart className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {tx("progress.insight.title", "Learning insight")}
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {summary.insight}
            </p>
          </div>
        </div>
      </Card>

      {/*
        Progress Charts Grid
        Places quiz score progress and confidence progress next to each other.
      */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressPreviewCard
          title={tx("progress.quizScores.title", "Quiz scores over time")}
          description={tx(
            "progress.quizScores.desc",
            "See how your quiz performance is changing."
          )}
          icon={<BarChart3 className="h-5 w-5" />}
          onOpen={() => setOpenModal("quizScores")}
        >
          {hasQuizScores ? (
            <SimpleBarChart
              points={summary.quizScorePoints}
              maxValue={100}
              suffix="%"
            />
          ) : (
            <EmptyState
              message={tx(
                "progress.quizScores.empty",
                "Complete a quiz to see score progress here."
              )}
            />
          )}
        </ProgressPreviewCard>

        <ProgressPreviewCard
          title={tx("progress.confidence.title", "Confidence over time")}
          description={tx(
            "progress.confidence.desc",
            "See how your confidence ratings have changed."
          )}
          icon={<Brain className="h-5 w-5" />}
          onOpen={() => setOpenModal("confidence")}
        >
          {hasConfidencePoints ? (
            <SimpleLineChart points={summary.confidencePoints} maxValue={10} />
          ) : (
            <EmptyState
              message={tx(
                "progress.confidence.empty",
                "Save notes with confidence ratings to see this chart."
              )}
            />
          )}
        </ProgressPreviewCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/*
          Recent Quizzes Card
          Lists recent quiz attempts and links to review pages.
        */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {tx("progress.goals.title", "Learning goals")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {tx(
                    "progress.goals.desc",
                    "Your progress towards simple learning targets."
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpenModal("goals")}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {tx("common.viewDetails", "View details")}
            </button>
          </div>

          <div className="mt-6">
            <LearningGoalsList goals={summary.learningGoals} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Star className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {tx("progress.snapshot.title", "Learning snapshot")}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {tx(
                  "progress.snapshot.desc",
                  "A useful summary of your current learning activity."
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InsightMiniCard
              label={tx("progress.snapshot.latestQuizScore", "Latest quiz score")}
              value={
                latestScore === null
                  ? tx("progress.snapshot.noQuizYet", "No quiz yet")
                  : `${latestScore}%`
              }
              description={
                latestScore === null
                  ? tx(
                      "progress.snapshot.completeQuiz",
                      "Complete a quiz to start tracking this."
                    )
                  : getScoreMessage(latestScore, tx)
              }
            />

            <InsightMiniCard
              label={tx("progress.snapshot.bestQuizScore", "Best quiz score")}
              value={`${bestQuizScore}%`}
              description={tx(
                "progress.snapshot.bestQuizScoreDesc",
                "Your highest score from recent completed quizzes."
              )}
            />

            <InsightMiniCard
              label={tx("progress.snapshot.quizCompletion", "Quiz completion")}
              value={`${quizCompletionRate}%`}
              description={tx(
                "progress.snapshot.quizCompletionDesc",
                "How many created quizzes have been completed."
              )}
            />

            <InsightMiniCard
              label={tx("progress.snapshot.savedFavourites", "Saved favourites")}
              value={totalFavourites}
              description={tx(
                "progress.snapshot.savedFavouritesDesc",
                "Notes and chats you marked as useful."
              )}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {tx("progress.recentQuizzes.title", "Recent quizzes")}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {tx(
              "progress.recentQuizzes.desc",
              "Open a completed quiz to review the answers and explanations."
            )}
          </p>
        </div>

        <div className="mt-6">
          {hasRecentQuizzes ? (
            <div className="space-y-3">
              {summary.recentQuizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/quiz/${quiz.id}?from=progress`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-50">
                      {quiz.title}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {quiz.correctCount ?? 0}/{quiz.questionCount}{" "}
                      {tx("progress.recentQuizzes.correct", "correct")}
                    </div>
                  </div>

                  <div className="text-2xl font-semibold text-blue-600">
                    {quiz.scorePercent ?? 0}%
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              message={tx(
                "progress.recentQuizzes.empty",
                "Your completed quizzes will appear here."
              )}
            />
          )}
        </div>
      </Card>

      {/*
        Quiz Scores Detail Modal
        Explains quiz score progress in more detail when the user opens the popup.
      */}
      {openModal === "quizScores" && (
        <ProgressDetailModal
          title={tx("progress.quizScores.modalTitle", "Quiz scores over time")}
          description={tx(
            "progress.quizScores.modalDesc",
            "A detailed view of your recent quiz performance."
          )}
          onClose={() => setOpenModal(null)}
        >
          <div className="space-y-6">
            {hasQuizScores ? (
              <>
                <SimpleBarChart
                  points={summary.quizScorePoints}
                  maxValue={100}
                  suffix="%"
                />

                <QuizScoresTable
                  quizzes={summary.recentQuizzes}
                  tx={tx}
                />
              </>
            ) : (
              <EmptyState
                message={tx(
                  "progress.quizScores.empty",
                  "Complete a quiz to see score progress here."
                )}
              />
            )}
          </div>
        </ProgressDetailModal>
      )}

      {/*
        Confidence Detail Modal
        Explains confidence progress and what the rating means for learning.
      */}
      {openModal === "confidence" && (
        <ProgressDetailModal
          title={tx("progress.confidence.modalTitle", "Confidence over time")}
          description={tx(
            "progress.confidence.modalDesc",
            "A detailed view of how your confidence changed through saved notes."
          )}
          onClose={() => setOpenModal(null)}
        >
          <div className="space-y-6">
            {hasConfidencePoints ? (
              <>
                <SimpleLineChart
                  points={summary.confidencePoints}
                  maxValue={10}
                />

                <ConfidenceTable
                  points={summary.confidencePoints}
                  tx={tx}
                />
              </>
            ) : (
              <EmptyState
                message={tx(
                  "progress.confidence.detailEmpty",
                  "Save notes with confidence ratings to see this detail."
                )}
              />
            )}
          </div>
        </ProgressDetailModal>
      )}

      {/*
        Goals Detail Modal
        Explains the learning goals and how each one is calculated.
      */}
      {openModal === "goals" && (
        <ProgressDetailModal
          title={tx("progress.goals.modalTitle", "Learning goals")}
          description={tx(
            "progress.goals.modalDesc",
            "A detailed view of your current learning targets."
          )}
          onClose={() => setOpenModal(null)}
        >
          <LearningGoalsList goals={summary.learningGoals} large />
        </ProgressDetailModal>
      )}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Stat Card Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper: string;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <Card>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
        {icon}
      </div>

      <div className="mt-5 text-3xl font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </div>

      <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </div>

      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </Card>
  );
}


/* -------------------------------------------------------------------------- */
/* Progress Preview Card Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function ProgressPreviewCard({
  title,
  description,
  icon,
  children,
  onOpen,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  onOpen: () => void;
}) {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            {icon}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {tx("common.viewDetails", "View details")}
        </button>
      </div>

      <div className="mt-6">{children}</div>
    </Card>
  );
}


/* -------------------------------------------------------------------------- */
/* Insight Mini Card Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function InsightMiniCard({
  label,
  value,
  description,
}: {
  label: string;
  value: ReactNode;
  description: string;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-sm font-medium text-slate-500">{label}</div>

      <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Empty State Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
      {message}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Learning Goals List Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function LearningGoalsList({
  goals,
  large = false,
}: {
  goals: { title: string; current: number; target: number }[];
  large?: boolean;
}) {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  return (
    <div className="space-y-5">
      {goals.map((goal) => {
        const percent =
          goal.target > 0
            ? Math.min(100, Math.round((goal.current / goal.target) * 100))
            : 0;

        return (
          <div
            key={goal.title}
            className={
              large
                ? "rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950"
                : ""
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  {tx("progress.goals.target", "Target")}: {goal.title}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {tx("progress.goals.currentProgress", "Current progress")}:{" "}
                  {goal.current} {tx("progress.goals.outOf", "out of")}{" "}
                  {goal.target}
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-500">
                {percent}%
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${percent}%` }}
              />
            </div>

            {large && (
              <p className="mt-3 text-sm text-slate-500">
                {percent >= 100
                  ? tx(
                      "progress.goals.completed",
                      "Goal completed. You can keep going or set a higher target later."
                    )
                  : tx(
                      "progress.goals.inProgress",
                      "Keep going. This goal is still in progress."
                    )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Progress Detail Modal Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function ProgressDetailModal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-105px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Simple Bar Chart Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function SimpleBarChart({
  points,
  maxValue,
  suffix = "",
}: {
  points: { label: string; value: number }[];
  maxValue: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
      <div className="mb-4 flex justify-between text-xs text-slate-400">
        <span>0{suffix}</span>
        <span>
          {Math.round(maxValue / 2)}
          {suffix}
        </span>
        <span>
          {maxValue}
          {suffix}
        </span>
      </div>

      <div className="flex h-64 items-end gap-3">
        {points.map((point, index) => {
          const height = Math.max(
            8,
            Math.min(100, (point.value / maxValue) * 100)
          );

          return (
            <div
              key={`${point.label}-${index}`}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                {point.value}
                {suffix}
              </div>

              <div className="flex h-44 w-full items-end rounded-xl bg-slate-100 dark:bg-slate-800">
                <div
                  title={`${point.label}: ${point.value}${suffix}`}
                  className="w-full rounded-t-xl bg-blue-600 transition-all group-hover:bg-blue-700"
                  style={{ height: `${height}%` }}
                />
              </div>

              <div className="line-clamp-1 text-xs text-slate-500">
                {point.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Simple Line Chart Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function SimpleLineChart({
  points,
  maxValue,
}: {
  points: { label: string; value: number }[];
  maxValue: number;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
      <div className="space-y-3">
        {points.map((point, index) => {
          const width = Math.max(
            4,
            Math.min(100, (point.value / maxValue) * 100)
          );

          return (
            <div key={`${point.label}-${index}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>{point.label}</span>
                <span>{point.value}/10</span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Quiz Scores Table Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function QuizScoresTable({
  quizzes,
  tx,
}: {
  quizzes: ProgressSummary["recentQuizzes"];
  tx: (key: string, fallback: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <tr>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.quiz", "Quiz")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.score", "Score")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.correct", "Correct")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.meaning", "What this means")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.review", "Review")}
            </th>
          </tr>
        </thead>

        <tbody>
          {quizzes.map((quiz) => {
            const score = quiz.scorePercent ?? 0;
            const correct = quiz.correctCount ?? 0;

            return (
              <tr
                key={quiz.id}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    {quiz.title}
                  </div>
                </td>

                <td className="px-4 py-3 font-semibold text-blue-600">
                  {score}%
                </td>

                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {correct}/{quiz.questionCount}
                </td>

                <td className="px-4 py-3 text-slate-500">
                  {getScoreMessage(score, tx)}
                </td>

                <td className="px-4 py-3">
                  <Link
                    href={`/quiz/${quiz.id}?from=progress`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {tx("common.open", "Open")}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confidence Table Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function ConfidenceTable({
  points,
  tx,
}: {
  points: { label: string; value: number }[];
  tx: (key: string, fallback: string) => string;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <tr>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.date", "Date")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.confidence", "Confidence")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {tx("progress.table.meaningShort", "Meaning")}
            </th>
          </tr>
        </thead>

        <tbody>
          {points.map((point, index) => (
            <tr
              key={`${point.label}-${index}`}
              className="border-t border-slate-200 dark:border-slate-800"
            >
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                {point.label}
              </td>

              <td className="px-4 py-3 font-semibold text-blue-600">
                {point.value}/10
              </td>

              <td className="px-4 py-3 text-slate-500">
                {point.value >= 8
                  ? tx(
                      "progress.confidence.high",
                      "High confidence. This topic seems familiar."
                    )
                  : point.value >= 5
                    ? tx(
                        "progress.confidence.moderate",
                        "Moderate confidence. Some review may help."
                      )
                    : tx(
                        "progress.confidence.low",
                        "Low confidence. This may be worth revisiting."
                      )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
