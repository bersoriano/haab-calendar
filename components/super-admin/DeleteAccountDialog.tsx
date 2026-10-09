"use client";

import { useEffect, useRef, useState } from "react";

import type { ManagedUserSummary } from "@/lib/supabase/publication";

export function isDeletionConfirmationMatch(
  targetEmail: string,
  confirmationEmail: string,
) {
  return (
    targetEmail.trim().toLowerCase() ===
    confirmationEmail.trim().toLowerCase()
  );
}

export function DeleteAccountDialog({
  user,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  user: ManagedUserSummary;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (confirmationEmail: string) => void;
}) {
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmed = isDeletionConfirmationMatch(
    user.email,
    confirmationEmail,
  );

  useEffect(() => {
    inputRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[rgba(15,23,32,0.55)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      aria-describedby="delete-account-description"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[var(--danger-line)] bg-white shadow-[0_30px_90px_rgba(76,5,25,0.28)]">
        <div className="border-b border-[var(--danger-line)] bg-[var(--danger-soft)] px-6 py-5 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--danger-strong)]">
            Permanent action
          </p>
          <h2
            id="delete-account-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-[var(--danger-strong)]"
          >
            Delete {user.email} permanently?
          </h2>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div id="delete-account-description" className="space-y-3">
            <p className="text-sm leading-6 text-[var(--ink)]">
              This cannot be undone. Haab will permanently remove:
            </p>
            <ul className="grid gap-2 text-sm text-[var(--ink)] sm:grid-cols-2">
              {[
                "Login and authentication identity",
                "Workflow and services",
                "Bookings and client details",
                "Active booking holds",
                "Public URLs and current Haab-hosted branding images",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {user.demoOwner ? (
            <p className="rounded-2xl border border-[var(--warning-line)] bg-[var(--warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--warning-strong)]">
              This account owns a public example page. Its URL will return 404
              until the demo is reseeded.
            </p>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
            Type <code className="font-mono text-[var(--danger-strong)]">{user.email}</code>{" "}
            to confirm
            <input
              ref={inputRef}
              type="email"
              value={confirmationEmail}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              onChange={(event) => setConfirmationEmail(event.target.value)}
              className="min-h-12 rounded-xl border border-[var(--line)] bg-white px-4 font-normal outline-none transition focus:border-[var(--danger-strong)] focus:ring-4 focus:ring-[var(--danger-soft)] disabled:cursor-wait disabled:bg-[var(--surface-soft)]"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-[var(--danger-strong)]">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="min-h-11 rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)] disabled:cursor-wait disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!confirmed || busy}
              onClick={() => onConfirm(confirmationEmail)}
              className="min-h-11 rounded-full bg-[var(--danger-strong)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
