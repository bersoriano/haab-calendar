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
  initialToastState,
  toastReducer,
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
  const notify = useCallback<ToastApi["notify"]>(
    ({ tone = "success", message }) => dispatch({ type: "add", tone, message }),
    [],
  );
  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {state.items.map((item) => (
          <Toast key={item.id} item={item} dispatch={dispatch} dismissLabel={dismissLabel} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({
  item,
  dispatch,
  dismissLabel,
}: {
  item: ToastItem;
  dispatch: Dispatch<ToastAction>;
  dismissLabel: string;
}) {
  const startedAt = useRef(0);

  useEffect(() => {
    if (item.paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => dispatch({ type: "dismiss", id: item.id }), item.remainingMs);
    return () => window.clearTimeout(timer);
  }, [item.paused, item.remainingMs, item.id, dispatch]);

  const pause = () => dispatch({ type: "pause", id: item.id, elapsedMs: Date.now() - startedAt.current });
  const resume = () => dispatch({ type: "resume", id: item.id });
  const Icon = item.tone === "success" ? CheckCircle : Info;

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
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
        label={dismissLabel}
        icon={<X aria-hidden="true" size={16} />}
        size="sm"
        onClick={() => dispatch({ type: "dismiss", id: item.id })}
      />
    </div>
  );
}
