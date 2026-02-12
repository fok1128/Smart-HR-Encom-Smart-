// src/pages/FieldWorkSubmitPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { useToastCenter } from "../components/common/ToastCenter";
import {
  createFieldWorkRequestWithFiles,
  uploadFieldWorkFiles,
  type FieldWorkAttachment,
  type FieldWorkSubmitter,
} from "../services/fieldWorkRequests";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODateTimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}
function isValidDTLocal(s: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s);
}
function formatKB(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

type UiToastType = "success" | "error" | "info";
type UiModal = {
  type: UiToastType;
  title: string;
  message: string;
};

function modalStyle(t: UiToastType) {
  if (t === "success") {
    return {
      ring: "ring-green-200 dark:ring-green-900/40",
      iconWrap: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200",
      title: "text-gray-900 dark:text-gray-100",
      msg: "text-gray-700 dark:text-gray-200",
      button: "bg-green-600 hover:bg-green-700 text-white",
      focusRing: "focus-visible:ring-green-400/60",
    };
  }
  if (t === "error") {
    return {
      ring: "ring-red-200 dark:ring-red-900/40",
      iconWrap: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
      title: "text-gray-900 dark:text-gray-100",
      msg: "text-gray-700 dark:text-gray-200",
      button: "bg-red-600 hover:bg-red-700 text-white",
      focusRing: "focus-visible:ring-red-400/60",
    };
  }
  return {
    ring: "ring-gray-200 dark:ring-gray-800",
    iconWrap: "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-200",
    title: "text-gray-900 dark:text-gray-100",
    msg: "text-gray-700 dark:text-gray-200",
    button: "bg-brand-600 hover:bg-brand-700 text-white",
    focusRing: "focus-visible:ring-brand-400/60",
  };
}

function Icon({ type }: { type: UiToastType }) {
  if (type === "success") return <span className="text-2xl leading-none">✅</span>;
  if (type === "error") return <span className="text-2xl leading-none">⚠️</span>;
  return <span className="text-2xl leading-none">ℹ️</span>;
}

// ---- Focus Trap helpers ----
function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(",")
    )
  );
  return nodes.filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

export default function FieldWorkSubmitPage() {
  const { user } = useAuth() as any;
  const toastCenter = useToastCenter() as any;

  const now = useMemo(() => new Date(), []);
  const [startAt, setStartAt] = useState<string>(toISODateTimeLocal(now));
  const [endAt, setEndAt] = useState<string>(toISODateTimeLocal(now));
  const [place, setPlace] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<FieldWorkAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ✅ Modal: แยก data กับ open สำหรับ animation
  const [uiModal, setUiModal] = useState<UiModal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const modalAutoTimer = useRef<any>(null);
  const modalCloseTimer = useRef<any>(null);

  // focus trap refs
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const okBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusedRef = useRef<HTMLElement | null>(null);

  function openModal(p: UiModal) {
    if (modalAutoTimer.current) clearTimeout(modalAutoTimer.current);
    if (modalCloseTimer.current) clearTimeout(modalCloseTimer.current);

    setUiModal(p);
    requestAnimationFrame(() => setModalOpen(true));

    modalAutoTimer.current = setTimeout(() => {
      closeModal();
    }, 2200);
  }

  function closeModal() {
    if (modalAutoTimer.current) {
      clearTimeout(modalAutoTimer.current);
      modalAutoTimer.current = null;
    }

    setModalOpen(false);

    if (modalCloseTimer.current) clearTimeout(modalCloseTimer.current);
    modalCloseTimer.current = setTimeout(() => {
      setUiModal(null);
      modalCloseTimer.current = null;

      // คืนโฟกัสเดิม
      const prev = prevFocusedRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
      prevFocusedRef.current = null;
    }, 180);
  }

  // ✅ notify = ใช้ ToastCenter ก่อน
  function notify(p: { type: UiToastType; title: string; message: string }) {
    try {
      if (toastCenter && typeof toastCenter.show === "function") {
        toastCenter.show(p);
        return;
      }
    } catch {
      // ignore
    }
    openModal(p);
  }

  // ✅ Cleanup + Keyboard (ESC + Focus Trap Tab)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!uiModal) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }

      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        const focusables = getFocusable(dialog);
        if (!focusables.length) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first || !dialog?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
          return;
        }

        if (!active || active === last || !dialog?.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (modalAutoTimer.current) clearTimeout(modalAutoTimer.current);
      if (modalCloseTimer.current) clearTimeout(modalCloseTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiModal]);

  // ✅ ตอน modal โผล่: เก็บโฟกัสเดิม + โฟกัสปุ่มตกลง
  useEffect(() => {
    if (!uiModal) return;

    prevFocusedRef.current = document.activeElement as HTMLElement | null;

    const t = setTimeout(() => {
      okBtnRef.current?.focus?.();
    }, 0);

    return () => clearTimeout(t);
  }, [uiModal]);

  function validate(): string {
    if (!user?.uid) return "ยังไม่เข้าสู่ระบบ";
    if (!place.trim()) return "กรุณากรอกสถานที่/หน่วยงานที่ไปปฏิบัติงาน";
    if (!isValidDTLocal(startAt)) return "วันเวลาเริ่มต้นไม่ถูกต้อง";
    if (!isValidDTLocal(endAt)) return "วันเวลาสิ้นสุดไม่ถูกต้อง";
    const s = new Date(startAt);
    const e = new Date(endAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "ช่วงเวลาไม่ถูกต้อง";
    if (e.getTime() < s.getTime()) return "วัน/เวลาสิ้นสุดต้องไม่ก่อนวัน/เวลาเริ่มต้น";
    return "";
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);

    setFiles((prev) => {
      const key = (f: File) => `${f.name}_${f.size}`;
      const prevSet = new Set(prev.map(key));
      const next = [...prev];
      for (const f of picked) {
        if (!prevSet.has(key(f))) next.push(f);
      }
      return next;
    });

    setUploaded([]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setUploaded([]);
  }

  async function onUploadFiles() {
    setErr("");
    if (!files.length) {
      notify({ type: "error", title: "อัปโหลดไม่สำเร็จ", message: "ยังไม่ได้เลือกไฟล์" });
      return;
    }

    setUploading(true);
    try {
      const attachments = await uploadFieldWorkFiles(files);
      setUploaded(attachments);

      notify({
        type: "success",
        title: "อัปโหลดสำเร็จ",
        message: `อัปโหลดไฟล์แนบแล้ว ${attachments.length} ไฟล์`,
      });
    } catch (e: any) {
      const m = e?.message || String(e);
      setErr(m);
      notify({ type: "error", title: "อัปโหลดไม่สำเร็จ", message: m });
    } finally {
      setUploading(false);
    }
  }

  // ✅ NEW: สร้าง submitter snapshot จาก AuthContext.user
  function buildSubmitter(): FieldWorkSubmitter | null {
    const uid = String(user?.uid || "").trim();
    if (!uid) return null;

    const fname = String(user?.fname || "").trim();
    const lname = String(user?.lname || "").trim();
    const fullName = `${fname} ${lname}`.trim();

    const phone = String(user?.phone || "").trim() || undefined;
    const employeeNo = String(user?.employeeNo || "").trim() || undefined;
    const role = String(user?.role || "").trim() || undefined;

    return {
      uid,
      email: user?.email ?? null,
      fname: fname || undefined,
      lname: lname || undefined,
      fullName: fullName || user?.email || uid,
      phone,
      employeeNo,
      role,
    };
  }

  async function onSubmit() {
    setErr("");
    const msg = validate();
    if (msg) {
      setErr(msg);
      notify({ type: "error", title: "บันทึกไม่สำเร็จ", message: msg });
      return;
    }

    setSaving(true);
    try {
      const submitter = buildSubmitter();

      const result = await createFieldWorkRequestWithFiles({
        uid: user!.uid,
        email: user?.email ?? null,

        // ✅ สำคัญ: snapshot ผู้ยื่น
        submitter,

        startAt,
        endAt,
        place: place.trim(),
        note: note.trim(),
        attachments: uploaded.length ? uploaded : undefined,
        files: !uploaded.length ? files : undefined,
      });

      notify({
        type: "success",
        title: "บันทึกสำเร็จ",
        message: `เลขคำร้อง ${result.requestNo} • ไฟล์แนบ ${result.attachmentsCount ?? 0} ไฟล์`,
      });

      setPlace("");
      setNote("");
      setFiles([]);
      setUploaded([]);
    } catch (e: any) {
      const m = e?.message || String(e);
      setErr(m);
      notify({ type: "error", title: "บันทึกไม่สำเร็จ", message: m });
    } finally {
      setSaving(false);
    }
  }

  const hasPendingFiles = files.length > 0 && uploaded.length === 0;

  const modalAnimClass =
    uiModal?.type === "success"
      ? "fw-modal-bounce"
      : uiModal?.type === "error"
        ? "fw-modal-shake"
        : "";

  const modalNode =
    uiModal &&
    createPortal(
      <div
        className={[
          "fixed inset-0 p-4",
          "z-[2147483647]",
          "flex items-center justify-center",
          "bg-black/40 backdrop-blur-sm",
          "transition-opacity duration-150 ease-out",
          modalOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        onClick={closeModal}
      >
        <style>{`
          @keyframes fwBounceIn {
            0%   { transform: translateY(8px) scale(0.98); }
            60%  { transform: translateY(0px) scale(1.01); }
            100% { transform: translateY(0px) scale(1.0); }
          }
          @keyframes fwShake {
            0% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
            100% { transform: translateX(0); }
          }
          .fw-modal-bounce { animation: fwBounceIn 240ms ease-out; }
          .fw-modal-shake { animation: fwShake 260ms ease-in-out; }
        `}</style>

        <div
          ref={dialogRef}
          className={[
            "w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1",
            modalStyle(uiModal.type).ring,
            "dark:bg-gray-900",
            "transition-all duration-150 ease-out will-change-transform",
            modalOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.98] opacity-0",
            modalAnimClass,
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            <div
              className={[
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                modalStyle(uiModal.type).iconWrap,
              ].join(" ")}
            >
              <Icon type={uiModal.type} />
            </div>

            <div className="flex-1">
              <div className={`text-base font-extrabold ${modalStyle(uiModal.type).title}`}>
                {uiModal.title}
              </div>
              <div className={`mt-1 text-sm font-medium ${modalStyle(uiModal.type).msg}`}>
                {uiModal.message}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              ref={okBtnRef}
              type="button"
              onClick={closeModal}
              className={[
                "h-10 rounded-xl px-4 text-sm font-bold",
                "transition-transform duration-150 active:scale-[0.97]",
                "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                modalStyle(uiModal.type).focusRing,
                modalStyle(uiModal.type).button,
              ].join(" ")}
            >
              ตกลง
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <PageMeta title="Field Work | Smart HR" description="Field work submit page" />
      <PageBreadcrumb pageTitle="แจ้งปฏิบัติงานนอกสถานที่" />

      {modalNode}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              แจ้งปฏิบัติงานนอกสถานที่
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              บันทึกแล้ว “อนุมัติอัตโนมัติ” (ไม่ต้องให้ผู้อนุมัติกด)
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              สถานที่/หน่วยงาน
            </label>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              placeholder="เช่น โรงงานสาขา A / ลูกค้า XYZ / หน่วยงานภายนอก"
            />
          </div>
          <div />

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              วัน/เวลาเริ่มต้น
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => {
                const v = e.target.value;
                setStartAt(v);
                if (endAt && v && endAt < v) setEndAt(v);
              }}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              วัน/เวลาสิ้นสุด
            </label>
            <input
              type="datetime-local"
              min={startAt || undefined}
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              placeholder="รายละเอียดงาน / ผู้ติดต่อ / อื่นๆ"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              ไฟล์แนบ (PDF/รูปภาพ)
            </label>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
                เลือกไฟล์
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
              </label>

              <button
                type="button"
                disabled={!files.length || uploading}
                onClick={onUploadFiles}
                className="h-11 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-900/40 dark:bg-brand-900/10 dark:text-brand-200 dark:hover:bg-brand-900/20"
              >
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}
              </button>

              {uploaded.length > 0 ? (
                <span className="text-xs font-semibold text-green-600 dark:text-green-300">
                  อัปโหลดแล้ว {uploaded.length} ไฟล์ ✅
                </span>
              ) : (
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  เลือกได้หลายไฟล์ • แนะนำกด “อัปโหลดไฟล์” ก่อนบันทึก
                </span>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                    <tr>
                      <th className="px-3 py-2 font-semibold">ไฟล์</th>
                      <th className="px-3 py-2 font-semibold">ขนาด</th>
                      <th className="px-3 py-2 font-semibold">สถานะ</th>
                      <th className="px-3 py-2 font-semibold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {files.map((f, idx) => (
                      <tr key={`${f.name}-${idx}`}>
                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                          {f.name}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                          {formatKB(f.size)}
                        </td>
                        <td className="px-3 py-2">
                          {uploaded.length > 0 ? (
                            <span className="text-xs font-semibold text-green-600 dark:text-green-300">
                              อัปโหลดแล้ว
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                              รออัปโหลด
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200 dark:hover:bg-red-900/20"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasPendingFiles && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                ตอนนี้ไฟล์ยัง “รออัปโหลด” อยู่ — ถ้ากดบันทึก ระบบจะอัปโหลดให้ตอนบันทึก (แนะนำกด “อัปโหลดไฟล์” ก่อน)
              </div>
            )}
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {err}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={saving || uploading}
            onClick={onSubmit}
            className="h-11 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก (อนุมัติอัตโนมัติ)"}
          </button>
        </div>
      </div>
    </>
  );
}
