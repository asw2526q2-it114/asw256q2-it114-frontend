"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { ApiError } from "@/lib/api";

type ToastTone = "error" | "info" | "success";
type ToastInput = {
  message: string;
  title?: string;
  tone?: ToastTone;
};
type ToastItem = Required<ToastInput> & { id: number };
type ConfirmInput = {
  actionLabel?: string;
  cancelLabel?: string;
  description?: string;
  destructive?: boolean;
  onConfirm?: () => Promise<void> | void;
  title: string;
};
type ConfirmState = ConfirmInput & {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const ToastContext = createContext<{
  error: (error: unknown, fallback?: string) => void;
  show: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
} | null>(null);

const ConfirmContext = createContext<((input: ConfirmInput) => Promise<boolean>) | null>(null);

let toastId = 0;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = ++toastId;
      const item: ToastItem = {
        id,
        message: toast.message,
        title: toast.title || defaultToastTitle(toast.tone || "info"),
        tone: toast.tone || "info"
      };
      setToasts((current) => [...current.slice(-3), item]);
      window.setTimeout(() => removeToast(id), item.tone === "error" ? 6500 : 4200);
    },
    [removeToast]
  );

  const toastApi = useMemo(
    () => ({
      error(error: unknown, fallback = "Something went wrong. Try again.") {
        show({ message: errorMessage(error, fallback), title: "Action failed", tone: "error" });
      },
      show,
      success(message: string, title = "Saved") {
        show({ message, title, tone: "success" });
      }
    }),
    [show]
  );

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        ...input,
        actionLabel: input.actionLabel || "Confirm",
        cancelLabel: input.cancelLabel || "Cancel",
        loading: false,
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        },
        onConfirm: async () => {
          if (!input.onConfirm) {
            setConfirmState(null);
            resolve(true);
            return;
          }
          setConfirmState((current) => (current ? { ...current, loading: true } : current));
          try {
            await input.onConfirm();
            setConfirmState(null);
            resolve(true);
          } catch {
            setConfirmState((current) => (current ? { ...current, loading: false } : current));
            resolve(false);
          }
        }
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <div className="toast-stack" aria-live="polite" aria-relevant="additions">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
        {confirmState ? <ConfirmDialog state={confirmState} /> : null}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside FeedbackProvider");
  return context;
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside FeedbackProvider");
  return context;
}

function ToastCard({ onClose, toast }: { onClose: () => void; toast: ToastItem }) {
  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? AlertCircle : Info;
  return (
    <article className={`toast ${toast.tone}`}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button className="icon-button ghost toast-close" onClick={onClose} title="Dismiss" type="button">
        <X size={14} aria-hidden="true" />
      </button>
    </article>
  );
}

function ConfirmDialog({ state }: { state: ConfirmState }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div>
          <p className="eyebrow">{state.destructive ? "Confirm delete" : "Confirm action"}</p>
          <h2 id="confirm-title">{state.title}</h2>
          {state.description ? <p className="muted">{state.description}</p> : null}
        </div>
        <div className="toolbar">
          <button className={`button ${state.destructive ? "danger" : "primary"}`} disabled={state.loading} onClick={state.onConfirm} type="button">
            {state.loading ? "Working" : state.actionLabel}
          </button>
          <button className="button secondary" disabled={state.loading} onClick={state.onCancel} type="button">
            {state.cancelLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function defaultToastTitle(tone: ToastTone) {
  if (tone === "success") return "Success";
  if (tone === "error") return "Action failed";
  return "Notice";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
