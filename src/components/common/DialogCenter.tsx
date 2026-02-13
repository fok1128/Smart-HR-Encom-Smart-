// src/components/common/DialogCenter.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import ModalShell from "./ModalShell";
import { popupTheme, type PopupVariant } from "../ui/theme/popupTheme";

type DialogType = "ALERT" | "CONFIRM" | "PROMPT";
type DialogSize = "sm" | "md" | "lg" | "xl";

function sizeToWidth(size?: DialogSize) {
  switch (size) {
    case "sm":
      return "max-w-sm";
    case "md":
      return "max-w-md";
    case "xl":
      return "max-w-xl";
    case "lg":
    default:
      return "max-w-lg";
  }
}

type DialogState = {
  open: boolean;
  type: DialogType;
  title?: string;
  message?: string;
  variant?: PopupVariant;
  confirmText?: string;
  cancelText?: string;
  size?: DialogSize;

  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  inputRequired?: boolean;
  inputMinLen?: number;
  inputMaxLen?: number;
  inputError?: string;
};

type AlertOpts = {
  title?: string;
  confirmText?: string;
  variant?: PopupVariant;
  danger?: boolean;
  size?: DialogSize;
};

type ConfirmOpts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: PopupVariant;
  danger?: boolean;
  size?: DialogSize;
};

type SuccessOpts = {
  title?: string;
  confirmText?: string;
  size?: DialogSize;
};

type PromptOpts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: PopupVariant;
  size?: DialogSize;

  label?: string;
  placeholder?: string;
  defaultValue?: string;

  required?: boolean;
  minLen?: number;
  maxLen?: number;
};

type DialogContextType = {
  alert: (message: string, opts?: AlertOpts) => Promise<void>;
  confirm: (message: string, opts?: ConfirmOpts) => Promise<boolean>;
  success: (message: string, opts?: SuccessOpts) => Promise<void>;
  prompt: (message: string, opts?: PromptOpts) => Promise<string | null>;
};

const DialogCenterContext = createContext<DialogContextType | undefined>(undefined);

export function DialogCenterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    type: "ALERT",
    title: "",
    message: "",
    variant: "info",
    confirmText: "ตกลง",
    cancelText: "ยกเลิก",
    size: "md",

    inputLabel: "",
    inputPlaceholder: "",
    inputValue: "",
    inputRequired: false,
    inputMinLen: 0,
    inputMaxLen: 500,
    inputError: "",
  });

  const resolverRef = useRef<((v: any) => void) | null>(null);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const finish = useCallback(
    (result: any) => {
      const r = resolverRef.current;
      resolverRef.current = null;
      r?.(result);
      close();
    },
    [close]
  );

  const alertFn = useCallback(async (message: string, opts?: AlertOpts) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        type: "ALERT",
        title: opts?.title || "แจ้งเตือน",
        message,
        variant: opts?.variant || (opts?.danger ? "danger" : "info"),
        confirmText: opts?.confirmText || "ตกลง",
        cancelText: undefined,
        size: opts?.size || "md",
      });
    });
  }, []);

  const confirmFn = useCallback(async (message: string, opts?: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        type: "CONFIRM",
        title: opts?.title || "ยืนยันการทำรายการ",
        message,
        variant: opts?.variant || (opts?.danger ? "danger" : "info"),
        confirmText: opts?.confirmText || "ยืนยัน",
        cancelText: opts?.cancelText || "ยกเลิก",
        size: opts?.size || "md",
      });
    });
  }, []);

  const successFn = useCallback(
    async (message: string, opts?: SuccessOpts) => {
      return alertFn(message, {
        title: opts?.title || "ทำรายการสำเร็จ",
        confirmText: opts?.confirmText || "ตกลง",
        variant: "success",
        size: opts?.size || "md",
      });
    },
    [alertFn]
  );

  const promptFn = useCallback(async (message: string, opts?: PromptOpts) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        type: "PROMPT",
        title: opts?.title || "กรอกข้อมูล",
        message,
        variant: opts?.variant || "info",
        confirmText: opts?.confirmText || "ยืนยัน",
        cancelText: opts?.cancelText || "ยกเลิก",
        size: opts?.size || "md",

        inputLabel: opts?.label || "เหตุผล",
        inputPlaceholder: opts?.placeholder || "พิมพ์เหตุผล...",
        inputValue: opts?.defaultValue || "",
        inputRequired: opts?.required ?? false,
        inputMinLen: opts?.minLen ?? 0,
        inputMaxLen: opts?.maxLen ?? 500,
        inputError: "",
      });
    });
  }, []);

  const value = useMemo(
    () => ({ alert: alertFn, confirm: confirmFn, success: successFn, prompt: promptFn }),
    [alertFn, confirmFn, successFn, promptFn]
  );

  const v: PopupVariant = state.variant || "info";
  const iconWrap = popupTheme.iconWrapByVariant[v];
  const icon = popupTheme.iconByVariant[v];

  const confirmBtnClass = v === "danger" ? popupTheme.btnConfirmDanger : popupTheme.btnConfirmSuccess;

  const canSubmitPrompt = (() => {
    if (state.type !== "PROMPT") return true;
    const val = String(state.inputValue ?? "");
    const trimmed = val.trim();
    if (state.inputRequired && !trimmed) return false;
    if (typeof state.inputMinLen === "number" && trimmed.length < state.inputMinLen) return false;
    if (typeof state.inputMaxLen === "number" && trimmed.length > state.inputMaxLen) return false;
    return true;
  })();

  const submitPrompt = () => {
    const raw = String(state.inputValue ?? "");
    const trimmed = raw.trim();
    if (state.inputRequired && !trimmed) {
      setState((s) => ({ ...s, inputError: "กรุณากรอกเหตุผล" }));
      return;
    }
    if (typeof state.inputMinLen === "number" && trimmed.length < state.inputMinLen) {
      setState((s) => ({ ...s, inputError: `กรุณากรอกอย่างน้อย ${state.inputMinLen} ตัวอักษร` }));
      return;
    }
    if (typeof state.inputMaxLen === "number" && trimmed.length > state.inputMaxLen) {
      setState((s) => ({ ...s, inputError: `ยาวเกินไป (เกิน ${state.inputMaxLen} ตัวอักษร)` }));
      return;
    }
    finish(trimmed);
  };

  const closeBehavior = () => {
    if (state.type === "CONFIRM") finish(false);
    else if (state.type === "PROMPT") finish(null);
    else finish(undefined);
  };

  return (
    <DialogCenterContext.Provider value={value}>
      {children}

      <ModalShell
        open={state.open}
        title={undefined}
        description={undefined}
        widthClassName={sizeToWidth(state.size)}
        zIndexClassName={popupTheme.z.confirm}
        showTopBar={false}
        glow={true}
        glowVariant="purpleStrong" // ✅ แสงม่วง “แรงกว่าเดิม”
        panelClassName="bg-white"
        closeOnEsc={true}
        closeOnBackdrop={true}
        canClose={() => true}
        onClose={closeBehavior}
        footer={
          <div className="flex items-center justify-center gap-2">
            {state.type !== "ALERT" && (
              <button
                type="button"
                onClick={() => {
                  if (state.type === "CONFIRM") finish(false);
                  else if (state.type === "PROMPT") finish(null);
                }}
                className={[
                  popupTheme.btnBase,
                  "bg-white text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {state.cancelText || "ยกเลิก"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (state.type === "CONFIRM") finish(true);
                else if (state.type === "PROMPT") submitPrompt();
                else finish(undefined);
              }}
              disabled={state.type === "PROMPT" ? !canSubmitPrompt : false}
              className={[
                popupTheme.btnBase,
                popupTheme.btnConfirm,
                confirmBtnClass,
                state.type === "ALERT" ? "w-full justify-center" : "",
                state.type === "PROMPT" && !canSubmitPrompt ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {state.confirmText || "ตกลง"}
            </button>
          </div>
        }
      >
        <div className="relative px-5 pt-5 pb-2 bg-white">
          <button
            type="button"
            onClick={() => finish(state.type === "CONFIRM" ? false : state.type === "PROMPT" ? null : undefined)}
            className={[popupTheme.btnCloseIcon, "absolute right-4 top-4"].join(" ")}
            aria-label="close"
          >
            ✕
          </button>

          <div className="flex flex-col items-center text-center">
            <div className={[popupTheme.iconWrapBase, iconWrap, "h-12 w-12 rounded-full grid place-items-center"].join(" ")}>
              <span className="text-2xl font-black leading-none">{icon}</span>
            </div>

            <div className="mt-3 text-lg font-extrabold text-gray-900">{state.title}</div>

            {state.message ? (
              <div className="mt-3 text-sm font-semibold text-gray-700 whitespace-pre-wrap break-words">
                {state.message}
              </div>
            ) : null}

            {state.type === "PROMPT" ? (
              <div className="mt-4 w-full text-left">
                <div className="text-xs font-extrabold text-gray-700 mb-1">
                  {state.inputLabel || "เหตุผล"}
                </div>

                <textarea
                  value={state.inputValue || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      inputValue: e.target.value,
                      inputError: "",
                    }))
                  }
                  placeholder={state.inputPlaceholder || ""}
                  rows={4}
                  maxLength={state.inputMaxLen ?? 500}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none",
                    "bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-violet-300",
                  ].join(" ")}
                />

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-red-600">{state.inputError || ""}</div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    {(state.inputValue?.length ?? 0)}/{state.inputMaxLen ?? 500}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </ModalShell>
    </DialogCenterContext.Provider>
  );
}

export function useDialogCenter() {
  const ctx = useContext(DialogCenterContext);
  if (!ctx) throw new Error("useDialogCenter must be used within DialogCenterProvider");
  return ctx;
}
