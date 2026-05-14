"use client";

/*
  Dashboard page

  This version keeps the dashboard cleaner:
  - Main stat cards appear first
  - The top-right bell contains gentle reminders
  - Learning insight and motivation are combined into one main card
  - Motivation is the main message
  - Learning insight is shown as a smaller section inside that same card
*/

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FileText,
  BookCheck,
  TrendingUp,
  Plus,
  Sparkles,
  Star,
  MessageCircle,
  Loader2,
  Bell,
  Heart,
  ArrowRight,
  X,
  Lightbulb,
  Brain,
} from "lucide-react";

import {
  getProgressSummary,
  type ProgressSummary,
} from "@/src/lib/progressApi";

import { useI18n } from "@/src/i18n/I18nProvider";

type ReminderItem = {
  id: string;
  title: string;
  shortText: string;
  detailText: string;
  actionText: string;
  href: string;
  icon: ReactNode;
};

/* --------------------------------
   Main Dashboard page
-------------------------------- */

export default function DashboardPage() {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const [data, setData] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(
    null
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getProgressSummary();
      setData(result);
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : tx("dashboard.error", "Could not load dashboard.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [tx]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const reminderItems = useMemo(() => {
    if (!data) return [];
    return buildDashboardReminders(data, tx);
  }, [data, tx]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tx("dashboard.loading", "Loading dashboard...")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const totalFavouriteItems = data.favouriteNotes + data.favouriteChats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {tx("dashboard.welcome", "Welcome back!")}
          </h1>

          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {tx("dashboard.subtitle", "Continue your health learning journey")}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label={tx("dashboard.notifications", "Notifications")}
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5" />

            {reminderItems.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                {reminderItems.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 z-30 mt-3 w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-50">
                    {tx("dashboard.reminders.title", "Gentle reminders")}
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {tx(
                      "dashboard.reminders.desc",
                      "Small review prompts based on your saved notes, quizzes, confidence, and favourites."
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  aria-label={tx("common.close", "Close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3">
                {reminderItems.length === 0 ? (
                  <div className="rounded-xl p-4 text-sm text-slate-500 dark:text-slate-400">
                    {tx(
                      "dashboard.reminders.empty",
                      "No reminders right now. Keep learning and your reminders will appear here."
                    )}
                  </div>
                ) : (
                  reminderItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedReminder(item)}
                      className="w-full rounded-xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                          {item.icon}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {item.title}
                          </div>

                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.shortText}
                          </p>

                          <div className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-300">
                            {tx("dashboard.reminders.viewDetails", "View details")}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main dashboard stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          title={tx("dashboard.notesCreated", "Notes Created")}
          value={String(data.totalNotes)}
          subtitle={tx("dashboard.notesCreatedSubtitle", "Health information saved")}
          icon={<FileText className="h-7 w-7" />}
        />

        <StatCard
          title={tx("dashboard.quizzesCompleted", "Quizzes Completed")}
          value={String(data.completedQuizzes)}
          subtitle={tx("dashboard.quizzesCompletedSubtitle", "Testing your knowledge")}
          icon={<BookCheck className="h-7 w-7" />}
          tint="emerald"
        />

        <StatCard
          title={tx("dashboard.averageScore", "Average Score")}
          value={`${data.averageQuizScore}%`}
          subtitle={tx("dashboard.averageScoreSubtitle", "Quiz performance")}
          icon={<TrendingUp className="h-7 w-7" />}
        />

        <StatCard
          title={tx("dashboard.aiChats", "AI Chats")}
          value={String(data.totalChatSessions)}
          subtitle={tx("dashboard.aiChatsSubtitle", "Learning conversations")}
          icon={<MessageCircle className="h-7 w-7" />}
        />
      </div>

      {/* Combined motivation and learning insight card */}
      <MotivationInsightCard
        motivationTitle={tx("dashboard.motivation", "Motivation")}
        motivationText={data.motivationMessage}
        insightTitle={tx("dashboard.learningInsight", "Learning insight")}
        insightText={data.insight}
      />

      {/* Main action cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <ActionCard
          title={tx("dashboard.addNewNote", "Add New Note")}
          desc={tx(
            "dashboard.addNewNoteDesc",
            "Write or paste health information you want to learn about."
          )}
          buttonText={tx("dashboard.createNote", "Create Note")}
          href="/learning_workspace"
          icon={<Plus className="h-7 w-7" />}
        />

        <ActionCard
          title={tx("dashboard.generateSummary", "Generate Summary")}
          desc={tx(
            "dashboard.generateSummaryDesc",
            "Turn complex medical notes into simple summaries."
          )}
          buttonText={tx("dashboard.summarizeNow", "Summarise Now")}
          href="/learning_workspace"
          accent="green"
          icon={<Sparkles className="h-7 w-7" />}
        />

        <ActionCard
          title={tx("dashboard.createQuiz", "Create Quiz")}
          desc={tx(
            "dashboard.createQuizDesc",
            "Test your understanding using a saved note."
          )}
          buttonText={tx("dashboard.startQuiz", "Start Quiz")}
          href="/learning_workspace?openQuiz=true"
          icon={<BookCheck className="h-7 w-7" />}
        />

        <ActionCard
          title={tx("dashboard.viewFavourites", "View Favourites")}
          desc={`${totalFavouriteItems} ${tx(
            "dashboard.savedFavouriteItems",
            "saved favourite items"
          )}`}
          buttonText={tx("dashboard.browseFavourites", "Browse Favourites")}
          href="/favourites"
          icon={<Star className="h-7 w-7" />}
        />
      </div>

      {/* Recent quizzes */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {tx("dashboard.recentQuizActivity", "Recent Quiz Activity")}
        </h2>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {data.recentQuizzes.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
              {tx(
                "dashboard.noCompletedQuizzes",
                "No completed quizzes yet. Start a quiz to see activity here."
              )}
            </div>
          ) : (
            data.recentQuizzes.map((quiz, index) => (
              <div key={quiz.id}>
                <RecentRow
                  title={quiz.title}
                  meta={`${tx("dashboard.quiz", "Quiz")} • ${
                    quiz.scorePercent ?? 0
                  }% • ${quiz.correctCount ?? 0}/${quiz.questionCount}`}
                  href={`/quiz/${quiz.id}?from=dashboard`}
                  viewText={tx("dashboard.view", "View")}
                />

                {index < data.recentQuizzes.length - 1 && <Divider />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reminder detail popup */}
      {selectedReminder && (
        <ReminderDetailModal
          reminder={selectedReminder}
          onClose={() => setSelectedReminder(null)}
        />
      )}
    </div>
  );
}

/* --------------------------------
   Dynamic reminder builder
-------------------------------- */

function buildDashboardReminders(
  data: ProgressSummary,
  tx: (key: string, fallback: string) => string
): ReminderItem[] {
  const reminders: ReminderItem[] = [];

  const reviewHref = data.reminderNote?.id
    ? `/learning_workspace?noteId=${encodeURIComponent(data.reminderNote.id)}`
    : "/learning_workspace";

  const reviewTitle =
    data.reminderNote?.title && data.reminderNote.title.trim()
      ? data.reminderNote.title
      : tx("dashboard.reminders.yourSavedNote", "your saved note");

  if (data.totalNotes === 0) {
    reminders.push({
      id: "create-first-note",
      title: tx("dashboard.reminders.createFirstNote.title", "Create your first note"),
      shortText: tx(
        "dashboard.reminders.createFirstNote.short",
        "You have not saved a learning note yet."
      ),
      detailText: tx(
        "dashboard.reminders.createFirstNote.detail",
        "Start by adding one short note in the Learning Workspace. After that, you can generate a simple AI summary, create a quiz, and track your confidence."
      ),
      actionText: tx("dashboard.reminders.createFirstNote.action", "Create note"),
      href: "/learning_workspace",
      icon: <FileText className="h-4 w-4" />,
    });
  }

  if (data.totalNotes > 0 && data.completedQuizzes === 0) {
    reminders.push({
      id: "try-first-quiz",
      title: tx("dashboard.reminders.firstQuiz.title", "Try your first quiz"),
      shortText: tx(
        "dashboard.reminders.firstQuiz.short",
        "You have saved notes, but no completed quizzes yet."
      ),
      detailText: `${tx(
        "dashboard.reminders.firstQuiz.detailStart",
        "A short quiz can help you check what you remember from"
      )} ${reviewTitle}. ${tx(
        "dashboard.reminders.firstQuiz.detailEnd",
        "The score is not there to judge you; it helps you see what to review next."
      )}`,
      actionText: tx("dashboard.reminders.firstQuiz.action", "Start quiz"),
      href: "/learning_workspace?openQuiz=true",
      icon: <BookCheck className="h-4 w-4" />,
    });
  }

  if (data.completedQuizzes > 0 && data.averageQuizScore < 50) {
    reminders.push({
      id: "review-low-score",
      title: tx("dashboard.reminders.reviewScore.title", "Review a topic again"),
      shortText: `${reviewTitle} ${tx(
        "dashboard.reminders.reviewScore.short",
        "may need another review because your quiz score is still developing."
      )}`,
      detailText: `${tx(
        "dashboard.reminders.reviewScore.detailStart",
        "Your average quiz score shows this is a good time to revise"
      )} ${reviewTitle}. ${tx(
        "dashboard.reminders.reviewScore.detailEnd",
        "Read the note again, update your reflection, then retake a quiz to check improvement."
      )}`,
      actionText: tx("dashboard.reminders.reviewScore.action", "Review note"),
      href: reviewHref,
      icon: <TrendingUp className="h-4 w-4" />,
    });
  }

  if (data.averageConfidence > 0 && data.averageConfidence <= 4) {
    reminders.push({
      id: "confidence-review",
      title: tx("dashboard.reminders.confidence.title", "Build your confidence"),
      shortText: tx(
        "dashboard.reminders.confidence.short",
        "Your confidence rating is low, so a short review may help."
      ),
      detailText: `${tx(
        "dashboard.reminders.confidence.detailStart",
        "Low confidence is normal when a topic is new or difficult."
      )} ${tx(
        "dashboard.reminders.confidence.detailEnd",
        "Try reviewing one saved note slowly, write a short reflection, and update your confidence rating afterwards."
      )}`,
      actionText: tx("dashboard.reminders.confidence.action", "Update reflection"),
      href: reviewHref,
      icon: <Brain className="h-4 w-4" />,
    });
  }

  if (data.favouriteNotes + data.favouriteChats > 0) {
    reminders.push({
      id: "review-favourites",
      title: tx("dashboard.reminders.favourites.title", "Review your favourites"),
      shortText: tx(
        "dashboard.reminders.favourites.short",
        "You have saved useful items for later review."
      ),
      detailText: tx(
        "dashboard.reminders.favourites.detail",
        "Favourites are useful for important topics you may want to revisit. Open your favourites and review one item for a few minutes to keep the information fresh."
      ),
      actionText: tx("dashboard.reminders.favourites.action", "Open favourites"),
      href: "/favourites",
      icon: <Star className="h-4 w-4" />,
    });
  }

  if (data.totalChatSessions === 0 && data.totalNotes > 0) {
    reminders.push({
      id: "try-ai-chat",
      title: tx("dashboard.reminders.aiChat.title", "Try an AI learning chat"),
      shortText: tx(
        "dashboard.reminders.aiChat.short",
        "You have notes, but no saved AI chats yet."
      ),
      detailText: tx(
        "dashboard.reminders.aiChat.detail",
        "Use an AI learning chat to turn a saved note into a clearer explanation. This can help you revise the topic in a simpler way before attempting a quiz."
      ),
      actionText: tx("dashboard.reminders.aiChat.action", "Start AI chat"),
      href: "/chatbots",
      icon: <MessageCircle className="h-4 w-4" />,
    });
  }

  if (reminders.length === 0) {
    reminders.push({
      id: "keep-going",
      title: tx("dashboard.reminders.keepGoing.title", "Keep your learning active"),
      shortText: tx(
        "dashboard.reminders.keepGoing.short",
        "A short review today can help you remember more later."
      ),
      detailText: tx(
        "dashboard.reminders.keepGoing.detail",
        "Your progress is building. Continue by reviewing one saved note, taking a quiz, or adding a reflection to strengthen your understanding."
      ),
      actionText: tx("dashboard.reminders.keepGoing.action", "Continue learning"),
      href: "/learning_workspace",
      icon: <Lightbulb className="h-4 w-4" />,
    });
  }

  return reminders.slice(0, 4);
}

/* --------------------------------
   Reusable UI components
-------------------------------- */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tint = "blue",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  tint?: "blue" | "emerald";
}) {
  const tile =
    tint === "emerald"
      ? "bg-emerald-500/10 text-emerald-400"
      : "bg-blue-500/10 text-blue-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tile}`}
        >
          {icon}
        </div>

        <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
          {value}
        </div>
      </div>

      <div className="mt-5 text-base font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </div>

      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {subtitle}
      </div>
    </div>
  );
}

function MotivationInsightCard({
  motivationTitle,
  motivationText,
  insightTitle,
  insightText,
}: {
  motivationTitle: string;
  motivationText: string;
  insightTitle: string;
  insightText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
          <Sparkles className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {motivationTitle}
          </h2>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {motivationText}
          </p>

          <div className="mt-6 max-w-4xl rounded-2xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                <Heart className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                  {insightTitle}
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {insightText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  buttonText,
  href,
  accent,
  icon,
}: {
  title: string;
  desc: string;
  buttonText: string;
  href: string;
  accent?: "green";
  icon: ReactNode;
}) {
  const btnClass =
    accent === "green"
      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  const iconTileClass =
    accent === "green"
      ? "bg-emerald-500/10 text-emerald-400"
      : "bg-blue-500/10 text-blue-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-xl ${iconTileClass}`}
      >
        {icon}
      </div>

      <div className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </div>

      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {desc}
      </div>

      <Link
        href={href}
        className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${btnClass}`}
      >
        {buttonText}
      </Link>
    </div>
  );
}

function RecentRow({
  title,
  meta,
  href,
  viewText,
}: {
  title: string;
  meta: string;
  href: string;
  viewText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </div>

        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {meta}
        </div>
      </div>

      <Link
        href={href}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
      >
        {viewText}
      </Link>
    </div>
  );
}

function ReminderDetailModal({
  reminder,
  onClose,
}: {
  reminder: ReminderItem;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              {reminder.icon}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {reminder.title}
              </h2>

              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {reminder.detailText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Link
          href={reminder.href}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {reminder.actionText}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-200 dark:bg-slate-800" />;
}