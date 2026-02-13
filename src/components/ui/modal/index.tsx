// src/components/ui/modal/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { popupTheme } from "../theme/popupTheme";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  closeOnBackdrop?: boolean;
  zIndexClassName?: string;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  closeOnBackdrop = true,
  zIndexClassName = popupTheme.z.modal,
  title,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setVisible(true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") safeClose();
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function safeClose() {
    setVisible(false);
    setTimeout(() => onClose(), 180);
  }

  if (!isOpen) return null;

  const contentClasses = useMemo(() => {
    if (isFullscreen) return "w-full h-full";
    return popupTheme.cardBase;
  }, [isFullscreen]);

  const node = (
    <div className={`fixed inset-0 ${zIndexClassName}`}>
      <style>{popupTheme.css}</style>

      {/* Backdrop */}
      {!isFullscreen && (
        <div
          className={popupTheme.backdrop(visible)}
          style={{
            animation: visible ? "fadeIn 160ms ease-out" : "fadeOut 160ms ease-in",
            transition: "opacity 180ms ease",
          }}
          onClick={() => {
            if (closeOnBackdrop) safeClose();
          }}
        />
      )}

      {/* Center */}
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div
          className={[contentClasses, className || ""].join(" ")}
          style={{
            animation: visible ? "popIn 220ms cubic-bezier(.2,.9,.2,1)" : "popOut 180ms ease-in",
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {!isFullscreen && <div className={popupTheme.topBarSoft} />}

          {!isFullscreen && (title || showCloseButton) && (
            <div className="flex items-center justify-between gap-3 px-6 pt-5">
              <div className="min-w-0">
                {title ? (
                  <div className="truncate text-lg font-extrabold text-gray-900 dark:text-gray-50">
                    {title}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-300">{/* spacer */}</div>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={safeClose}
                  className={popupTheme.btnCloseIcon}
                  aria-label="Close"
                >
                  <span className="text-sm font-extrabold text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                    ✕
                  </span>
                </button>
              )}
            </div>
          )}

          <div className={!isFullscreen ? "px-6 pb-6 pt-4" : ""}>{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
