// frontend/src/lib/progressApi.ts

export type ProgressPoint = {
  label: string;
  value: number;
};

export type RecentQuiz = {
  id: string;
  title: string;
  scorePercent: number | null;
  correctCount: number | null;
  questionCount: number;
  timeTakenSeconds: number | null;
  completedAt: string | null;
};

export type LearningGoal = {
  title: string;
  current: number;
  target: number;
};

export type ReminderNote = {
  id: string | null;
  title: string | null;
  reason: string;
};

export type ProgressSummary = {
  totalNotes: number;
  totalChatSessions: number;
  favouriteNotes: number;
  favouriteChats: number;

  totalQuizzes: number;
  completedQuizzes: number;
  averageQuizScore: number;
  averageConfidence: number;

  quizScorePoints: ProgressPoint[];
  confidencePoints: ProgressPoint[];
  recentQuizzes: RecentQuiz[];
  learningGoals: LearningGoal[];

  insight: string;
  motivationMessage: string;
  suggestedNextStep: string;
  gentleReminder: string;
  reminderNote: ReminderNote | null;
};

type RawProgressSummary = {
  total_notes: number;
  total_chat_sessions: number;
  favourite_notes: number;
  favourite_chats: number;

  total_quizzes: number;
  completed_quizzes: number;
  average_quiz_score: number;
  average_confidence: number;

  quiz_score_points: ProgressPoint[];
  confidence_points: ProgressPoint[];

  recent_quizzes: {
    id: string;
    title: string;
    score_percent: number | null;
    correct_count: number | null;
    question_count: number;
    time_taken_seconds: number | null;
    completed_at: string | null;
  }[];

  learning_goals: LearningGoal[];

  insight: string;
  motivation_message?: string;
  suggested_next_step?: string;
  gentle_reminder?: string;

  reminder_note?: {
    id: string | null;
    title: string | null;
    reason: string;
  } | null;
};

type ApiErrorBody = {
  detail?: string | { code?: string; message?: string; action?: string };
  message?: string;
};

async function readResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data: unknown, status: number) {
  const errorData = data as ApiErrorBody;
  const detail = errorData.detail;

  if (typeof detail === "string") return detail;

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && typeof detail.action === "string") {
      return `${detail.message} ${detail.action}`;
    }

    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.code === "string") return detail.code;
  }

  if (typeof errorData.message === "string") return errorData.message;

  if (status === 401) {
    return "You are not signed in. Please sign in again, then try loading your progress.";
  }

  if (status === 500) {
    return "The server had a problem while loading progress. Please check the backend terminal logs.";
  }

  return `Request failed with status ${status}`;
}

function normaliseProgressSummary(raw: RawProgressSummary): ProgressSummary {
  return {
    totalNotes: raw.total_notes,
    totalChatSessions: raw.total_chat_sessions,
    favouriteNotes: raw.favourite_notes,
    favouriteChats: raw.favourite_chats,

    totalQuizzes: raw.total_quizzes,
    completedQuizzes: raw.completed_quizzes,
    averageQuizScore: raw.average_quiz_score,
    averageConfidence: raw.average_confidence,

    quizScorePoints: raw.quiz_score_points ?? [],
    confidencePoints: raw.confidence_points ?? [],

    recentQuizzes: (raw.recent_quizzes ?? []).map((quiz) => ({
      id: String(quiz.id),
      title: quiz.title,
      scorePercent: quiz.score_percent,
      correctCount: quiz.correct_count,
      questionCount: quiz.question_count,
      timeTakenSeconds: quiz.time_taken_seconds,
      completedAt: quiz.completed_at,
    })),

    learningGoals: raw.learning_goals ?? [],

    insight: raw.insight,
    motivationMessage:
      raw.motivation_message ??
      "Keep going — small review sessions can help you remember more.",
    suggestedNextStep:
      raw.suggested_next_step ??
      "Open the Learning Workspace and review one saved note.",
    gentleReminder:
      raw.gentle_reminder ??
      "Review one saved item today to keep your learning fresh.",
    reminderNote: raw.reminder_note ?? null,
  };
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  const res = await fetch("/api/backend/progress/summary", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await readResponseBody(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res.status));
  }

  return normaliseProgressSummary(data as RawProgressSummary);
}