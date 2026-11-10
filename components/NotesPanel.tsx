"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { postJson, request } from "@/lib/client";
import { DEFAULT_STYLE, ROLES } from "@/lib/options";
import type { Note, NoteKind } from "@/lib/types";
import { BetterAnswer, BridgePanes, ErrorNote, inputClass, primaryButton } from "./shared";
import { TermDiagramView } from "./TermDiagramView";

const KINDS: { id: NoteKind; label: string }[] = [
  { id: "coach", label: "學習教練" },
  { id: "translation", label: "即時翻譯" },
  { id: "term", label: "必知詞彙" },
  { id: "manual", label: "手寫筆記" },
];

const kindLabel = (kind: NoteKind) => KINDS.find((item) => item.id === kind)?.label;

export function NotesPanel({ active }: { active: boolean }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<NoteKind | "all">("all");
  const [writing, setWriting] = useState(false);
  const [openId, setOpenId] = useState("");
  const [error, setError] = useState("");

  // 其他分頁可能剛存了新筆記，每次切回來都重新抓。
  useEffect(() => {
    if (!active) return;
    let current = true;
    request<{ notes: Note[] }>("/api/notes")
      .then((data) => {
        if (current) setNotes(data.notes);
      })
      .catch((caught: Error) => {
        if (current) setError(caught.message);
      });
    return () => {
      current = false;
    };
  }, [active]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (kind !== "all" && note.kind !== kind) return false;
      if (!keyword) return true;
      return [note.title, note.plain, note.professional, note.betterAnswer, note.note, note.targetRole]
        .join("\n")
        .toLowerCase()
        .includes(keyword);
    });
  }, [notes, query, kind]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} min-w-48 flex-1`}
          type="search"
          aria-label="搜尋筆記"
          placeholder="搜尋標題或內容"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={`${inputClass} max-w-40`}
          aria-label="筆記來源"
          value={kind}
          onChange={(event) => setKind(event.target.value as NoteKind | "all")}
        >
          <option value="all">全部來源</option>
          {KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="button" className={primaryButton} onClick={() => setWriting((value) => !value)}>
          寫筆記
        </button>
        {notes.length > 0 && (
          <>
            {/* 這些是下載 API，不是頁面跳轉，不能用 next/link。 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/notes/export?format=pdf"
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-100"
            >
              全部下載 PDF
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/notes/export?format=md" className="text-sm text-stone-600 hover:text-stone-900">
              Markdown
            </a>
          </>
        )}
      </div>

      <ErrorNote message={error} />

      {writing && (
        <NewNoteForm
          onCreated={(note) => {
            setNotes((items) => [note, ...items]);
            setWriting(false);
            setOpenId(note.id);
          }}
        />
      )}

      {notes.length === 0 && !writing ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          還沒有筆記。在學習教練或即時翻譯按「存成筆記」，或自己寫一篇。
        </p>
      ) : visible.length === 0 && notes.length > 0 ? (
        <p className="p-8 text-center text-sm text-stone-500">找不到符合的筆記。</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              open={openId === note.id}
              onToggle={() => setOpenId((id) => (id === note.id ? "" : note.id))}
              onSaved={(saved) => setNotes((items) => items.map((item) => (item.id === saved.id ? saved : item)))}
              onDeleted={() => setNotes((items) => items.filter((item) => item.id !== note.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewNoteForm({ onCreated }: { onCreated: (note: Note) => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ note: Note }>("/api/notes", { title, kind: "manual", note: text });
      onCreated(data.note);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <input className={inputClass} aria-label="筆記標題" placeholder="標題" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className={`${inputClass} min-h-32`} aria-label="筆記內容" placeholder="想記下來的內容" value={text} maxLength={20000} onChange={(event) => setText(event.target.value)} />
      <ErrorNote message={error} />
      <button type="submit" className={primaryButton} disabled={busy || !title.trim() || !text.trim()}>
        {busy ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}

function NoteItem({
  note,
  open,
  onToggle,
  onSaved,
  onDeleted,
}: {
  note: Note;
  open: boolean;
  onToggle: () => void;
  onSaved: (note: Note) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = title.trim() !== note.title || text !== note.note;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const data = await request<{ note: Note }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, note: text }),
      });
      onSaved(data.note);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`確定刪除「${note.title}」？`)) return;
    setError("");
    try {
      await request(`/api/notes/${note.id}`, { method: "DELETE" });
      onDeleted();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <li className="rounded-xl border border-stone-200 bg-white">
      <button type="button" aria-expanded={open} onClick={onToggle} className="w-full px-4 py-3 text-left">
        <span className="block truncate font-medium">{note.title}</span>
        <span className="text-xs text-stone-500">
          {kindLabel(note.kind)}
          {note.targetRole && ` · ${note.targetRole}`} · {new Date(note.createdAt).toLocaleDateString("zh-TW")}
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-100 p-4">
          {(note.plain || note.professional) && <BridgePanes plain={note.plain} professional={note.professional} />}
          <BetterAnswer text={note.betterAnswer} />
          {note.diagram && <TermDiagramView diagram={note.diagram} meta={{ style: DEFAULT_STYLE, targetRole: note.targetRole || ROLES[0] }} />}
          <label className="block text-sm text-stone-600">
            標題
            <input className={`${inputClass} mt-1 text-stone-900`} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="block text-sm text-stone-600">
            我的筆記
            <textarea
              className={`${inputClass} mt-1 min-h-24 text-stone-900`}
              placeholder="補上自己的話、實際數字或面試時要提醒自己的事"
              maxLength={20000}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <ErrorNote message={error} />
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className={primaryButton} disabled={busy || !dirty || !title.trim()} onClick={save}>
              {busy ? "儲存中…" : "儲存修改"}
            </button>
            <a href={`/api/notes/export?id=${note.id}&format=pdf`} className="text-sm text-stone-600 hover:text-stone-900">
              下載 PDF
            </a>
            <a href={`/api/notes/export?id=${note.id}&format=md`} className="text-sm text-stone-600 hover:text-stone-900">
              Markdown
            </a>
            <button type="button" onClick={remove} className="text-sm text-stone-500 hover:text-red-600">
              刪除
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
