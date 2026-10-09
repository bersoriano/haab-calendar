"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/app-ui";

/**
 * Announce a notice id unless it is the one that was already showing when
 * the bridge mounted — a remount (the module swaps its dialogs out around the
 * setup wizard) must not replay an old confirmation.
 */
export function shouldAnnounceNotice(id: number | undefined, idAtMount: number | undefined) {
  return id !== undefined && id !== idAtMount;
}

/**
 * Toasts a notice once per id. Rendered inside the toast provider, so a host
 * whose own component sits above the provider can still confirm actions —
 * and its effect runs after a dialog that closed in the same update has gone,
 * so the toast is announced instead of sitting behind the modal backdrop.
 */
export function ToastOnChange({ notice }: { notice: { id: number; message: string } | null }) {
  const { notify } = useToast();
  const id = notice?.id;
  const message = notice?.message;
  const idAtMount = useRef(id);

  useEffect(() => {
    if (message && shouldAnnounceNotice(id, idAtMount.current)) notify({ message });
  }, [id, message, notify]);

  return null;
}
