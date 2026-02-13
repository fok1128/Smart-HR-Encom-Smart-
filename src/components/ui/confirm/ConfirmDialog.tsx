// src/components/ui/confirm/ConfirmDialog.tsx
import { useEffect, useState } from "react";
import ModalShell from "../../common/ModalShell";
import { popupTheme } from "../theme/popupTheme";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;

  danger?: boolean;
  confirmText?: string;
  cancelText?: string;

  loading?: boolean;
  disableClose?: boolean;

  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

function Icon({ danger }: { danger?: boolean }) {
  if (danger) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path d="M12 9v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path
          d="M10.3 4.6l-7.2 12.5A2 2 0 0 0 4.8 20h14.4a2 2 0 0 0 1.7-2.9L13.7 4.6a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ConfirmDialog({
  open,
  title = "ยืนยันการทำรายการ",
  description = "คุณแน่ใจหรือไม่?",
  danger = false,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  loading = false,
  disableClose = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  const confirmBtn = danger ? popupTheme.btnConfirmDanger : popupTheme.btnConfirmSuccess;

  const canClose = () => !disableClose && !loading && !busy;

  return (
    <>
      <style>{popupTheme.css}</style>

      <ModalShell
        open={open}
        title={undefined}
        description={undefined}
        widthClassName="max-w-[420px]"
        zIndexClassName={popupTheme.z.confirm}
        panelClassName={popupTheme.cardStrongPurple}

        // ✅ เอาแถบม่วงด้านบนออก
        showTopBar={false}

        closeOnBackdrop={canClose()}
        closeOnEsc={canClose()}
        canClose={canClose}
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!canClose()) return;
                onClose();
              }}
              disabled={!canClose()}
              className={[
                popupTheme.btnBase,
                popupTheme.btnCancelDanger,
                !canClose() ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={async () => {
                if (loading || busy) return;
                try {
                  setBusy(true);
                  await onConfirm();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={loading || busy}
              className={[
                popupTheme.btnBase,
                popupTheme.btnConfirm,
                confirmBtn,
                loading || busy ? "cursor-not-allowed opacity-80" : "",
              ].join(" ")}
            >
              {loading || busy ? "กำลังทำรายการ..." : confirmText}
            </button>
          </div>
        }
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={[popupTheme.iconWrapBase, popupTheme.iconWrapPurple].join(" ")}>
              <Icon danger={danger} />
            </div>

            <div className="min-w-0 flex-1">
              <div className={popupTheme.title}>{title}</div>
              {description && <div className={popupTheme.desc}>{description}</div>}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!canClose()) return;
                onClose();
              }}
              className={popupTheme.btnCloseIcon}
              aria-label="close"
              disabled={!canClose()}
            >
              ✕
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
