export const TOAST_DURATION_MS = 4000;
export const MAX_TOASTS = 3;

export type ToastTone = "success" | "neutral";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
  remainingMs: number;
  paused: boolean;
};

export type ToastState = { items: ToastItem[]; nextId: number };

export type ToastAction =
  | { type: "add"; tone: ToastTone; message: string }
  | { type: "dismiss"; id: number }
  | { type: "pause"; id: number; elapsedMs: number }
  | { type: "resume"; id: number };

export const initialToastState: ToastState = { items: [], nextId: 0 };

export function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "add": {
      const item: ToastItem = {
        id: state.nextId,
        tone: action.tone,
        message: action.message,
        remainingMs: TOAST_DURATION_MS,
        paused: false,
      };
      return { items: [...state.items, item].slice(-MAX_TOASTS), nextId: state.nextId + 1 };
    }
    case "dismiss":
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case "pause": {
      const target = state.items.find((item) => item.id === action.id);
      if (!target || target.paused) return state;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id
            ? { ...item, paused: true, remainingMs: Math.max(0, item.remainingMs - action.elapsedMs) }
            : item,
        ),
      };
    }
    case "resume":
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.id ? { ...item, paused: false } : item)),
      };
  }
}
