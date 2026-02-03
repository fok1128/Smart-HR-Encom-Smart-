import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
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

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, opts?: { title?: string; variant?: ToastVariant; durationMs?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const variant = opts?.variant ?? "info";
      const title = opts?.title;
      const durationMs = opts?.durationMs ?? 2200;

      const item: ToastItem = { id, title, message, variant };
      setToasts([item]);

      window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  // ✅ ใช้จริงใน className แล้ว (ไม่ unused)
  const variantStyles = (v: ToastVariant) => {
    switch (v) {
      case "success":
        return "border-green-200 bg-green-50 text-green-900";
      case "warning":
        return "border-yellow-200 bg-yellow-50 text-yellow-900";
      case "danger":
        return "border-red-200 bg-red-50 text-red-900";
      default:
        return "border-gray-200 bg-white text-gray-900";
    }
  };

  return (
    <ToastCenterContext.Provider value={value}>
      {children}

      {/* Center overlay */}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center px-4">
            {/* backdrop: เบลอทั้งหน้า รวม topbar */}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-lg" />

            {/* toast */}
            <div className="relative w-full max-w-md">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`w-full rounded-2xl border p-4 shadow-xl ${variantStyles(t.variant)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {t.title && <div className="text-sm font-semibold">{t.title}</div>}
                      <div className="mt-1 whitespace-pre-wrap text-sm">{t.message}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-black/5"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </ToastCenterContext.Provider>
  );
}

export function useToastCenter() {
  const ctx = useContext(ToastCenterContext);
  if (!ctx) throw new Error("useToastCenter must be used within ToastCenterProvider");
  return ctx;
}
