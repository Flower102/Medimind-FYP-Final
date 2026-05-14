// frontend/src/app/chatbots/page.tsx

"use client";

/**
 * Chatbots page.
 *
 * This page:
 * - Lists saved AI learning chats
 * - Lets the user continue a chat
 * - Lets the user rename a chat
 * - Lets the user add/remove a chat from favourites
 * - Lets the user delete a chat
 *
 * Errors now show plain English messages from the shared apiFetch helper.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  AlertTriangle,
  Bot,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  listChatSessions,
  renameBackendChatSession,
  deleteBackendChatSession,
  toggleBackendChatSessionFavourite,
  type BackendChatSession,
} from "@/src/lib/chatSessionsApi";

import { getApiErrorMessage } from "@/src/lib/apiFetch";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function ChatbotsPage() {
  const { t } = useI18n();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const [sessions, setSessions] = useState<BackendChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [renameSession, setRenameSession] =
    useState<BackendChatSession | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteSession, setDeleteSession] =
    useState<BackendChatSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [favouriteUpdatingId, setFavouriteUpdatingId] = useState<string | null>(
    null
  );

  /**
   * Loads saved chats from the backend database.
   */
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await listChatSessions();
      setSessions(data);
    } catch (err: unknown) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          tx(
            "chatbots.error.loadChats",
            "Failed to load saved chats. Please sign in again and refresh."
          )
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [tx]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   * Recent chats appear first.
   * If updatedAt is missing, that chat goes lower in the list.
   */
  const sortedSessions = useMemo(() => {
    const toTime = (value?: string) => {
      if (!value) return 0;

      const time = new Date(value).getTime();
      return Number.isFinite(time) ? time : 0;
    };

    return [...sessions].sort(
      (a, b) => toTime(b.updatedAt) - toTime(a.updatedAt)
    );
  }, [sessions]);

  /**
   * Opens the rename modal.
   */
  function openRenameModal(session: BackendChatSession) {
    setError("");
    setOpenMenuId(null);
    setRenameSession(session);
    setRenameValue(session.title);
  }

  /**
   * Confirms and saves the renamed title.
   */
  async function confirmRename() {
    if (!renameSession) return;

    const cleanedTitle = renameValue.trim();

    if (!cleanedTitle) {
      setError(tx("chatbots.error.emptyTitle", "Chat title cannot be empty."));
      return;
    }

    setIsRenaming(true);
    setError("");

    try {
      const updated = await renameBackendChatSession(
        renameSession.id,
        cleanedTitle
      );

      setSessions((prev) =>
        prev.map((session) =>
          session.id === updated.id
            ? {
                ...updated,
                updatedAt: session.updatedAt,
              }
            : session
        )
      );

      setRenameSession(null);
      setRenameValue("");
    } catch (err: unknown) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          tx("chatbots.error.renameChat", "Failed to rename chat.")
        )
      );
    } finally {
      setIsRenaming(false);
    }
  }

  /**
   * Opens the delete confirmation modal.
   */
  function openDeleteModal(session: BackendChatSession) {
    setError("");
    setOpenMenuId(null);
    setDeleteSession(session);
  }

  /**
   * Permanently deletes a saved chat.
   */
  async function confirmDelete() {
    if (!deleteSession) return;

    setIsDeleting(true);
    setError("");

    try {
      await deleteBackendChatSession(deleteSession.id);

      setSessions((prev) =>
        prev.filter((session) => session.id !== deleteSession.id)
      );

      setDeleteSession(null);

      await loadSessions();
    } catch (err: unknown) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          tx("chatbots.error.deleteChat", "Failed to delete chat.")
        )
      );
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Adds/removes one chat from favourites.
   * This is saved in the backend database, not localStorage.
   */
  async function handleToggleFavourite(session: BackendChatSession) {
    const nextFavourite = !session.isFavorite;

    setOpenMenuId(null);
    setError("");
    setFavouriteUpdatingId(session.id);

    setSessions((prev) =>
      prev.map((item) =>
        item.id === session.id
          ? { ...item, isFavorite: nextFavourite }
          : item
      )
    );

    try {
      const updated = await toggleBackendChatSessionFavourite(
        session.id,
        nextFavourite
      );

      setSessions((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...updated,
                updatedAt: item.updatedAt,
              }
            : item
        )
      );
    } catch (err: unknown) {
      console.error(err);

      setSessions((prev) =>
        prev.map((item) =>
          item.id === session.id
            ? { ...item, isFavorite: session.isFavorite }
            : item
        )
      );

      setError(
        getApiErrorMessage(
          err,
          tx("chatbots.error.updateFavourite", "Failed to update favourite.")
        )
      );
    } finally {
      setFavouriteUpdatingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {tx("chatbots.title", "Health Learning Chatbots")}
          </h1>

          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {tx(
              "chatbots.subtitle",
              "View and continue your previous AI learning conversations."
            )}
          </p>
        </div>

        <Link
          href="/chatbot_InteractionPage"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {tx("chatbots.createNewChat", "Create New Chat")}
        </Link>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="font-semibold text-slate-900 dark:text-slate-50">
          {tx("chatbots.supportOnlyTitle", "For Learning Support Only")}
        </div>

        <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {tx(
            "chatbots.supportOnlyDesc",
            "These chats help users understand and remember health information. They are not a replacement for professional medical advice."
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950 dark:text-red-100">
          {error}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {tx("chatbots.recentChatsTitle", "Your Recent Chats")}
          </h2>

          <button
            type="button"
            onClick={loadSessions}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {tx("common.refresh", "Refresh")}
          </button>
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tx("chatbots.loadingChats", "Loading chats...")}
            </div>
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Bot className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
              {tx("chatbots.noSavedChatsTitle", "No saved chats yet")}
            </h3>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {tx(
                "chatbots.noSavedChatsDesc",
                "Start a chat from the Learning Workspace or create a new chat here."
              )}
            </p>

            <Link
              href="/chatbot_InteractionPage"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {tx("chatbots.startNewChat", "Start New Chat")}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {sortedSessions.map((session) => (
              <ChatSessionCard
                key={session.id}
                session={session}
                menuOpen={openMenuId === String(session.id)}
                isFavouriteUpdating={favouriteUpdatingId === session.id}
                onToggleMenu={() =>
                  setOpenMenuId((current) =>
                    current === String(session.id) ? null : String(session.id)
                  )
                }
                onToggleFavourite={() => handleToggleFavourite(session)}
                onRename={() => openRenameModal(session)}
                onDelete={() => openDeleteModal(session)}
              />
            ))}
          </div>
        )}
      </div>

      {renameSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {tx("chatbots.renameModalTitle", "Rename chat")}
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {tx(
                    "chatbots.renameModalDesc",
                    "Enter a new title for this saved chat."
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRenameSession(null);
                  setRenameValue("");
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                aria-label={tx("common.close", "Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") confirmRename();
              }}
              autoFocus
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              placeholder={tx("chatbots.chatTitlePlaceholder", "Chat title")}
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRenameSession(null);
                  setRenameValue("");
                }}
                disabled={isRenaming}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {tx("common.cancel", "Cancel")}
              </button>

              <button
                type="button"
                onClick={confirmRename}
                disabled={!renameValue.trim() || isRenaming}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRenaming && <Loader2 className="h-4 w-4 animate-spin" />}
                {tx("chatbots.saveName", "Save name")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {tx("chatbots.deleteModalTitle", "Delete this chat?")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {tx(
                    "chatbots.deleteModalBeforeTitle",
                    "This will permanently remove"
                  )}{" "}
                  <span className="font-semibold">{deleteSession.title}</span>{" "}
                  {tx(
                    "chatbots.deleteModalAfterTitle",
                    "from your saved chats."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteSession(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {tx("common.cancel", "Cancel")}
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {tx("chatbots.deleteChat", "Delete chat")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatSessionCard({
  session,
  menuOpen,
  isFavouriteUpdating,
  onToggleMenu,
  onToggleFavourite,
  onRename,
  onDelete,
}: {
  session: BackendChatSession;
  menuOpen: boolean;
  isFavouriteUpdating: boolean;
  onToggleMenu: () => void;
  onToggleFavourite: () => void;
  onRename: () => void;
  onDelete: () => void;
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
    session.messages?.find((m) => m.role === "assistant")?.content ??
    session.messages?.find((m) => m.role === "user")?.content ??
    tx("chatbots.previewFallback", "AI learning conversation");

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
          <MessageSquare className="h-6 w-6" />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            aria-label={tx("chatbots.chatMenu", "Chat menu")}
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-950">
              <button
                type="button"
                onClick={onToggleFavourite}
                disabled={isFavouriteUpdating}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {isFavouriteUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star
                    className={`h-4 w-4 ${
                      session.isFavorite
                        ? "fill-yellow-400 text-yellow-500"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  />
                )}

                {session.isFavorite
                  ? tx(
                      "chatbots.removeFromFavourites",
                      "Remove from favourites"
                    )
                  : tx("chatbots.addToFavourites", "Add to favourites")}
              </button>

              <button
                type="button"
                onClick={onRename}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
                {tx("chatbots.rename", "Rename")}
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4" />
                {tx("chatbots.deleteChat", "Delete chat")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-50">
        {session.title || tx("chatbots.untitledChat", "Untitled Chat")}
      </div>

      <div className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
        {preview}
      </div>

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {tx("chatbots.updated", "Updated")}:{" "}
        {session.updatedAt
          ? new Date(session.updatedAt).toLocaleString()
          : tx("chatbots.unknown", "Unknown")}
      </div>

      <Link
        href={`/chatbot_InteractionPage?chatId=${encodeURIComponent(
          session.id
        )}`}
        className="mt-6 block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900"
      >
        {tx("chatbots.continueChat", "Continue Chat")}
      </Link>
    </div>
  );
}