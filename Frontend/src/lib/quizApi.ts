// frontend/src/lib/quizApi.ts

/**
 * Quiz API functions.
 *
 * The browser calls:
 *   /api/backend/quizzes/...
 *
 * Next.js proxy forwards to FastAPI:
 *   http://127.0.0.1:8000/quizzes/...
 *
 * This keeps the httpOnly auth cookie working properly.
 */

import { apiFetch } from "./apiFetch";

export type RevealMode = "end" | "after_each";

export type QuizQuestion = {
  id: string;
  position: number;
  question: string;
  options: string[];
  selectedOptionIndex: number | null;
  correctOptionIndex: number | null;
  explanation: string | null;
  isCorrect: boolean | null;
};

export type QuizAttempt = {
  id: string;
  noteId: string;
  title: string;
  questionCount: number;
  revealMode: RevealMode;
  timerEnabled: boolean;
  timeLimitSeconds: number | null;
  timeTakenSeconds: number | null;
  correctCount: number | null;
  scorePercent: number | null;
  startedAt: string | null;
  completedAt: string | null;
  questions: QuizQuestion[];
};

export type QuizResult = QuizAttempt & {
  correctCount: number;
  scorePercent: number;
  completedAt: string;
};

export type QuizAnswerResult = {
  questionId: string;
  selectedOptionIndex: number;
  revealAnswer: boolean;
  correctOptionIndex: number | null;
  isCorrect: boolean | null;
  explanation: string | null;
};

type RawQuizQuestion = {
  id: number | string;
  position?: number | null;
  question?: string | null;
  question_text?: string | null;
  questionText?: string | null;
  options?: string[] | null;
  selected_option_index?: number | null;
  selectedOptionIndex?: number | null;
  correct_option_index?: number | null;
  correctOptionIndex?: number | null;
  explanation?: string | null;
  is_correct?: boolean | null;
  isCorrect?: boolean | null;
};

type RawQuizAttempt = {
  id: number | string;
  note_id?: number | string | null;
  noteId?: number | string | null;
  title?: string | null;
  question_count?: number | null;
  questionCount?: number | null;
  reveal_mode?: RevealMode | null;
  revealMode?: RevealMode | null;
  timer_enabled?: boolean | null;
  timerEnabled?: boolean | null;
  time_limit_seconds?: number | null;
  timeLimitSeconds?: number | null;
  time_taken_seconds?: number | null;
  timeTakenSeconds?: number | null;
  correct_count?: number | null;
  correctCount?: number | null;
  score_percent?: number | null;
  scorePercent?: number | null;
  started_at?: string | null;
  startedAt?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  questions?: RawQuizQuestion[] | null;
};

type RawQuizAnswerResult = {
  question_id?: number | string;
  questionId?: number | string;
  selected_option_index?: number;
  selectedOptionIndex?: number;
  reveal_answer?: boolean;
  revealAnswer?: boolean;
  correct_option_index?: number | null;
  correctOptionIndex?: number | null;
  is_correct?: boolean | null;
  isCorrect?: boolean | null;
  explanation?: string | null;
};

function normaliseQuestion(question: RawQuizQuestion): QuizQuestion {
  return {
    id: String(question.id),
    position: Number(question.position ?? 0),
    question:
      question.question ??
      question.question_text ??
      question.questionText ??
      "",
    options: Array.isArray(question.options) ? question.options : [],
    selectedOptionIndex:
      question.selectedOptionIndex ?? question.selected_option_index ?? null,
    correctOptionIndex:
      question.correctOptionIndex ?? question.correct_option_index ?? null,
    explanation: question.explanation ?? null,
    isCorrect: question.isCorrect ?? question.is_correct ?? null,
  };
}

function normaliseAttempt(attempt: RawQuizAttempt): QuizAttempt {
  const questions = Array.isArray(attempt.questions)
    ? attempt.questions.map(normaliseQuestion)
    : [];

  return {
    id: String(attempt.id),
    noteId: String(attempt.noteId ?? attempt.note_id ?? ""),
    title: attempt.title ?? "Generated Quiz",
    questionCount: Number(
      attempt.questionCount ?? attempt.question_count ?? questions.length
    ),
    revealMode: attempt.revealMode ?? attempt.reveal_mode ?? "end",
    timerEnabled: Boolean(attempt.timerEnabled ?? attempt.timer_enabled),
    timeLimitSeconds:
      attempt.timeLimitSeconds ?? attempt.time_limit_seconds ?? null,
    timeTakenSeconds:
      attempt.timeTakenSeconds ?? attempt.time_taken_seconds ?? null,
    correctCount: attempt.correctCount ?? attempt.correct_count ?? null,
    scorePercent: attempt.scorePercent ?? attempt.score_percent ?? null,
    startedAt: attempt.startedAt ?? attempt.started_at ?? null,
    completedAt: attempt.completedAt ?? attempt.completed_at ?? null,
    questions,
  };
}

function normaliseResult(attempt: RawQuizAttempt): QuizResult {
  const normalised = normaliseAttempt(attempt);

  const calculatedCorrect = normalised.questions.filter(
    (question) => question.isCorrect === true
  ).length;

  const totalQuestions =
    normalised.questionCount > 0
      ? normalised.questionCount
      : normalised.questions.length;

  const correctCount =
    typeof normalised.correctCount === "number"
      ? normalised.correctCount
      : calculatedCorrect;

  const scorePercent =
    typeof normalised.scorePercent === "number"
      ? normalised.scorePercent
      : totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

  return {
    ...normalised,
    correctCount,
    scorePercent,
    completedAt: normalised.completedAt ?? new Date().toISOString(),
  };
}

function normaliseAnswerResult(data: RawQuizAnswerResult): QuizAnswerResult {
  return {
    questionId: String(data.questionId ?? data.question_id ?? ""),
    selectedOptionIndex:
      data.selectedOptionIndex ?? data.selected_option_index ?? 0,
    revealAnswer: data.revealAnswer ?? data.reveal_answer ?? false,
    correctOptionIndex:
      data.correctOptionIndex ?? data.correct_option_index ?? null,
    isCorrect: data.isCorrect ?? data.is_correct ?? null,
    explanation: data.explanation ?? null,
  };
}

export async function generateQuiz(payload: {
  noteId: string;
  questionCount: number;
  revealMode: RevealMode;
  timerEnabled: boolean;
  timeLimitSeconds?: number | null;
}): Promise<QuizAttempt> {
  const data = await apiFetch<RawQuizAttempt>("/quizzes/generate", {
    method: "POST",
    json: {
      noteId: Number(payload.noteId),
      questionCount: payload.questionCount,
      revealMode: payload.revealMode,
      timerEnabled: payload.timerEnabled,
      timeLimitSeconds: payload.timeLimitSeconds ?? null,
    },
  });

  return normaliseAttempt(data);
}

export async function getQuizAttempt(attemptId: string): Promise<QuizAttempt> {
  const data = await apiFetch<RawQuizAttempt>(
    `/quizzes/${encodeURIComponent(attemptId)}`,
    {
      method: "GET",
    }
  );

  return normaliseAttempt(data);
}

export async function answerQuizQuestion(payload: {
  attemptId: string;
  questionId: string;
  selectedOptionIndex: number;
}): Promise<QuizAnswerResult> {
  const data = await apiFetch<RawQuizAnswerResult>(
    `/quizzes/${encodeURIComponent(payload.attemptId)}/answer`,
    {
      method: "POST",
      json: {
        questionId: Number(payload.questionId),
        selectedOptionIndex: payload.selectedOptionIndex,
      },
    }
  );

  return normaliseAnswerResult(data);
}

export async function submitQuizAttempt(payload: {
  attemptId: string;
  timeTakenSeconds?: number | null;
}): Promise<QuizResult> {
  const data = await apiFetch<RawQuizAttempt>(
    `/quizzes/${encodeURIComponent(payload.attemptId)}/submit`,
    {
      method: "POST",
      json: {
        timeTakenSeconds: payload.timeTakenSeconds ?? null,
      },
    }
  );

  return normaliseResult(data);
}