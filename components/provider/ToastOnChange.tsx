"use client";

import { useEffect } from "react";

import { useToast } from "@/components/app-ui";

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

  useEffect(() => {
    if (id !== undefined && message) notify({ message });
  }, [id, message, notify]);

  return null;
}
