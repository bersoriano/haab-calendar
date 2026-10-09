"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";

import { Alert } from "@/components/app-ui/Alert";
import { Button, IconButton } from "@/components/app-ui/Button";
import { pageScrollLock } from "@/components/app-ui/scroll-lock";
import { cn } from "@/lib/utils";

/** A click on the dialog element outside its panel box hit the backdrop. */
export function isBackdropClick(
  rect: { left: number; top: number; right: number; bottom: number },
  point: { x: number; y: number },
) {
  return point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom;
}

/**
 * Close only when the press started and ended on the backdrop: a text
 * selection dragged out of the panel ends on the backdrop too, and must not
 * throw away what the person was typing.
 */
export function shouldCloseFromBackdrop(startedOnBackdrop: boolean, endedOnBackdrop: boolean) {
  return startedOnBackdrop && endedOnBackdrop;
}

/**
 * The browser can close a modal dialog on its own (a repeated Esc that it no
 * longer lets us cancel, Android's back gesture). Tell the owner; if the owner
 * keeps it open — a confirm that is still pending — show it again, so the
 * element never disagrees with the `open` prop.
 */
export function reconcileNativeClose({
  dialog,
  isOpen,
  onClose,
  defer,
}: {
  dialog: { open: boolean; showModal: () => void };
  isOpen: () => boolean;
  onClose: () => void;
  defer: (run: () => void) => void;
}) {
  if (!isOpen()) return;
  onClose();
  defer(() => {
    if (isOpen() && !dialog.open) dialog.showModal();
  });
}

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-3xl" } as const;

/**
 * A native modal dialog. `showModal()` gives the top layer, an inert page,
 * focus containment and Esc; this component adds the look, labelling, scroll
 * lock and focus return. The `open` attribute is never rendered: calling
 * showModal() on an element that already has it throws.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  closeLabel = "Close",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  footer?: ReactNode;
  closeLabel?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Read by native event handlers, which can run after a render that changed them.
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    openRef.current = open;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialog.open) dialog.showModal();
    const releaseScroll = pageScrollLock.acquire();

    return () => {
      if (dialog.open) dialog.close();
      releaseScroll();
      opener?.focus();
    };
  }, [open]);

  function onBackdrop(event: MouseEvent<HTMLDialogElement> | PointerEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return isBackdropClick(rect, { x: event.clientX, y: event.clientY });
  }

  function onClick(event: MouseEvent<HTMLDialogElement>) {
    const startedOnBackdrop = pressStartedOnBackdrop.current;
    pressStartedOnBackdrop.current = false;
    if (shouldCloseFromBackdrop(startedOnBackdrop, onBackdrop(event))) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = onBackdrop(event);
      }}
      onClick={onClick}
      onClose={(event) =>
        reconcileNativeClose({
          dialog: event.currentTarget,
          isOpen: () => openRef.current,
          onClose: () => onCloseRef.current(),
          defer: (run) => window.setTimeout(run, 0),
        })
      }
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-app-surface p-0 text-app-fg shadow-xl ring-1 ring-app-border backdrop:bg-app-overlay open:animate-app-dialog-in sm:m-auto sm:rounded-xl",
        SIZES[size],
      )}
    >
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start gap-4 px-4 pb-2 pt-5 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-app-fg">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="mt-1 text-sm text-app-fg-muted">
                  {description}
                </div>
              ) : null}
            </div>
            <IconButton
              label={closeLabel}
              icon={<X aria-hidden="true" size={18} />}
              size="sm"
              onClick={onClose}
              className="-mr-2 -mt-1"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">{children}</div>
          {footer ? <div className="border-t border-app-border px-4 py-3 sm:px-6">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  pending = false,
  error,
  onConfirm,
  onCancel,
  closeLabel,
  children,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  closeLabel?: string;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onCancel();
      }}
      title={title}
      description={body}
      size="sm"
      closeLabel={closeLabel ?? cancelLabel}
      footer={
        <DialogActions>
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogActions>
      }
    >
      <div className="grid gap-4 empty:hidden">
        {children}
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
