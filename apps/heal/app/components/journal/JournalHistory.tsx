"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { deletePhoto } from "@/lib/photos-api";

interface Goal { id: string; name: string; icon: string }

interface JournalEntry {
  id: string;
  photo_path: string | null;
  content: string;
  response: string | null;
  liked: boolean;
  goal_id: string | null;
  parent_id: string | null;
  created_at: string;
}

interface GrowIntent {
  trigger: string;
  source: "mood-done" | "mood-history" | "journal-history";
}

interface JournalHistoryProps {
  history: JournalEntry[];
  goals: Goal[];
  photoUrls: Record<string, string>;
  saving: boolean;
  userId: string;
  onToggleLike: (id: string, liked: boolean) => void;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  onSaveReply: (parentId: string, content: string) => void;
  onLoadHistory: (userId: string) => void;
  onNavigateToGrow?: (intent: GrowIntent) => void;
  onAssociatePath?: (entryId: string, goalId: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function JournalHistory({
  history, goals, photoUrls, saving, userId,
  onToggleLike, onUpdateEntry, onDeleteEntry, onSaveReply, onLoadHistory, onNavigateToGrow, onAssociatePath,
  hasMore, loadingMore, onLoadMore,
}: JournalHistoryProps) {
  const { t, lang } = useI18n();
  const { accessToken } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [associatingId, setAssociatingId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  // Group: only show parent entries, nest children
  const parents = history.filter((e) => !e.parent_id);
  const childrenMap = new Map<string, JournalEntry[]>();
  history.filter((e) => e.parent_id).forEach((e) => {
    if (!childrenMap.has(e.parent_id!)) childrenMap.set(e.parent_id!, []);
    childrenMap.get(e.parent_id!)!.push(e);
  });
  for (const [, children] of childrenMap) {
    children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  return (
    <div className="mt-8 space-y-3 text-left">
      <h3 className="text-sm font-semibold text-pm-text">{t("journal.past")}</h3>
      {parents.map((entry) => {
        const children = childrenMap.get(entry.id) || [];
        return (
          <div key={entry.id} className="bg-pm-surface-active rounded-2xl p-4">
            {editingId === entry.id ? (
              <>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-pm-surface-hover border border-brand-light text-pm-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { onUpdateEntry(entry.id, editContent); setEditingId(null); setEditContent(""); }} className="text-xs px-3 py-1 rounded-full bg-brand text-white cursor-pointer">{t("journal.save")}</button>
                  <button onClick={() => { setEditingId(null); setEditContent(""); }} className="text-xs px-3 py-1 rounded-full bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("journal.cancel")}</button>
                </div>
              </>
            ) : (
              <>
                {entry.goal_id && goals.find((g) => g.id === entry.goal_id) && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-pm-accent text-[10px] text-pm-text-secondary mb-1">
                    {goals.find((g) => g.id === entry.goal_id)!.icon} {goals.find((g) => g.id === entry.goal_id)!.name}
                  </span>
                )}
                {entry.photo_path && photoUrls[entry.photo_path] && (
                  <div className="mb-2 relative inline-block">
                    <img src={photoUrls[entry.photo_path]} alt="" className="w-20 h-20 rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button
                      onClick={async () => { if (accessToken) { await deletePhoto(accessToken, entry.photo_path!); onLoadHistory(userId); } }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pm-surface-hover text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer flex items-center justify-center"
                    >✕</button>
                  </div>
                )}
                <p className="text-sm text-pm-text whitespace-pre-wrap">{entry.content}</p>
                {entry.response && (
                  <div className="mt-2 pl-3 border-l-2 border-brand-light">
                    <p className="text-xs text-pm-text-secondary italic">{entry.response}</p>
                  </div>
                )}
                {!entry.response && (Date.now() - new Date(entry.created_at).getTime() < 2 * 60 * 1000) && (
                  <div className="mt-2 pl-3 border-l-2 border-pm-accent">
                    <p className="text-xs text-pm-text-muted italic">{t("journal.thinking")}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-pm-text-muted">{formatDate(entry.created_at)}</span>
                    <button onClick={() => onToggleLike(entry.id, entry.liked)} className="cursor-pointer transition-transform text-sm" style={{ color: entry.liked ? "#e8b4c8" : "#d8cfe8" }}>♥</button>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {onNavigateToGrow && (
                      <button onClick={() => onNavigateToGrow({ trigger: entry.content, source: "journal-history" })} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">
                        🌱 {lang === "zh" ? "规划" : "plan"}
                      </button>
                    )}
                    {onAssociatePath && (
                      <button
                        onClick={() => setAssociatingId(associatingId === entry.id ? null : entry.id)}
                        className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
                      >
                        🔗 {lang === "zh" ? "路径" : "path"}
                      </button>
                    )}
                    <button onClick={() => { setEditingId(entry.id); setEditContent(entry.content); }} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">{t("journal.edit")}</button>
                    <button onClick={() => onDeleteEntry(entry.id)} className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer">{t("journal.delete")}</button>
                    <button onClick={() => { setReplyingTo(replyingTo === entry.id ? null : entry.id); setReplyContent(""); }} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">{t("journal.update")}</button>
                  </div>
                  {associatingId === entry.id && onAssociatePath && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {goals.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => { onAssociatePath(entry.id, g.id); setAssociatingId(null); }}
                          className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-all ${
                            entry.goal_id === g.id
                              ? "bg-brand text-white"
                              : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                          }`}
                        >
                          {g.icon} {g.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Thread: child updates */}
            {children.length > 0 && (
              <div className="mt-3 space-y-2 pl-3 border-l-2 border-pm-accent">
                {children.map((child) => (
                  <div key={child.id} className="text-sm">
                    <p className="text-pm-text whitespace-pre-wrap">{child.content}</p>
                    {child.response && <p className="text-xs text-pm-text-secondary italic mt-1">{child.response}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-pm-text-muted">{formatDate(child.created_at)}</span>
                      <button onClick={() => onDeleteEntry(child.id)} className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === entry.id && (
              <div className="mt-3 pl-3 border-l-2 border-brand-light">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={lang === "zh" ? "添加更新..." : "Add an update..."}
                  rows={2}
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-pm-surface-hover border border-brand-light text-pm-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { onSaveReply(entry.id, replyContent); setReplyingTo(null); setReplyContent(""); }} disabled={saving || !replyContent.trim()} className="text-xs px-3 py-1 rounded-full bg-brand text-white cursor-pointer disabled:opacity-40">{saving ? "..." : t("journal.save")}</button>
                  <button onClick={() => { setReplyingTo(null); setReplyContent(""); }} className="text-xs px-3 py-1 rounded-full bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("journal.cancel")}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full mt-4 py-2 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer transition-all disabled:opacity-40"
        >
          {loadingMore ? (lang === "zh" ? "加载中..." : "Loading...") : (lang === "zh" ? "加载更多" : "Load more")}
        </button>
      )}
    </div>
  );
}
