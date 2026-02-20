"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toasts: [], toast: () => { }, dismiss: () => { } });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString(36);
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", icon: "✓" },
  error: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", icon: "✕" },
  info: { bg: "rgba(46,92,255,0.1)", border: "rgba(46,92,255,0.25)", icon: "ℹ" },
  warning: { bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.25)", icon: "⚠" },
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-[360px]">
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => onDismiss(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDismiss(t.id);
              }
            }}
            className="flex items-center gap-2.5 rounded-button px-3.5 py-2.5 backdrop-blur-md cursor-pointer text-sm shadow-elevated animate-slide-up bg-surface-2 border border-border-default hover:bg-surface-3 transition-colors"
          >
            <span className="text-sm border-r border-border-subtle pr-2" style={{ color: s.bg.replace('0.1', '1') }}>
              {s.icon}
            </span>
            <span className="text-text-primary text-[13px] flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
