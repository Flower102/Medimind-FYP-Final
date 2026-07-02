
"use client";


/* -------------------------------------------------------------------------- */
/* File Overview */
/* AI Chat Interaction Page. Runs the live AI chat experience, loads or creates saved chats, handles file uploads, exports, and chat deletion. */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Imports */
/* Brings in React, Next.js utilities, shared components, icons, and API helpers used by this file. */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";

import {
  Send,
  Paperclip,
  MoreVertical,
  Download,
  Trash2,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  X,
  FileText,
  Lightbulb,
} from "lucide-react";

import { sendChatMessage, type ChatMsg } from "@/src/lib/chatApi";

import {
  createBackendChatSession,
  getBackendChatSession,
  addBackendChatSessionMessage,
  deleteBackendChatSession,
} from "@/src/lib/chatSessionsApi";


/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type Msg = ChatMsg & {
  suggestions?: string[];
};

/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type PageBanner =
  | { open: false }
  | { open: true; type: "success" | "error" | "info"; message: string };

/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type LearningContext = {
  noteId?: string;
  title?: string | null;
  note?: string;
  reflection?: string;
  confidence?: number;
  createdAt?: string;
};

/* -------------------------------------------------------------------------- */
/* Type Definitions */
/* Defines the data shapes used for props, API responses, form values, and page state. */
/* -------------------------------------------------------------------------- */

type FormattedBlock =
  | { type: "section"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };


/* -------------------------------------------------------------------------- */
/* Cn Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

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
  const raw = getRawErrorMessage(error).trim();

  switch (raw) {
    case "AUTH_MISSING_TOKEN":
    case "AUTH_INVALID_TOKEN":
    case "AUTH_SESSION_EXPIRED":
    case "AUTH_MISSING_REFRESH":
    case "AUTH_INVALID_REFRESH":
    case "AUTH_REFRESH_EXPIRED":
      return "Your session has expired or you are not signed in. Please sign in again, then try sending your message one more time.";

    case "AUTH_USER_NOT_FOUND":
      return "We could not find your account. Please sign in again or create a new account.";

    case "CHAT_SESSION_NOT_FOUND":
    case "NOT_FOUND":
    case "REQUEST_FAILED_404":
      return "This saved chat could not be found. It may have already been deleted. Please go back to the chat list and refresh.";

    case "EMPTY_CHAT_MESSAGE":
      return "The message is empty. Please type a question or attach a file before sending.";

    case "INVALID_CHAT_ROLE":
      return "The chat message could not be saved because its role was invalid. Please refresh and try again.";

    case "REQUEST_FAILED_413":
      return "One of the files is too large. Please upload a smaller file and try again.";

    case "REQUEST_FAILED_422":
    case "VALIDATION_ERROR":
      return "Some information was missing or invalid. Please check your message or file and try again.";

    case "REQUEST_FAILED_500":
    case "INTERNAL_SERVER_ERROR":
      return "The server had a problem while processing your chat. Please try again. If it continues, check the backend terminal logs.";

    case "NETWORK_ERROR":
    case "BACKEND_CONNECTION_FAILED":
      return "The app could not connect to the backend server. Please check that FastAPI is running and try again.";

    default:
      break;
  }

  if (
    raw.includes(" ") &&
    !raw.startsWith("REQUEST_FAILED_") &&
    !/^[A-Z0-9_]+$/.test(raw)
  ) {
    return raw;
  }

  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Clean List Text Helper */
/* Keeps validation, detection, or text-cleaning logic separate from the main render code. */
/* -------------------------------------------------------------------------- */

function cleanListText(line: string) {
  return line.replace(/^[-•*]\s*/, "").trim();
}

/* -------------------------------------------------------------------------- */
/* Strip Number Prefix Helper */
/* Keeps validation, detection, or text-cleaning logic separate from the main render code. */
/* -------------------------------------------------------------------------- */

function stripNumberPrefix(line: string) {
  return line.replace(/^\d+[\).]\s*/, "").trim();
}

/* -------------------------------------------------------------------------- */
/* Normalise Heading Helper */
/* Converts backend or mixed-format data into the frontend shape used by the rest of the app. */
/* -------------------------------------------------------------------------- */

function normaliseHeading(line: string) {
  return stripNumberPrefix(cleanListText(line))
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Is Main Section Heading Helper */
/* Keeps validation, detection, or text-cleaning logic separate from the main render code. */
/* -------------------------------------------------------------------------- */

function isMainSectionHeading(line: string) {
  const text = normaliseHeading(line);

  return [
    "short summary",
    "summary",
    "key points",
    "what this means",
    "simple explanation",
    "foods to choose",
    "foods to limit",
    "when to get help",
    "important note",
    "next steps",
    "conclusion",
    "suggestions",
  ].includes(text);
}

/* -------------------------------------------------------------------------- */
/* Is Sub Heading Helper */
/* Keeps validation, detection, or text-cleaning logic separate from the main render code. */
/* -------------------------------------------------------------------------- */

function isSubHeading(line: string) {
  const cleaned = cleanListText(line);
  return cleaned.endsWith(":") && cleaned.length <= 48;
}

/* -------------------------------------------------------------------------- */
/* Looks Like List Item Helper */
/* Keeps validation, detection, or text-cleaning logic separate from the main render code. */
/* -------------------------------------------------------------------------- */

function looksLikeListItem(line: string) {
  const trimmed = line.trim();
  const cleaned = cleanListText(stripNumberPrefix(trimmed));

  if (!cleaned) return false;
  if (cleaned.endsWith(":")) return false;
  if (/^[-•*]\s+/.test(trimmed)) return true;
  if (/^\d+[\).]\s+/.test(trimmed)) return true;

  return cleaned.length <= 120;
}

/* -------------------------------------------------------------------------- */
/* Split Inline Heading Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function splitInlineHeading(line: string) {
  const match = line.match(/^([A-Za-z][A-Za-z\s]{2,40}):\s+(.+)$/);
  if (!match) return null;

  const heading = match[1].trim();
  const text = match[2].trim();

  const knownHeadings = [
    "summary",
    "short summary",
    "key points",
    "what this means",
    "next steps",
    "important note",
    "conclusion",
  ];

  if (!knownHeadings.includes(heading.toLowerCase())) return null;

  return { heading, text };
}

/* -------------------------------------------------------------------------- */
/* Format File Size Helper */
/* Formats values into readable text before they are shown in the interface. */
/* -------------------------------------------------------------------------- */

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/* Create Chat Title Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function createChatTitle(messages: Msg[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")
    ?.content;

  if (!firstUserMessage) return "New AI Learning Chat";

  const cleaned = firstUserMessage
    .replace(/\s+/g, " ")
    .replace("Please help me study this health topic.", "")
    .trim();

  return cleaned.length > 45 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

/* -------------------------------------------------------------------------- */
/* To Backend Message Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function toBackendMessage(message: Msg): ChatMsg {
  return {
    role: message.role,
    content: message.content,
  };
}


/* -------------------------------------------------------------------------- */
/* Status Banner Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function StatusBanner({
  type,
  message,
}: {
  type: "success" | "error" | "info";
  message: string;
}) {
  const styles =
    type === "success"
      ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950 dark:text-green-100"
      : type === "error"
        ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950 dark:text-red-100"
        : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100";

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-6", styles)}>
      {message}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Build Formatted Blocks Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function buildFormattedBlocks(content: string): FormattedBlock[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: FormattedBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const inlineHeading = splitInlineHeading(line);

    if (inlineHeading) {
      blocks.push({ type: "section", text: inlineHeading.heading });
      blocks.push({ type: "paragraph", text: inlineHeading.text });
      index += 1;
      continue;
    }

    if (isMainSectionHeading(line)) {
      blocks.push({
        type: "section",
        text: stripNumberPrefix(cleanListText(line)).replace(/:$/, ""),
      });
      index += 1;
      continue;
    }

    if (isSubHeading(line)) {
      blocks.push({
        type: "subheading",
        text: stripNumberPrefix(cleanListText(line)).replace(/:$/, ""),
      });

      const items: string[] = [];
      let nextIndex = index + 1;

      while (nextIndex < lines.length) {
        const next = lines[nextIndex];

        if (isMainSectionHeading(next) || isSubHeading(next)) break;
        if (!looksLikeListItem(next)) break;

        items.push(stripNumberPrefix(cleanListText(next)));
        nextIndex += 1;
      }

      if (items.length > 0) {
        blocks.push({ type: "list", items });
        index = nextIndex;
        continue;
      }

      index += 1;
      continue;
    }

    const possibleItems: string[] = [];
    let nextIndex = index;

    while (nextIndex < lines.length) {
      const next = lines[nextIndex];

      if (isMainSectionHeading(next) || isSubHeading(next)) break;
      if (!looksLikeListItem(next)) break;

      possibleItems.push(stripNumberPrefix(cleanListText(next)));
      nextIndex += 1;
    }

    if (possibleItems.length >= 3) {
      blocks.push({ type: "list", items: possibleItems });
      index = nextIndex;
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: stripNumberPrefix(cleanListText(line)),
    });

    index += 1;
  }

  return blocks;
}

/* -------------------------------------------------------------------------- */
/* Assistant Plain Formatted Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function AssistantPlainFormatted({ content }: { content: string }) {
  const blocks = buildFormattedBlocks(content);

  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="text-[17px] leading-8 text-slate-800 dark:text-slate-100">
      {blocks.map((block, index) => {
        if (block.type === "section") {
          return (
            <section key={index} className="mt-8 first:mt-0">
              <div className="mb-4 border-t border-slate-200 dark:border-slate-700" />
              <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                {block.text}
              </div>
            </section>
          );
        }

        if (block.type === "subheading") {
          return (
            <div
              key={index}
              className="mb-2 mt-5 text-[16px] font-semibold text-slate-900 dark:text-slate-50"
            >
              {block.text}
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="my-4 space-y-3 pl-6 text-[17px] leading-8">
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="list-disc marker:text-blue-400 dark:marker:text-blue-500"
                >
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="my-4 text-[17px] leading-8">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Suggestion Buttons Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function SuggestionButtons({
  suggestions,
  onPick,
}: {
  suggestions?: string[];
  onPick: (suggestion: string) => void;
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
          <Lightbulb className="h-4 w-4" />
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Suggested next steps
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Pick a follow-up question to continue
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion}-${index}`}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Assistant Message Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function AssistantMessage({
  content,
  suggestions,
  onSuggestionClick,
}: {
  content: string;
  suggestions?: string[];
  onSuggestionClick: (suggestion: string) => void;
}) {
  /* -------------------------------------------------------------------------- */
  /* Component Markup */
  /* Renders the visible UI for this specific component or page section. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="w-full max-w-6xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/80 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Sparkles className="h-4 w-4" />
            </div>

            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                AI Response
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Summary, key points, and suggested follow-up questions
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-7">
          <AssistantPlainFormatted content={content} />

          <SuggestionButtons
            suggestions={suggestions}
            onPick={onSuggestionClick}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* User Message Function */
/* Keeps this piece of logic isolated so the rest of the file is easier to scan and explain. */
/* -------------------------------------------------------------------------- */

function UserMessage({ content }: { content: string }) {
  return (
    <div className="max-w-5xl whitespace-pre-wrap rounded-[30px] bg-blue-600 px-6 py-5 text-[17px] leading-8 text-white shadow-sm">
      {content}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Main Page Component */
/* Coordinates page data, user interaction, and the final user interface rendered by this route. */
/* -------------------------------------------------------------------------- */

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionIdFromUrl = searchParams.get("chatId");
  const isNewSession = searchParams.get("session") === "new";
  const noteIdFromUrl = searchParams.get("noteId");
  const [chatId, setChatId] = useState<string | null>(sessionIdFromUrl);
  const chatIdRef = useRef<string | null>(sessionIdFromUrl);

  const sendInProgressRef = useRef(false);
  const autoStartedRef = useRef(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [banner, setBanner] = useState<PageBanner>({ open: false });

  const endRef = useRef<HTMLDivElement>(null);

  const learningCtx = useMemo(() => {
    if (typeof window === "undefined") return null;

    try {
      const raw = sessionStorage.getItem("mm_learning_context");
      return raw ? (JSON.parse(raw) as LearningContext) : null;
    } catch {
      return null;
    }
  }, []);

  const learningNoteId = noteIdFromUrl ?? learningCtx?.noteId ?? null;

  const chatSource =
    learningNoteId !== null ? "learning_workspace" : "direct_chat";

  const scrollToEnd = useCallback(() => {
    window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const showBanner = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setBanner({ open: true, type, message });

      window.setTimeout(() => {
        setBanner({ open: false });
      }, 3500);
    },
    []
  );

  const setCurrentChatId = useCallback((id: string) => {
    chatIdRef.current = id;
    setChatId(id);

    window.history.replaceState(
      null,
      "",
      `/chatbot_InteractionPage?chatId=${encodeURIComponent(id)}`
    );
  }, []);

 
  useEffect(() => {
    const savedChatId = sessionIdFromUrl;

    if (savedChatId === null) return;

    if (sendInProgressRef.current) return;

    let cancelled = false;

    async function loadSavedChat(id: string) {
      try {
        const saved = await getBackendChatSession(id);

        if (cancelled) return;

        const loadedChatId = String(saved.id);

        chatIdRef.current = loadedChatId;
        setChatId(loadedChatId);
        setMessages(saved.messages as Msg[]);
      } catch (error: unknown) {
        console.error("Failed to load saved chat:", error);

        if (!cancelled) {
          showBanner(
            "error",
            getFriendlyErrorMessage(
              error,
              "Could not load this saved chat. It may have been deleted, or your session may have expired."
            )
          );
        }
      }
    }

    loadSavedChat(savedChatId);

    return () => {
      cancelled = true;
    };
  }, [sessionIdFromUrl, showBanner]);

  const createBackendSession = useCallback(
    async (initialMessages: Msg[]) => {
      const saved = await createBackendChatSession({
        title: createChatTitle(initialMessages),
        messages: initialMessages.map(toBackendMessage),

        source: chatSource,

        noteId: learningNoteId,
      });

      const savedId = String(saved.id);
      setCurrentChatId(savedId);

      return savedId;
    },
    [chatSource, learningNoteId, setCurrentChatId]
  );

  const saveMessageToBackend = useCallback(
    async (sessionId: string, message: Msg) => {
      await addBackendChatSessionMessage(sessionId, toBackendMessage(message));
    },
    []
  );

  const handleOpenFilePicker = useCallback(() => {
    setAttachOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);

      if (files.length === 0) return;

      const maxFiles = 5;
      const maxSingleFileSize = 20 * 1024 * 1024;

      const validFiles = files
        .slice(0, maxFiles)
        .filter((file) => file.size <= maxSingleFileSize);

      if (validFiles.length === 0) {
        showBanner(
          "error",
          "The selected file is too large. Please choose a file smaller than 20 MB."
        );
        event.target.value = "";
        return;
      }

      if (files.length > maxFiles) {
        showBanner(
          "info",
          "Only the first 5 files were added. Please send fewer files at a time."
        );
      }

      setSelectedFiles((prev) => {
        const existing = new Set(
          prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
        );

        const uniqueFiles = validFiles.filter(
          (file) =>
            !existing.has(`${file.name}-${file.size}-${file.lastModified}`)
        );

        return [...prev, ...uniqueFiles].slice(0, maxFiles);
      });

      showBanner(
        "success",
        `${validFiles.length} file${validFiles.length === 1 ? "" : "s"} added.`
      );

      event.target.value = "";
    },
    [showBanner]
  );

  const removeSelectedFile = useCallback((indexToRemove: number) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  }, []);

  const send = useCallback(
    async (text?: string, auto = false) => {
      const messageText = (text ?? input).trim();

      if (!messageText && selectedFiles.length === 0) return;
      if (sendInProgressRef.current) return;

      sendInProgressRef.current = true;
      setIsLoading(true);

      if (!auto) setInput("");

      const filesToSend = [...selectedFiles];

      const attachmentText =
        filesToSend.length > 0
          ? `\n\nAttached files:\n${filesToSend
              .map((file) => `- ${file.name}`)
              .join("\n")}`
          : "";

      const visibleUserMessage =
        messageText || filesToSend.length > 0
          ? `${messageText || "Please analyse the attached file(s)."}${attachmentText}`
          : messageText;

      const userMessage: Msg = {
        role: "user",
        content: visibleUserMessage,
      };

      const updatedMessages: Msg[] = [...messages, userMessage];

      setMessages(updatedMessages);
      setSelectedFiles([]);
      scrollToEnd();

      let activeSessionId = chatIdRef.current;

      try {
        if (!activeSessionId) {
          activeSessionId = await createBackendSession(updatedMessages);
        } else {
          await saveMessageToBackend(activeSessionId, userMessage);
        }
        const payload: Parameters<typeof sendChatMessage>[0] = {
          messages: updatedMessages.map(toBackendMessage),
          ...(learningCtx?.note ? { note: learningCtx.note } : {}),
          ...(learningCtx?.reflection
            ? { reflection: learningCtx.reflection }
            : {}),
          ...(typeof learningCtx?.confidence === "number"
            ? { confidence: learningCtx.confidence }
            : {}),
        };
        const res = await sendChatMessage(payload, filesToSend);

        const assistantMessage: Msg = {
          role: "assistant",
          content: res.reply,
          suggestions: res.suggestions ?? [],
        };

        const finalMessages: Msg[] = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        await saveMessageToBackend(activeSessionId, assistantMessage);
        scrollToEnd();

      } catch (error: unknown) {
        console.error("Chat send failed:", error);

        const friendlyMessage = getFriendlyErrorMessage(
          error,
          "Something went wrong while sending or saving this chat. Please check that the backend is running, then try again."
        );

        const errorMessage: Msg = {
          role: "assistant",
          content: `Sorry — ${friendlyMessage}`,
          suggestions: [
            "Try again with a shorter message",
            "Check whether the backend is running",
          ],
        };

        setMessages([...updatedMessages, errorMessage]);
        showBanner("error", friendlyMessage);
        scrollToEnd();
      } finally {
        setIsLoading(false);
        sendInProgressRef.current = false;
      }
    },
    [
      input,
      selectedFiles,
      messages,
      learningCtx,
      createBackendSession,
      saveMessageToBackend,
      scrollToEnd,
      showBanner,
    ]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      send(suggestion);
    },
    [send]
  );

  useEffect(() => {
    if (!isNewSession) return;
    if (!learningCtx) return;
    if (messages.length > 0) return;
    if (isLoading) return;
    if (autoStartedRef.current) return;

    autoStartedRef.current = true;

    const introMsg = `
Please help me study this health topic.

My notes:
${learningCtx.note ?? ""}

My reflection:
${learningCtx.reflection ?? ""}

My confidence level:
${learningCtx.confidence ?? 0}/10

Please give me a clear, simple summary.
`.trim();

    send(introMsg, true);
  }, [isNewSession, learningCtx, messages.length, isLoading, send]);

  const handleExportPDF = useCallback(() => {
    if (messages.length === 0) {
      showBanner(
        "info",
        "There is no chat to export yet. Send a message first, then try again."
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
    doc.roundedRect(margin, y, contentWidth, 18, 4, 4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("AI Learning Chat", margin + 5, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin + 5, y + 13);

    y += 28;

    messages.forEach((message, index) => {
      const isUser = message.role === "user";
      const label = isUser ? "You" : "AI Response";

      addNewPageIfNeeded(20);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(
        isUser ? 239 : 248,
        isUser ? 246 : 250,
        isUser ? 255 : 252
      );

      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, "F");

      doc.setTextColor(isUser ? 37 : 15, isUser ? 99 : 23, isUser ? 235 : 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(label, margin + 4, y + 6.5);

      y += 14;

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);

      const cleanedText = message.content
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^[-•*]\s+/gm, "• ");

      const lines = doc.splitTextToSize(cleanedText, contentWidth - 4);

      lines.forEach((line: string) => {
        addNewPageIfNeeded(8);
        doc.text(line, margin + 2, y);
        y += 5.8;
      });

      if (message.suggestions && message.suggestions.length > 0) {
        addNewPageIfNeeded(10);

        doc.setFont("helvetica", "bold");
        doc.text("Suggested next steps:", margin + 2, y);

        y += 6;

        doc.setFont("helvetica", "normal");

        message.suggestions.forEach((suggestion) => {
          addNewPageIfNeeded(8);
          doc.text(`• ${suggestion}`, margin + 5, y);
          y += 5.8;
        });
      }

      y += 6;

      if (index < messages.length - 1) {
        addNewPageIfNeeded(8);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
      }
    });

    doc.save(`ai-learning-chat-${new Date().toISOString().slice(0, 10)}.pdf`);
    showBanner("success", "Chat exported as PDF.");
  }, [messages, showBanner]);

  const handleDeleteChat = useCallback(() => {
    setMenuOpen(false);
    setDeleteModalOpen(true);
  }, []);

  const confirmDeleteChat = useCallback(async () => {
    const idToDelete = chatIdRef.current ?? chatId;

    try {
      if (idToDelete) {
        await deleteBackendChatSession(idToDelete);
      }

      chatIdRef.current = null;
      setChatId(null);
      setMessages([]);
      setInput("");
      setSelectedFiles([]);
      setDeleteModalOpen(false);

      showBanner("success", "Chat deleted successfully.");
      router.push("/chatbots");
    } catch (error: unknown) {
      console.error("Failed to delete chat:", error);

      showBanner(
        "error",
        getFriendlyErrorMessage(
          error,
          "Failed to delete the chat. Please refresh the page and try again."
        )
      );
    }
  }, [chatId, router, showBanner]);

  /* -------------------------------------------------------------------------- */
  /* Chat Page Shell */
  /* Wraps the chatbot interface so the conversation fills the page correctly. */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/*
        Chat Feedback Banner
        Shows save, error, or delete feedback that applies to the current chat.
      */}
      {banner.open && (
        <div className="px-4 pt-4 sm:px-6">
          <div className="mx-auto w-full max-w-350">
            <StatusBanner type={banner.type} message={banner.message} />
          </div>
        </div>
      )}

      {/*
        Chat Header Bar
        Shows chat title, learning context, and top-level chat actions.
      */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
        <div className="mx-auto flex w-full max-w-350 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Bot className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
                AI Learning Chat
              </div>
              <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                Clear summaries, file support, and structured learning help
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((state) => !state)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={handleDeleteChat}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-slate-50 dark:text-red-400 dark:hover:bg-slate-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete chat
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/*
        Scrollable Conversation Area
        Keeps the message history scrollable while the composer stays available.
      */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-350 flex-col gap-6">
          {/*
            Empty Chat Prompt
            Shows starting guidance before the first message is sent.
          */}
          {messages.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="text-lg font-medium text-slate-900 dark:text-slate-50">
                Start a learning conversation
              </div>

              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Ask a question, upload a file, or return from Learning Workspace
                to auto-generate a summary.
              </div>
            </div>
          )}

          {/*
            Conversation Message List
            Renders each user or assistant message with the correct visual style.
          */}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className="flex max-w-full items-start gap-4">
                {message.role === "assistant" && (
                  <div className="mt-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:flex">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                {message.role === "assistant" ? (
                  <AssistantMessage
                    content={message.content}
                    suggestions={message.suggestions}
                    onSuggestionClick={handleSuggestionClick}
                  />
                ) : (
                  <div className="flex max-w-full items-start gap-4">
                    <UserMessage content={message.content} />

                    <div className="mt-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white sm:flex">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="mt-2 hidden h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:flex">
                <Bot className="h-4 w-4" />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-400" />
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />

                  <span className="ml-2 text-[15px] text-slate-500 dark:text-slate-400">
                    AI is thinking…
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/*
        Composer and Attachment Area
        Holds selected file previews, attachment controls, text input, and send button.
      */}
      <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
        <div className="mx-auto w-full max-w-350">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx,.csv,.xlsx,.ppt,.pptx"
            onChange={handleFilesSelected}
            className="hidden"
          />

          <div className="flex items-end gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAttachOpen((state) => !state)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Add attachment"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {attachOpen && (
                <div className="absolute bottom-16 left-0 z-20 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={handleOpenFilePicker}
                    className="w-full rounded-lg px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Add photos and files
                  </button>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 rounded-[30px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();

                    if (!isLoading) {
                      send();
                    }
                  }
                }}
                rows={1}
                placeholder="Ask a question..."
                className="max-h-40 min-h-8.5 w-full resize-none bg-transparent px-1 py-1 text-[17px] leading-7 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={() => send()}
              disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
              className="inline-flex h-14 shrink-0 items-center justify-center rounded-3xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/*
            Selected File Preview
            Shows files attached to the next message and lets the user remove them before sending.
          */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="flex max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />

                  <div className="min-w-0">
                    <div className="max-w-55 truncate font-medium">
                      {file.name}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.size)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Press Enter to send, Shift+Enter for a new line
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Delete this chat?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This will permanently remove the current saved conversation.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteChat}
                className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Delete chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
