// src/components/common/ModalShell.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { popupTheme } from "../ui/theme/popupTheme";
import { useLockScroll } from "./useLockScroll";

type GlowVariant = "soft" | "purpleStrong";

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

  /**
   * panelClassName = class ของ “กล่องด้านใน” เท่านั้น (พื้น/ขอบ/เนื้อหา)
   * Glow จะทำที่ชั้นนอก (ไม่ย้อมพื้นข้างใน)
   */
  panelClassName?: string;

  showTopBar?: boolean;
  closeOnEsc?: boolean;
  canClose?: () => boolean;

  glow?: boolean;
  glowVariant?: GlowVariant;
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

  panelClassName,
  showTopBar = true,
  closeOnEsc = true,
  canClose,

  glow = true,
  glowVariant = "soft",
}: ModalShellProps) {
  useLockScroll(open);

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

  // Outer wrapper: ทำ glow “นอกกล่อง” + isolate คุม stacking กันแว้บ
  const outerWrapClass = ["relative isolate overflow-visible", "w-[92%]", widthClassName].join(" ");

  // Inner panel base: “พื้นขาวล้วน” เป็นค่าเริ่มต้น
  const innerPanelBaseClass = [
    "relative rounded-3xl overflow-hidden",
    "bg-white", // ✅ บังคับพื้นขาว (ไม่ย้อมม่วง)
    "border border-gray-200/80",
    "shadow-2xl",
  ].join(" ");

  const innerPanelClass = [innerPanelBaseClass, panelClassName || ""].join(" ").trim();

  // Glow preset
  const glowSoft = {
    glowBg: "linear-gradient(90deg, rgba(139,92,246,.55), rgba(217,70,239,.55), rgba(99,102,241,.55))",
    ringBg: "linear-gradient(90deg, rgba(139,92,246,.65), rgba(217,70,239,.65), rgba(99,102,241,.65))",
    glowOpacity: 0.35,
  };

  const glowStrong = {
    glowBg: "linear-gradient(90deg, rgba(168,85,247,.90), rgba(217,70,239,.80), rgba(99,102,241,.85))",
    ringBg: "linear-gradient(90deg, rgba(168,85,247,.98), rgba(217,70,239,.92), rgba(99,102,241,.98))",
    glowOpacity: 0.62,
  };

  const g = glowVariant === "purpleStrong" ? glowStrong : glowSoft;

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
          className={outerWrapClass}
          style={{
            animation: visible
              ? "popIn 240ms cubic-bezier(.2,.9,.2,1)"
              : `popOut ${durationMs}ms ease-in`,
          }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ✅ Glow อยู่ “นอกกล่อง” (ไม่มีวันย้อมพื้นข้างใน) */}
          {glow ? (
            <>
              {/* แสงฟุ้ง */}
              <div
                className="pointer-events-none absolute -inset-[10px] rounded-[40px] -z-10 blur-[22px]"
                style={{
                  background: g.glowBg,
                  opacity: g.glowOpacity as any,
                }}
              />
              {/* ring คม */}
              <div
                className="pointer-events-none absolute -inset-[2px] rounded-[32px] -z-10"
                style={{
                  background: g.ringBg,
                  WebkitMask:
                    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1px",
                  opacity: glowVariant === "purpleStrong" ? 1 : 0.85,
                }}
              />
            </>
          ) : null}

          {/* ✅ Inner panel */}
          <div className={innerPanelClass}>
            {showTopBar ? <div className={popupTheme.topBarSoft} /> : null}

            {(title || description) && (
              <div className="px-5 pt-4 relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {title && (
                      <div className="text-base font-extrabold text-gray-900">
                        {title}
                      </div>
                    )}
                    {description && (
                      <div className="mt-1 text-sm font-semibold text-gray-600">
                        {description}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={requestClose}
                    className={popupTheme.btnCloseIcon}
                    aria-label="Close"
                    disabled={!allowedToClose()}
                  >
                    <span className="text-sm font-extrabold text-gray-600 group-hover:text-gray-900">
                      ✕
                    </span>
                  </button>
                </div>
              </div>
            )}

            {children ? <div className="px-5 pb-5 pt-3 relative bg-white">{children}</div> : null}

            {footer ? (
              <div className="border-t border-gray-200/70 px-5 py-4 relative bg-white">
                <div className="flex justify-center">{footer}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
