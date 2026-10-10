"use client";

import { useEffect, useState } from "react";

import { Alert, ConfirmDialog, Field, Input } from "@/components/app-ui";
import type { ManagedUserSummary } from "@/lib/supabase/publication";

const CONFIRMATION_INPUT_ID = "delete-account-confirmation";

const REMOVED = [
  "Login and authentication identity",
  "Workflow and services",
  "Bookings and client details",
  "Active booking holds",
  "Public URLs and current Haab-hosted branding images",
];

export function isDeletionConfirmationMatch(
  targetEmail: string,
  confirmationEmail: string,
) {
  return (
    targetEmail.trim().toLowerCase() ===
    confirmationEmail.trim().toLowerCase()
  );
}

/**
 * Permanent deletion, locked until the operator types the account's email.
 * Mount it per target: the typed confirmation starts empty every time.
 */
export function DeleteAccountDialog({
  open,
  user,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  user: ManagedUserSummary;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (confirmationEmail: string) => void;
}) {
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const confirmed = isDeletionConfirmationMatch(
    user.email,
    confirmationEmail,
  );

  // Runs after the dialog's own effect has opened it (parent effects run
  // after their children's), so the typed confirmation, not the close
  // button, takes focus.
  useEffect(() => {
    if (open) document.getElementById(CONFIRMATION_INPUT_ID)?.focus();
  }, [open]);

  return (
    <ConfirmDialog
      open={open}
      title={<span className="break-words">Delete {user.email} permanently?</span>}
      body="This cannot be undone."
      confirmLabel={busy ? "Deleting…" : "Delete permanently"}
      cancelLabel="Cancel"
      closeLabel="Close"
      tone="danger"
      pending={busy}
      confirmDisabled={!confirmed}
      error={error}
      onConfirm={() => onConfirm(confirmationEmail)}
      onCancel={onCancel}
    >
      <div>
        <p className="text-sm text-app-fg">Haab will permanently remove:</p>
        <ul role="list" className="mt-2 grid gap-2 text-sm text-app-fg-secondary sm:grid-cols-2">
          {REMOVED.map((item) => (
            <li key={item} className="rounded-lg bg-app-subtle px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {user.demoOwner ? (
        <Alert tone="warning">
          This account owns a public example page. Its URL will return 404
          until the demo is reseeded.
        </Alert>
      ) : null}

      <Field
        id={CONFIRMATION_INPUT_ID}
        label={
          <>
            Type <code className="break-words font-mono text-app-danger-fg">{user.email}</code> to confirm
          </>
        }
      >
        <Input
          type="email"
          value={confirmationEmail}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          onChange={(event) => setConfirmationEmail(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
