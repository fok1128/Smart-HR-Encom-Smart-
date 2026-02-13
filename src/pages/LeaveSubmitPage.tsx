// LeaveSubmitPage.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createLeaveRequestWithFiles } from "../services/leaveRequests";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useDialogCenter } from "../components/common/DialogCenter";

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
  | "ลาเพื่อทำหมัน"
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
          <span className={selected ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>{selected?.label ?? placeholder}</span>

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
  ลากรณีพิเศษ: ["ลาคลอด", "ลาราชการทหาร", "ลาเพื่อทำหมัน", "อื่นๆ"],
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

//type PopupState =
//  | null
//  | {
//      type: "success" | "error";
//      title: string;
//      subtitle?: string;
//      requestNo?: string;
//    };

/** ✅ Popup แบบ Portal (กลางจอแบบการ์ดจริง ไม่เป็นแถบยาว) */
// /** ✅ Popup แบบ Portal (กลางจอแบบการ์ดจริง ไม่เป็นแถบยาว) */
// function PopupModal({ state, onOk }: { state: PopupState; onOk: () => void }) {
//   const open = !!state;
//   useLockScroll(open);

//   // ESC เพื่อปิด
//   useEffect(() => {
//     if (!open) return;
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") onOk();
//     };
//     document.addEventListener("keydown", onKey);
//     return () => document.removeEventListener("keydown", onKey);
//   }, [open, onOk]);

//   if (!state) return null;

//   const isSuccess = state.type === "success";

//   const node = (
//     <div
//       className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/35 backdrop-blur-md"
//       aria-modal="true"
//       role="dialog"
//       onMouseDown={(e) => {
//         if (e.target === e.currentTarget) onOk();
//       }}
//     >
//       <div className="w-[92vw] max-w-md">
//         <div
//           className={[
//             "relative rounded-2xl border bg-white px-6 py-6 shadow-2xl",
//             "dark:bg-gray-900",
//             isSuccess ? "border-emerald-200 dark:border-emerald-900/40" : "border-red-200 dark:border-red-900/40",
//             "animate-[modalIn_180ms_ease-out]",
//           ].join(" ")}
//         >
//           <button
//             type="button"
//             onClick={onOk}
//             className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
//             aria-label="Close"
//             title="ปิด"
//           >
//             <XIcon />
//           </button>

//           <div
//             className={[
//               "mx-auto grid h-14 w-14 place-items-center rounded-full",
//               isSuccess
//                 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100"
//                 : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-100",
//             ].join(" ")}
//           >
//             {isSuccess ? <CheckIcon className="h-7 w-7" /> : <AlertIcon className="h-7 w-7" />}
//           </div>

//           <div className="mt-4 text-center">
//             <div
//               className={[
//                 "text-lg font-extrabold",
//                 isSuccess ? "text-emerald-800 dark:text-emerald-100" : "text-red-800 dark:text-red-100",
//               ].join(" ")}
//             >
//               {state.title}
//             </div>

//             {state.requestNo ? (
//               <div className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
//                 เลขคำร้อง: <span className="font-extrabold">{state.requestNo}</span>
//               </div>
//             ) : state.subtitle ? (
//               <div className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{state.subtitle}</div>
//             ) : null}
//           </div>

//           <button
//             type="button"
//             onClick={onOk}
//             className={[
//               "mt-6 w-full rounded-xl px-5 py-3 text-sm font-extrabold text-white",
//               "transition-transform active:scale-[0.98]",
//               isSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
//             ].join(" ")}
//           >
//             ตกลง
//           </button>

//           <style>{`
//             @keyframes modalIn {
//               from { opacity: 0; transform: translateY(8px) scale(0.98); }
//               to { opacity: 1; transform: translateY(0) scale(1); }
//             }
//           `}</style>
//         </div>
//       </div>
//     </div>
//   );

//   return createPortal(node, document.body);
// }



/** ✅ การ์ดสรุปสิทธิ (ใช้ร่วมกันทุกประเภท) + progress bar แบบเดียวกัน */
function YearEntitlementCard({
  title,
  year,
  total, // null = ตามนโยบาย/HR, "UNLIMITED" = ไม่จำกัด
  used,
  loading,
  error,
  requested,
  note,
}: {
  title: string;
  year: number;
  total: number | null | "UNLIMITED";
  used?: number | null;
  loading?: boolean;
  error?: string;
  requested?: number;
  note?: React.ReactNode;
}) {
  const usedNum = Number.isFinite(used as number) ? Number(used) : 0;

  const isUnlimited = total === "UNLIMITED";
  const hasTotal = typeof total === "number" && Number.isFinite(total);
  const totalNum = hasTotal ? Number(total) : 0;

  const remain = hasTotal ? Math.max(0, totalNum - usedNum) : null;
  const pct = hasTotal && totalNum > 0 ? Math.min(100, Math.max(0, (usedNum / totalNum) * 100)) : 0;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">{title}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900">
              ปี {year}
            </span>

            {isUnlimited ? (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">สิทธิ: ไม่จำกัด (ตามแพทย์/นโยบาย)</span>
              </>
            ) : hasTotal ? (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span>
                  ใช้ไป{" "}
                  <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : usedNum}</span>{" "}
                  วันทำการ
                </span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span>
                  คงเหลือ{" "}
                  <span className="font-extrabold text-violet-700 dark:text-violet-200">{loading ? "…" : remain}</span>{" "}
                  วันทำการ
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">สิทธิ: ตามนโยบาย/ตรวจสอบกับ HR</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
          กำลังยื่นรอบนี้: <span className="font-extrabold text-gray-900 dark:text-gray-100">{requested ?? 0}</span> วัน
        </div>
      </div>

      {/* ✅ progress bar */}
      {hasTotal && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
            <div>
              ใช้ไป <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : usedNum}</span>{" "}
              วันทำการ
            </div>
            <div className="text-gray-900 dark:text-gray-100">{loading ? "…" : remain} วันทำการ</div>
          </div>

          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="h-full bg-violet-600 dark:bg-violet-400 transition-all" style={{ width: `${loading ? 0 : pct}%` }} />
          </div>
        </div>
      )}

      {!!note && <div className="mt-4 text-sm text-gray-700 dark:text-gray-200">{note}</div>}

      {!!error && (
        <div className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-200">* โหลดข้อมูลสิทธิไม่สำเร็จ: {error}</div>
      )}
    </div>
  );
}

/** ✅ แถวสรุปแบบรูปตัวอย่าง (หัวข้อ + ใช้ไป/คงเหลือ + แถบ) */
function EntitlementRow({
  title,
  total,
  used,
  loading,
}: {
  title: string;
  total: number | "UNLIMITED" | null;
  used: number;
  loading?: boolean;
}) {
  const isUnlimited = total === "UNLIMITED" || total == null;
  const totalNum = typeof total === "number" ? total : 0;
  const usedNum = Number.isFinite(used) ? used : 0;

  const remain = typeof total === "number" ? Math.max(0, totalNum - usedNum) : null;
  const pct = typeof total === "number" && totalNum > 0 ? Math.min(100, Math.max(0, (usedNum / totalNum) * 100)) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {isUnlimited ? (
              <>ใช้ไป {loading ? "…" : usedNum} วันทำการ • คงเหลือ ไม่จำกัด</>
            ) : (
              <>
                ใช้ไป <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : usedNum}</span> วันทำการ • คงเหลือ{" "}
                <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : remain}</span> วันทำการ
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-sm font-extrabold text-gray-900 dark:text-gray-100">
          {typeof total === "number" ? `${total} วันทำการ` : "ไม่จำกัด"}
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div className="h-full bg-violet-600 dark:bg-violet-400 transition-all" style={{ width: `${loading || isUnlimited ? 0 : pct}%` }} />
      </div>
    </div>
  );
}
export default function LeaveSubmitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialogCenter();
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
  
  useEffect(() => {
    setSubType("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.subType;
      delete next.category;
      return next;
    });
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

  const isVacation = category === "ลาพักร้อน";

  const isSpecial = category === "ลากรณีพิเศษ";
  const isMaternity = isSpecial && subType === "ลาคลอด";
  const isMilitary = isSpecial && subType === "ลาราชการทหาร";
  const isSterilization = isSpecial && subType === "ลาเพื่อทำหมัน";

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
  // ✅ สิทธิต่อปี
  // =======================
  const LIMIT_BUSINESS = 5;
  const LIMIT_SICK = 30;
  const LIMIT_VACATION = 6;

  const LIMIT_MATERNITY = 120;
  const LIMIT_MILITARY = 60;

  // ลาเพื่อทำหมัน = ไม่จำกัด
  const LIMIT_STERILIZATION: "UNLIMITED" = "UNLIMITED";

  // =======================
  // ✅ RULE: ลากิจปกติ ต้องยื่นล่วงหน้า >= 3 วันทำการ (จ.-ส.) (ยกเว้นฉุกเฉิน/ย้อนหลัง)
  // =======================
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

  // =======================
  // ✅ Usage summary: โหลด “ใช้ไปแล้ว” ทุกประเภทในปีนี้ (query ครั้งเดียว)
  // =======================
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageErr, setUsageErr] = useState("");
  const [usedMap, setUsedMap] = useState<Record<string, number>>({});

  function usedKey(cat: LeaveCategory, sub?: LeaveSubType | "") {
    if (cat !== "ลากรณีพิเศษ") return `CAT:${cat}`;
    return `SP:${sub || "UNKNOWN"}`;
  }

  async function loadYearUsageAll() {
    if (!user?.uid) return;

    setUsageLoading(true);
    setUsageErr("");
    try {
      const snap = await getDocs(query(collection(db, "leave_requests"), where("uid", "==", user.uid)));
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];

      const year = new Date().getFullYear();
      const yStart = `${year}-01-01`;
      const yEnd = `${year}-12-31`;

      const okRows = rows
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
        });

      const next: Record<string, number> = {};

      for (const r of okRows) {
        const cat = String(r.category || "") as LeaveCategory;
        const sub = String(r.subType || "") as LeaveSubType;
        const days = Number(r.workdaysCount || 0) || 0;

        if (cat === "ลากรณีพิเศษ") {
          const k = usedKey("ลากรณีพิเศษ", sub);
          next[k] = (next[k] || 0) + days;
        } else if (cat === "ลากิจ" || cat === "ลาป่วย" || cat === "ลาพักร้อน") {
          const k = usedKey(cat);
          next[k] = (next[k] || 0) + days;
        }
      }

      setUsedMap(next);
    } catch (e: any) {
      console.error("loadYearUsageAll error:", e);
      setUsageErr(e?.message || String(e));
      setUsedMap({});
    } finally {
      setUsageLoading(false);
    }
  }

  useEffect(() => {
    loadYearUsageAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const bizUsed = usedMap[usedKey("ลากิจ")] || 0;
  const sickUsed = usedMap[usedKey("ลาป่วย")] || 0;
  const vacationUsed = usedMap[usedKey("ลาพักร้อน")] || 0;

  const maternityUsed = usedMap[usedKey("ลากรณีพิเศษ", "ลาคลอด")] || 0;
  const militaryUsed = usedMap[usedKey("ลากรณีพิเศษ", "ลาราชการทหาร")] || 0;
  const sterilUsed = usedMap[usedKey("ลากรณีพิเศษ", "ลาเพื่อทำหมัน")] || 0;

  const bizRemain = Math.max(0, LIMIT_BUSINESS - bizUsed);
  const sickRemain = Math.max(0, LIMIT_SICK - sickUsed);
  const vacationRemain = Math.max(0, LIMIT_VACATION - vacationUsed);
  const maternityRemain = Math.max(0, LIMIT_MATERNITY - maternityUsed);
  const militaryRemain = Math.max(0, LIMIT_MILITARY - militaryUsed);

  // =======================
  // ✅ NEW: Summary block (ดูย้อนหลังรายปี) สำหรับ “รวมสิทธิการลาทั้งหมด”
  // =======================
  function toAdYear(thYear: number) {
    // thYear = พ.ศ. -> ค.ศ.
    return thYear - 543;
  }
  function toThYear(adYear: number) {
    return adYear + 543;
  }

  const [summaryYearTH, setSummaryYearTH] = useState<number>(() => toThYear(new Date().getFullYear()));
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryErr, setSummaryErr] = useState("");
  const [summaryUsedMap, setSummaryUsedMap] = useState<Record<string, number>>({});

  async function loadUsageAllByYear(adYear: number) {
    if (!user?.uid) return;

    setSummaryLoading(true);
    setSummaryErr("");
    try {
      const snap = await getDocs(query(collection(db, "leave_requests"), where("uid", "==", user.uid)));
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];

      const yStart = `${adYear}-01-01`;
      const yEnd = `${adYear}-12-31`;

      const okRows = rows
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
        });

      const next: Record<string, number> = {};
      for (const r of okRows) {
        const cat = String(r.category || "") as LeaveCategory;
        const sub = String(r.subType || "") as LeaveSubType;
        const days = Number(r.workdaysCount || 0) || 0;

        if (cat === "ลากรณีพิเศษ") {
          const k = usedKey("ลากรณีพิเศษ", sub);
          next[k] = (next[k] || 0) + days;
        } else if (cat === "ลากิจ" || cat === "ลาป่วย" || cat === "ลาพักร้อน") {
          const k = usedKey(cat);
          next[k] = (next[k] || 0) + days;
        }
      }

      setSummaryUsedMap(next);
    } catch (e: any) {
      console.error("loadUsageAllByYear error:", e);
      setSummaryErr(e?.message || String(e));
      setSummaryUsedMap({});
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    const ad = toAdYear(summaryYearTH);
    loadUsageAllByYear(ad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, summaryYearTH]);

  const summaryBizUsed = summaryUsedMap[usedKey("ลากิจ")] || 0;
  const summarySickUsed = summaryUsedMap[usedKey("ลาป่วย")] || 0;
  const summaryVacationUsed = summaryUsedMap[usedKey("ลาพักร้อน")] || 0;

  const resetAll = async () => {
const handleResetClick = async () => {
  const ok = await dialog.confirm("ต้องการล้างฟอร์มนี้ใช่ไหม?", {
    title: "ยืนยันการล้างฟอร์ม",
    variant: "danger",
    confirmText: "ล้างฟอร์ม",
    cancelText: "ยกเลิก",
    size: "md",
  });
  if (ok) resetAll();
};
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
    if (isBusinessNormal && !isRetroactive && startYMD) {
      if (!isBusinessEmergency && compareYMD(startYMD, minStartForBusinessNormal) < 0) {
        e.startDate = `ลากิจปกติ: ต้องยื่นล่วงหน้าอย่างน้อย 3 วันทำการ (เริ่มลาได้ตั้งแต่ ${minStartForBusinessNormal} เป็นต้นไป)`;
      }
    }

    // ✅ เงื่อนไขเอกสาร “เฉพาะ” ลาคลอด/ทหาร/ทำหมัน (เขียนไว้เป็นเงื่อนไข)
    if (isSterilization) {
      // ต้องยื่นล่วงหน้า 1 วัน (ตามเงื่อนไขที่ให้มา)
      if (!isRetroactive && startYMD) {
        const min = (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          const t = addDays(d, 1);
          const pad2 = (x: number) => String(x).padStart(2, "0");
          return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
        })();
        if (compareYMD(startYMD, min) < 0) {
          e.startDate = `ลาเพื่อทำหมัน: ต้องยื่นล่วงหน้าอย่างน้อย 1 วัน (เริ่มลาได้ตั้งแต่ ${min})`;
        }
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

    // ✅ ตรวจสิทธิ/เพดาน
    if (isBusinessLeave && workdaysCount > 0) {
      if (workdaysCount > bizRemain) e.businessLimit = `ลากิจปีนี้เหลือ ${bizRemain} วัน (คุณกำลังยื่น ${workdaysCount} วันทำการ)`;
    }
    if (isSick && workdaysCount > 0) {
      if (workdaysCount > sickRemain) e.sickLimit = `ลาป่วยปีนี้เหลือ ${sickRemain} วัน (คุณกำลังยื่น ${workdaysCount} วันทำการ)`;
    }
    if (isVacation && workdaysCount > 0) {
      if (workdaysCount > vacationRemain) e.vacationLimit = `ลาพักร้อนปีนี้เหลือ ${vacationRemain} วัน (คุณกำลังยื่น ${workdaysCount} วันทำการ)`;
    }
    if (isMaternity && workdaysCount > 0) {
      if (workdaysCount > maternityRemain) e.maternityLimit = `ลาคลอดปีนี้เหลือ ${maternityRemain} วัน (คุณกำลังยื่น ${workdaysCount} วันทำการ)`;
    }
    if (isMilitary && workdaysCount > 0) {
      if (workdaysCount > militaryRemain) e.militaryLimit = `ลาเพื่อรับราชการทหารปีนี้เหลือ ${militaryRemain} วัน (คุณกำลังยื่น ${workdaysCount} วันทำการ)`;
    }

    setErrors(e);
    return e;
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
  ev.preventDefault();

  if (!user?.uid) {
    await dialog.alert("ยังไม่เข้าสู่ระบบ", { title: "ส่งคำร้องไม่สำเร็จ", variant: "danger", size: "sm" });
    return;
  }

  const e = validate();
  if (Object.keys(e).length > 0) {
    const msg = Object.values(e).join(" • ");
    await dialog.alert(msg, { title: "ส่งคำร้องไม่สำเร็จ", variant: "danger", size: "md" });
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

    await loadYearUsageAll();
    await loadUsageAllByYear(toAdYear(summaryYearTH));

    setErrors({});
    setFiles([]);
    setUploadPct(0);
    setRetroReason("");

    const requestNo = created.requestNo ?? created.id ?? "-";

    // ✅ popup แบบเดียวทั้งเว็บ
    await dialog.alert(`เลขคำร้อง: ${requestNo}`, { title: "ส่งคำร้องสำเร็จ", variant: "success", size: "md" });

    // ✅ หลังปิด dialog ค่อยเด้งหน้า (เหมือน flow เดิม)
    resetAll();
    navigate(MY_LEAVES_PATH);
  } catch (err: any) {
    console.error(err);
    await dialog.alert(err?.message || String(err), { title: "ส่งคำร้องไม่สำเร็จ", variant: "danger", size: "lg" });
  } finally {
    setSubmitting(false);
  }
};

  // =======================
  // ✅ ConditionsBox: ทำรูปแบบเดียวกันทุกประเภท + เงื่อนไขอยู่ด้านบน
  // =======================
  const ConditionsBox = useMemo(() => {
    if (!category) return null;

    const year = new Date().getFullYear();

    const wrapCls =
      "rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200";

    const headerCls = "font-extrabold text-gray-900 dark:text-gray-100";
    const listCls = "mt-2 grid gap-1 text-sm text-gray-700 dark:text-gray-200";

    // 1) ลากิจ
    if (category === "ลากิจ") {
      return (
        <div className={wrapCls}>
          <div className={headerCls}>เงื่อนไขลากิจ</div>
          <div className={listCls}>
            <div>• ลาได้ไม่เกิน 5 วัน/ปี (รีเซ็ตทุกปี / ไม่สะสม)</div>
            <div>• ลากิจปกติ ต้องยื่นล่วงหน้าอย่างน้อย 3 วันทำการ (จ.-ส.)</div>
            <div>• ลากิจฉุกเฉิน: ไม่จำเป็นต้องยื่นใบรับรองแพทย์</div>
            <div>• กรณีย้อนหลัง ต้องมีเหตุผล หรือแนบไฟล์หลักฐาน</div>
          </div>

          <YearEntitlementCard
            title="สรุปสิทธิในปีนี้"
            year={year}
            total={LIMIT_BUSINESS}
            used={bizUsed}
            loading={usageLoading}
            error={usageErr}
            requested={workdaysCount}
            note={
              <>
                {isBusinessNormal && !isRetroactive && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                    <div className="font-extrabold">ลากิจปกติ: วันที่เริ่มลาเร็วสุด</div>
                    <div className="mt-1 text-sm">
                      เริ่มลาได้ตั้งแต่ <span className="font-extrabold">{minStartForBusinessNormal}</span> เป็นต้นไป
                    </div>
                  </div>
                )}

                {errors.businessLimit && <div className="mt-2 text-xs font-extrabold text-red-600">{errors.businessLimit}</div>}
              </>
            }
          />
        </div>
      );
    }
    // 2) ลาป่วย
    if (category === "ลาป่วย") {
      return (
        <div className={wrapCls}>
          <div className={headerCls}>เงื่อนไขลาป่วย </div>

          <div className={listCls}>
            <div>• “ป่วยระหว่างวัน” ไม่ต้องแนบใบรับรองทุกกรณี</div>
            <div>• ป่วยระหว่างวัน: ต้องเป็นวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00</div>
            <div>• ลาป่วย ≥ 3 วันทำการ ต้องมีใบรับรอง “จากโรงพยาบาลเท่านั้น”</div>
          </div>

          <YearEntitlementCard
            title="สรุปสิทธิในปีนี้"
            year={year}
            total={LIMIT_SICK}
            used={sickUsed}
            loading={usageLoading}
            error={usageErr}
            requested={workdaysCount}
            note={
              <>
                <div className="text-sm">
                  <span className="font-semibold">จำนวนวันทำการ (ประเมิน):</span>{" "}
                  <span className="font-extrabold text-teal-700 dark:text-teal-200">{workdaysCount} วัน</span>
                  {startYMD && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{isRetroactive ? "• ยื่นย้อนหลัง" : "• ไม่ย้อนหลัง"}</span>
                  )}
                </div>

                {needMedicalCert && medicalCertMode === "DUE_BY_WORKDAY_3" && medicalCertDueAt && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                    <div className="font-extrabold">ต้องแนบใบรับรอง “ภายในวันทำการที่ 3”</div>
                    <div className="mt-1 text-sm">
                      เดดไลน์: <span className="font-extrabold">{formatThaiDate(medicalCertDueAt)}</span> (ภายใน 23:59)
                    </div>
                    <div className="mt-1 text-xs opacity-90">
                      * วันนี้สามารถยื่นก่อน แล้วไปแนบเอกสารภายหลังในหน้า “ใบลาของฉัน” (ตอนสถานะยังรอดำเนินการ)
                    </div>
                  </div>
                )}

                {needMedicalCert && medicalCertMode === "MUST_AT_SUBMIT" && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
                    <div className="font-extrabold">ลาป่วยย้อนหลัง ≥ 3 วันทำการ: ต้องแนบใบรับรองตอนยื่น</div>
                    <div className="mt-1 text-xs opacity-90">* ไม่ควรแนบทีหลัง เพราะถือว่าเลยเดดไลน์แล้ว</div>
                  </div>
                )}

                {errors.sickLimit && <div className="mt-2 text-xs font-extrabold text-red-600">{errors.sickLimit}</div>}
              </>
            }
          />
        </div>
      );
    }

    // 3) ลาพักร้อน
    if (category === "ลาพักร้อน") {
      return (
        <div className={wrapCls}>
          <div className={headerCls}>เงื่อนไขลาพักร้อน</div>
          <div className={listCls}>
            <div>• สิทธิวันลาพักร้อน 6 วัน/ปี (รีเซ็ตทุกปี / ไม่สะสม)</div>
            <div>• แนะนำให้ยื่นล่วงหน้าเพื่อให้ผู้อนุมัติพิจารณาได้ทันเวลา</div>
          </div>

          <YearEntitlementCard
            title="สรุปสิทธิในปีนี้"
            year={year}
            total={LIMIT_VACATION}
            used={vacationUsed}
            loading={usageLoading}
            error={usageErr}
            requested={workdaysCount}
            note={
              <>
                <div className="text-sm">* หากบริษัทมีเงื่อนไขเพิ่มเติม ให้ยึดตามนโยบาย/HR</div>
                {errors.vacationLimit && <div className="mt-2 text-xs font-extrabold text-red-600">{errors.vacationLimit}</div>}
              </>
            }
          />
        </div>
      );
    }

    // 4) ลากรณีพิเศษ
    return (
      <div className={wrapCls}>
        <div className={headerCls}>เงื่อนไขลากรณีพิเศษ</div>

        <div className={listCls}>
          <div>• ขึ้นกับประเภทที่เลือก (เช่น ลาคลอด / ราชการทหาร / ทำหมัน / อื่นๆ)</div>
          <div>• อาจต้องแนบเอกสารประกอบตามที่ HR/ผู้อนุมัติร้องขอ</div>
        </div>

        {isMaternity && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-extrabold">ลาคลอด (เงื่อนไขการยื่น)</div>
            <div className="mt-1 text-sm">
              • ต้องลาล่วงหน้าไม่น้อยกว่า 30 วัน และแนบหลักฐานสมุดฝากครรภ์
              <br />• เมื่อกลับมาทำงาน ให้ยื่นสำเนาหลักฐานการคลอดบุตรประกอบใบลา หรือ สำเนาใบรับรองแพทย์
            </div>
          </div>
        )}

        {isMilitary && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-extrabold">ลาเพื่อรับราชการทหาร (เงื่อนไข)</div>
            <div className="mt-1 text-sm">
              • พร้อมแนบสำเนาหลักฐานหมายเรียกพลของราชการ
              <br />• มีสิทธิลาโดยได้รับค่าจ้างเท่ากับวันทำงานปกติ ตามจำนวนวันที่ถูกเรียกพล แต่ไม่เกิน 60 วัน
            </div>
          </div>
        )}

        {isSterilization && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-extrabold">ลาเพื่อทำหมัน และลาเนื่องจากการทำหมัน (เงื่อนไข)</div>
            <div className="mt-1 text-sm">
              • มีสิทธิ์ลาเพื่อทำหมัน และมีสิทธิ์ลาเนื่องจากการทำหมันตามระยะเวลาที่แพทย์กำหนดและออกใบรับรอง โดยลูกจ้างมีสิทธิ์ได้รับค่าจ้างในวันลานั้นด้วย
              <br />• ต้องยื่นใบลาล่วงหน้า 1 วัน และแนบใบรับรองแพทย์ย้อนหลังเมื่อกลับมาทำงานวันแรก
            </div>
          </div>
        )}

        <YearEntitlementCard
          title="สรุปสิทธิในปีนี้"
          year={year}
          total={isMaternity ? LIMIT_MATERNITY : isMilitary ? LIMIT_MILITARY : isSterilization ? LIMIT_STERILIZATION : null}
          used={isMaternity ? maternityUsed : isMilitary ? militaryUsed : isSterilization ? sterilUsed : null}
          loading={usageLoading}
          error={usageErr}
          requested={workdaysCount}
          note={
            <>
              {!subType && <div className="text-sm">* โปรดเลือก “ประเภทย่อย” เพื่อแสดงสิทธิของรายการนั้น</div>}
              {errors.maternityLimit && <div className="mt-2 text-xs font-extrabold text-red-600">{errors.maternityLimit}</div>}
              {errors.militaryLimit && <div className="mt-2 text-xs font-extrabold text-red-600">{errors.militaryLimit}</div>}
            </>
          }
        />
      </div>
    );
  }, [
    category,
    subType,
    workdaysCount,
    usageLoading,
    usageErr,
    bizUsed,
    sickUsed,
    vacationUsed,
    maternityUsed,
    militaryUsed,
    sterilUsed,
    bizRemain,
    sickRemain,
    vacationRemain,
    maternityRemain,
    militaryRemain,
    isBusinessNormal,
    isRetroactive,
    minStartForBusinessNormal,
    startYMD,
    needMedicalCert,
    medicalCertMode,
    medicalCertDueAt,
    errors.businessLimit,
    errors.sickLimit,
    errors.vacationLimit,
    errors.maternityLimit,
    errors.militaryLimit,
    isMaternity,
    isMilitary,
    isSterilization,
  ]);

  // ✅ years for summary (พ.ศ.) — 7 ปีล่าสุด (ปรับได้)
  const summaryYearOptions = useMemo(() => {
    const nowTH = toThYear(new Date().getFullYear());
    const years = Array.from({ length: 7 }, (_, i) => nowTH - 6 + i);
    return years.map((y) => ({ value: String(y), label: String(y) }));
  }, []);

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
          onClick={() => resetAll()}
          disabled={submitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          ล้างฟอร์ม
        </button>
      </div>

      {/* ✅ เงื่อนไข: แสดง “เฉพาะประเภทที่เลือก” */}
      {ConditionsBox}

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
                  {(errors.startDate ||
                    errors.businessLimit ||
                    errors.sickLimit ||
                    errors.vacationLimit ||
                    errors.maternityLimit ||
                    errors.militaryLimit) && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {errors.startDate ||
                        errors.businessLimit ||
                        errors.sickLimit ||
                        errors.vacationLimit ||
                        errors.maternityLimit ||
                        errors.militaryLimit}
                    </p>
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
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">* ป่วยระหว่างวัน: ต้องเป็นวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00</div>
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

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">* ไฟล์จะถูกอัปโหลดไป Supabase Storage ผ่าน Backend</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 disabled:opacity-60"
          >
            {submitting ? "กำลังส่ง..." : "ส่งคำร้อง"}
          </button>
        </div>
      </form>

      {/* =======================
          ✅ NEW BLOCK: รวมสิทธิการลาทั้งหมด (ดูย้อนหลังรายปี)
          ✅ วางต่อจากปุ่มล้างฟอร์ม/ส่งคำร้อง (แยกส่วน)
        ======================= */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100">รวมสิทธิการลาทั้งหมด</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">ดูยอด “ใช้ไป/คงเหลือ” ของแต่ละประเภท และเลือกปีเพื่อดูย้อนหลัง</div>
          </div>

          <div className="min-w-[180px]">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">เลือกปี (พ.ศ.)</div>
            <select
              value={String(summaryYearTH)}
              onChange={(e) => setSummaryYearTH(Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-800 dark:bg-gray-900"
            >
              {summaryYearOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {summaryErr && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            * โหลดข้อมูลย้อนหลังไม่สำเร็จ: {summaryErr}
          </div>
        )}

        <div className="mt-6 grid gap-4">
  {/* 1) ลาป่วย */}
  <EntitlementRow title="ลาป่วย (รวม)" total={LIMIT_SICK} used={summarySickUsed} loading={summaryLoading} />

  {/* 2) ลากิจ */}
  <EntitlementRow title="ลากิจ" total={LIMIT_BUSINESS} used={summaryBizUsed} loading={summaryLoading} />

  {/* 3) ลาพักร้อน */}
  <EntitlementRow title="ลาพักร้อนประจำปี" total={LIMIT_VACATION} used={summaryVacationUsed} loading={summaryLoading} />

  {/* 4) ลาคลอด */}
  <EntitlementRow
    title="ลาคลอด"
    total={LIMIT_MATERNITY}
    used={summaryUsedMap[usedKey("ลากรณีพิเศษ", "ลาคลอด")] || 0}
    loading={summaryLoading}
  />

  {/* 5) ลาทำหมัน (ไม่จำกัด) */}
  <EntitlementRow
    title="ลาเพื่อทำหมัน"
    total={LIMIT_STERILIZATION}
    used={summaryUsedMap[usedKey("ลากรณีพิเศษ", "ลาเพื่อทำหมัน")] || 0}
    loading={summaryLoading}
  />

  {/* 6) ลารับราชการทหาร */}
  <EntitlementRow
    title="ลาเพื่อรับราชการทหาร"
    total={LIMIT_MILITARY}
    used={summaryUsedMap[usedKey("ลากรณีพิเศษ", "ลาราชการทหาร")] || 0}
    loading={summaryLoading}
  />
</div>

        <div className="mt-5 text-xs text-gray-500 dark:text-gray-400">
          * หมายเหตุ: ไม่นับคำร้องที่ “ไม่อนุมัติ/REJECTED” และ “ยกเลิก/CANCELED”
        </div>
      </div>
    </div>
  );
}
