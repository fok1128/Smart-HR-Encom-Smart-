// LeaveSubmitPage.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createLeaveRequestWithFiles } from "../services/leaveRequests";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { createPortal } from "react-dom";

// ✅ เปลี่ยน path ให้ตรงกับ Router ของคุณ
const MY_LEAVES_PATH = "/my-leaves";

// ====== Types ======
type LeaveCategory = "ลากิจ" | "ลาป่วย" | "ลาพักร้อน" | "ลากรณีพิเศษ";
type LeaveSubType =
  | "ลากิจปกติ"
  | "ลากิจฉุกเฉิน"
  | "ป่วยระหว่างวัน"
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

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.71-3.14l-8-14a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
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
  ลาป่วย: ["ป่วยระหว่างวัน", "ลาป่วยทั่วไป", "ลาหมอนัด", "ลาแบบมีใบรับรองแพทย์"],
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

// ====== ✅ Company calendar: Workdays = Mon-Sat (OFF only Sunday) ======
function isCompanyWorkday(d: Date) {
  return d.getDay() !== 0; // 0 = Sunday OFF
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toDateOnlyLocal(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}
function datePartFromDateTimeLocal(s: string) {
  const d = String(s || "").slice(0, 10);
  return d.length === 10 ? d : "";
}
function compareYMD(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function countWorkdaysInclusive(startDate: Date, endDate: Date) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);

  if (e.getTime() < s.getTime()) return 0;

  let count = 0;
  for (let d = new Date(s); d.getTime() <= e.getTime(); d = addDays(d, 1)) {
    if (isCompanyWorkday(d)) count += 1;
  }
  return count;
}

/** ✅ เดดไลน์ใบรับรอง: ภายใน "วันทำการที่ N" นับจากวันเริ่มป่วย (จ.-ส.) */
function dueAtByNthWorkdayFrom(startDate: Date, n: number) {
  let d = new Date(startDate);
  d.setHours(0, 0, 0, 0);

  let got = 0;
  while (true) {
    if (isCompanyWorkday(d)) {
      got += 1;
      if (got === n) {
        const due = new Date(d);
        due.setHours(23, 59, 59, 999);
        return due;
      }
    }
    d = addDays(d, 1);
  }
}

function formatThaiDate(d: Date) {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const dd = d.getDate();
  const mm = months[d.getMonth()] || "";
  const yyyy = d.getFullYear() + 543;
  return `${dd} ${mm} ${yyyy}`;
}

function minutesOfDayFromDateTimeLocal(s: string): number | null {
  if (!s || s.length < 16) return null;
  const hh = Number(s.slice(11, 13));
  const mm = Number(s.slice(14, 16));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/** ✅ ล็อกสกรอลแบบแน่น ๆ (กันเลื่อนตอน modal เปิด) */
function useLockScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

type PopupState =
  | null
  | {
      type: "success" | "error";
      title: string;
      subtitle?: string;
      requestNo?: string;
    };

/** ✅ Popup แบบ Portal (แก้ fixed หลุด viewport เพราะ parent มี transform) */
function PopupModal({ state, onOk }: { state: PopupState; onOk: () => void }) {
  const open = !!state;
  useLockScroll(open);

  if (!state) return null;

  const isSuccess = state.type === "success";

  const node = (
    <div
      className={[
        "fixed inset-0 z-[999999] flex items-center justify-center p-4",
        "bg-black/25 backdrop-blur-md",
      ].join(" ")}
      aria-modal="true"
      role="dialog"
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // ไม่ให้คลิกพื้นหลังแล้วปิด + กัน drag เลื่อน
        e.preventDefault();
      }}
    >
      {/* ✅ เหลือแค่กรอบสีเขียว/แดง + ปุ่มอยู่ขวา */}
      <div className="w-[92vw] max-w-4xl">
        <div
          className={[
            "flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-xl",
            isSuccess
              ? "border-emerald-200 bg-emerald-50/95 dark:border-emerald-900/40 dark:bg-emerald-900/25"
              : "border-red-200 bg-red-50/95 dark:border-red-900/40 dark:bg-red-900/25",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={[
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                isSuccess
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-100",
              ].join(" ")}
            >
              {isSuccess ? <CheckIcon /> : <AlertIcon />}
            </div>

            <div className="min-w-0">
              <div
                className={[
                  "text-base font-extrabold tracking-wide truncate",
                  isSuccess ? "text-emerald-800 dark:text-emerald-100" : "text-red-800 dark:text-red-100",
                ].join(" ")}
              >
                {/* ✅ ตัดคำว่าเรียบร้อย = ให้ title จาก state ตรง ๆ */}
                {state.title}
              </div>

              {(state.requestNo || state.subtitle) && (
                <div
                  className={[
                    "mt-0.5 text-sm font-semibold truncate",
                    isSuccess ? "text-emerald-800/80 dark:text-emerald-100/80" : "text-red-800/80 dark:text-red-100/80",
                  ].join(" ")}
                >
                  {state.requestNo ? (
                    <>
                      เลขคำร้อง: <span className="font-extrabold">{state.requestNo}</span>
                    </>
                  ) : (
                    state.subtitle
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOk}
            className={[
              "shrink-0 rounded-xl px-6 py-2.5 text-sm font-extrabold shadow-sm",
              isSuccess ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700",
            ].join(" ")}
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default function LeaveSubmitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<LeaveCategory | "">("");
  const [subType, setSubType] = useState<LeaveSubType | "">("");

  const [mode, setMode] = useState<LeaveMode>("allDay");

  const [startDate, setStartDate] = useState<string>(todayISODate());
  const [endDate, setEndDate] = useState<string>(todayISODate());

  const [startDT, setStartDT] = useState<string>(() => toISODateTimeLocal(new Date()));
  const [endDT, setEndDT] = useState<string>(() => toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));

  const [reason, setReason] = useState<string>("");
  const [retroReason, setRetroReason] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);

  // ✅ Popup state (แทน alert บนหน้า)
  const [popup, setPopup] = useState<PopupState>(null);

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

  // ====== ✅ derive start/end date-only for workdays + retro ======
  const startYMD = useMemo(() => {
    if (mode === "allDay") return startDate || "";
    return datePartFromDateTimeLocal(startDT);
  }, [mode, startDate, startDT]);

  const endYMD = useMemo(() => {
    if (mode === "allDay") return endDate || "";
    return datePartFromDateTimeLocal(endDT);
  }, [mode, endDate, endDT]);

  const todayYMD = useMemo(() => todayISODate(), []);

  const isRetroactive = useMemo(() => {
    if (!startYMD) return false;
    return compareYMD(startYMD, todayYMD) < 0;
  }, [startYMD, todayYMD]);

  const leaveStartDateOnly = useMemo(() => (startYMD ? toDateOnlyLocal(startYMD) : null), [startYMD]);
  const leaveEndDateOnly = useMemo(() => (endYMD ? toDateOnlyLocal(endYMD) : null), [endYMD]);

  const workdaysCount = useMemo(() => {
    if (!leaveStartDateOnly || !leaveEndDateOnly) return 0;
    return countWorkdaysInclusive(leaveStartDateOnly, leaveEndDateOnly);
  }, [leaveStartDateOnly, leaveEndDateOnly]);

  const isSick = category === "ลาป่วย";
  const isSickInDay = isSick && subType === "ป่วยระหว่างวัน";

  const isBusinessLeave = category === "ลากิจ";
  const isBusinessNormal = isBusinessLeave && subType === "ลากิจปกติ";
  const isBusinessEmergency = isBusinessLeave && subType === "ลากิจฉุกเฉิน";

  // ✅ ป่วยระหว่างวัน = บังคับ "ระบุเวลา"
  useEffect(() => {
    if (isSickInDay && mode !== "time") setMode("time");
  }, [isSickInDay, mode]);

  const sickNeedMedicalCertRule = useMemo(() => {
    if (!isSick || !subType) return { need: false, mode: "NONE" as const };
    if (isSickInDay) return { need: false, mode: "NONE" as const };

    if (workdaysCount >= 3) {
      if (isRetroactive) return { need: true, mode: "MUST_AT_SUBMIT" as const };
      return { need: true, mode: "DUE_BY_WORKDAY_3" as const };
    }
    return { need: false, mode: "NONE" as const };
  }, [isSick, subType, isSickInDay, workdaysCount, isRetroactive]);

  const needMedicalCert = sickNeedMedicalCertRule.need;
  const medicalCertMode = sickNeedMedicalCertRule.mode;

  const medicalCertDueAt = useMemo(() => {
    if (!needMedicalCert || !leaveStartDateOnly) return null;
    if (medicalCertMode !== "DUE_BY_WORKDAY_3") return null;
    return dueAtByNthWorkdayFrom(leaveStartDateOnly, 3);
  }, [needMedicalCert, medicalCertMode, leaveStartDateOnly]);

  // ✅ เวลาทำการ 09:00–18:00 ใช้เฉพาะ "ป่วยระหว่างวัน" และต้องอยู่วันเดียวกัน
  const violateBusinessHours = useMemo(() => {
    if (!(isSickInDay && mode === "time")) return false;

    const sDate = datePartFromDateTimeLocal(startDT);
    const eDate = datePartFromDateTimeLocal(endDT);
    if (!sDate || !eDate) return false;

    if (sDate !== eDate) return true;

    const sMin = minutesOfDayFromDateTimeLocal(startDT);
    const eMin = minutesOfDayFromDateTimeLocal(endDT);
    if (sMin == null || eMin == null) return false;

    const OPEN = 9 * 60;
    const CLOSE = 18 * 60;

    return !(sMin >= OPEN && eMin <= CLOSE);
  }, [isSickInDay, mode, startDT, endDT]);

  // =======================
  // ✅ RULE: ลากิจ
  // - ลาได้ไม่เกิน 5 วัน/ปี (รีเซ็ตทุกปี)
  // - ลากิจปกติ: ต้องยื่นล่วงหน้า >= 3 วันทำการ (จ.-ส.) (ยกเว้น "ลากิจฉุกเฉิน")
  // - กรณีย้อนหลัง: ต้องมี "เหตุผล" หรือ "แนบหลักฐาน"
  // =======================
  const BUSINESS_ANNUAL_LIMIT = 5;

  function countForwardWorkdaysFromTomorrow(n: number) {
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    d = addDays(d, 1);

    let got = 0;
    while (true) {
      if (isCompanyWorkday(d)) {
        got += 1;
        if (got === n) return d;
      }
      d = addDays(d, 1);
    }
  }

  const minStartForBusinessNormal = useMemo(() => {
    const d = countForwardWorkdaysFromTomorrow(3);
    const pad2 = (x: number) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }, []);

  // ====== ✅ Usage summary: ลากิจปีนี้ ======
  const [bizUsed, setBizUsed] = useState<number>(0);
  const [bizLoading, setBizLoading] = useState<boolean>(false);
  const [bizErr, setBizErr] = useState<string>("");

  async function loadBusinessLeaveUsage() {
    if (!user?.uid) return;

    setBizLoading(true);
    setBizErr("");
    try {
      // ✅ query แค่ uid แล้ว filter ใน client (ไม่ต้องสร้าง composite index)
      const snap = await getDocs(query(collection(db, "leave_requests"), where("uid", "==", user.uid)));
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];

      const year = new Date().getFullYear();
      const yStart = `${year}-01-01`;
      const yEnd = `${year}-12-31`;

      const used = rows
        .filter((r) => String(r.category || "") === "ลากิจ")
        .filter((r) => {
          const s = String(r.status || "").toUpperCase();
          const thai = String(r.status || "");
          const isRejected = s === "REJECTED" || thai === "ไม่อนุมัติ";
          const isCanceled = s === "CANCELED" || thai === "ยกเลิก";
          return !isRejected && !isCanceled;
        })
        .filter((r) => {
          const startAt = String(r.startAt || "");
          const startYmd = startAt.length >= 10 ? startAt.slice(0, 10) : "";
          if (!startYmd) return false;
          return startYmd >= yStart && startYmd <= yEnd;
        })
        .reduce((sum, r) => sum + Number(r.workdaysCount || 0), 0);

      setBizUsed(Number.isFinite(used) ? used : 0);
    } catch (e: any) {
      console.error("loadBusinessLeaveUsage error:", e);
      setBizErr(e?.message || String(e));
      setBizUsed(0);
    } finally {
      setBizLoading(false);
    }
  }

  useEffect(() => {
    loadBusinessLeaveUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const bizRemain = useMemo(() => {
    const x = BUSINESS_ANNUAL_LIMIT - (bizUsed || 0);
    return x < 0 ? 0 : x;
  }, [bizUsed]);

  const resetAll = () => {
    setCategory("");
    setSubType("");
    setMode("allDay");
    setStartDate(todayISODate());
    setEndDate(todayISODate());
    setStartDT(toISODateTimeLocal(new Date()));
    setEndDT(toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
    setReason("");
    setRetroReason("");
    setFiles([]);
    setErrors({});
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

      if (startDT && endDT && isEndBeforeStart(startDT, endDT)) {
        e.endDT = "วัน-เวลาสิ้นสุดต้องไม่น้อยกว่าวัน-เวลาเริ่ม";
      }

      if (violateBusinessHours) {
        e.endDT = "ป่วยระหว่างวันต้องอยู่ในวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00";
      }
    }

    if (!reason.trim()) e.reason = "กรุณากรอกเหตุผล/รายละเอียด";

    // ✅ ย้อนหลัง:
    // - ลาป่วยย้อนหลัง: ต้องมี retroReason
    // - ลากิจย้อนหลัง: ต้องมี retroReason หรือแนบไฟล์หลักฐาน
    if (isRetroactive) {
      if (isSick) {
        if (!retroReason.trim()) e.retroReason = "กรุณาชี้แจงเหตุผลการยื่นย้อนหลัง";
      }
      if (isBusinessLeave) {
        const hasReason = !!retroReason.trim();
        const hasFiles = (files || []).length > 0;
        if (!hasReason && !hasFiles) e.retroReason = "ลากิจย้อนหลัง: ต้องระบุเหตุผล หรือแนบไฟล์หลักฐาน";
      }
    }

    // ✅ ลากิจปกติ ต้องยื่นล่วงหน้า >= 3 วันทำการ (ยกเว้นฉุกเฉิน / ยกเว้นย้อนหลัง)
    // ลากิจปกติ: ต้องยื่นล่วงหน้า >= 3 วันทำการ (ยกเว้นฉุกเฉิน / ยกเว้นย้อนหลัง)
      if (isBusinessNormal && !isRetroactive && startYMD) {
        // ✅ ใช้ isBusinessEmergency ให้ TS ไม่ฟ้อง + อ่านง่ายว่า "ปกติเท่านั้น"
        if (!isBusinessEmergency && compareYMD(startYMD, minStartForBusinessNormal) < 0) {
          e.startDate = `ลากิจปกติ: ต้องยื่นล่วงหน้าอย่างน้อย 3 วันทำการ (เริ่มลาได้ตั้งแต่ ${minStartForBusinessNormal} เป็นต้นไป)`;
        }
      }


    const MAX_FILES = 5;
    const MAX_MB = 15;
    if (files.length > MAX_FILES) e.files = `แนบไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์`;
    if (files.some((f) => f.size > MAX_MB * 1024 * 1024)) e.files = `ไฟล์ต้องไม่เกิน ${MAX_MB}MB ต่อไฟล์`;

    const okTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (files.some((f) => f.type && !okTypes.has(f.type))) {
      e.files = "อนุญาตเฉพาะ PDF และรูป (JPG/PNG/WEBP)";
    }

    // ✅ ลาป่วยย้อนหลัง ≥3 ต้องแนบตอนยื่น
    if (isSick && !isSickInDay && workdaysCount >= 3 && isRetroactive) {
      if (files.length === 0) e.files = "ลาป่วยย้อนหลัง ≥ 3 วันทำการ: ต้องแนบใบรับรองแพทย์จากโรงพยาบาลตอนยื่น";
    }

    // ✅ ลากิจ: ไม่เกิน 5 วัน/ปี
    if (isBusinessLeave && workdaysCount > 0) {
      if (workdaysCount > bizRemain) {
        e.businessLimit = `ลากิจปีนี้เหลือ ${bizRemain} วัน (คุณกำลังยื่น ${workdaysCount} วันทำการ)`;
      }
    }

    setErrors(e);
    return e;
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    if (!user?.uid) {
      setPopup({ type: "error", title: "ส่งคำร้องไม่สำเร็จ", subtitle: "ยังไม่เข้าสู่ระบบ" });
      return;
    }

    const e = validate();
    if (Object.keys(e).length > 0) {
      const msg = Object.values(e).join(" • ");
      setPopup({ type: "error", title: "ส่งคำร้องไม่สำเร็จ", subtitle: msg });
      console.log("VALIDATE_ERRORS:", e);
      return;
    }

    setSubmitting(true);
    setUploadPct(0);

    try {
      const employeeNo = pickStr((user as any)?.employeeNo, (user as any)?.empNo);
      const employeeName = `${pickStr((user as any)?.fname, (user as any)?.firstName)} ${pickStr(
        (user as any)?.lname,
        (user as any)?.lastName
      )}`.trim();
      const phone = pickStr((user as any)?.phone, (user as any)?.tel, (user as any)?.mobile);

      const payload: any = {
        uid: user.uid,
        email: user.email ?? null,

        createdByEmail: user.email ?? null,
        employeeNo: employeeNo || null,
        employeeName: employeeName || null,
        phone: phone || null,

        category: category as any,
        subType: subType as any,
        mode,
        startAt: mode === "allDay" ? startDate : startDT,
        endAt: mode === "allDay" ? endDate : endDT,
        reason,

        workdaysCount: workdaysCount || 0,

        isRetroactive: !!isRetroactive,
        retroReason: isRetroactive ? retroReason.trim() : null,

        requireMedicalCert: !!needMedicalCert,
        medicalCertDueAt: medicalCertDueAt ? medicalCertDueAt.toISOString() : null,

        medicalCertProvided: !!needMedicalCert ? files.length > 0 : false,
        medicalCertSubmittedAt: !!needMedicalCert && files.length > 0 ? new Date().toISOString() : null,
        medicalCertSource: !!needMedicalCert && files.length > 0 ? "UPLOADED_WITH_REQUEST" : null,
      };

      const created = await createLeaveRequestWithFiles(payload, files, (p) => setUploadPct(p));

      // ✅ รีโหลด usage ลากิจทันที
      await loadBusinessLeaveUsage();

      setErrors({});
      setFiles([]);
      setUploadPct(0);
      setRetroReason("");

      setPopup({
        type: "success",
        title: "ส่งคำร้องสำเร็จ",
        requestNo: created.requestNo ?? created.id ?? "-",
      });
    } catch (err: any) {
      console.error(err);
      setPopup({ type: "error", title: "ส่งคำร้องไม่สำเร็จ", subtitle: err?.message || String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ popup: กดตกลง -> ถ้าสำเร็จ เด้งไปหน้าใบลาของฉัน
  const handlePopupOk = () => {
    if (popup?.type === "success") {
      setPopup(null);
      resetAll();
      navigate(MY_LEAVES_PATH);
      return;
    }
    setPopup(null);
  };

  return (
    <div className="space-y-6">
      <PopupModal state={popup} onOk={handlePopupOk} />

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

      {/* ✅ เงื่อนไขลากิจ + แถบสรุปสิทธิ: โชว์ตลอด (ไม่ต้องรอเลือก “ลากิจ”) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
        <div className="font-extrabold text-gray-900 dark:text-gray-100">เงื่อนไขลากิจ</div>
        <div className="mt-2 grid gap-1 text-sm text-gray-700 dark:text-gray-200">
          <div>• ลาได้ไม่เกิน 5 วัน/ปี (รีเซ็ตทุกปี / ไม่สะสม)</div>
          <div>• ลากิจปกติ ต้องยื่นล่วงหน้าอย่างน้อย 3 วันทำการ (จ.-ส.)</div>
          <div>• ลากิจฉุกเฉิน: ยกเว้น ไม่ต้องยื่นล่วงหน้า</div>
          <div>• กรณีย้อนหลัง ต้องมีเหตุผล หรือแนบไฟล์หลักฐาน</div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-extrabold">
              ปี {new Date().getFullYear()} • ใช้ไปแล้ว{" "}
              <span className="text-teal-700 dark:text-teal-200">{bizLoading ? "…" : bizUsed}</span>{" "}
              วัน • เหลือ{" "}
              <span className="text-teal-700 dark:text-teal-200">{bizLoading ? "…" : bizRemain}</span> วัน
            </div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              กำลังยื่นรอบนี้:{" "}
              <span className="text-gray-900 dark:text-gray-100">{isBusinessLeave ? workdaysCount : 0} วัน</span>
            </div>
          </div>

          {bizErr && (
            <div className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
              * โหลดสรุปสิทธิไม่สำเร็จ: {bizErr}
              <div className="opacity-80">
                * ถ้าขึ้นเรื่อง index ไม่ต้องสร้างก็ได้ เพราะหน้านี้ query แบบไม่ใช้ composite index แล้ว
              </div>
            </div>
          )}

          {/* ✅ โชว์ “วันที่เริ่มลาเร็วสุด” เฉพาะกรณีเลือก ลากิจปกติ และไม่ย้อนหลัง */}
          {isBusinessNormal && !isRetroactive && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              <div className="font-bold">ลากิจปกติ: วันที่เริ่มลาเร็วสุด</div>
              <div className="mt-1 text-sm">
                เริ่มลาได้ตั้งแต่ <span className="font-extrabold">{minStartForBusinessNormal}</span> เป็นต้นไป
              </div>
            </div>
          )}

          {errors.businessLimit && <p className="mt-3 text-xs font-extrabold text-red-600">{errors.businessLimit}</p>}
        </div>
      </div>

      {/* ✅ สรุป policy ลาป่วย + ตารางเงื่อนไข */}
      {isSick && subType && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            เงื่อนไขลาป่วย (บริษัททำงาน จ.-ส. / เวลา 09:00–18:00)
          </div>

          <div className="mt-2 grid gap-2">
            <div>
              <span className="font-semibold">จำนวนวันทำการ (ประเมิน):</span>{" "}
              <span className="font-semibold text-teal-700 dark:text-teal-200">{workdaysCount} วัน</span>
              {startYMD && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {isRetroactive ? "• ยื่นย้อนหลัง" : "• ไม่ย้อนหลัง"}
                </span>
              )}
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400">
              • “ป่วยระหว่างวัน” ไม่ต้องแนบใบรับรองทุกกรณี<br />
              • ลาป่วย ≥ 3 วันทำการ ต้องมีใบรับรอง “จากโรงพยาบาลเท่านั้น”
            </div>

            {needMedicalCert && medicalCertMode === "DUE_BY_WORKDAY_3" && medicalCertDueAt && (
              <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="font-semibold">ต้องแนบใบรับรอง “ภายในวันทำการที่ 3”</div>
                <div className="mt-1 text-sm">
                  เดดไลน์: <span className="font-semibold">{formatThaiDate(medicalCertDueAt)}</span> (ภายใน 23:59)
                </div>
                <div className="mt-1 text-xs opacity-90">
                  * วันนี้สามารถยื่นก่อน แล้วไปแนบเอกสารภายหลังในหน้า “ใบลาของฉัน” (ตอนสถานะยังรอดำเนินการ)
                </div>
              </div>
            )}

            {needMedicalCert && medicalCertMode === "MUST_AT_SUBMIT" && (
              <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
                <div className="font-semibold">ลาป่วยย้อนหลัง ≥ 3 วันทำการ: ต้องแนบใบรับรองตอนยื่น</div>
                <div className="mt-1 text-xs opacity-90">* ไม่ควรแนบทีหลัง เพราะถือว่าเลยเดดไลน์แล้ว</div>
              </div>
            )}
          </div>
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
                <input
                  type="radio"
                  name="leaveMode"
                  checked={mode === "allDay"}
                  onChange={() => setMode("allDay")}
                  disabled={submitting || isSickInDay}
                />
                ทั้งวัน
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="leaveMode"
                  checked={mode === "time"}
                  onChange={() => setMode("time")}
                  disabled={submitting}
                />
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
                  {(errors.startDate || errors.businessLimit) && (
                    <p className="mt-2 text-xs font-semibold text-red-600">{errors.startDate || errors.businessLimit}</p>
                  )}
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
                      timedInvalid || violateBusinessHours
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-300 focus:border-teal-500 focus:ring-teal-500/20",
                    ].join(" ")}
                  />
                  {errors.endDT && <p className="mt-2 text-xs font-semibold text-red-600">{errors.endDT}</p>}
                </div>
              </>
            )}
          </div>

          {isSickInDay && mode === "time" && (
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              * ป่วยระหว่างวัน: ต้องเป็นวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00
            </div>
          )}
        </div>

        {isRetroactive && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">หมายเหตุ/ชี้แจงการยื่นย้อนหลัง</div>
            <textarea
              value={retroReason}
              onChange={(e) => setRetroReason(e.target.value)}
              rows={4}
              placeholder="อธิบายเหตุผลที่ยื่นย้อนหลัง (เช่น เข้ารพ./ไม่มีสัญญาณ/อยู่ระหว่างการรักษา ฯลฯ)"
              disabled={submitting}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900"
            />
            {errors.retroReason && <p className="mt-2 text-xs font-semibold text-red-600">{errors.retroReason}</p>}
          </div>
        )}

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
                * ไฟล์จะถูกอัปโหลดไป Supabase Storage ผ่าน Backend
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
