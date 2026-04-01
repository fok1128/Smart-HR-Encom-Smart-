// LeaveSubmitPage.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createLeaveRequestWithFiles,
  getLeaveRequestById,
  updateMyPendingLeaveRequest,
  deleteFilesFromLeaveRequest,
  getAttachmentKey,
  type LeaveAttachment,
} from "../services/leaveRequests";

import { getSignedUrl } from "../services/files";

import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useDialogCenter } from "../components/common/DialogCenter";
import AppButton from "../components/common/AppButton";
import PageMeta from "../components/common/PageMeta";
import { inputTheme } from "../components/ui/theme/inputTheme";

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
type LeaveMode = "time";

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
function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}
function buildEmployeeNameForLeave(user: any): string {
  const first = pickStr(
    user?.fname,
    user?.employee?.fname,
    user?.user?.fname,
    user?.firstName
  );
  const last = pickStr(
    user?.lname,
    user?.employee?.lname,
    user?.user?.lname,
    user?.lastName
  );

  const full = `${first} ${last}`.trim();
  if (full) return full;

  return pickStr(
    user?.displayName,
    user?.user?.displayName,
    user?.user?.name,
    user?.name
  );
}

function buildEmployeeNoForLeave(user: any): string {
  return pickStr(
    user?.employeeNo,
    user?.employee?.employeeNo,
    user?.user?.employeeNo,
    user?.empNo
  );
}

function buildPhoneForLeave(user: any): string {
  return pickStr(
    user?.phone,
    user?.employee?.phone,
    user?.user?.phone,
    user?.tel,
    user?.mobile
  );
}
/** ✅ Dropdown custom (ปรับให้เข้าธีม inputTheme) */
function SelectBox<T extends string>({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  clearable = true,
}: {
  label: ReactNode;
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
      {!!label && <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</div>}

      <div ref={wrapRef} className="relative mt-2">
        <div
          className={[
            inputTheme.control,
            "flex items-center justify-between gap-3",
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
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
                className="grid h-7 w-7 place-items-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
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
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
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
                      "w-full px-4 py-2.5 text-left text-sm",
                      "transition cursor-pointer",
                      isSelected
                        ? "bg-violet-50 text-violet-700 font-semibold dark:bg-violet-500/10 dark:text-violet-200"
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

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_WORKDAY = 8 * 60;
const WORK_WINDOWS: Array<[number, number]> = [
  [9 * 60, 12 * 60],
  [13 * 60, 18 * 60],
];

function roundLeaveUnits(v: number) {
  return Number((Number.isFinite(v) ? v : 0).toFixed(6));
}

function overlapMinutes(startA: number, endA: number, startB: number, endB: number) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function diffWorkingMinutesFromLocalDateTime(start: string, end: string) {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) return 0;
  if (endDate.getTime() <= startDate.getTime()) return 0;

  const startYMD = datePartFromDateTimeLocal(start);
  const endYMD = datePartFromDateTimeLocal(end);
  if (!startYMD || !endYMD) return 0;

  let total = 0;
  let cursor = toDateOnlyLocal(startYMD);
  const last = toDateOnlyLocal(endYMD);

  while (cursor.getTime() <= last.getTime()) {
    if (isCompanyWorkday(cursor)) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const d = cursor.getDate();

      const dayStart = new Date(y, m, d, 0, 0, 0, 0).getTime();
      const reqStart = Math.max(startDate.getTime(), dayStart);
      const reqEnd = Math.min(endDate.getTime(), dayStart + 24 * 60 * 60 * 1000);

      if (reqEnd > reqStart) {
        const reqStartMin = Math.floor((reqStart - dayStart) / 60000);
        const reqEndMin = Math.ceil((reqEnd - dayStart) / 60000);

        for (const [winStart, winEnd] of WORK_WINDOWS) {
          total += overlapMinutes(reqStartMin, reqEndMin, winStart, winEnd);
        }
      }
    }

    cursor = addDays(cursor, 1);
  }

  return total;
}


function formatMinutesAsLeaveText(totalMinutes: number) {
  const mins = Math.max(0, Math.round(Number.isFinite(totalMinutes) ? totalMinutes : 0));
  const days = Math.floor(mins / MINUTES_PER_WORKDAY);
  const remainAfterDays = mins % MINUTES_PER_WORKDAY;
  const hours = Math.floor(remainAfterDays / MINUTES_PER_HOUR);
  const minutes = remainAfterDays % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);

  if (parts.length === 0) return '0 นาที';
  return parts.join(' ');
}

function leaveUnitsToMinutes(units: number) {
  return Math.max(0, Math.round((Number.isFinite(units) ? units : 0) * MINUTES_PER_WORKDAY));
}

function formatLeaveUnitsAsText(units: number) {
  return formatMinutesAsLeaveText(leaveUnitsToMinutes(units));
}

function getEntitlementMetrics(total: number | null | "UNLIMITED", used?: number | null, requested?: number) {
  const usedNum = Number.isFinite(used as number) ? Number(used) : 0;
  const requestedNum = Number.isFinite(requested as number) ? Number(requested) : 0;

  const isUnlimited = total === "UNLIMITED";
  const hasTotal = typeof total === "number" && Number.isFinite(total);
  const totalNum = hasTotal ? Number(total) : 0;

  const remaining = hasTotal ? Math.max(0, totalNum - usedNum) : null;
  const projectedUsed = roundLeaveUnits(usedNum + requestedNum);
  void projectedUsed;
  const projectedRemaining = hasTotal ? Math.max(0, totalNum - projectedUsed) : null;
  const exceeded = hasTotal ? Math.max(0, usedNum - totalNum) : 0;
  const projectedExceeded = hasTotal ? Math.max(0, projectedUsed - totalNum) : 0;
  const pctUsed = hasTotal && totalNum > 0 ? Math.min(100, Math.max(0, (usedNum / totalNum) * 100)) : 0;
  const pctProjected = hasTotal && totalNum > 0 ? Math.min(100, Math.max(pctUsed, (projectedUsed / totalNum) * 100)) : 0;

  return {
    usedNum,
    requestedNum,
    isUnlimited,
    hasTotal,
    totalNum,
    remaining,
    projectedUsed,
    projectedRemaining,
    exceeded,
    projectedExceeded,
    pctUsed,
    pctProjected,
  };
}

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
  const {
    usedNum,
    requestedNum,
    isUnlimited,
    hasTotal,
    totalNum,
    remaining,
    projectedRemaining,
    exceeded,
    projectedExceeded,
    pctUsed,
    pctProjected,
  } = getEntitlementMetrics(total, used, requested);

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">{title}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900">ปี {year}</span>

            {isUnlimited ? (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">สิทธิ: ไม่จำกัด (ตามแพทย์/นโยบาย)</span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span>
                  ใช้ไป <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : formatLeaveUnitsAsText(usedNum)}</span>
                </span>
              </>
            ) : hasTotal ? (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span>
                  ใช้ไป <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : formatLeaveUnitsAsText(usedNum)}</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span>
                  คงเหลือ <span className="font-extrabold text-violet-700 dark:text-violet-200">{loading ? "…" : formatLeaveUnitsAsText(remaining ?? 0)}</span>
                </span>
                {exceeded > 0 && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">•</span>
                    <span>
                      เกินสิทธิ <span className="font-extrabold text-red-600 dark:text-red-300">{loading ? "…" : formatLeaveUnitsAsText(exceeded)}</span>
                    </span>
                  </>
                )}
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
          จำนวนเวลาที่ยื่นในรอบนี้: <span className="font-extrabold text-gray-900 dark:text-gray-100">{formatLeaveUnitsAsText(requestedNum)}</span>
        </div>
      </div>

      {hasTotal && (
        <div className="mt-4">
          <div className="flex flex-wrap items-end justify-between gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            <div>
              ใช้สิทธิ <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : formatLeaveUnitsAsText(usedNum)}</span> / {formatLeaveUnitsAsText(totalNum)}
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              {((requestedNum > 0 && projectedExceeded > 0) || (requestedNum <= 0 && exceeded > 0)) && (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-700 shadow-sm dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                  เกินสิทธิรวม {loading ? "…" : formatLeaveUnitsAsText(requestedNum > 0 ? projectedExceeded : exceeded)}
                </span>
              )}
              <div>
                คงเหลือ <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : formatLeaveUnitsAsText(remaining ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="relative h-full w-full">
              <div className="absolute inset-y-0 left-0 bg-violet-600 dark:bg-violet-400 transition-all" style={{ width: `${loading ? 0 : pctProjected}%`, opacity: requestedNum > 0 ? 0.35 : 1 }} />
              <div className="absolute inset-y-0 left-0 bg-violet-600 dark:bg-violet-400 transition-all" style={{ width: `${loading ? 0 : pctUsed}%` }} />
            </div>
          </div>

          {requestedNum > 0 && projectedExceeded <= 0 ? (
            <div className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
              หลังรวมคำร้องรอบนี้จะเหลือ {loading ? "…" : formatLeaveUnitsAsText(projectedRemaining ?? 0)}
            </div>
          ) : null}
        </div>
      )}

      {!!note && <div className="mt-5 space-y-3 text-sm text-gray-700 dark:text-gray-200">{note}</div>}

      {!!error && (
        <div className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-200">* โหลดข้อมูลสิทธิไม่สำเร็จ: {error}</div>
      )}
    </div>
  );
}

/** ✅ แถวสรุปแบบรูปตัวอย่าง */
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
  const { usedNum, isUnlimited, hasTotal, totalNum, remaining, exceeded, pctUsed } = getEntitlementMetrics(total, used, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {isUnlimited ? (
              <>ใช้ไป {loading ? "…" : formatLeaveUnitsAsText(usedNum)} • คงเหลือ ไม่จำกัด</>
            ) : hasTotal ? (
              <>
                ใช้ไป <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : formatLeaveUnitsAsText(usedNum)}</span> / {formatLeaveUnitsAsText(totalNum)} • คงเหลือ{' '}
                <span className="font-extrabold text-gray-900 dark:text-gray-100">{loading ? "…" : formatLeaveUnitsAsText(remaining ?? 0)}</span>
                {exceeded > 0 && (
                  <>
                    {' '}• เกินสิทธิ <span className="font-extrabold text-red-600 dark:text-red-300">{loading ? "…" : formatLeaveUnitsAsText(exceeded)}</span>
                  </>
                )}
              </>
            ) : (
              <>ใช้ไป {loading ? "…" : formatLeaveUnitsAsText(usedNum)} • คงเหลือ ตรวจสอบกับ HR</>
            )}
          </div>
        </div>

        <div className="shrink-0 text-sm font-extrabold text-gray-900 dark:text-gray-100">
          {typeof total === "number" ? formatLeaveUnitsAsText(total) : "ไม่จำกัด"}
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div className="h-full bg-violet-600 dark:bg-violet-400 transition-all" style={{ width: `${loading || isUnlimited ? 0 : pctUsed}%` }} />
      </div>

      {hasTotal && exceeded > 0 && (
        <div className="mt-2 text-xs font-extrabold text-red-600 dark:text-red-300">ใช้สิทธิเกินสะสม {loading ? "…" : formatLeaveUnitsAsText(exceeded)}</div>
      )}
    </div>
  );
}

type LeaveSubmitPageProps = {
  embedded?: boolean;
  editId?: string;
  onDone?: () => void;
  onCancel?: () => void;
};

export default function LeaveSubmitPage(props: LeaveSubmitPageProps = {}) {
 const { user, roleReady } = useAuth();
  const _navigate = useNavigate();

  const allowGoMyLeavesRef = useRef(false);

  const dialog = useDialogCenter();
  const location = useLocation();

  const embedded = !!props.embedded;
  const urlEditId = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get("edit") || "";
    } catch {
      return "";
    }
  }, [location.search]);

  const effectiveEditId = String(props.editId || "").trim() || urlEditId;
  const isEdit = !!effectiveEditId;

  const [, setLoadingEdit] = useState(false);
  const [, setEditLoadErr] = useState<string | null>(null);

  const [category, setCategory] = useState<LeaveCategory | "">("");
  const [subType, setSubType] = useState<LeaveSubType | "">("");

  // ✅ เหลือเฉพาะแบบระบุเวลา
  const mode: LeaveMode = "time";

  const [startDT, setStartDT] = useState<string>(() => toISODateTimeLocal(new Date()));
  const [endDT, setEndDT] = useState<string>(() => toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));

  const [reason, setReason] = useState<string>("");
  const [retroReason, setRetroReason] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ ไฟล์เดิมในคำร้อง (ตอน Edit)
  const [existingAttachments, setExistingAttachments] = useState<LeaveAttachment[]>([]);
  const [deletingKey, setDeletingKey] = useState<string>("");
  const [editOriginalUsage, setEditOriginalUsage] = useState<{
    category: LeaveCategory | "";
    subType: LeaveSubType | "";
    startAt: string;
    leaveUnits: number;
  } | null>(null);

  function navigate(to: any, opts?: any) {
  console.group("🚨 NAVIGATE called");
  console.log("to =", to, "opts =", opts);
  console.trace("stack");
  console.groupEnd();
  return _navigate(to, opts);
}
  function toArrayMaybe(x: any): any[] {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }
  function pickAttachmentsFromDoc(doc: any): LeaveAttachment[] {
    const raw =
      doc?.attachments ??
      doc?.files ??
      doc?.attachment ??
      doc?.fileAttachments ??
      doc?.uploadedFiles ??
      doc?.storagePaths ??
      null;
    return toArrayMaybe(raw) as any;
  }
  function attachmentKeySafe(a: any): string {
    return pickStr(getAttachmentKey(a), a?.key, a?.storagePath, a?.path, a?.url, a?.name, a?.originalName);
  }

  // =======================
  // ✅ Edit mode: โหลดคำร้องเดิมมาเติมฟอร์ม
  // =======================
  useEffect(() => {
    let alive = true;

    async function run() {
      setEditLoadErr("");
      if (!isEdit) {
        setEditOriginalUsage(null);
        return;
      }

      if (!user?.uid) {
        setEditLoadErr("ยังไม่เข้าสู่ระบบ");
        return;
      }

      setLoadingEdit(true);
      try {
        const doc = await getLeaveRequestById(effectiveEditId);
        if (!alive) return;

        if (!doc) {
          setEditLoadErr("ไม่พบคำร้องนี้");
          return;
        }

        // ✅ ต้องเป็นเจ้าของคำร้อง
        if (String((doc as any).uid || "") !== String(user.uid || "")) {
          setEditLoadErr("คุณไม่มีสิทธิ์แก้ไขคำร้องนี้");
          return;
        }

        // ✅ แก้ได้เฉพาะตอนยังรอ HR
        const status = String((doc as any).status || "").toUpperCase();
        const overall = String((doc as any).overallStatus || "").toUpperCase();
        const okOverall = !overall || overall === "PENDING_HR";
        if (status !== "PENDING" || !okOverall) {
          setEditLoadErr("คำร้องนี้ถูกดำเนินการแล้ว (แก้ไขไม่ได้)");
          return;
        }

        // ✅ เติมค่าลงฟอร์ม
        setCategory(((doc as any).category || "") as any);
        setSubType(((doc as any).subType || "") as any);

        if ((doc as any).startAt) setStartDT(String((doc as any).startAt));
        if ((doc as any).endAt) setEndDT(String((doc as any).endAt));

        setReason(String((doc as any).reason || ""));
        setRetroReason(String((doc as any).retroReason || ""));
        setEditOriginalUsage({
          category: (((doc as any).category || "") as LeaveCategory | "") || "",
          subType: (((doc as any).subType || "") as LeaveSubType | "") || "",
          startAt: String((doc as any).startAt || ""),
          leaveUnits:
            typeof (doc as any).leaveUnits === "number"
              ? Number((doc as any).leaveUnits)
              : Number((doc as any).workdaysCount || 0) || 0,
        });

        // ✅ ไฟล์เดิมในคำร้อง (โชว์ไฟล์ล่าสุด)
        const atts = pickAttachmentsFromDoc(doc);
        setExistingAttachments(atts);
        setDeletingKey("");

        // ไฟล์ใหม่ (ที่เลือกเพิ่ม) ให้เริ่มเป็นว่าง
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e: any) {
        console.error("load edit leave error:", e);
        setEditOriginalUsage(null);
        setEditLoadErr(e?.message || String(e));
      } finally {
        if (alive) setLoadingEdit(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [isEdit, effectiveEditId, user?.uid]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);
  const profileHydratingForCreate = !isEdit && !!user?.uid && (!roleReady || !!(user as any)?._lite);
  useEffect(() => {
    // ✅ ตอนแก้ไข (Edit) ไม่ให้ reset ประเภทย่อยทิ้ง
    if (isEdit) return;

    if (category === "ลาพักร้อน") setSubType("ลาพักร้อน");
    else setSubType("");

    setErrors((prev) => {
      const next = { ...prev };
      delete next.subType;
      delete next.category;
      return next;
    });
  }, [category, isEdit]);

  const timedInvalid = isEndBeforeStart(startDT, endDT);

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

  const startYMD = useMemo(() => datePartFromDateTimeLocal(startDT), [startDT]);
  const endYMD = useMemo(() => datePartFromDateTimeLocal(endDT), [endDT]);
  const todayYMD = useMemo(() => todayISODate(), []);

  const isRetroactive = useMemo(() => {
    if (!startYMD) return false;
    return compareYMD(startYMD, todayYMD) < 0;
  }, [startYMD, todayYMD]);

  const leaveStartDateOnly = useMemo(() => (startYMD ? toDateOnlyLocal(startYMD) : null), [startYMD]);
  const leaveEndDateOnly = useMemo(() => (endYMD ? toDateOnlyLocal(endYMD) : null), [endYMD]);

  const leaveCalc = useMemo(() => {
    if (!leaveStartDateOnly || !leaveEndDateOnly || !startDT || !endDT) {
      return {
        workdaysCount: 0,
        leaveMinutes: 0,
        leaveUnits: 0,
      };
    }

    const workdays = countWorkdaysInclusive(leaveStartDateOnly, leaveEndDateOnly);
    const leaveMinutes = diffWorkingMinutesFromLocalDateTime(startDT, endDT);
    const leaveUnits = roundLeaveUnits(leaveMinutes / MINUTES_PER_WORKDAY);

    return {
      workdaysCount: workdays,
      leaveMinutes,
      leaveUnits,
    };
  }, [leaveStartDateOnly, leaveEndDateOnly, startDT, endDT]);

  const workdaysCount = leaveCalc.workdaysCount;
  const requestedLeaveMinutes = leaveCalc.leaveMinutes;
  const requestedLeaveUnits = leaveCalc.leaveUnits;

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

  function startYearFromDateTimeLocal(s: string) {
    const ymd = datePartFromDateTimeLocal(s);
    if (!ymd) return null;
    const y = Number(ymd.slice(0, 4));
    return Number.isFinite(y) ? y : null;
  }

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
        const units = typeof r.leaveUnits === "number" ? Number(r.leaveUnits) : Number(r.workdaysCount || 0) || 0;

        if (cat === "ลากรณีพิเศษ") {
          const k = usedKey("ลากรณีพิเศษ", sub);
          next[k] = roundLeaveUnits((next[k] || 0) + units);
        } else if (cat === "ลากิจ" || cat === "ลาป่วย" || cat === "ลาพักร้อน") {
          const k = usedKey(cat);
          next[k] = roundLeaveUnits((next[k] || 0) + units);
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

  const adjustedUsedMap = useMemo(() => {
    if (!isEdit || !editOriginalUsage || !editOriginalUsage.category) return usedMap;

    const currentYear = new Date().getFullYear();
    const originalYear = startYearFromDateTimeLocal(editOriginalUsage.startAt);
    if (!originalYear || originalYear !== currentYear) return usedMap;

    const key = usedKey(editOriginalUsage.category as LeaveCategory, editOriginalUsage.subType as LeaveSubType | "");

    const next = { ...usedMap };
    next[key] = roundLeaveUnits(Math.max(0, (next[key] || 0) - (editOriginalUsage.leaveUnits || 0)));
    return next;
  }, [isEdit, editOriginalUsage, usedMap]);

  const bizUsed = adjustedUsedMap[usedKey("ลากิจ")] || 0;
  const sickUsed = adjustedUsedMap[usedKey("ลาป่วย")] || 0;
  const vacationUsed = adjustedUsedMap[usedKey("ลาพักร้อน")] || 0;

  const maternityUsed = adjustedUsedMap[usedKey("ลากรณีพิเศษ", "ลาคลอด")] || 0;
  const militaryUsed = adjustedUsedMap[usedKey("ลากรณีพิเศษ", "ลาราชการทหาร")] || 0;
  const sterilUsed = adjustedUsedMap[usedKey("ลากรณีพิเศษ", "ลาเพื่อทำหมัน")] || 0;

  // =======================
  // ✅ Summary by year (ย้อนหลัง)
  // =======================
  function toAdYear(thYear: number) {
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
        const units = typeof r.leaveUnits === "number" ? Number(r.leaveUnits) : Number(r.workdaysCount || 0) || 0;

        if (cat === "ลากรณีพิเศษ") {
          const k = usedKey("ลากรณีพิเศษ", sub);
          next[k] = roundLeaveUnits((next[k] || 0) + units);
        } else if (cat === "ลากิจ" || cat === "ลาป่วย" || cat === "ลาพักร้อน") {
          const k = usedKey(cat);
          next[k] = roundLeaveUnits((next[k] || 0) + units);
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

  const selectedEntitlement = useMemo(() => {
    if (!category) return null;

    if (category === "ลากิจ") {
      return { label: "ลากิจ", total: LIMIT_BUSINESS as number | null | "UNLIMITED", used: bizUsed };
    }
    if (category === "ลาป่วย") {
      return { label: "ลาป่วย", total: LIMIT_SICK as number | null | "UNLIMITED", used: sickUsed };
    }
    if (category === "ลาพักร้อน") {
      return { label: "ลาพักร้อน", total: LIMIT_VACATION as number | null | "UNLIMITED", used: vacationUsed };
    }
    if (category === "ลากรณีพิเศษ") {
      if (subType === "ลาคลอด") {
        return { label: "ลาคลอด", total: LIMIT_MATERNITY as number | null | "UNLIMITED", used: maternityUsed };
      }
      if (subType === "ลาราชการทหาร") {
        return { label: "ลาเพื่อรับราชการทหาร", total: LIMIT_MILITARY as number | null | "UNLIMITED", used: militaryUsed };
      }
      if (subType === "ลาเพื่อทำหมัน") {
        return { label: "ลาเพื่อทำหมัน", total: LIMIT_STERILIZATION as number | null | "UNLIMITED", used: sterilUsed };
      }
      return {
        label: subType || "ลากรณีพิเศษ",
        total: null as number | null | "UNLIMITED",
        used: 0,
      };
    }

    return null;
  }, [
    category,
    subType,
    bizUsed,
    sickUsed,
    vacationUsed,
    maternityUsed,
    militaryUsed,
    sterilUsed,
  ]);

  const selectedEntitlementMetrics = useMemo(() => {
    if (!selectedEntitlement) return null;
    return getEntitlementMetrics(selectedEntitlement.total, selectedEntitlement.used, requestedLeaveUnits);
  }, [selectedEntitlement, requestedLeaveUnits]);

  const selectedEntitlementAlert = useMemo(() => {
    if (!selectedEntitlement || !selectedEntitlementMetrics || !selectedEntitlementMetrics.hasTotal) return null;

    if (selectedEntitlementMetrics.projectedExceeded > 0) {
      return {
        tone: "danger" as const,
        title: `คำร้องรอบนี้จะทำให้${selectedEntitlement.label}เกินสิทธิ`,
        message: `หลังยื่นคำร้องนี้ คุณจะใช้สิทธิรวม ${formatLeaveUnitsAsText(selectedEntitlementMetrics.projectedUsed)} จากสิทธิ ${formatLeaveUnitsAsText(selectedEntitlementMetrics.totalNum)} และมียอดเกินสิทธิรวม ${formatLeaveUnitsAsText(selectedEntitlementMetrics.projectedExceeded)}`,
      };
    }

    if (selectedEntitlementMetrics.exceeded > 0) {
      return {
        tone: "danger" as const,
        title: `${selectedEntitlement.label}มีการใช้เกินสิทธิสะสมอยู่แล้ว`,
        message: `ขณะนี้มียอดใช้สิทธิเกินสะสม ${formatLeaveUnitsAsText(selectedEntitlementMetrics.exceeded)}`,
      };
    }

    return null;
  }, [selectedEntitlement, selectedEntitlementMetrics]);

  const resetAll = () => {
    setCategory("");
    setSubType("");
    setStartDT(toISODateTimeLocal(new Date()));
    setEndDT(toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
    setReason("");
    setRetroReason("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors({});
    setUploadPct(0);
  };

  const handleResetClick = async () => {
    console.log("SUBMIT FIRED");
    if (embedded && isEdit) {
      props.onCancel?.();
      return;
    }
    const ok = await dialog.confirm("ต้องการล้างฟอร์มนี้ใช่ไหม?", {
      title: "ยืนยันการล้างฟอร์ม",
      variant: "danger",
      confirmText: "ล้างฟอร์ม",
      cancelText: "ยกเลิก",
      size: "md",
    });

    if (ok) resetAll();
  };

  const validate = () => {
    const e: Record<string, string> = {};

    const existingCount = isEdit ? (existingAttachments?.length || 0) : 0;
    const totalFileCount = existingCount + (files?.length || 0);

    if (!category) e.category = "กรุณาเลือกประเภทการลา";
    if (!subType) e.subType = "กรุณาเลือกประเภทย่อย";

    if (!startDT) e.startDT = "กรุณาเลือกวัน-เวลาเริ่ม";
    if (!endDT) e.endDT = "กรุณาเลือกวัน-เวลาสิ้นสุด";

    if (startDT && endDT && isEndBeforeStart(startDT, endDT)) {
      e.endDT = "วัน-เวลาสิ้นสุดต้องไม่น้อยกว่าวัน-เวลาเริ่ม";
    }

    if (violateBusinessHours) {
      e.endDT = "ป่วยระหว่างวันต้องอยู่ในวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00";
    }

    if (!reason.trim() && !isVacation) e.reason = "กรุณากรอกเหตุผล/รายละเอียด";

    if (isRetroactive) {
      if (isSick) {
        if (!retroReason.trim()) e.retroReason = "กรุณาชี้แจงเหตุผลการยื่นย้อนหลัง";
      }
      if (isBusinessLeave) {
        const hasReason = !!retroReason.trim();
        const hasFiles = totalFileCount > 0;
        if (!hasReason && !hasFiles) e.retroReason = "ลากิจย้อนหลัง: ต้องระบุเหตุผล หรือแนบไฟล์หลักฐาน";
      }
    }

    if (isBusinessNormal && !isRetroactive && startYMD) {
      if (!isBusinessEmergency && compareYMD(startYMD, minStartForBusinessNormal) < 0) {
        e.startDT = `ลากิจปกติ: ต้องยื่นล่วงหน้าอย่างน้อย 3 วันทำการ (เริ่มลาได้ตั้งแต่ ${minStartForBusinessNormal} เป็นต้นไป)`;
      }
    }

    if (isSterilization) {
      if (!isRetroactive && startYMD) {
        const min = (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          const t = addDays(d, 1);
          const pad2 = (x: number) => String(x).padStart(2, "0");
          return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
        })();
        if (compareYMD(startYMD, min) < 0) {
          e.startDT = `ลาเพื่อทำหมัน: ต้องยื่นล่วงหน้าอย่างน้อย 1 วัน (เริ่มลาได้ตั้งแต่ ${min})`;
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

    if (isSick && !isSickInDay && requestedLeaveUnits >= 3 && isRetroactive) {
      if (totalFileCount === 0) e.files = "ลาป่วยย้อนหลัง ≥ 3 วันทำการ: ต้องแนบใบรับรองแพทย์จากโรงพยาบาลตอนยื่น";
    }

    if (isMaternity && !isRetroactive && startYMD) {
      const start = toDateOnlyLocal(startYMD);
      const today = toDateOnlyLocal(todayISODate());
      const diffDays = Math.floor((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays < 30) e.startDT = "ลาคลอดต้องยื่นล่วงหน้าอย่างน้อย 30 วัน";
    }

    if (isMaternity && totalFileCount === 0) {
      e.files = "ลาคลอด: กรุณาแนบเอกสารประกอบ (เช่น สมุดฝากครรภ์/ใบรับรองแพทย์)";
    }

    setErrors(e);
    return e;
  };

  // =======================
  // ✅ SAVE (ไม่ใช้ form submit เพื่อกันเด้งตอนกดปุ่มอื่น เช่น ลบไฟล์/เปิดไฟล์)
  // =======================
  const doSave = async () => {
  if (!user?.uid) {
    await dialog.alert("ยังไม่เข้าสู่ระบบ", { title: "ส่งคำร้องไม่สำเร็จ", variant: "danger", size: "sm" });
    return;
  }

  if (!isEdit && (!roleReady || !!(user as any)?._lite)) {
    await dialog.alert("กรุณารอสักครู่ ระบบกำลังโหลดข้อมูลพนักงานก่อนส่งคำร้อง", {
      title: "กำลังเตรียมข้อมูลผู้ใช้",
      variant: "warning",
      size: "md",
    });
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
    // =======================
    // ✅ UPDATE (edit)
    // =======================
    if (isEdit) {
      const patch: any = {
        category: category as any,
        subType: subType as any,
        startAt: startDT,
        endAt: endDT,
        reason,
        workdaysCount: workdaysCount || 0,
        leaveUnits: requestedLeaveUnits || 0,
        isRetroactive: !!isRetroactive,
        retroReason: isRetroactive ? retroReason.trim() : null,
        requireMedicalCert: !!needMedicalCert,
        medicalCertDueAt: medicalCertDueAt ? medicalCertDueAt.toISOString() : null,

        medicalCertProvided: (() => {
          if (!needMedicalCert) return false;
          const existingCount = existingAttachments?.length || 0;
          const total = existingCount + (files?.length || 0);
          return total > 0;
        })(),

        medicalCertSubmittedAt: (() => {
          if (!needMedicalCert) return null;
          const existingCount = existingAttachments?.length || 0;
          const total = existingCount + (files?.length || 0);
          if (total === 0) return null;
          if ((files?.length || 0) > 0) return new Date().toISOString();
          return (undefined as any);
        })(),

        medicalCertSource: (() => {
          if (!needMedicalCert) return null;
          const existingCount = existingAttachments?.length || 0;
          const total = existingCount + (files?.length || 0);
          if (total === 0) return null;
          if ((files?.length || 0) > 0) return "UPLOADED_WITH_REQUEST";
          return (undefined as any);
        })(),
      };

      await updateMyPendingLeaveRequest(effectiveEditId, user.uid, patch, files, (p) => setUploadPct(p));

      await loadYearUsageAll();
      await loadUsageAllByYear(toAdYear(summaryYearTH));

      setErrors({});
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadPct(0);

      await dialog.alert("บันทึกการแก้ไขเรียบร้อย", { title: "แก้ไขคำร้องสำเร็จ", variant: "success", size: "md" });

      if (embedded) props.onDone?.();
      else {
        if (allowGoMyLeavesRef.current) navigate(MY_LEAVES_PATH);
      }

      return;
    }

    // =======================
    // ✅ CREATE (new)
    // =======================
    const employeeNo = buildEmployeeNoForLeave(user);
    const employeeName = buildEmployeeNameForLeave(user);
    const phone = buildPhoneForLeave(user);

    if (!employeeName) {
      await dialog.alert("ไม่พบชื่อ-นามสกุลพนักงานในโปรไฟล์ กรุณาออกจากหน้านี้แล้วเข้าใหม่อีกครั้ง", {
        title: "ส่งคำร้องไม่สำเร็จ",
        variant: "danger",
        size: "md",
      });
      return;
    }

    const payload: any = {
      uid: user.uid,
      email: user.email ?? null,

      createdByEmail: user.email ?? null,
      employeeNo: employeeNo || null,
      employeeName: employeeName || null,
      phone: phone || null,

      category: category as any,
      subType: subType as any,
      mode: "time",
      startAt: startDT,
      endAt: endDT,
      reason,

      workdaysCount: workdaysCount || 0,
      leaveUnits: requestedLeaveUnits || 0,

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
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadPct(0);
    setRetroReason("");

    const requestNo = created.requestNo ?? created.id ?? "-";
    await dialog.alert(`เลขคำร้อง: ${requestNo}`, { title: "ส่งคำร้องสำเร็จ", variant: "success", size: "md" });

    resetAll();
    if (embedded) props.onDone?.();
    else {
      if (allowGoMyLeavesRef.current) navigate(MY_LEAVES_PATH);
    }
  } catch (err: any) {
    console.error(err);
    await dialog.alert(err?.message || String(err), { title: "ส่งคำร้องไม่สำเร็จ", variant: "danger", size: "lg" });
  } finally {
    allowGoMyLeavesRef.current = false;
    setSubmitting(false);
  }
};

  // ✅ กัน form submit ทุกกรณี (ฟอร์มนี้ "ห้าม" submit)
// เหตุผล: มีหลาย action ในหน้า (เช่น ลบไฟล์/เปิดดูไฟล์/confirm dialog) ที่อาจทำให้เกิด submit โดยไม่ตั้งใจ
// เราจะให้ "บันทึก/ส่งคำร้อง" เรียก doSave() ผ่านปุ่มโดยตรงเท่านั้น
const handleFormSubmit = (ev: FormEvent<HTMLFormElement>) => {
  ev.preventDefault();
  ev.stopPropagation();
  // ✅ ห้าม submit ทุกกรณี (กัน submit หลุดจาก dialog / enter / browser)
  return;
};

  // =======================
  // ✅ ConditionsBox (คง logic เดิม แค่เปลี่ยน wrapper ให้เป็นการ์ดสไตล์เดียวกัน)
  // =======================
  const ConditionsBox = useMemo(() => {
    if (!category) return null;

    const year = new Date().getFullYear();

    const wrapCls = "rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900";
    const headerCls = "font-extrabold text-gray-900 dark:text-gray-100";
    const listCls = "mt-2 grid gap-1 text-sm text-gray-700 dark:text-gray-200";

    if (category === "ลากิจ") {
      return (
        <div className={wrapCls}>
          <div className={headerCls}>เงื่อนไขลากิจ</div>
          <div className={listCls}>
            <div>• สิทธิ 5 วัน/ปี (รีเซ็ตทุกปี / ไม่สะสม) หากใช้ครบแล้วยังยื่นลาได้ และระบบจะแสดงจำนวนวันที่เกินสิทธิ</div>
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
            requested={requestedLeaveUnits}
            note={
              <>
                {isBusinessNormal && !isRetroactive && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                    <div className="font-extrabold">ลากิจปกติ: วันที่เริ่มลาเร็วสุด</div>
                    <div className="mt-1 text-sm">
                      เริ่มลาได้ตั้งแต่ <span className="font-extrabold">{minStartForBusinessNormal}</span> เป็นต้นไป
                    </div>
                  </div>
                )}

                <div className="text-sm">
                  <span className="font-semibold">จำนวนเวลาที่ยื่นในรอบนี้:</span>{" "}
                  <span className="font-extrabold text-teal-700 dark:text-teal-200">{formatMinutesAsLeaveText(requestedLeaveMinutes)}</span>
                </div>
                {selectedEntitlementAlert && (
                  <div
                    className={[
                      "rounded-xl border px-3 py-3 text-sm",
                      selectedEntitlementAlert.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
                        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
                    ].join(" ")}
                  >
                    <div className="font-extrabold">{selectedEntitlementAlert.title}</div>
                    <div className="mt-1 text-sm">{selectedEntitlementAlert.message}</div>
                  </div>
                )}

              </>
            }
          />
        </div>
      );
    }

    if (category === "ลาป่วย") {
      return (
        <div className={wrapCls}>
          <div className={headerCls}>เงื่อนไขลาป่วย</div>

          <div className={listCls}>
            <div>• “ป่วยระหว่างวัน” ไม่ต้องแนบใบรับรองทุกกรณี</div>
            <div>• ป่วยระหว่างวัน: ต้องเป็นวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00</div>
            <div>• ลาป่วย ≥ 3 วันทำการ ต้องมีใบรับรอง “จากโรงพยาบาลเท่านั้น”</div>
            <div>• หากใช้สิทธิครบแล้วยังยื่นลาได้ โดยระบบจะแสดงจำนวนวันที่เกินสิทธิ</div>
          </div>

          <YearEntitlementCard
            title="สรุปสิทธิในปีนี้"
            year={year}
            total={LIMIT_SICK}
            used={sickUsed}
            loading={usageLoading}
            error={usageErr}
            requested={requestedLeaveUnits}
            note={
              <>
                <div className="text-sm">
                  <span className="font-semibold">จำนวนเวลาที่ยื่นในรอบนี้:</span>{" "}
                  <span className="font-extrabold text-teal-700 dark:text-teal-200">{formatLeaveUnitsAsText(requestedLeaveUnits)}</span>
                  {startYMD && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{isRetroactive ? "• ยื่นย้อนหลัง" : "• ไม่ย้อนหลัง"}</span>
                  )}
                </div>

                {selectedEntitlementAlert && (
                  <div
                    className={[
                      "rounded-xl border px-3 py-3 text-sm",
                      selectedEntitlementAlert.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
                        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
                    ].join(" ")}
                  >
                    <div className="font-extrabold">{selectedEntitlementAlert.title}</div>
                    <div className="mt-1 text-sm">{selectedEntitlementAlert.message}</div>
                  </div>
                )}

                {needMedicalCert && medicalCertMode === "DUE_BY_WORKDAY_3" && medicalCertDueAt && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                    <div className="font-extrabold">ต้องแนบใบรับรอง “ภายในวันทำการที่ 3”</div>
                    <div className="mt-1 text-sm">
                      เดดไลน์: <span className="font-extrabold">{formatThaiDate(medicalCertDueAt)}</span> (ภายใน 23:59)
                    </div>
                  </div>
                )}

                {needMedicalCert && medicalCertMode === "MUST_AT_SUBMIT" && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
                    <div className="font-extrabold">ลาป่วยย้อนหลัง ≥ 3 วันทำการ: ต้องแนบใบรับรองตอนยื่น</div>
                  </div>
                )}


              </>
            }
          />
        </div>
      );
    }

    if (category === "ลาพักร้อน") {
      return (
        <div className={wrapCls}>
          <div className={headerCls}>เงื่อนไขลาพักร้อน</div>
          <div className={listCls}>
            <div>• สิทธิวันลาพักร้อน 6 วัน/ปี (รีเซ็ตทุกปี / ไม่สะสม) หากใช้ครบแล้วยังยื่นลาได้ และระบบจะแสดงจำนวนวันที่เกินสิทธิ</div>
            <div>• แนะนำให้ยื่นล่วงหน้าเพื่อให้ผู้อนุมัติพิจารณาได้ทันเวลา</div>
          </div>

          <YearEntitlementCard
            title="สรุปสิทธิในปีนี้"
            year={year}
            total={LIMIT_VACATION}
            used={vacationUsed}
            loading={usageLoading}
            error={usageErr}
            requested={requestedLeaveUnits}
            note={
              <>
                <div className="text-sm">
                  <span className="font-semibold">จำนวนเวลาที่ยื่นในรอบนี้:</span>{" "}
                  <span className="font-extrabold text-teal-700 dark:text-teal-200">{formatMinutesAsLeaveText(requestedLeaveMinutes)}</span>
                </div>
                {selectedEntitlementAlert && (
                  <div
                    className={[
                      "rounded-xl border px-3 py-3 text-sm",
                      selectedEntitlementAlert.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
                        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
                    ].join(" ")}
                  >
                    <div className="font-extrabold">{selectedEntitlementAlert.title}</div>
                    <div className="mt-1 text-sm">{selectedEntitlementAlert.message}</div>
                  </div>
                )}
                <div className="text-sm">* หากบริษัทมีเงื่อนไขเพิ่มเติม ให้ยึดตามนโยบาย/HR</div>

              </>
            }
          />
        </div>
      );
    }

    return (
      <div className={wrapCls}>
        <div className={headerCls}>เงื่อนไขลากรณีพิเศษ</div>

        <div className={listCls}>
          <div>• ขึ้นกับประเภทที่เลือก (เช่น ลาคลอด / ราชการทหาร / ทำหมัน / อื่นๆ)</div>
          <div>• อาจต้องแนบเอกสารประกอบตามที่ HR/ผู้อนุมัติร้องขอ</div>
          <div>• ประเภทที่มีสิทธิจำกัดยังสามารถยื่นลาได้ต่อ แม้ใช้ครบแล้ว โดยระบบจะแสดงจำนวนวันที่เกินสิทธิ</div>
        </div>

        {isMaternity && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-extrabold">ลาคลอด (เงื่อนไขการยื่น)</div>
            <div className="mt-1 text-sm">
              • ต้องลาล่วงหน้าไม่น้อยกว่า 30 วัน และแนบหลักฐานสมุดฝากครรภ์
              <br />• เมื่อกลับมาทำงาน ให้ยื่นสำเนาหลักฐานการคลอดบุตรประกอบใบลา หรือ สำเนาใบรับรองแพทย์
            </div>
          </div>
        )}

        {isMilitary && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-extrabold">ลาเพื่อรับราชการทหาร (เงื่อนไข)</div>
            <div className="mt-1 text-sm">
              • พร้อมแนบสำเนาหลักฐานหมายเรียกพลของราชการ
              <br />• มีสิทธิลาโดยได้รับค่าจ้างเท่ากับวันทำงานปกติ ตามจำนวนวันที่ถูกเรียกพล แต่ไม่เกิน 60 วัน
            </div>
          </div>
        )}

        {isSterilization && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
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
          requested={requestedLeaveUnits}
          note={
            <>
              <div className="text-sm">
                <span className="font-semibold">จำนวนเวลาที่ยื่นในรอบนี้:</span>{" "}
                <span className="font-extrabold text-teal-700 dark:text-teal-200">{formatMinutesAsLeaveText(requestedLeaveMinutes)}</span>
              </div>
                {selectedEntitlementAlert && (
                  <div
                    className={[
                      "rounded-xl border px-3 py-3 text-sm",
                      selectedEntitlementAlert.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
                        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
                    ].join(" ")}
                  >
                    <div className="font-extrabold">{selectedEntitlementAlert.title}</div>
                    <div className="mt-1 text-sm">{selectedEntitlementAlert.message}</div>
                  </div>
                )}
              {!subType && <div className="text-sm">* โปรดเลือก “ประเภทย่อย” เพื่อแสดงสิทธิของรายการนั้น</div>}

            </>
          }
        />
      </div>
    );
  }, [
    category,
    subType,
    workdaysCount,
    requestedLeaveUnits,
    requestedLeaveMinutes,
    usageLoading,
    usageErr,
    bizUsed,
    sickUsed,
    vacationUsed,
    maternityUsed,
    militaryUsed,
    sterilUsed,
    isBusinessNormal,
    isRetroactive,
    minStartForBusinessNormal,
    startYMD,
    needMedicalCert,
    medicalCertMode,
    medicalCertDueAt,
    selectedEntitlementAlert,
    isMaternity,
    isMilitary,
    isSterilization,
  ]);

  const summaryYearOptions = useMemo(() => {
    const nowTH = toThYear(new Date().getFullYear());
    const years = Array.from({ length: 7 }, (_, i) => nowTH - 6 + i);
    return years.map((y) => ({ value: String(y), label: String(y) }));
  }, []);

  // ===== File UI helpers =====
  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    setFiles((prev) => {
      const map = new Map<string, File>();
      for (const f of prev) map.set(`${f.name}|${f.size}|${f.lastModified}`, f);
      for (const f of picked) map.set(`${f.name}|${f.size}|${f.lastModified}`, f);
      return Array.from(map.values());
    });

    // ✅ รีเซ็ต input เพื่อให้เลือกไฟล์เดิมซ้ำได้ (บาง browser ไม่ยิง onChange ถ้าเลือกไฟล์เดิม)
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  function clearFiles() {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      {!embedded && <PageMeta title="Leave Submit | Smart HR" description="leave submit page" />}
      <div className="space-y-6">
        {/* Header row */}
        {!embedded && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{isEdit ? "แก้ไขคำร้องการลา" : "ยื่นใบลา"}</h1>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isEdit ? "แก้ไขข้อมูล แล้วกดบันทึกการแก้ไข" : "กรอกข้อมูลให้ครบ แล้วกดส่งคำร้อง"}
              </div>
            </div>

            <AppButton variant="outline" disabled={submitting} onClick={handleResetClick}>
              ล้างฟอร์ม
            </AppButton>
          </div>
        )}

        {/* ✅ เงื่อนไขด้านบน */}
        {!embedded && ConditionsBox}

        {/* Upload progress */}
        {submitting && files.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <div className="font-semibold">กำลังอัปโหลดไฟล์… {uploadPct}%</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full bg-violet-600 transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}

        {/* ===== เลือกประเภทการลา ===== */}
        {!isEdit ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  เลือกประเภทการลา <span className="text-red-500">*</span>
                </label>
                <SelectBox<LeaveCategory>
                  label=""
                  placeholder="ประเภทการลา"
                  value={category}
                  options={categoryOptions}
                  onChange={(v) => setCategory((v as LeaveCategory) || "")}
                  disabled={submitting}
                />
                {errors.category && <p className="mt-2 text-xs font-semibold text-red-600">{errors.category}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  เลือกประเภทย่อย <span className="text-red-500">*</span>
                </label>
                <SelectBox<LeaveSubType>
                  label=""
                  placeholder="ประเภทย่อย"
                  value={subType}
                  options={subTypeOptions}
                  onChange={(v) => setSubType((v as LeaveSubType) || "")}
                  disabled={!category || submitting}
                />
                {errors.subType && <p className="mt-2 text-xs font-semibold text-red-600">{errors.subType}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">ประเภทการลา</div>
                <div className="mt-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-extrabold text-gray-900 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-gray-100">
                  {category || "-"}
                </div>
              </div>

              <div>
                <div className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">ประเภทย่อย</div>
                <div className="mt-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-extrabold text-gray-900 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-gray-100">
                  {subType || "-"}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">* โหมดแก้ไข: ไม่สามารถเปลี่ยนประเภท/ประเภทย่อยได้</div>
          </div>
        )}

        {/* ✅ FORM: ครอบเฉพาะข้อมูลการลา (กัน submit หลุดจาก dialog ในส่วนไฟล์) */}
          <form id="leaveForm" onSubmit={handleFormSubmit} className="space-y-6">
            {/* ช่วงเวลา */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">ช่วงเวลาการลา</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">ระบุวัน-เวลาเริ่ม และวัน-เวลาสิ้นสุด</div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    วัน-เวลาเริ่มลา<span className="ml-1 text-red-500">*</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={startDT}
                    onChange={(e) => setStartDT(e.target.value)}
                    disabled={submitting}
                    className={`${inputTheme.control} mt-2`}
                  />
                  {errors.startDT && <p className="mt-2 text-xs font-semibold text-red-600">{errors.startDT}</p>}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    วัน-เวลาสิ้นสุดลา<span className="ml-1 text-red-500">*</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={endDT}
                    onChange={(e) => setEndDT(e.target.value)}
                    disabled={submitting}
                    className={[
                      inputTheme.control,
                      "mt-2",
                      timedInvalid || violateBusinessHours ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : "",
                    ].join(" ")}
                  />
                  {errors.endDT && <p className="mt-2 text-xs font-semibold text-red-600">{errors.endDT}</p>}
                </div>
              </div>

              {selectedEntitlementAlert && (
                <div
                  className={[
                    "mt-5 rounded-2xl border px-4 py-3 text-sm",
                    selectedEntitlementAlert.tone === "danger"
                      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
                      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
                  ].join(" ")}
                >
                  <div className="font-extrabold">{selectedEntitlementAlert.title}</div>
                  <div className="mt-1">{selectedEntitlementAlert.message}</div>
                </div>
              )}

              {isSickInDay && (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                  * ป่วยระหว่างวัน: ต้องเป็นวันเดียวกัน และอยู่ในเวลาทำการ 09:00–18:00
                </div>
              )}
            </div>

            {/* ย้อนหลัง */}
            {isRetroactive && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">หมายเหตุ/ชี้แจงการยื่นย้อนหลัง</div>
                <textarea
                  value={retroReason}
                  onChange={(e) => setRetroReason(e.target.value)}
                  rows={4}
                  placeholder="อธิบายเหตุผลที่ยื่นย้อนหลัง (เช่น เข้ารพ./ไม่มีสัญญาณ/อยู่ระหว่างการรักษา ฯลฯ)"
                  disabled={submitting}
                  className={`${inputTheme.textarea} mt-2`}
                />
                {errors.retroReason && <p className="mt-2 text-xs font-semibold text-red-600">{errors.retroReason}</p>}
              </div>
            )}

            {/* ✅ เหตุผล (อยู่ใน form) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                เหตุผล / รายละเอียด{!isVacation && <span className="ml-1 text-red-500">*</span>}
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                placeholder="พิมพ์เหตุผลการลา…"
                disabled={submitting}
                className={`${inputTheme.textarea} mt-2`}
              />

              {errors.reason && <p className="mt-2 text-xs font-semibold text-red-600">{errors.reason}</p>}
            </div>
          </form>

          {/* ✅ แนบไฟล์ (ย้ายออกนอก form เพื่อกัน dialog/ปุ่ม submit หลุด) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              แนบไฟล์ (PDF/รูป){isMaternity && <span className="ml-1 text-red-500">*</span>}
            </div>

            {/* ✅ Edit: แสดง “ไฟล์ทั้งหมดในคำร้อง” (เปิดดู/ลบได้) */}
            {isEdit && (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold">ไฟล์ในคำร้อง</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {existingAttachments.length ? `${existingAttachments.length} ไฟล์` : "ไม่มีไฟล์เดิม"}
                  </div>
                </div>

                {existingAttachments.length === 0 ? (
                  <div className="mt-2 text-gray-500 dark:text-gray-400">ยังไม่มีไฟล์แนบในคำร้องนี้</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {[...existingAttachments]
                      .map((x: any, idx) => ({ x, idx }))
                      .reverse()
                      .map(({ x, idx }) => {
                        const key = attachmentKeySafe(x);
                        const name = pickStr(
                          x?.originalName,
                          x?.name,
                          x?.fileName,
                          x?.filename,
                          key || `ไฟล์แนบ ${idx + 1}`
                        );
                        const canDelete = !!effectiveEditId && !!key && !submitting;
                        const deleting = deletingKey === key;
                        const isLatest = idx === existingAttachments.length - 1;

                        return (
                          <div
                            key={`${key || name}-${idx}`}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate font-semibold">{name}</div>
                                {isLatest && (
                                  <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
                                    ล่าสุด
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 break-all text-xs text-gray-500 dark:text-gray-400">{key}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <AppButton
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!key || submitting || deleting}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    if (!key) return;
                                    const url = await getSignedUrl(key);
                                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                                  } catch (err: any) {
                                    await dialog.alert(err?.message || String(err), {
                                      title: "เปิดไฟล์ไม่สำเร็จ",
                                      variant: "danger",
                                      size: "md",
                                    });
                                  }
                                }}
                              >
                                เปิดดู
                              </AppButton>

                              <AppButton
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={!canDelete || deleting}
                                loading={deleting}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    if (!effectiveEditId || !key) return;

                                    const ok = await dialog.confirm(
                                      "ต้องการลบไฟล์นี้ออกจากคำร้องใช่ไหม? (ลบจริงในระบบ)",
                                      {
                                        title: "ลบไฟล์แนบ",
                                        confirmText: "ลบไฟล์",
                                        cancelText: "ยกเลิก",
                                        variant: "danger",
                                        size: "md",
                                      } as any
                                    );

                                    if (!ok) return;

                                    setDeletingKey(key);
                                    await deleteFilesFromLeaveRequest({ requestId: effectiveEditId, keys: [key] });
                                    setExistingAttachments((prev) => prev.filter((p: any) => attachmentKeySafe(p) !== key));
                                  } catch (err: any) {
                                    await dialog.alert(err?.message || String(err), {
                                      title: "ลบไฟล์ไม่สำเร็จ",
                                      variant: "danger",
                                      size: "md",
                                    });
                                  } finally {
                                    setDeletingKey("");
                                  }
                                }}
                              >
                                ลบไฟล์
                              </AppButton>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={submitting}
              accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => onPickFiles(e.target.files)}
              className="hidden"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AppButton type="button" variant="outline" disabled={submitting} onClick={() => fileInputRef.current?.click()}>
                เลือกไฟล์
              </AppButton>

              <AppButton type="button" variant="danger" size="sm" disabled={submitting || files.length === 0} onClick={clearFiles}>
                ลบทั้งหมด
              </AppButton>

              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {files.length ? `เลือกแล้ว ${files.length} ไฟล์` : "ยังไม่ได้เลือกไฟล์"}
              </div>
            </div>

            {errors.files && <p className="mt-2 text-xs font-semibold text-red-600">{errors.files}</p>}

            {isMaternity && (
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
                * ลาคลอด: ต้องแนบเอกสารประกอบก่อนส่งคำร้อง
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
              <div className="font-semibold">ไฟล์ที่เลือก</div>
              {files.length === 0 ? (
                <div className="mt-2 text-gray-500 dark:text-gray-400">ยังไม่ได้เลือกไฟล์</div>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}-${f.lastModified}`}>
                      {f.name} <span className="text-gray-500">({Math.ceil(f.size / 1024)} KB)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">* ไฟล์จะถูกอัปโหลดไป Supabase Storage ผ่าน Backend</div>
          </div>

          {/* ✅ Submit button: อยู่นอก form แต่ submit ได้ด้วย form="leaveForm" */}
          <div className="flex justify-end">
            <AppButton
  type="button"
  data-action="save"
  variant="primary"
  disabled={submitting || profileHydratingForCreate}
  loading={submitting}
  onClick={() => {
    if (submitting || profileHydratingForCreate) return;
    console.log("SAVE CLICKED", new Date().toISOString());
    allowGoMyLeavesRef.current = true;
    void doSave();
  }}
>
  {submitting
    ? "กำลังบันทึก..."
    : profileHydratingForCreate
    ? "กำลังโหลดข้อมูลพนักงาน..."
    : isEdit
    ? "บันทึกการแก้ไข"
    : "ส่งคำร้อง"}
</AppButton>
          </div>

        {/* รวมสิทธิการลาทั้งหมด */}
        {!embedded && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100">รวมสิทธิการลาทั้งหมด</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">ดูยอด “ใช้ไป/คงเหลือ/เกินสิทธิ” ของแต่ละประเภท และเลือกปีเพื่อดูย้อนหลัง</div>
              </div>

              <div className="min-w-[180px]">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">เลือกปี (พ.ศ.)</div>
                <select
                  value={String(summaryYearTH)}
                  onChange={(e) => setSummaryYearTH(Number(e.target.value))}
                  className={`${inputTheme.control} mt-2`}
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
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                * โหลดข้อมูลย้อนหลังไม่สำเร็จ: {summaryErr}
              </div>
            )}

            <div className="mt-6 grid gap-4">
              <EntitlementRow title="ลาป่วย (รวม)" total={LIMIT_SICK} used={summarySickUsed} loading={summaryLoading} />
              <EntitlementRow title="ลากิจ" total={LIMIT_BUSINESS} used={summaryBizUsed} loading={summaryLoading} />
              <EntitlementRow title="ลาพักร้อนประจำปี" total={LIMIT_VACATION} used={summaryVacationUsed} loading={summaryLoading} />
              <EntitlementRow
                title="ลาคลอด"
                total={LIMIT_MATERNITY}
                used={summaryUsedMap[usedKey("ลากรณีพิเศษ", "ลาคลอด")] || 0}
                loading={summaryLoading}
              />
              <EntitlementRow
                title="ลาเพื่อทำหมัน"
                total={LIMIT_STERILIZATION}
                used={summaryUsedMap[usedKey("ลากรณีพิเศษ", "ลาเพื่อทำหมัน")] || 0}
                loading={summaryLoading}
              />
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
        )}
      </div>
    </>
  );
}