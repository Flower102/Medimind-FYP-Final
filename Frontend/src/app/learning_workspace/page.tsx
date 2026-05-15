// frontend/src/app/quiz/[attemptId]/page.tsx

"use client";

/**
 * Quiz attempt page.
 *
 * This page:
 * - Loads one quiz attempt from the backend
 * - Lets the user answer questions
 * - Supports "answers at the end" and "answers after each question"
 * - Supports optional timer
 * - Submits the quiz and shows a result/review screen
 * - Converts backend error codes into clear plain-English messages
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  XCircle,
} from "lucide-react";

import {
  answerQuizQuestion,
  getQuizAttempt,
  submitQuizAttempt,
  type QuizAttempt,
  type QuizQuestion,
  type QuizResult,
} from "@/src/lib/quizApi";

/* --------------------------------
   Small reusable card
-------------------------------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

/* --------------------------------
   Time helper
-------------------------------- */

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/* --------------------------------
   Error helpers

   These stop raw backend codes such as:
   QUIZ_ATTEMPT_NOT_FOUND
   AUTH_MISSING_TOKEN
   OPENAI_QUIZ_UPSTREAM_ERROR

   from being shown directly to users.
-------------------------------- */

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

function getFriendlyQuizError(error: unknown, fallback: string) {
  const raw = getRawErrorMessage(error).trim();

  switch (raw) {
    case "AUTH_MISSING_TOKEN":
    case "AUTH_INVALID_TOKEN":
    case "AUTH_MISSING_REFRESH":
    case "AUTH_INVALID_REFRESH":
    case "AUTH_REFRESH_EXPIRED":
    case "AUTH_SESSION_EXPIRED":
      return "Your session has expired or you are not signed in. Please sign in again, then return to your quiz.";

    case "AUTH_USER_NOT_FOUND":
      return "We could not find your account. Please sign in again using the account that created this quiz.";

    case "QUIZ_ATTEMPT_NOT_FOUND":
    case "REQUEST_FAILED_404":
      return "This quiz could not be found. It may have been deleted, or it may belong to a different account. Please go back to Learning Workspace or Progress and open the quiz again.";

    case "QUIZ_QUESTION_NOT_FOUND":
      return "This question could not be found in the quiz. Please refresh the page. If the problem continues, start a new quiz from your saved note.";

    case "QUIZ_ALREADY_SUBMITTED":
      return "This quiz has already been submitted. You can review the result, but answers can no longer be changed.";

    case "QUIZ_NOT_SUBMITTED":
      return "This quiz has not been submitted yet. Please answer the questions and click Submit Quiz.";

    case "QUIZ_HAS_NO_QUESTIONS":
      return "This quiz does not contain any questions. Please return to Learning Workspace and generate a new quiz.";

    case "INVALID_SELECTED_OPTION":
      return "The selected answer option is invalid. Please choose one of the available options and try again.";

    case "INVALID_QUESTION_COUNT":
      return "The quiz question count is invalid. Please choose 10, 15, or 20 questions.";

    case "NOTE_NOT_FOUND":
      return "The note used for this quiz could not be found. It may have been deleted. Please go back to Learning Workspace and choose another saved note.";

    case "OPENAI_API_KEY_MISSING":
      return "The quiz generator is not configured on the backend. Please add your OpenAI API key in the backend .env file, restart FastAPI, and try again.";

    case "OPENAI_QUIZ_NETWORK_ERROR":
      return "The backend could not connect to the AI service. Please check your internet connection and try again.";

    case "OPENAI_QUIZ_UPSTREAM_ERROR":
      return "The AI service returned an error while generating the quiz. Please try again in a few moments.";

    case "OPENAI_QUIZ_EMPTY_RESPONSE":
      return "The AI service did not return quiz content. Please try again, or use a note with more detailed content.";

    case "AI_QUIZ_BAD_JSON":
    case "AI_QUIZ_BAD_SHAPE":
    case "AI_QUIZ_WRONG_QUESTION_COUNT":
    case "AI_QUIZ_OPTIONS_MUST_BE_FOUR":
    case "AI_QUIZ_BAD_CORRECT_INDEX":
    case "AI_QUIZ_GENERATION_FAILED":
      return "The AI generated a quiz in the wrong format. Please try again. If it keeps happening, make your note clearer and more detailed before generating another quiz.";

    case "REQUEST_FAILED_422":
    case "VALIDATION_ERROR":
      return "Some quiz data was missing or invalid. Please refresh the page and try again.";

    case "REQUEST_FAILED_500":
    case "INTERNAL_SERVER_ERROR":
      return "The server had a problem while processing this quiz. Please try again. If it continues, check the backend terminal logs.";

    case "NETWORK_ERROR":
    case "BACKEND_CONNECTION_FAILED":
      return "The app could not connect to the backend server. Please check that FastAPI is running, then try again.";

    default:
      break;
  }

  // If the backend already sent readable text, show it.
  if (
    raw.includes(" ") &&
    !raw.startsWith("REQUEST_FAILED_") &&
    !/^[A-Z0-9_]+$/.test(raw)
  ) {
    return raw;
  }

  return fallback;
}

/* --------------------------------
   Result calculation helper

   This protects the result page if the backend response
   is missing correctCount or scorePercent.
-------------------------------- */

function getResultStats(result: QuizResult) {
  const calculatedCorrectCount = result.questions.filter(
    (question) => question.isCorrect === true
  ).length;

  const totalQuestions =
    typeof result.questionCount === "number" && result.questionCount > 0
      ? result.questionCount
      : result.questions.length;

  const correctCount =
    typeof result.correctCount === "number"
      ? result.correctCount
      : calculatedCorrectCount;

  const scorePercent =
    typeof result.scorePercent === "number"
      ? result.scorePercent
      : totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

  return {
    correctCount,
    totalQuestions,
    scorePercent,
  };
}

export default function QuizAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const searchParams = useSearchParams();

  const attemptId = params.attemptId;

  /* --------------------------------
     Dynamic return link
  -------------------------------- */

const fromPage = searchParams.get("from");

const backHref =
  fromPage === "dashboard"
    ? "/dashboard"
    : fromPage === "progress"
      ? "/progress"
      : "/learning_workspace";

const backLabel =
  fromPage === "dashboard"
    ? "Back to Dashboard"
    : fromPage === "progress"
      ? "Back to Progress"
      : "Back to Workspace";

  /* --------------------------------
     Main quiz state
  -------------------------------- */

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [answerMessage, setAnswerMessage] = useState("");

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Used to calculate total time taken.
  const startedAtRef = useRef<number>(Date.now());

  // Stops the timer from auto-submitting more than once.
  const autoSubmittedRef = useRef(false);

  /* --------------------------------
     Quiz values
  -------------------------------- */

  const questions = useMemo(() => {
    return attempt?.questions ?? [];
  }, [attempt?.questions]);

  const currentQuestion = questions[currentIndex];

  const isLastQuestion = currentIndex === questions.length - 1;

  const answeredCount = useMemo(() => {
    return questions.filter(
      (question) =>
        question.selectedOptionIndex !== null &&
        question.selectedOptionIndex !== undefined
    ).length;
  }, [questions]);

  const displayedAnsweredCount = useMemo(() => {
    const currentSaved =
      currentQuestion?.selectedOptionIndex !== null &&
      currentQuestion?.selectedOptionIndex !== undefined;

    const currentSelected = selectedOptionIndex !== null;

    // Count the current selection immediately, even before backend save finishes.
    if (currentSelected && !currentSaved) {
      return answeredCount + 1;
    }

    return answeredCount;
  }, [answeredCount, currentQuestion?.selectedOptionIndex, selectedOptionIndex]);

  const questionsLeft = Math.max(questions.length - displayedAnsweredCount, 0);

  const progressPercent =
    questions.length > 0
      ? Math.round(((currentIndex + 1) / questions.length) * 100)
      : 0;

  const getTimeTakenSeconds = useCallback(() => {
    return Math.round((Date.now() - startedAtRef.current) / 1000);
  }, []);

  /* --------------------------------
     Load quiz attempt from backend
  -------------------------------- */

  const loadQuiz = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const loaded = await getQuizAttempt(attemptId);

      setAttempt(loaded);

      // If already completed, go straight to result review.
      if (loaded.completedAt) {
        setResult(loaded as QuizResult);
      }

      const firstQuestion = loaded.questions[0];
      setSelectedOptionIndex(firstQuestion?.selectedOptionIndex ?? null);

      // Timer starts when the page opens.
      if (loaded.timerEnabled && loaded.timeLimitSeconds && !loaded.completedAt) {
        setSecondsLeft(loaded.timeLimitSeconds);
      }
    } catch (error: unknown) {
      console.error(error);

      setError(
        getFriendlyQuizError(
          error,
          "Could not load this quiz. Please go back and open it again. If the problem continues, check that the backend is running."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  /* --------------------------------
     Save one answer
  -------------------------------- */

  const updateQuestionLocally = useCallback(
    (questionId: string, patch: Partial<QuizQuestion>) => {
      setAttempt((previousAttempt) => {
        if (!previousAttempt) return previousAttempt;

        return {
          ...previousAttempt,
          questions: previousAttempt.questions.map((question) =>
            question.id === questionId ? { ...question, ...patch } : question
          ),
        };
      });
    },
    []
  );

  const saveCurrentAnswer = useCallback(async () => {
    if (!currentQuestion) return false;

    if (selectedOptionIndex === null) {
      setAnswerMessage("Choose an answer first, then continue.");
      return false;
    }

    setIsSavingAnswer(true);
    setAnswerMessage("");
    setError("");

    try {
      const saved = await answerQuizQuestion({
        attemptId,
        questionId: currentQuestion.id,
        selectedOptionIndex,
      });

      updateQuestionLocally(currentQuestion.id, {
        selectedOptionIndex: saved.selectedOptionIndex,
        correctOptionIndex: saved.correctOptionIndex,
        explanation: saved.explanation,
        isCorrect: saved.isCorrect,
      });

      return true;
    } catch (error: unknown) {
      console.error(error);

      setError(
        getFriendlyQuizError(
          error,
          "Could not save your answer. Please check your connection and try again."
        )
      );

      return false;
    } finally {
      setIsSavingAnswer(false);
    }
  }, [
    attemptId,
    currentQuestion,
    selectedOptionIndex,
    updateQuestionLocally,
  ]);

  /* --------------------------------
     Submit whole quiz
  -------------------------------- */

  const handleSubmitQuiz = useCallback(async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const submitted = await submitQuizAttempt({
        attemptId,
        timeTakenSeconds: getTimeTakenSeconds(),
      });

      setResult(submitted);
      setAttempt(submitted);
    } catch (error: unknown) {
      console.error(error);

      setError(
        getFriendlyQuizError(
          error,
          "Could not submit the quiz. Please try again. If it continues, refresh the page and check the backend."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, getTimeTakenSeconds]);

  /* --------------------------------
     Timer countdown
  -------------------------------- */

  useEffect(() => {
    if (!attempt?.timerEnabled) return;
    if (secondsLeft === null) return;
    if (result) return;

    if (secondsLeft <= 0) {
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleSubmitQuiz();
      }

      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [attempt?.timerEnabled, handleSubmitQuiz, result, secondsLeft]);

  /* --------------------------------
     Navigation helpers
  -------------------------------- */

  const goToNextQuestion = useCallback(() => {
    if (isLastQuestion) return;

    const nextIndex = currentIndex + 1;
    const nextQuestion = questions[nextIndex];

    setCurrentIndex(nextIndex);
    setSelectedOptionIndex(nextQuestion?.selectedOptionIndex ?? null);
    setAnswerMessage("");
  }, [currentIndex, isLastQuestion, questions]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentIndex === 0) return;

    const previousIndex = currentIndex - 1;
    const previousQuestion = questions[previousIndex];

    setCurrentIndex(previousIndex);
    setSelectedOptionIndex(previousQuestion?.selectedOptionIndex ?? null);
    setAnswerMessage("");
  }, [currentIndex, questions]);

  const currentQuestionHasRevealedAnswer =
    attempt?.revealMode === "after_each" &&
    currentQuestion?.isCorrect !== null &&
    currentQuestion?.isCorrect !== undefined &&
    currentQuestion?.selectedOptionIndex === selectedOptionIndex;

  const handlePrimaryAction = useCallback(async () => {
    if (!currentQuestion) return;

    // after_each mode: first click checks answer, second click continues.
    if (attempt?.revealMode === "after_each") {
      if (!currentQuestionHasRevealedAnswer) {
        const saved = await saveCurrentAnswer();

        if (saved) {
          setAnswerMessage("Answer saved. Review the feedback, then continue.");
        }

        return;
      }

      if (isLastQuestion) {
        await handleSubmitQuiz();
      } else {
        goToNextQuestion();
      }

      return;
    }

    // end mode: save and move on immediately.
    const saved = await saveCurrentAnswer();

    if (!saved) return;

    if (isLastQuestion) {
      await handleSubmitQuiz();
    } else {
      goToNextQuestion();
    }
  }, [
    attempt?.revealMode,
    currentQuestion,
    currentQuestionHasRevealedAnswer,
    goToNextQuestion,
    handleSubmitQuiz,
    isLastQuestion,
    saveCurrentAnswer,
  ]);

  /* --------------------------------
     Loading / error states
  -------------------------------- */

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading quiz...
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-lg font-semibold text-red-600">
            Could not load quiz
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {error}
          </p>

          <Link
            href={backHref}
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {backLabel}
          </Link>
        </Card>
      </div>
    );
  }

  if (!attempt || questions.length === 0 || !currentQuestion) {
    return (
      <Card>
        <div className="text-lg font-semibold">No quiz questions found.</div>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          This quiz does not contain any questions. Please return to Learning
          Workspace and generate a new quiz from a saved note.
        </p>

        <Link
          href={backHref}
          className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {backLabel}
        </Link>
      </Card>
    );
  }

  /* --------------------------------
     Result / review screen
  -------------------------------- */

  if (result) {
    const resultStats = getResultStats(result);

    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-16">
        <div className="overflow-hidden rounded-3xl border border-blue-200 bg-linear-to-r from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                Quiz completed
              </div>

              <h1 className="mt-4 text-3xl font-semibold">Quiz Results</h1>

              <p className="mt-2 max-w-2xl text-sm text-blue-50">
                {result.title}
              </p>
            </div>

            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel.replace("Back to ", "")}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-medium text-slate-500">Score</div>
            <div className="mt-2 text-4xl font-semibold text-blue-600">
              {resultStats.scorePercent}%
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-medium text-slate-500">
              Correct answers
            </div>
            <div className="mt-2 text-4xl font-semibold text-green-600">
              {resultStats.correctCount}/{resultStats.totalQuestions}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-medium text-slate-500">Questions</div>
            <div className="mt-2 text-4xl font-semibold text-slate-900 dark:text-slate-50">
              {resultStats.totalQuestions}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-medium text-slate-500">Time taken</div>
            <div className="mt-2 text-4xl font-semibold text-slate-900 dark:text-slate-50">
              {formatTime(result.timeTakenSeconds ?? getTimeTakenSeconds())}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {result.questions.map((question, index) => (
            <div
              key={question.id}
              className={[
                "overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-slate-900",
                question.isCorrect
                  ? "border-green-200 dark:border-green-900/60"
                  : "border-red-200 dark:border-red-900/60",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-start gap-4 border-b px-6 py-5",
                  question.isCorrect
                    ? "border-green-100 bg-green-50/70 dark:border-green-900/50 dark:bg-green-950/25"
                    : "border-red-100 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/25",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                    question.isCorrect
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
                  ].join(" ")}
                >
                  {question.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Question {index + 1}
                  </div>

                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {question.question}
                  </div>
                </div>
              </div>

              <div className="space-y-2 px-6 py-5">
                {question.options.map((option, optionIndex) => {
                  const isSelected =
                    question.selectedOptionIndex === optionIndex;
                  const isCorrect =
                    question.correctOptionIndex === optionIndex;

                  return (
                    <div
                      key={`${question.id}-${optionIndex}`}
                      className={[
                        "rounded-xl border px-4 py-3 text-sm font-medium",
                        isCorrect
                          ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100"
                          : isSelected
                            ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                            : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
                      ].join(" ")}
                    >
                      {option}
                    </div>
                  );
                })}

                {question.explanation && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <div className="font-semibold text-slate-900 dark:text-slate-50">
                      Explanation
                    </div>

                    <div className="mt-1 leading-6">
                      {question.explanation}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Quiz completed
              </div>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                You can return to where you came from or start another quiz from
                your saved notes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={backHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>

              <Link
                href="/learning_workspace?openQuiz=true"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Start another quiz
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------
     Active quiz screen
  -------------------------------- */

  const disableAnswerButtons =
    isSavingAnswer || isSubmitting || currentQuestionHasRevealedAnswer;

  const primaryButtonText =
    attempt.revealMode === "after_each" && !currentQuestionHasRevealedAnswer
      ? "Check Answer"
      : isLastQuestion
        ? "Submit Quiz"
        : "Save & Next";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-200 bg-linear-to-r from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              Active quiz
            </div>

            <h1 className="mt-4 text-3xl font-semibold">Take Quiz</h1>

            <p className="mt-2 max-w-2xl text-sm text-blue-50">
              {attempt.title}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {attempt.timerEnabled && secondsLeft !== null && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4" />
                {formatTime(secondsLeft)}
              </div>
            )}

            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900 dark:border-red-900/50 dark:bg-red-950 dark:text-red-100">
          {error}
        </div>
      )}

      <Card>
        <div className="mb-5">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>

            <span>
              {questionsLeft === 0
                ? "Ready to submit"
                : `${questionsLeft} question${
                    questionsLeft === 1 ? "" : "s"
                  } left`}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <HelpCircle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-8 text-slate-900 dark:text-slate-50">
              {currentQuestion.question}
            </h2>

            <div className="mt-5 space-y-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const active = selectedOptionIndex === optionIndex;
                const isCorrect =
                  currentQuestion.correctOptionIndex === optionIndex;
                const isWrongSelection =
                  currentQuestionHasRevealedAnswer && active && !isCorrect;

                return (
                  <button
                    key={`${currentQuestion.id}-${optionIndex}`}
                    type="button"
                    onClick={() => {
                      setSelectedOptionIndex(optionIndex);
                      setAnswerMessage("");
                    }}
                    disabled={disableAnswerButtons}
                    className={[
                      "w-full rounded-2xl border px-5 py-4 text-left text-sm font-medium transition disabled:cursor-not-allowed",
                      currentQuestionHasRevealedAnswer && isCorrect
                        ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100"
                        : isWrongSelection
                          ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                          : active
                            ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {answerMessage && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {answerMessage}
              </div>
            )}

            {currentQuestionHasRevealedAnswer && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <div className="font-semibold">
                  {currentQuestion.isCorrect ? "Correct" : "Not quite"}
                </div>

                {currentQuestion.explanation && (
                  <div className="mt-1 leading-6">
                    {currentQuestion.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={handlePreviousQuestion}
          disabled={currentIndex === 0 || isSavingAnswer || isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>

        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isSavingAnswer || isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingAnswer || isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}

          {primaryButtonText}
        </button>
      </div>
    </div>
  );
}
