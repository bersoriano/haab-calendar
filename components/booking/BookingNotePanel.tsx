"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BookingNoteStatus = "idle" | "saved" | "failed";

export function BookingNotePanel({
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
  isSavingNote,
  noteStatus,
  savedNote,
  lang = "en",
  className,
  insetClass,
  buttonClass,
}: {
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  isSavingNote: boolean;
  noteStatus: BookingNoteStatus;
  savedNote: string;
  lang?: Lang;
  className?: string;
  insetClass?: string;
  buttonClass?: string;
}) {
  const t = bookingTranslations[lang];
  const noteUnchanged = noteDraft.trim() === savedNote.trim();

  return (
    <section className={className}>
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
        {t.manage.noteTitle}
      </h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.manage.noteBody}</p>
      {savedNote.trim() ? (
        <div className={cn("mt-4", insetClass)}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {t.manage.noteOnRecord}
          </p>
          <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-6 text-[var(--ink)]">
            {savedNote}
          </p>
        </div>
      ) : null}
      <label className="mt-4 grid gap-2">
        <span className="sr-only">{t.manage.noteTitle}</span>
        <textarea
          value={noteDraft}
          onChange={(event) => onNoteDraftChange(event.target.value)}
          placeholder={t.manage.notePlaceholder}
          rows={3}
          maxLength={500}
          className="w-full rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 text-[0.9375rem] leading-6 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(26,115,232,0.14)]"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ActionButton
          tone="secondary"
          className={cn("min-w-[150px]", buttonClass)}
          disabled={isSavingNote || noteUnchanged}
          onClick={onSaveNote}
        >
          {isSavingNote ? t.manage.savingNote : t.manage.saveNote}
        </ActionButton>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-sm font-semibold",
            noteStatus === "failed" ? "text-[#be123c]" : "text-[var(--accent-strong)]",
          )}
        >
          {noteStatus === "saved"
            ? t.manage.noteSaved
            : noteStatus === "failed"
              ? t.manage.noteFailed
              : ""}
        </p>
      </div>
    </section>
  );
}
