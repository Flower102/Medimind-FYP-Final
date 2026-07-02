
"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* Learning Workspace Page. Supports note creation, editing, reflections, confidence ratings, favourites, PDF export, AI summaries, and quiz generation. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as lucideReact from "lucide-react";
import jsPDF from "jspdf";

import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
  type Note,
} from "@/src/lib/notesApi";

import { generateQuiz, type RevealMode } from "@/src/lib/quizApi";
import { useI18n } from "@/src/i18n/I18nProvider";


/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type QuizQuestionCount = 10 | 15 | 20;
type QuizRevealMode = RevealMode;

/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type BannerState = {
  open: boolean;
  type: "success" | "error" | "info";
  message: string;
};


/* -------------------------------------------------------------------------- */
/* Get Raw Error Message Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

/* -------------------------------------------------------------------------- */
/* Get Friendly Error Message Helper */
/* Reads or derives a specific value so the main component can stay easier to follow. */
/* -------------------------------------------------------------------------- */

function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  const raw = getRawErrorMessage(error);

  const code = raw.trim();

  switch (code) {
    case "AUTH_MISSING_TOKEN":
    case "AUTH_INVALID_TOKEN":
    case "AUTH_SESSION_EXPIRED":
    case "AUTH_MISSING_REFRESH":
    case "AUTH_INVALID_REFRESH":
    case "AUTH_REFRESH_EXPIRED":
      return "Your session has expired or you are not signed in. Please sign in again, then try this action one more time.";

    case "AUTH_USER_NOT_FOUND":
      return "We could not find your account. Please sign in again or create a new account.";

    case "NOTE_NOT_FOUND":
    case "NOT_FOUND":
    case "REQUEST_FAILED_404":
      return "The note could not be found. It may have already been deleted or moved. Please refresh the page and try again.";

    case "FORBIDDEN":
    case "REQUEST_FAILED_403":
      return "You do not have permission to access this item. Please make sure you are signed in with the correct account.";

    case "VALIDATION_ERROR":
    case "REQUEST_FAILED_422":
      return "Some information was missing or invalid. Please check your note content and try again.";

    case "REQUEST_FAILED_500":
    case "INTERNAL_SERVER_ERROR":
      return "The server had a problem while processing this request. Please try again. If it continues, check the backend terminal logs.";

    case "NETWORK_ERROR":
    case "BACKEND_CONNECTION_FAILED":
      return "The app could not connect to the backend server. Please check that FastAPI is running, then try again.";

    default:
      break;
  }

  if (
    code.includes(" ") &&
    !code.startsWith("REQUEST_FAILED_") &&
    !/^[A-Z0-9_]+$/.test(code)
  ) {
    return code;
  }

  return fallback;
}


/* -------------------------------------------------------------------------- */
/* Card Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div
      className={[
        "rounded-2xl border p-6 shadow-sm",
        "border-slate-200 bg-white text-slate-900",
        "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status Banner Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function StatusBanner({
  type,
  message,
  onClose,
}: {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
}) {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const styles =
    type === "success"
      ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100"
      : type === "error"
        ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
        : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50";

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      <div>
        <div className="font-semibold">
          {type === "success"
            ? tx("common.success", "Success")
            : type === "error"
              ? tx("common.error", "Error")
              : tx("common.info", "Info")}
        </div>

        <div className="mt-0.5 leading-6 opacity-90">{message}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        {tx("common.close", "Close")}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function LearningWorkspacePage() {
  /* -------------------------------------------------------------------------- */
  /* Component Setup */
  /* Initialises routing, translations, refs, or other page-level services used by the component. */
  /* -------------------------------------------------------------------------- */

  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [noteList, setNoteList] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [reflection, setReflection] = useState("");
  const [confidence, setConfidence] = useState<number>(5);
  const [isFavorite, setIsFavorite] = useState(false);

  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [hasLoadedNotes, setHasLoadedNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);


  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedQuizNoteId, setSelectedQuizNoteId] = useState<string | null>(
    null
  );

  const [quizQuestionCount, setQuizQuestionCount] =
    useState<QuizQuestionCount>(10);

  const [quizRevealMode, setQuizRevealMode] =
    useState<QuizRevealMode>("end");

  const [quizTimerEnabled, setQuizTimerEnabled] = useState(false);
  const [quizTimeLimitMinutes, setQuizTimeLimitMinutes] = useState(10);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);


  const [pageStatus, setPageStatus] = useState<BannerState>({
    open: false,
    type: "info",
    message: "",
  });

  const [noteStatus, setNoteStatus] = useState<BannerState>({
    open: false,
    type: "info",
    message: "",
  });

  /* -------------------------------------------------------------------------- */
  /* Show Page Status Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const showPageStatus = useCallback(
    (type: BannerState["type"], message: string) => {
      setPageStatus({ open: true, type, message });

      window.setTimeout(() => {
        setPageStatus((current) => ({ ...current, open: false }));
      }, 3500);
    },
    []
  );

  /* -------------------------------------------------------------------------- */
  /* Show Note Status Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const showNoteStatus = useCallback(
    (type: BannerState["type"], message: string) => {
      setNoteStatus({ open: true, type, message });

      window.setTimeout(() => {
        setNoteStatus((current) => ({ ...current, open: false }));
      }, 3500);
    },
    []
  );


  /* -------------------------------------------------------------------------- */
  /* Refresh Notes Handler */
  /* Loads the latest backend data and updates the page state used by the interface. */
  /* -------------------------------------------------------------------------- */

  const refreshNotes = useCallback(async () => {
    setIsLoadingNotes(true);

    try {
      const notes = await listNotes();
      setNoteList(notes);
    } catch (error: unknown) {
      console.error(error);

      showNoteStatus(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to load your saved notes. Please refresh the page. If this continues, sign in again and check that the backend is running."
        )
      );
    } finally {
      setIsLoadingNotes(false);
      setHasLoadedNotes(true);
    }
  }, [showNoteStatus]);

  /* -------------------------------------------------------------------------- */
  /* Side Effects */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);


  /* -------------------------------------------------------------------------- */
  /* Handle New Note Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const handleNewNote = useCallback(() => {
    setSelectedNoteId(null);
    setNoteTitle("");
    setNoteContent("");
    setReflection("");
    setConfidence(5);
    setIsFavorite(false);

    showNoteStatus(
      "info",
      tx("learning.status.newNote", "New note started. You can now write or paste your health information.")
    );
  }, [showNoteStatus, tx]);


  /* -------------------------------------------------------------------------- */
  /* Handle Select Note Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const handleSelectNote = useCallback(
    async (noteId: string) => {
      try {
        const note = await getNote(noteId);

        setSelectedNoteId(note.id);
        setNoteTitle(note.title ?? "");
        setNoteContent(note.content);
        setReflection(note.reflection ?? "");
        setConfidence(note.confidence ?? 5);
        setIsFavorite(note.isFavorite);

        showNoteStatus(
          "info",
          tx("learning.status.noteLoaded", "Note loaded. You can edit it, export it, or use it for AI summary and quiz.")
        );
      } catch (error: unknown) {
        console.error(error);

        showNoteStatus(
          "error",
          getFriendlyErrorMessage(
            error,
            "Failed to load this note. It may have been deleted or the server may be unavailable. Please refresh and try again."
          )
        );
      }
    },
    [showNoteStatus, tx]
  );


  /* -------------------------------------------------------------------------- */
  /* Save Note Internal Handler */
  /* Handles this user action and keeps the backend data and visible UI in sync. */
  /* -------------------------------------------------------------------------- */

  const saveNoteInternal = useCallback(async (): Promise<string | null> => {
    if (!noteContent.trim()) {
      showNoteStatus(
        "info",
        tx(
          "learning.status.writeBeforeSaving",
          "Please write or paste some note content before saving."
        )
      );
      return null;
    }

    try {
      let saved: Note;

      const payload = {
        title: noteTitle.trim() ? noteTitle.trim() : null,
        content: noteContent,
        reflection,
        confidence,
        isFavorite,
      };

      if (!selectedNoteId) {
        saved = await createNote(payload);
        setSelectedNoteId(saved.id);
      } else {
        saved = await updateNote(selectedNoteId, payload);
      }

      setNoteTitle(saved.title ?? "");
      setNoteContent(saved.content);
      setReflection(saved.reflection ?? "");
      setConfidence(saved.confidence ?? 5);
      setIsFavorite(saved.isFavorite);

      await refreshNotes();

      return saved.id;
    } catch (error: unknown) {
      console.error(error);

      showNoteStatus(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to save your note. Please check your internet/backend connection and try again."
        )
      );

      return null;
    }
  }, [
    confidence,
    isFavorite,
    noteContent,
    noteTitle,
    reflection,
    refreshNotes,
    selectedNoteId,
    showNoteStatus,
    tx,
  ]);


  /* -------------------------------------------------------------------------- */
  /* Handle Save Note Handler */
  /* Handles this user action and keeps the backend data and visible UI in sync. */
  /* -------------------------------------------------------------------------- */

  const handleSaveNote = useCallback(async () => {
    setIsSavingNote(true);

    const wasExistingNote = Boolean(selectedNoteId);
    const savedId = await saveNoteInternal();

    if (savedId) {
      showNoteStatus(
        "success",
        wasExistingNote
          ? tx("learning.status.changesSaved", "Changes saved successfully.")
          : tx("learning.status.noteSaved", "Note saved successfully.")
      );
    }

    setIsSavingNote(false);
  }, [saveNoteInternal, selectedNoteId, showNoteStatus, tx]);


  const [deleteArmed, setDeleteArmed] = useState(false);

  /* -------------------------------------------------------------------------- */
  /* Handle Delete Note Handler */
  /* Handles the delete flow, including validation, backend calls, and UI cleanup. */
  /* -------------------------------------------------------------------------- */

  const handleDeleteNote = useCallback(async () => {
    if (!selectedNoteId) {
      showNoteStatus(
        "info",
        tx("learning.status.selectNoteFirst", "Please select a saved note before deleting.")
      );
      return;
    }

    if (!deleteArmed) {
      setDeleteArmed(true);
      showNoteStatus(
        "info",
        tx(
          "learning.status.confirmDelete",
          "Click Delete again to confirm. This will permanently remove the note."
        )
      );

      window.setTimeout(() => {
        setDeleteArmed(false);
      }, 3000);

      return;
    }

    try {
      await deleteNote(selectedNoteId);

      handleNewNote();
      await refreshNotes();

      showNoteStatus(
        "success",
        tx("learning.status.noteDeleted", "Note deleted successfully.")
      );
    } catch (error: unknown) {
      console.error(error);

      showNoteStatus(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to delete the note. Please refresh and try again."
        )
      );
    } finally {
      setDeleteArmed(false);
    }
  }, [
    deleteArmed,
    handleNewNote,
    refreshNotes,
    selectedNoteId,
    showNoteStatus,
    tx,
  ]);


  /* -------------------------------------------------------------------------- */
  /* Handle Toggle Favourite Handler */
  /* Handles this user action and keeps the backend data and visible UI in sync. */
  /* -------------------------------------------------------------------------- */

  const handleToggleFavourite = useCallback(async () => {
    if (!selectedNoteId) {
      showPageStatus(
        "info",
        tx(
          "learning.status.saveBeforeFavourite",
          "Please save the note first, then you can add it to favourites."
        )
      );
      return;
    }

    const nextFavorite = !isFavorite;

    setIsFavorite(nextFavorite);

    try {
      const saved = await updateNote(selectedNoteId, {
        isFavorite: nextFavorite,
      });

      setIsFavorite(saved.isFavorite);

      setNoteList((previousNotes) =>
        previousNotes.map((note) => (note.id === saved.id ? saved : note))
      );

      showPageStatus(
        "success",
        saved.isFavorite
          ? tx("learning.status.savedToFavourites", "Saved to favourites.")
          : tx("learning.status.removedFromFavourites", "Removed from favourites.")
      );
    } catch (error: unknown) {
      console.error(error);

      setIsFavorite(!nextFavorite);

      showPageStatus(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to update favourites. Please check your connection and try again."
        )
      );
    }
  }, [isFavorite, selectedNoteId, showPageStatus, tx]);


  /* -------------------------------------------------------------------------- */
  /* Handle Export Pdf Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const handleExportPDF = useCallback(() => {
    if (!noteContent.trim()) {
      showPageStatus(
        "info",
        tx(
          "learning.status.writeBeforeExport",
          "Please write or select a note before exporting it as a PDF."
        )
      );
      return;
    }

    const doc = new jsPDF("portrait", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    let y = 18;

    const addNewPageIfNeeded = (spaceNeeded = 12) => {
      if (y + spaceNeeded > pageHeight - 16) {
        doc.addPage();
        y = 18;
      }
    };

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, y, contentWidth, 20, 4, 4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(
      tx("learning.pdf.header", "MediMind Lite - Learning Notes"),
      margin + 5,
      y + 8
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${tx("learning.pdf.exported", "Exported")}: ${new Date().toLocaleString()}`,
      margin + 5,
      y + 15
    );

    y += 30;

    const addSection = (title: string, body: string) => {
      addNewPageIfNeeded(20);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, "F");

      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, margin + 4, y + 6.5);

      y += 14;

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);

      const lines = doc.splitTextToSize(
        body || tx("learning.pdf.notProvided", "Not provided."),
        contentWidth - 4
      );

      lines.forEach((line: string) => {
        addNewPageIfNeeded(8);
        doc.text(line, margin + 2, y);
        y += 5.8;
      });

      y += 8;
    };

    addSection(
      tx("learning.pdf.title", "Title"),
      noteTitle.trim() || tx("learning.untitledNote", "Untitled Note")
    );

    addSection(tx("learning.pdf.healthNotes", "Health Notes"), noteContent);
    addSection(tx("learning.pdf.reflection", "Personal Reflection"), reflection);
    addSection(
      tx("learning.pdf.confidence", "Confidence Rating"),
      `${confidence}/10`
    );

    addSection(
      tx("learning.pdf.disclaimerTitle", "Important Disclaimer"),
      tx(
        "learning.pdf.disclaimerText",
        "This document is for educational support only. It is not medical advice, diagnosis, or treatment guidance. Always consult a healthcare professional for medical decisions."
      )
    );

    const safeTitle = (noteTitle.trim() || "medimind-learning-note")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();

    doc.save(`${safeTitle}.pdf`);

    showPageStatus(
      "success",
      tx("learning.status.exportedPdf", "Learning note exported as PDF.")
    );
  }, [confidence, noteContent, noteTitle, reflection, showPageStatus, tx]);


  const canGenerateAI =
    noteContent.trim().length > 0 &&
    reflection.trim().length > 0 &&
    Number.isFinite(confidence) &&
    confidence >= 1;

  /* -------------------------------------------------------------------------- */
  /* Handle Generate Ai Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const handleGenerateAI = useCallback(async () => {
    if (!canGenerateAI) {
      showPageStatus(
        "info",
        tx(
          "learning.status.completeStepsFirst",
          "Please complete your notes, reflection, and confidence rating before opening the AI summary."
        )
      );
      return;
    }

    setIsGeneratingAI(true);

    try {
      const savedNoteId = await saveNoteInternal();

      if (!savedNoteId) return;

      sessionStorage.setItem(
        "mm_learning_context",
        JSON.stringify({
          noteId: savedNoteId,
          title: noteTitle.trim() || null,
          note: noteContent,
          reflection,
          confidence,
          createdAt: new Date().toISOString(),
        })
      );

      showPageStatus(
        "success",
        tx("learning.status.openingAi", "Saved. Opening AI summary...")
      );

      router.push(`/chatbot_InteractionPage?session=new&noteId=${savedNoteId}`);
    } catch (error: unknown) {
      console.error(error);

      showPageStatus(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to open the AI summary. Please save your note and try again."
        )
      );
    } finally {
      setIsGeneratingAI(false);
    }
  }, [
    canGenerateAI,
    confidence,
    noteContent,
    noteTitle,
    reflection,
    router,
    saveNoteInternal,
    showPageStatus,
    tx,
  ]);


  /* -------------------------------------------------------------------------- */
  /* Handle Open Quiz Modal Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const handleOpenQuizModal = useCallback(() => {
    const firstNote = noteList[0];
    const noteIdToSelect = selectedNoteId ?? firstNote?.id;

    if (!noteIdToSelect) {
      showPageStatus(
        "info",
        tx(
          "learning.status.saveBeforeQuiz",
          "Please save at least one note first. The quiz is generated from saved note content."
        )
      );
      return;
    }

    setSelectedQuizNoteId(noteIdToSelect);
    setShowQuizModal(true);
  }, [noteList, selectedNoteId, showPageStatus, tx]);


  /* -------------------------------------------------------------------------- */
  /* Additional Side Effect */
  /* Runs browser or data-loading work after render, such as fetching data, syncing preferences, or cleaning up listeners. */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!hasLoadedNotes) return;
    if (searchParams.get("openQuiz") !== "true") return;

    handleOpenQuizModal();
    router.replace("/learning_workspace");
  }, [handleOpenQuizModal, hasLoadedNotes, router, searchParams]);

  /* -------------------------------------------------------------------------- */
  /* Handle Start Quiz Handler */
  /* Keeps this component action separate so the render section stays easier to read. */
  /* -------------------------------------------------------------------------- */

  const handleStartQuiz = useCallback(async () => {
    if (!selectedQuizNoteId) {
      showPageStatus(
        "info",
        tx("learning.status.chooseNoteFirst", "Please choose a saved note first.")
      );
      return;
    }

    setIsStartingQuiz(true);

    try {
      let noteIdForQuiz = selectedQuizNoteId;

      if (selectedNoteId && selectedQuizNoteId === selectedNoteId) {
        const savedId = await saveNoteInternal();

        if (!savedId) return;

        noteIdForQuiz = savedId;
      }

      const safeTimeLimitMinutes = Math.max(
        1,
        Math.min(120, quizTimeLimitMinutes)
      );

      const attempt = await generateQuiz({
        noteId: noteIdForQuiz,
        questionCount: quizQuestionCount,
        revealMode: quizRevealMode,
        timerEnabled: quizTimerEnabled,
        timeLimitSeconds: quizTimerEnabled ? safeTimeLimitMinutes * 60 : null,
      });

      setShowQuizModal(false);
      router.push(`/quiz/${attempt.id}?from=learning_workspace`);
    } catch (error: unknown) {
      console.error(error);

      showPageStatus(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to start the quiz. Please make sure the note is saved and the backend is running."
        )
      );
    } finally {
      setIsStartingQuiz(false);
    }
  }, [
    quizQuestionCount,
    quizRevealMode,
    quizTimerEnabled,
    quizTimeLimitMinutes,
    router,
    saveNoteInternal,
    selectedNoteId,
    selectedQuizNoteId,
    showPageStatus,
    tx,
  ]);

  const charCount = noteContent.length;

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/*
        Page Header and Top Actions
        Shows the workspace title, subtitle, favourite action, PDF export action, and page-level messages.
      */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
              {tx("learning.title", "Learning Workspace")}
            </h1>

            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {tx(
                "learning.subtitle",
                "Notes → Reflection → Confidence → AI summary → Quiz"
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleToggleFavourite}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <lucideReact.Star
                className={`h-4 w-4 ${
                  isFavorite
                    ? "fill-yellow-400 text-yellow-500"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              />

              {isFavorite
                ? tx("learning.favourited", "Favourited")
                : tx("learning.addToFavourites", "Add to Favourites")}
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <lucideReact.Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              {tx("learning.exportPdf", "Export PDF")}
            </button>
          </div>
        </div>

        {/*
          Page Feedback Banner
          Displays success, error, or information messages that apply to the whole Learning Workspace page.
        */}
        {pageStatus.open && (
          <StatusBanner
            type={pageStatus.type}
            message={pageStatus.message}
            onClose={() =>
              setPageStatus((current) => ({ ...current, open: false }))
            }
          />
        )}
      </div>

      {/*
        Notes Workspace Card
        Groups the saved-notes sidebar, note editor, and note management buttons in one working area.
      */}
      <Card>
        {/*
          Notes Card Header
          Shows the notes section title, character count, and whether the user is editing an existing note.
        */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {tx("learning.healthNotesTitle", "Your Health Notes")}
            </h2>

            <p className="text-sm text-slate-500">
              {charCount} {tx("learning.characters", "characters")}{" "}
              {selectedNoteId
                ? tx("learning.editingSavedNote", "• Editing saved note")
                : tx("learning.newNoteLabel", "• New note")}
            </p>
          </div>

          {/*
            Note Action Buttons
            Contains refresh, new note, save, and delete controls for the currently selected note.
          */}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={refreshNotes}
              disabled={isLoadingNotes}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <lucideReact.RefreshCw
                className={`h-4 w-4 ${isLoadingNotes ? "animate-spin" : ""}`}
              />
              {tx("learning.refresh", "Refresh")}
            </button>

            <button
              type="button"
              onClick={handleNewNote}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <lucideReact.Plus className="h-4 w-4" />
              {tx("learning.new", "New")}
            </button>

            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isSavingNote || isGeneratingAI}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <lucideReact.Save className="h-4 w-4" />
              {isSavingNote
                ? tx("learning.saving", "Saving...")
                : tx("learning.save", "Save")}
            </button>

            <button
              type="button"
              onClick={handleDeleteNote}
              disabled={!selectedNoteId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <lucideReact.Trash2 className="h-4 w-4" />
              {deleteArmed
                ? tx("learning.confirmDelete", "Confirm Delete")
                : tx("learning.delete", "Delete")}
            </button>
          </div>
        </div>

        {/*
          Notes Sidebar and Editor Layout
          Splits the card into the saved-notes list on the left and the editable note fields on the right.
        */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/*
            Saved Notes List
            Lists saved notes so the user can reopen and edit previous learning content.
          */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:col-span-1">
            <div className="mb-2 text-sm font-semibold">
              {tx("learning.savedNotes", "Saved Notes")}
            </div>

            {/*
              Saved Notes Empty State
              Explains what to do when no notes have been saved yet.
            */}
            {noteList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  {tx("learning.noSavedNotesYet", "No saved notes yet")}
                </div>

                <p className="mt-1">
                  {tx(
                    "learning.noSavedNotesHint",
                    "Add your first note in the editor, then click Save."
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/*
                  Saved Note Buttons
                  Creates one selectable button for each saved note in the sidebar list.
                */}
                {noteList.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNote(note.id)}
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                      "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                      selectedNoteId === note.id
                        ? "border-slate-900 bg-slate-50 dark:border-slate-200 dark:bg-slate-900"
                        : "",
                    ].join(" ")}
                  >
                    <div className="font-medium">
                      {note.title?.trim()
                        ? note.title
                        : tx("learning.untitledNote", "Untitled Note")}
                    </div>

                    <div className="line-clamp-1 text-xs text-slate-500">
                      {note.content}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/*
            Note Editor Fields
            Contains the title input, main note textarea, and note-specific feedback message.
          */}
          <div className="md:col-span-2">
            <input
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder={tx(
                "learning.titlePlaceholder",
                "Optional title e.g., Blood Pressure Notes"
              )}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
            />

            <textarea
              placeholder={tx(
                "learning.notePlaceholder",
                "Write or paste your health information here..."
              )}
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              className="mt-3 min-h-50 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-slate-200/20"
            />

            {/*
              Note Feedback Banner
              Shows save, update, or delete feedback that only relates to the current note.
            */}
            {noteStatus.open && (
              <div className="mt-3">
                <StatusBanner
                  type={noteStatus.type}
                  message={noteStatus.message}
                  onClose={() =>
                    setNoteStatus((current) => ({ ...current, open: false }))
                  }
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/*
        Personal Reflection Card
        Lets the user record what they learned and how they might apply the note.
      */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {tx("learning.reflectionTitle", "Personal Reflection")}
        </h2>

        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {tx(
            "learning.reflectionDesc",
            "Write what you learned and how you will apply it."
          )}
        </p>

        <textarea
          placeholder={tx(
            "learning.reflectionPlaceholder",
            "What did you learn? How will you apply this?"
          )}
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          className="mt-4 min-h-35 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-slate-200/20"
        />
      </Card>

      {/*
        Confidence Rating Card
        Lets the user rate confidence from 1 to 10 so progress tracking has useful learning data.
      */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {tx("learning.confidenceTitle", "Confidence Level")}
        </h2>

        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {tx(
            "learning.confidenceDesc",
            "How confident do you feel about this topic?"
          )}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {tx("learning.low", "Low")}
          </span>

          <span className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {confidence}/10
          </span>

          <span className="text-sm text-slate-500">
            {tx("learning.high", "High")}
          </span>
        </div>

        <input
          className="mt-4 w-full"
          type="range"
          min={1}
          max={10}
          step={1}
          value={confidence}
          onChange={(event) => setConfidence(parseInt(event.target.value, 10))}
        />
      </Card>

      {/*
        AI Summary Action Card
        Explains the AI summary step and opens the chatbot flow when the required learning fields are ready.
      */}
      <Card className="bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <lucideReact.Sparkles className="h-5 w-5" />
              {tx("learning.aiSummaryTitle", "AI Summary")}
            </h2>

            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {tx(
                "learning.aiSummaryDesc",
                "Complete the three steps above, then continue to generate your AI summary in chat."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={!canGenerateAI || isGeneratingAI || isSavingNote}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800 md:w-auto"
          >
            <lucideReact.ArrowRight className="h-5 w-5" />
            {isGeneratingAI
              ? tx("learning.savingOpening", "Saving & Opening...")
              : tx("learning.continueAiSummary", "Continue to AI Summary")}
          </button>
        </div>

        {/*
          AI Summary Requirements Message
          Reminds the user which fields must be completed before starting the AI summary.
        */}
        {!canGenerateAI && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {tx("learning.required", "Required")}:{" "}
            <span className="font-semibold">{tx("learning.notes", "Notes")}</span>{" "}
            +{" "}
            <span className="font-semibold">
              {tx("learning.reflection", "Reflection")}
            </span>{" "}
            +{" "}
            <span className="font-semibold">
              {tx("learning.confidence", "Confidence")}
            </span>
            .
          </div>
        )}
      </Card>

      {/*
        Quiz Setup Entry Card
        Introduces quiz generation and opens the setup modal for saved notes.
      */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {tx("learning.takeQuizTitle", "Take a Quiz")}
        </h2>

        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {tx(
            "learning.takeQuizDesc",
            "Choose a saved note, select your options, then start a quiz."
          )}
        </p>

        <button
          type="button"
          onClick={handleOpenQuizModal}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
        >
          <lucideReact.BookCheck className="h-4 w-4" />
          {tx("learning.chooseNoteStartQuiz", "Choose Note & Start Quiz")}
        </button>

        {/*
          Quiz Setup Modal
          Collects the note selection and quiz options before generating the quiz attempt.
        */}
        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {tx("learning.quizModalTitle", "Set up your quiz")}
                  </div>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {tx(
                      "learning.quizModalDesc",
                      "Choose a saved note and quiz options. The quiz will be generated and saved in the backend."
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  disabled={isStartingQuiz}
                  className="rounded-xl border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
                >
                  {tx("common.close", "Close")}
                </button>
              </div>

              {/*
                Quiz Note Selector
                Lets the user choose which saved note should be used to generate the quiz.
              */}
              <div className="mt-6">
                <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {tx("learning.chooseNote", "Choose note")}
                </div>

                <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  {noteList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">
                        {tx("learning.noSavedNotesYet", "No saved notes yet")}
                      </div>

                      <p className="mt-1">
                        {tx(
                          "learning.noSavedNotesQuizHint",
                          "Please write a note and click Save before starting a quiz."
                        )}
                      </p>
                    </div>
                  ) : (
                    noteList.map((note) => {
                      const active = selectedQuizNoteId === note.id;

                      return (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => setSelectedQuizNoteId(note.id)}
                          disabled={isStartingQuiz}
                          className={[
                            "w-full rounded-xl border px-3 py-2 text-left text-sm transition disabled:opacity-50",
                            active
                              ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
                              : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800",
                          ].join(" ")}
                        >
                          <div className="font-medium">
                            {note.title?.trim()
                              ? note.title
                              : tx("learning.untitledNote", "Untitled Note")}
                          </div>

                          <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                            {note.content}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {tx("learning.numberOfQuestions", "Number of questions")}
                </div>

                {/*
                  Question Count Options
                  Shows the allowed quiz sizes so the backend receives a controlled question count.
                */}
                <div className="grid grid-cols-3 gap-2">
                  {([10, 15, 20] as QuizQuestionCount[]).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuizQuestionCount(count)}
                      disabled={isStartingQuiz}
                      className={[
                        "rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50",
                        quizQuestionCount === count
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {tx("learning.showAnswers", "Show answers")}
                </div>

                {/*
                  Answer Reveal Options
                  Lets the user choose whether answers appear during practice or only after submission.
                */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setQuizRevealMode("end")}
                    disabled={isStartingQuiz}
                    className={[
                      "rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-50",
                      quizRevealMode === "end"
                        ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    <div className="font-semibold">
                      {tx("learning.answersAtEnd", "At the end")}
                    </div>
                    <div className="mt-1 text-xs opacity-80">
                      {tx(
                        "learning.answersAtEndDesc",
                        "Best for a real test experience."
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizRevealMode("after_each")}
                    disabled={isStartingQuiz}
                    className={[
                      "rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-50",
                      quizRevealMode === "after_each"
                        ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    <div className="font-semibold">
                      {tx("learning.answersAfterEach", "After each question")}
                    </div>
                    <div className="mt-1 text-xs opacity-80">
                      {tx(
                        "learning.answersAfterEachDesc",
                        "Best for learning while practising."
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/*
                Timer Options
                Lets the user enable an optional timer and choose a time limit for the quiz.
              */}
              <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {tx("learning.enableTimer", "Enable timer")}
                    </div>

                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {tx(
                        "learning.enableTimerDesc",
                        "Optional. The result page will show how long the quiz took."
                      )}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={quizTimerEnabled}
                    onChange={(event) =>
                      setQuizTimerEnabled(event.target.checked)
                    }
                    disabled={isStartingQuiz}
                    className="h-5 w-5"
                  />
                </label>

                {quizTimerEnabled && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {tx("learning.timeLimit", "Time limit")}
                    </label>

                    <select
                      value={quizTimeLimitMinutes}
                      onChange={(event) =>
                        setQuizTimeLimitMinutes(Number(event.target.value))
                      }
                      disabled={isStartingQuiz}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value={5}>{tx("learning.minutes5", "5 minutes")}</option>
                      <option value={10}>{tx("learning.minutes10", "10 minutes")}</option>
                      <option value={15}>{tx("learning.minutes15", "15 minutes")}</option>
                      <option value={20}>{tx("learning.minutes20", "20 minutes")}</option>
                      <option value={30}>{tx("learning.minutes30", "30 minutes")}</option>
                    </select>
                  </div>
                )}
              </div>

              {/*
                Quiz Modal Actions
                Provides cancel and start buttons for closing the modal or creating the quiz.
              */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  disabled={isStartingQuiz}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {tx("common.cancel", "Cancel")}
                </button>

                <button
                  type="button"
                  onClick={handleStartQuiz}
                  disabled={!selectedQuizNoteId || isStartingQuiz}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStartingQuiz
                    ? tx("learning.generatingQuiz", "Generating quiz...")
                    : tx("learning.startQuiz", "Start Quiz")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
