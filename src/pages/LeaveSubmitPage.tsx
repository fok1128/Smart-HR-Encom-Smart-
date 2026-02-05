import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createLeaveRequestWithFiles } from "../services/leaveRequests";

// ====== Types ======
type LeaveCategory = "ลากิจ" | "ลาป่วย" | "ลาพักร้อน" | "ลากรณีพิเศษ";
type LeaveSubType =
  | "ลากิจปกติ"
  | "ลากิจฉุกเฉิน"
  | "ลาป่วยทั่วไป"
  | "ลาหมอนัด"
  | "ลาแบบมีใบรับรองแพทย์"
  | "ลาพักร้อน"
  | "ลาคลอด"
  | "ลาราชการทหาร"
  | "อื่นๆ";

type LeaveMode = "allDay" | "time";
type Option<T extends string> = { value: T; label: string };

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ✅ Dropdown custom */
function SelectBox<T extends string>({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  clearable = true,
}: {
  label: string;
  placeholder: string;
  value: T | "";
  options: Option<T>[];
  onChange: (v: T | "") => void;
  disabled?: boolean;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</div>

      <div ref={wrapRef} className="relative mt-2">
        <div
          className={[
            "w-full rounded-md border bg-white px-3 py-2 text-left",
            "flex items-center justify-between gap-3",
            "transition",
            "dark:bg-gray-900",
            disabled
              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-700 cursor-pointer",
            open && !disabled ? "border-teal-500 ring-2 ring-teal-500/20" : "",
          ].join(" ")}
          role="button"
          tabIndex={0}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
          }}
        >
          <span className={selected ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
            {selected?.label ?? placeholder}
          </span>

          <span className="flex items-center gap-2 text-gray-500">
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange("");
                    setOpen(false);
                  }
                }}
                className="grid h-6 w-6 place-items-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Clear"
                title="ล้าง"
              >
                <XIcon />
              </span>
            )}
            <ChevronDownIcon className={open ? "rotate-180 transition" : "transition"} />
          </span>
        </div>

        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="max-h-64 overflow-auto">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onChange(opt.value);
                        setOpen(false);
                      }
                    }}
                    className={[
                      "w-full px-3 py-2 text-left text-sm",
                      "transition cursor-pointer",
                      isSelected
                        ? "bg-teal-50 text-teal-700 font-semibold dark:bg-teal-500/10 dark:text-teal-200"
                        : "text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/60",
                    ].join(" ")}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const subTypeByCategory: Record<LeaveCategory, LeaveSubType[]> = {
  ลากิจ: ["ลากิจปกติ", "ลากิจฉุกเฉิน"],
  ลาป่วย: ["ลาป่วยทั่วไป", "ลาหมอนัด", "ลาแบบมีใบรับรองแพทย์"],
  ลาพักร้อน: ["ลาพักร้อน"],
  ลากรณีพิเศษ: ["ลาคลอด", "ลาราชการทหาร", "อื่นๆ"],
};

function todayISODate() {
  const d = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toISODateTimeLocal(d: Date) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function isEndBeforeStart(start: string, end: string) {
  if (!start || !end) return false;
  return new Date(end).getTime() < new Date(start).getTime();
}

export default function LeaveSubmitPage() {
  const { user } = useAuth();

  const [category, setCategory] = useState<LeaveCategory | "">("");
  const [subType, setSubType] = useState<LeaveSubType | "">("");

  const [mode, setMode] = useState<"allDay" | "time">("allDay");

  const [startDate, setStartDate] = useState<string>(todayISODate());
  const [endDate, setEndDate] = useState<string>(todayISODate());

  const [startDT, setStartDT] = useState<string>(() => toISODateTimeLocal(new Date()));
  const [endDT, setEndDT] = useState<string>(() => toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));

  const [reason, setReason] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);

  useEffect(() => {
    setSubType("");
  }, [category]);

  useEffect(() => {
    if (mode !== "allDay") return;
    if (!startDate || !endDate) return;
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) setEndDate(startDate);
  }, [mode, startDate, endDate]);

  const timedInvalid = mode === "time" && isEndBeforeStart(startDT, endDT);

  const categoryOptions: Option<LeaveCategory>[] = useMemo(
    () => [
      { value: "ลากิจ", label: "ลากิจ" },
      { value: "ลาป่วย", label: "ลาป่วย" },
      { value: "ลาพักร้อน", label: "ลาพักร้อน" },
      { value: "ลากรณีพิเศษ", label: "ลากรณีพิเศษ" },
    ],
    []
  );

  const subTypeOptions: Option<LeaveSubType>[] = useMemo(() => {
    if (!category) return [];
    return subTypeByCategory[category].map((s) => ({ value: s, label: s }));
  }, [category]);

  const resetAll = () => {
    setCategory("");
    setSubType("");
    setMode("allDay");
    setStartDate(todayISODate());
    setEndDate(todayISODate());
    setStartDT(toISODateTimeLocal(new Date()));
    setEndDT(toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
    setReason("");
    setFiles([]);
    setErrors({});
    setSuccessMsg("");
    setSubmitting(false);
    setUploadPct(0);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!category) e.category = "กรุณาเลือกประเภทการลา";
    if (!subType) e.subType = "กรุณาเลือกประเภทย่อย";

    if (mode === "allDay") {
      if (!startDate) e.startDate = "กรุณาเลือกวันเริ่ม";
      if (!endDate) e.endDate = "กรุณาเลือกวันสิ้นสุด";
    } else {
      if (!startDT) e.startDT = "กรุณาเลือกวัน-เวลาเริ่ม";
      if (!endDT) e.endDT = "กรุณาเลือกวัน-เวลาสิ้นสุด";
      if (startDT && endDT && isEndBeforeStart(startDT, endDT)) e.endDT = "วัน-เวลาสิ้นสุดต้องไม่น้อยกว่าวัน-เวลาเริ่ม";
    }

    if (!reason.trim()) e.reason = "กรุณากรอกเหตุผล/รายละเอียด";

    const MAX_FILES = 5;
    const MAX_MB = 25; // ✅ ให้ตรงกับ backend จำกัด 25MB
    if (files.length > MAX_FILES) e.files = `แนบไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์`;
    if (files.some((f) => f.size > MAX_MB * 1024 * 1024)) e.files = `ไฟล์ต้องไม่เกิน ${MAX_MB}MB ต่อไฟล์`;

    // ✅ จำกัดประเภทไฟล์: PDF + รูป
    const okTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (files.some((f) => f.type && !okTypes.has(f.type))) {
      e.files = "อนุญาตเฉพาะ PDF และรูป (JPG/PNG/WEBP)";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setSuccessMsg("");

    if (!user?.uid) {
      setSuccessMsg("ส่งไม่สำเร็จ: ยังไม่เข้าสู่ระบบ");
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setUploadPct(0);

    try {
      const payload = {
        uid: user.uid,
        email: user.email ?? null,
        category: category as any,
        subType: subType as any,
        mode,
        startAt: mode === "allDay" ? startDate : startDT,
        endAt: mode === "allDay" ? endDate : endDT,
        reason,
      };

      const created = await createLeaveRequestWithFiles(payload, files, (p) => setUploadPct(p));

      setErrors({});
      setSuccessMsg(`ส่งคำร้องสำเร็จ ✅ เลขคำร้อง: ${created.requestNo ?? created.id ?? "-"}`);
      setFiles([]);
      setUploadPct(0);
    } catch (e: any) {
      console.error(e);
      setSuccessMsg(`ส่งไม่สำเร็จ: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">ยื่นใบลา</h1>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-teal-600">หน้าหลัก</span> <span className="mx-2">›</span> ยื่นใบลา
          </div>
        </div>

        <button
          type="button"
          onClick={resetAll}
          disabled={submitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          ล้างฟอร์ม
        </button>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          {successMsg}
        </div>
      )}

      {submitting && files.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <div className="font-semibold">กำลังอัปโหลดไฟล์… {uploadPct}%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full bg-teal-600 transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <SelectBox<LeaveCategory>
                label="เลือกประเภทการลา"
                placeholder="ประเภทการลา"
                value={category}
                options={categoryOptions}
                onChange={(v) => setCategory(v as LeaveCategory | "")}
                disabled={submitting}
              />
              {errors.category && <p className="mt-2 text-xs font-semibold text-red-600">{errors.category}</p>}
            </div>

            <div>
              <SelectBox<LeaveSubType>
                label="เลือกประเภทย่อย"
                placeholder="ประเภทย่อย"
                value={subType}
                options={subTypeOptions}
                onChange={(v) => setSubType(v as LeaveSubType | "")}
                disabled={!category || submitting}
              />
              {errors.subType && <p className="mt-2 text-xs font-semibold text-red-600">{errors.subType}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">ช่วงเวลาการลา</div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">เลือก “ทั้งวัน” หรือ “ระบุเวลา”</div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                <input type="radio" name="leaveMode" checked={mode === "allDay"} onChange={() => setMode("allDay")} disabled={submitting} />
                ทั้งวัน
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                <input type="radio" name="leaveMode" checked={mode === "time"} onChange={() => setMode("time")} disabled={submitting} />
                ระบุเวลา
              </label>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {mode === "allDay" ? (
              <>
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">วันเริ่มลา</div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={submitting}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900"
                  />
                  {errors.startDate && <p className="mt-2 text-xs font-semibold text-red-600">{errors.startDate}</p>}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">วันสิ้นสุดลา</div>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={submitting}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900"
                  />
                  {errors.endDate && <p className="mt-2 text-xs font-semibold text-red-600">{errors.endDate}</p>}
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">วัน-เวลาเริ่มลา</div>
                  <input
                    type="datetime-local"
                    value={startDT}
                    onChange={(e) => setStartDT(e.target.value)}
                    disabled={submitting}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900"
                  />
                  {errors.startDT && <p className="mt-2 text-xs font-semibold text-red-600">{errors.startDT}</p>}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">วัน-เวลาสิ้นสุดลา</div>
                  <input
                    type="datetime-local"
                    value={endDT}
                    onChange={(e) => setEndDT(e.target.value)}
                    disabled={submitting}
                    className={[
                      "mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none dark:bg-gray-900 dark:border-gray-800",
                      "focus:ring-2",
                      timedInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-teal-500 focus:ring-teal-500/20",
                    ].join(" ")}
                  />
                  {errors.endDT && <p className="mt-2 text-xs font-semibold text-red-600">{errors.endDT}</p>}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">เหตุผล / รายละเอียด</div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                placeholder="พิมพ์เหตุผลการลา…"
                disabled={submitting}
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900"
              />
              {errors.reason && <p className="mt-2 text-xs font-semibold text-red-600">{errors.reason}</p>}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">แนบไฟล์ (PDF/รูป)</div>
              <input
                type="file"
                multiple
                disabled={submitting}
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700"
              />

              {errors.files && <p className="mt-2 text-xs font-semibold text-red-600">{errors.files}</p>}

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                <div className="font-semibold">ไฟล์ที่เลือก</div>
                {files.length === 0 ? (
                  <div className="mt-2 text-gray-500 dark:text-gray-400">ยังไม่ได้เลือกไฟล์</div>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}`}>
                        {f.name} <span className="text-gray-500">({Math.ceil(f.size / 1024)} KB)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                * ไฟล์จะถูกอัปโหลดไป Supabase Storage ผ่าน Backend (ปลอดภัยกว่า และไม่ต้องใช้ Firebase Storage)
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={resetAll}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            ล้างฟอร์ม
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 disabled:opacity-60"
          >
            {submitting ? "กำลังส่ง..." : "ส่งคำร้อง"}
          </button>
        </div>
      </form>
    </div>
  );
}
