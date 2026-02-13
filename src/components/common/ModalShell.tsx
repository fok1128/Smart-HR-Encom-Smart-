// src/components/common/ModalShell.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { popupTheme } from "../ui/theme/popupTheme";

type ModalShellProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;

  widthClassName?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;

  closeOnBackdrop?: boolean;
  zIndexClassName?: string;

  durationMs?: number;

  // ✅ เพิ่มเพื่อให้ DialogCenter/ConfirmDialog ใช้ได้
  panelClassName?: string;      // เปลี่ยนกรอบ/แสง/สไตล์การ์ด
  showTopBar?: boolean;         // เปิด/ปิดแถบด้านบน
  closeOnEsc?: boolean;         // เปิด/ปิดปิดด้วย ESC
  canClose?: () => boolean;     // เงื่อนไขปิด (กันตอน loading/busy)
};

export default function ModalShell({
  open,
  title,
  description,
  onClose,

  widthClassName = "max-w-md",
  children,
  footer,

  closeOnBackdrop = true,
  zIndexClassName = popupTheme.z.modal,

  durationMs = 180,

  // ✅ defaults
  panelClassName,
  showTopBar = true,
  closeOnEsc = true,
  canClose,
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const allowedToClose = () => {
    if (canClose) return !!canClose();
    return true;
  };

  const requestClose = () => {
    if (!mounted) return;
    if (!allowedToClose()) return;

    setVisible(false);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, durationMs);
  };

  // lock scroll + กัน modal ซ้อน
  useEffect(() => {
    if (!mounted) return;

    const body = document.body as any;
    const prevOverflow = document.body.style.overflow;

    body.__modalLockCount = (body.__modalLockCount || 0) + 1;
    document.body.style.overflow = "hidden";

    return () => {
      body.__modalLockCount = Math.max(0, (body.__modalLockCount || 1) - 1);
      if (body.__modalLockCount === 0) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [mounted]);

  // เปิด/ปิดจาก prop open
  useEffect(() => {
    clearCloseTimer();

    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      if (mounted) {
        setVisible(false);
        closeTimerRef.current = window.setTimeout(() => {
          setMounted(false);
        }, durationMs);
      }
    }

    return () => clearCloseTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC
  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!closeOnEsc) return;
        requestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, closeOnEsc]);

  const backdropClass = useMemo(() => popupTheme.backdrop(visible), [visible]);

  if (!mounted) return null;

  const node = (
    <div className={`fixed inset-0 ${zIndexClassName}`}>
      <style>{popupTheme.css}</style>

      {/* Backdrop */}
      <div
        className={backdropClass}
        style={{ transition: `opacity ${durationMs}ms ease` }}
        onClick={() => {
          if (!closeOnBackdrop) return;
          requestClose();
        }}
      />

      {/* Center */}
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div
          className={[
            // ✅ ถ้าส่ง panelClassName มา จะใช้แทน cardBase
            panelClassName ? panelClassName : popupTheme.cardBase,
            "w-[92%]",
            widthClassName,
          ].join(" ")}
          style={{
            animation: visible
              ? "popIn 220ms cubic-bezier(.2,.9,.2,1)"
              : `popOut ${durationMs}ms ease-in`,
          }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ✅ แถบด้านบนเปิด/ปิดได้ */}
          {showTopBar ? <div className={popupTheme.topBarSoft} /> : null}

          {(title || description) && (
            <div className="px-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {title && <div className="text-base font-extrabold text-gray-900 dark:text-gray-50">{title}</div>}
                  {description && (
                    <div className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">{description}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={requestClose}
                  className={popupTheme.btnCloseIcon}
                  aria-label="Close"
                  disabled={!allowedToClose()}
                >
                  <span className="text-sm font-extrabold text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                    ✕
                  </span>
                </button>
              </div>
            </div>
          )}

          {children ? <div className="px-5 pb-5 pt-3">{children}</div> : null}
          {footer ? (<div className="border-t border-white/15 px-5 py-4"><div className="flex justify-center">{footer}</div>
          </div>) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
