// src/components/common/ToastCenter.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { popupTheme, type PopupVariant } from "../ui/theme/popupTheme";

type ToastVariant = PopupVariant;

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextType = {
  showToast: (message: string, opts?: { title?: string; variant?: ToastVariant; durationMs?: number }) => void;
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
    removeTimer.current = window.setTimeout(() => setToasts([]), 180);
  }, []);

  const showToast = useCallback(
    (message: string, opts?: { title?: string; variant?: ToastVariant; durationMs?: number }) => {
      clearTimers();

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const variant = opts?.variant ?? "info";
      const title = opts?.title;
      const durationMs = opts?.durationMs ?? 1800;

      setToasts([{ id, title, message, variant }]);
      requestAnimationFrame(() => setOpen(true));

      closeTimer.current = window.setTimeout(() => {
        setOpen(false);
        removeTimer.current = window.setTimeout(() => setToasts([]), 180);
      }, durationMs);
    },
    []
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  const toastNode =
    toasts.length > 0 &&
    createPortal(
      <div className={cn("fixed inset-0", popupTheme.z.toast)}>
        <style>{popupTheme.css}</style>

        {/* ✅ backdrop กลางจอ */}
        <div
          className={popupTheme.backdrop(open)}
          style={{ transition: "opacity 180ms ease" }}
          onClick={removeAll}
        />

        {/* ✅ บังคับให้อยู่ “กลางจอ” เสมอ */}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            {toasts.map((t) => {
              const ring = popupTheme.ringByVariant[t.variant];
              const icon = popupTheme.iconByVariant[t.variant];
              const iconWrap = popupTheme.iconWrapByVariant[t.variant];
              const bar = popupTheme.barByVariant[t.variant];
              const badge = popupTheme.badgeByVariant[t.variant];

              return (
                <div
                  key={t.id}
                  className={[popupTheme.cardBase, "ring-1", ring].join(" ")}
                  style={{
                    animation: open ? "popIn 240ms cubic-bezier(.2,.9,.2,1)" : "popOut 180ms ease-in",
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <div className={["h-[4px] w-full bg-gradient-to-r", bar].join(" ")} />

                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={[popupTheme.iconWrapBase, iconWrap, "flex items-center justify-center"].join(" ")}>
                        <span className="text-2xl font-black leading-none">{icon}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-gray-900 dark:text-gray-50">
                              {t.title ? t.title : "แจ้งเตือน"}
                            </div>
                            <div className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold text-gray-700 dark:text-gray-200">
                              {t.message}
                            </div>
                          </div>

                          <button type="button" onClick={removeAll} className={popupTheme.btnCloseIcon} aria-label="Close">
                            ✕
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold",
                              badge,
                            ].join(" ")}
                          >
                            {t.variant.toUpperCase()}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Smart HR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
