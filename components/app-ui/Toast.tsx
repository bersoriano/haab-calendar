"use client";

import { CheckCircle, Info, X } from "@phosphor-icons/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";

import { IconButton } from "@/components/app-ui/Button";
import {
  focusAfterDismiss,
  initialToastState,
  pauseTransition,
  toastReducer,
  type PauseSources,
  type ToastAction,
  type ToastItem,
  type ToastTone,
} from "@/components/app-ui/toast-state";

type ToastApi = { notify: (toast: { tone?: ToastTone; message: string }) => void };

const ToastContext = createContext<ToastApi | null>(null);
const NO_TOASTS: ToastApi = { notify: () => undefined };

/** Outside a provider, notifications are dropped rather than throwing. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NO_TOASTS;
}

/**
 * Transient confirmations ("Saved", "Link copied"). One live region per page:
 * a provider inside another passes straight through, so the dashboard shell
 * and the module can both mount one.
 */
export function ToastProvider({
  dismissLabel,
  children,
}: {
  /** The kit has no language of its own: callers word the close button. */
  dismissLabel: string;
  children: ReactNode;
}) {
  const parent = useContext(ToastContext);

  if (parent) {
    return <>{children}</>;
  }

  return <ToastRoot dismissLabel={dismissLabel}>{children}</ToastRoot>;
}

function ToastRoot({ dismissLabel, children }: { dismissLabel: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, initialToastState);
  const regionRef = useRef<HTMLDivElement>(null);
  // Where focus was before it entered the toasts, to return it on dismiss.
  const returnFocus = useRef<HTMLElement | null>(null);
  const notify = useCallback<ToastApi["notify"]>(
    ({ tone = "success", message }) => dispatch({ type: "add", tone, message }),
    [],
  );
  const api = useMemo(() => ({ notify }), [notify]);

  function dismiss(id: number, toast: HTMLElement | null) {
    const region = regionRef.current;
    if (region && toast?.contains(document.activeElement)) {
      const others = Array.from(region.querySelectorAll<HTMLElement>("[data-toast-dismiss]")).filter(
        (button) => !toast.contains(button),
      );
      focusAfterDismiss({ returnTo: returnFocus.current, others })?.focus();
    }
    dispatch({ type: "dismiss", id });
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={regionRef}
        role="status"
        aria-live="polite"
        onFocus={(event) => {
          const from = event.relatedTarget;
          if (from instanceof HTMLElement && !regionRef.current?.contains(from)) {
            returnFocus.current = from;
          }
        }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {state.items.map((item) => (
          <Toast
            key={item.id}
            item={item}
            dispatch={dispatch}
            onDismiss={(toast) => dismiss(item.id, toast)}
            dismissLabel={dismissLabel}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({
  item,
  dispatch,
  onDismiss,
  dismissLabel,
}: {
  item: ToastItem;
  dispatch: Dispatch<ToastAction>;
  onDismiss: (toast: HTMLElement | null) => void;
  dismissLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const sources = useRef<PauseSources>({ hovered: false, focused: false });

  useEffect(() => {
    if (item.paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => dispatch({ type: "dismiss", id: item.id }), item.remainingMs);
    return () => window.clearTimeout(timer);
  }, [item.paused, item.remainingMs, item.id, dispatch]);

  function hold(change: Partial<PauseSources>) {
    const next = { ...sources.current, ...change };
    const transition = pauseTransition(sources.current, next);
    sources.current = next;
    if (transition === "pause") {
      dispatch({ type: "pause", id: item.id, elapsedMs: Date.now() - startedAt.current });
    } else if (transition === "resume") {
      dispatch({ type: "resume", id: item.id });
    }
  }

  const Icon = item.tone === "success" ? CheckCircle : Info;

  return (
    <div
      ref={ref}
      onMouseEnter={() => hold({ hovered: true })}
      onMouseLeave={() => hold({ hovered: false })}
      onFocus={() => hold({ focused: true })}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hold({ focused: false });
      }}
      className="pointer-events-auto flex w-full max-w-sm animate-app-toast-in items-center gap-3 rounded-xl bg-app-surface p-3 pl-4 shadow-lg ring-1 ring-app-border"
    >
      <Icon
        aria-hidden="true"
        size={20}
        weight="fill"
        className={item.tone === "success" ? "shrink-0 text-app-success-fg" : "shrink-0 text-app-fg-muted"}
      />
      <p className="min-w-0 flex-1 text-sm font-medium text-app-fg">{item.message}</p>
      <IconButton
        data-toast-dismiss=""
        label={dismissLabel}
        icon={<X aria-hidden="true" size={16} />}
        size="sm"
        onClick={() => onDismiss(ref.current)}
      />
    </div>
  );
}
