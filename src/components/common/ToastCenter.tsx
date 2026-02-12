// src/components/common/ToastCenter.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "info" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextType = {
  showToast: (
    message: string,
    opts?: { title?: string; variant?: ToastVariant; durationMs?: number }
  ) => void;
};

const ToastCenterContext = createContext<ToastContextType | undefined>(undefined);

export function ToastCenterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [open, setOpen] = useState(false);

  const closeTimer = useRef<any>(null);
  const removeTimer = useRef<any>(null);

  const clearTimers = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);
    closeTimer.current = null;
    removeTimer.current = null;
  };

  const removeAll = useCallback(() => {
    clearTimers();
    setOpen(false);
    // รอให้ animation out จบก่อนค่อยล้าง
    removeTimer.current = window.setTimeout(() => setToasts([]), 180);
  }, []);

  const showToast = useCallback(
    (message: string, opts?: { title?: string; variant?: ToastVariant; durationMs?: number }) => {
      clearTimers();

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const variant = opts?.variant ?? "info";
      const title = opts?.title;
      const durationMs = opts?.durationMs ?? 1800;

      const item: ToastItem = { id, title, message, variant };
      setToasts([item]);

      // เปิดแบบมี animation
      requestAnimationFrame(() => setOpen(true));

      // auto close
      closeTimer.current = window.setTimeout(() => {
        setOpen(false);
        removeTimer.current = window.setTimeout(() => setToasts([]), 180);
      }, durationMs);
    },
    []
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  const variantStyles = (v: ToastVariant) => {
    switch (v) {
      case "success":
        return {
          ring: "ring-green-200 dark:ring-green-900/40",
          iconWrap: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200",
          title: "text-gray-900 dark:text-gray-100",
          msg: "text-gray-700 dark:text-gray-200",
          icon: "✅",
        };
      case "warning":
        return {
          ring: "ring-yellow-200 dark:ring-yellow-900/40",
          iconWrap: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
          title: "text-gray-900 dark:text-gray-100",
          msg: "text-gray-700 dark:text-gray-200",
          icon: "⚠️",
        };
      case "danger":
        return {
          ring: "ring-red-200 dark:ring-red-900/40",
          iconWrap: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
          title: "text-gray-900 dark:text-gray-100",
          msg: "text-gray-700 dark:text-gray-200",
          icon: "⛔",
        };
      default:
        return {
          ring: "ring-gray-200 dark:ring-gray-800",
          iconWrap: "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-200",
          title: "text-gray-900 dark:text-gray-100",
          msg: "text-gray-700 dark:text-gray-200",
          icon: "ℹ️",
        };
    }
  };

  const toastNode =
    toasts.length > 0 &&
    createPortal(
      <div className="fixed inset-0 z-[5000] flex items-center justify-center px-4">
        <style>{`
          @keyframes tcIn {
            0%   { transform: translateY(10px) scale(.985); opacity: 0; }
            100% { transform: translateY(0px) scale(1); opacity: 1; }
          }
          @keyframes tcOut {
            0%   { transform: translateY(0px) scale(1); opacity: 1; }
            100% { transform: translateY(10px) scale(.985); opacity: 0; }
          }
        `}</style>

        {/* Backdrop: เบลอทั้งหน้า รวม Header */}
        <div
          className={[
            "absolute inset-0 bg-black/25 backdrop-blur-sm",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{ transition: "opacity 180ms ease" }}
          onClick={removeAll}
        />

        {/* Toast card */}
        <div className="relative w-full max-w-md">
          {toasts.map((t) => {
            const s = variantStyles(t.variant);
            return (
              <div
                key={t.id}
                className={[
                  "w-full rounded-3xl bg-white p-5 shadow-2xl ring-1",
                  "dark:bg-gray-900",
                  s.ring,
                ].join(" ")}
                style={{
                  animation: open ? "tcIn 200ms ease-out" : "tcOut 170ms ease-in",
                }}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <div className={["flex h-11 w-11 items-center justify-center rounded-2xl", s.iconWrap].join(" ")}>
                    <span className="text-2xl leading-none">{s.icon}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {t.title && <div className={["text-sm font-extrabold", s.title].join(" ")}>{t.title}</div>}
                    <div className={["mt-0.5 text-sm font-medium whitespace-pre-wrap", s.msg].join(" ")}>
                      {t.message}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeAll}
                    className="shrink-0 rounded-xl px-2 py-1 text-sm font-bold text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>,
      document.body
    );

  return (
    <ToastCenterContext.Provider value={value}>
      {children}
      {toastNode}
    </ToastCenterContext.Provider>
  );
}

export function useToastCenter() {
  const ctx = useContext(ToastCenterContext);
  if (!ctx) throw new Error("useToastCenter must be used within ToastCenterProvider");
  return ctx;
}
