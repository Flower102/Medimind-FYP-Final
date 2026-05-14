"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  AlertTriangle,
  Bot,
  FileText,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import {
  listChatSessions,
  toggleBackendChatSessionFavourite,
  type BackendChatSession,
} from "@/src/lib/chatSessionsApi";

import { listNotes, updateNote, type Note } from "@/src/lib/notesApi";
import { useI18n } from "@/src/i18n/I18nProvider";

type FavouriteTab = "notes" | "chats";

type FavouriteNote = Note & {
  isFavorite?: boolean;
  is_favorite?: boolean;
  reflection?: string | null;
  confidence?: number | null;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Checks both frontend and backend favourite field names.
 */
function isNoteFavourite(note: FavouriteNote) {
  return Boolean(note.isFavorite ?? note.is_favorite);
}

/**
 * Gets the best available note date.
 */
function getNoteDate(note: FavouriteNote) {
  return note.updatedAt ?? note.updated_at ?? note.createdAt ?? note.created_at;
}

/**
 * Formats dates safely.
 */
function formatDate(value: string | undefined, unknownDate: string) {
  if (!value) return unknownDate;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return unknownDate;

  return date.toLocaleString();
}

/**
 * Creates a short preview for notes and chats.
 */
function getPreview(text: string | null | undefined, fallback: string) {
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();

  if (!cleaned) return fallback;

  return cleaned.length > 150 ? `${cleaned.slice(0, 150)}...` : cleaned;
}

export default function FavouritesPage() {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const [tab, setTab] = useState<FavouriteTab>("notes");

  const [notes, setNotes] = useState<FavouriteNote[]>([]);
  const [chats, setChats] = useState<BackendChatSession[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Loads notes and chat sessions from the backend.
   *
   * Notes tab will show:
   * - favourite notes
   * - favourite chats created from Learning Workspace
   *
   * AI Chats tab will show:
   * - favourite chats created directly from Chatbots page
   */
  const loadFavourites = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [noteData, chatData] = await Promise.all([
        listNotes(),
        listChatSessions(),
      ]);

      setNotes(noteData as FavouriteNote[]);
      setChats(chatData);
    } catch (err) {
      console.error(err);
      setError(
        tx(
          "favourites.error.load",
          "Failed to load favourites. Please sign in again, then press Refresh."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [tx]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  /**
   * Favourite saved notes.
   */
  const favouriteNotes = useMemo(() => {
    return notes
      .filter(isNoteFavourite)
      .sort((a, b) => {
        const bTime = new Date(getNoteDate(b) ?? "").getTime() || 0;
        const aTime = new Date(getNoteDate(a) ?? "").getTime() || 0;
        return bTime - aTime;
      });
  }, [notes]);

  /**
   * Favourite chats created from Learning Workspace.
   *
   * These belong in the Notes tab because they were created from:
   * notes + reflection + confidence.
   */
  const favouriteLearningChats = useMemo(() => {
    return chats
      .filter((chat) => chat.isFavorite && chat.source === "learning_workspace")
      .sort((a, b) => {
        const bTime = new Date(b.updatedAt ?? "").getTime() || 0;
        const aTime = new Date(a.updatedAt ?? "").getTime() || 0;
        return bTime - aTime;
      });
  }, [chats]);

  /**
   * Favourite direct AI chats.
   *
   * These belong in the AI Chats tab because they were created directly
   * from the Chatbots page.
   */
  const favouriteDirectChats = useMemo(() => {
    return chats
      .filter((chat) => chat.isFavorite && chat.source === "direct_chat")
      .sort((a, b) => {
        const bTime = new Date(b.updatedAt ?? "").getTime() || 0;
        const aTime = new Date(a.updatedAt ?? "").getTime() || 0;
        return bTime - aTime;
      });
  }, [chats]);

  /**
   * Removes a note from favourites.
   */
  async function removeNoteFavourite(note: FavouriteNote) {
    try {
      await updateNote(String(note.id), {
        isFavorite: false,
      } as Partial<Note> & { isFavorite?: boolean });

      setNotes((prev) =>
        prev.map((item) =>
          String(item.id) === String(note.id)
            ? { ...item, isFavorite: false, is_favorite: false }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      setError(
        tx(
          "favourites.error.removeNote",
          "Failed to remove this note from favourites. Please refresh and try again."
        )
      );
    }
  }

  /**
   * Removes a chat from favourites.
   */
  async function removeChatFavourite(chat: BackendChatSession) {
    try {
      await toggleBackendChatSessionFavourite(chat.id, false);

      setChats((prev) =>
        prev.map((item) =>
          item.id === chat.id ? { ...item, isFavorite: false } : item
        )
      );
    } catch (err) {
      console.error(err);
      setError(
        tx(
          "favourites.error.removeChat",
          "Failed to remove this chat from favourites. Please refresh and try again."
        )
      );
    }
  }

  const notesTabCount = favouriteNotes.length + favouriteLearningChats.length;
  const chatsTabCount = favouriteDirectChats.length;

  const activeCount = tab === "notes" ? notesTabCount : chatsTabCount;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {tx("favourites.title", "Favourites")}
          </h1>

          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {tx(
              "favourites.subtitle",
              "Access your saved notes, Learning Workspace chats, and direct AI chats."
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={loadFavourites}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          {tx("common.refresh", "Refresh")}
        </button>
      </div>

      {/* Explanation card */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="font-semibold text-slate-900 dark:text-slate-50">
          {tx("favourites.info.title", "Saved for quick access")}
        </div>

        <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {tx(
            "favourites.info.desc",
            "Learning Workspace chats appear under Notes. Direct chatbot conversations appear under AI Chats."
          )}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950 dark:text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
        <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
          <FileText className="h-4 w-4" />
          {tx("favourites.tabs.notes", "Notes")}
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">
            {notesTabCount}
          </span>
        </TabButton>

        <TabButton active={tab === "chats"} onClick={() => setTab("chats")}>
          <Sparkles className="h-4 w-4" />
          {tx("favourites.tabs.aiChats", "AI Chats")}
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">
            {chatsTabCount}
          </span>
        </TabButton>
      </div>

      {/* Main content */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {tx("favourites.loading", "Loading favourites...")}
        </div>
      ) : activeCount === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-4">
          {tab === "notes" && (
            <>
              {favouriteNotes.map((note) => (
                <FavouriteNoteCard
                  key={`note-${String(note.id)}`}
                  note={note}
                  onRemove={() => removeNoteFavourite(note)}
                />
              ))}

              {favouriteLearningChats.map((chat) => (
                <FavouriteChatCard
                  key={`learning-chat-${chat.id}`}
                  chat={chat}
                  onRemove={() => removeChatFavourite(chat)}
                  label="Learning Workspace chat"
                  badge="Created from notes, reflection, and confidence"
                />
              ))}
            </>
          )}

          {tab === "chats" &&
            favouriteDirectChats.map((chat) => (
              <FavouriteChatCard
                key={`direct-chat-${chat.id}`}
                chat={chat}
                onRemove={() => removeChatFavourite(chat)}
                label="AI learning conversation"
                badge="Created directly from the Chatbots page"
              />
            ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-6 py-2 text-sm font-semibold transition",
        active
          ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab }: { tab: FavouriteTab }) {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const isNotes = tab === "notes";

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
        {isNotes ? (
          <FileText className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
        {isNotes
          ? tx("favourites.empty.notes.title", "No favourite notes or Learning Workspace chats yet")
          : tx("favourites.empty.chats.title", "No favourite direct AI chats yet")}
      </h3>

      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {isNotes
          ? tx(
              "favourites.empty.notes.desc",
              "Open a note in Learning Workspace or favourite a chat that was created from your notes."
            )
          : tx(
              "favourites.empty.chats.desc",
              "Open Chatbots, click the three-dot menu on a direct AI chat, then choose Add to favourites."
            )}
      </p>

      <Link
        href={isNotes ? "/learning_workspace" : "/chatbots"}
        className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {isNotes
          ? tx("favourites.empty.notes.cta", "Go to Learning Workspace")
          : tx("favourites.empty.chats.cta", "Go to Chatbots")}
      </Link>
    </div>
  );
}

function FavouriteNoteCard({
  note,
  onRemove,
}: {
  note: FavouriteNote;
  onRemove: () => void;
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <FileText className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-50">
              {note.title?.trim()
                ? note.title
                : tx("favourites.untitledNote", "Untitled Note")}
            </div>

            <div className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
              {getPreview(
                note.content,
                tx("favourites.noPreview", "No preview available.")
              )}
            </div>

            {note.reflection && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {tx("favourites.reflection", "Reflection")}:{" "}
                {getPreview(
                  note.reflection,
                  tx("favourites.noPreview", "No preview available.")
                )}
              </div>
            )}

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {tx("favourites.updated", "Updated")}:{" "}
              {formatDate(
                getNoteDate(note),
                tx("favourites.unknownDate", "Unknown date")
              )}
              {typeof note.confidence === "number"
                ? ` • ${tx("favourites.confidence", "Confidence")}: ${
                    note.confidence
                  }/10`
                : ""}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-950"
          aria-label={tx(
            "favourites.removeNoteAria",
            "Remove note from favourites"
          )}
          title={tx("favourites.removeFromFavourites", "Remove from favourites")}
        >
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
        </button>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <Link
          href={`/learning-workspace?noteId=${note.id}`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
        >
          {tx("common.view", "View")}
        </Link>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" />
          {tx("common.remove", "Remove")}
        </button>
      </div>
    </div>
  );
}

function FavouriteChatCard({
  chat,
  onRemove,
  label,
  badge,
}: {
  chat: BackendChatSession;
  onRemove: () => void;
  label: string;
  badge: string;
}) {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const preview =
    chat.messages?.find((m) => m.role === "assistant")?.content ??
    chat.messages?.find((m) => m.role === "user")?.content ??
    label;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <MessageSquare className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-50">
              {chat.title || tx("favourites.untitledChat", "Untitled Chat")}
            </div>

            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {label}
            </div>

            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {badge}
            </div>

            <div className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
              {getPreview(
                preview,
                tx("favourites.noPreview", "No preview available.")
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {tx("favourites.updated", "Updated")}:{" "}
              {formatDate(
                chat.updatedAt,
                tx("favourites.unknownDate", "Unknown date")
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-950"
          aria-label={tx(
            "favourites.removeChatAria",
            "Remove chat from favourites"
          )}
          title={tx("favourites.removeFromFavourites", "Remove from favourites")}
        >
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
        </button>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <Link
          href={`/chatbot_InteractionPage?chatId=${chat.id}`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
        >
          {tx("common.view", "View")}
        </Link>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" />
          {tx("common.remove", "Remove")}
        </button>
      </div>
    </div>
  );
}