// src/pages/Calendar.tsx
import { useMemo, useState, type SelectHTMLAttributes } from "react";
import { useLeave, type LeaveRequest } from "../context/LeaveContext";
import { buildThaiHolidayMapAround } from "../services/utils/thHolidays";
import AppButton from "../components/common/AppButton";
import { useDialogCenter } from "../components/common/DialogCenter";
import { inputTheme } from "../components/ui/theme/inputTheme";
import * as leaveSvc from "../services/leaveRequests";

// ===== Types =====
type LeaveCategory =
  | "ลากิจ"
  | "ลาป่วย"
  | "ลาพักร้อน"
  | "ลากรณีพิเศษ"
  | "ปฏิบัติงานนอกสถานที่";

type LeaveSubType =
  | "ลากิจปกติ"
  | "ลากิจฉุกเฉิน"
  | "ลาป่วยทั่วไป"
  | "ลาหมอนัด"
  | "ลาแบบมีใบรับรองแพทย์"
  | "ลาพักร้อน"
  | "ลาคลอด"
  | "ลาราชการทหาร"
  | "ลาเพื่อทำหมัน"
  | "อื่นๆ"
  | "FIELD_WORK"; // ใช้เป็น subtype สำหรับงานนอกสถานที่

type LeaveStatus = "อนุมัติ" | "ไม่อนุมัติ" | "รอดำเนินการ";
type CategoryFilter = "ทั้งหมด" | LeaveCategory;

// ✅ Event
type EventAttachment = {
  name?: string;
  filename?: string;
  originalName?: string;
  fileName?: string;
  size?: number;
  url?: string;
  signedUrl?: string;
  downloadUrl?: string;
  storagePath?: string;
  key?: string;
  path?: string;
  contentType?: string;
};

type LeaveEvent = {
  id: string;
  requestNo: string;
  category: LeaveCategory;
  subType: LeaveSubType;
  status: LeaveStatus;
  startAt: string;
  endAt: string;
  note?: string;
  employeeName?: string;
  employeeNo?: string;
  createdByEmail?: string;
  phone?: string;
  submittedAt?: any;
  actionAt?: any;
  attachments?: EventAttachment[];
};

type DayOccurrence = {
  event: LeaveEvent;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  startMin?: number;
  endMin?: number;
};

type BarSeg = {
  event: LeaveEvent;
  date: string; // YYYY-MM-DD
  isStart: boolean;
  isEnd: boolean;
  isTimedSingleDay?: boolean;
};
const BRAND_PURPLE = "#6D1B7B";
const dayLabelsMonFirst = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const datePart = (s: string) => String(s || "").split("T")[0];

const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1);

/**
 * ✅ Normalize datetime string ให้ parseLocalDateTime ทำงานชัวร์
 * - รับ "YYYY-MM-DD" => คืนแบบเดิม
 * - รับ "YYYY-MM-DDTHH:mm" => คืนแบบเดิม
 * - อื่น ๆ => แปลงเป็น Date แล้วคืนเป็น YYYY-MM-DD หรือ YYYY-MM-DDTHH:mm
 */
function ensureISODateTime(v: any): string {
  if (!v) return toISODate(new Date());

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return toISODate(new Date());

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const ymd = toISODate(d);
      const hh = pad2(d.getHours());
      const mm = pad2(d.getMinutes());
      return `${ymd}T${hh}:${mm}`;
    }
    return toISODate(new Date());
  }

  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    const ymd = toISODate(d);
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return `${ymd}T${hh}:${mm}`;
  }

  if (v instanceof Date) {
    const ymd = toISODate(v);
    const hh = pad2(v.getHours());
    const mm = pad2(v.getMinutes());
    return `${ymd}T${hh}:${mm}`;
  }

  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const ymd = toISODate(d);
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return `${ymd}T${hh}:${mm}`;
  }

  return toISODate(new Date());
}

function parseLocalDateTime(input: string): Date {
  const safe = String(input || "");
  const [dPart, tPartRaw] = safe.split("T");
  const [y, m, d] = dPart.split("-").map(Number);
  let hh = 0,
    mm = 0;
  if (tPartRaw) {
    const t = tPartRaw.slice(0, 5);
    const parts = t.split(":").map(Number);
    hh = parts[0] ?? 0;
    mm = parts[1] ?? 0;
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function parseISODateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatTimeFromMinutes(min: number) {
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function formatDurationMinutes(total: number) {
  if (total <= 0) return "-";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function tsToDate(v: any): Date | null {
  try {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v?.toDate === "function") return tsToDate(v.toDate());
    if (typeof v?.seconds === "number") {
      const d = new Date(v.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return parseISODateOnly(s);
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return parseLocalDateTime(s.replace(" ", "T"));
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === "number") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatThaiDateValue(v: any) {
  const d = tsToDate(v);
  if (!d) return "-";
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatThaiDateTimeValue(v: any) {
  const d = tsToDate(v);
  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(size?: number) {
  if (typeof size !== "number" || !isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentDisplayName(att: EventAttachment, index: number) {
  return pickStr(att?.name, att?.filename, att?.originalName, att?.fileName) || `ไฟล์แนบ ${index + 1}`;
}

function attachmentStorageKey(att: EventAttachment) {
  return pickStr(att?.storagePath, att?.key, att?.path);
}

function buildCalendarCells(monthDate: Date, weekStartsOn: 0 | 1 = 1) {
  const monthStart = startOfMonth(monthDate);
  const firstDayIndex = (monthStart.getDay() - weekStartsOn + 7) % 7;

  const cells: Date[] = [];
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDayIndex);

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function eachDayISOInRange(startISO: string, endISO: string) {
  const s = parseISODateOnly(startISO);
  const e = parseISODateOnly(endISO);
  const days: string[] = [];
  const cur = new Date(s);

  while (cur <= e) {
    days.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function splitEventByDay(ev: LeaveEvent): DayOccurrence[] {
  const start = parseLocalDateTime(ev.startAt);
  const end = parseLocalDateTime(ev.endAt);
  if (end.getTime() < start.getTime()) return [];

  const sISO = datePart(ev.startAt);
  const eISO = datePart(ev.endAt);
  const days = eachDayISOInRange(sISO, eISO);

  const hasTimeStart = ev.startAt.includes("T");
  const hasTimeEnd = ev.endAt.includes("T");
  const allDay = !(hasTimeStart && hasTimeEnd);

  if (allDay) {
    return days.map((d) => ({ event: ev, date: d, allDay: true }));
  }

  const sDateOnly = parseISODateOnly(sISO).getTime();
  const eDateOnly = parseISODateOnly(eISO).getTime();

  return days
    .map((dISO) => {
      const dOnly = parseISODateOnly(dISO).getTime();
      const isFirst = dOnly === sDateOnly;
      const isLast = dOnly === eDateOnly;

      const startMin = isFirst ? start.getHours() * 60 + start.getMinutes() : 0;
      const endMin = isLast ? end.getHours() * 60 + end.getMinutes() : 24 * 60;

      const s = clamp(startMin, 0, 24 * 60);
      const e = clamp(endMin, 0, 24 * 60);

      if (e <= s) return null;
      return { event: ev, date: dISO, allDay: false, startMin: s, endMin: e } as DayOccurrence;
    })
    .filter(Boolean) as DayOccurrence[];
}

// ---------- Styles ----------
const catStyle: Record<LeaveCategory, { dot: string; barBg: string; barText: string; border: string }> = {
  ลาป่วย: {
    dot: "bg-red-500",
    barBg: "bg-red-500/20 dark:bg-red-400/20",
    barText: "text-red-800 dark:text-red-200",
    border: "border-red-200 dark:border-red-900/40",
  },
  ลากิจ: {
    dot: "bg-amber-500",
    barBg: "bg-amber-500/20 dark:bg-amber-400/20",
    barText: "text-amber-800 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-900/40",
  },
  ลาพักร้อน: {
    dot: "bg-green-500",
    barBg: "bg-green-500/20 dark:bg-green-400/20",
    barText: "text-green-800 dark:text-green-200",
    border: "border-green-200 dark:border-green-900/40",
  },
  ลากรณีพิเศษ: {
    dot: "bg-purple-500",
    barBg: "bg-purple-500/20 dark:bg-purple-400/20",
    barText: "text-purple-800 dark:text-purple-200",
    border: "border-purple-200 dark:border-purple-900/40",
  },
  ปฏิบัติงานนอกสถานที่: {
    dot: "bg-sky-500",
    barBg: "bg-sky-500/20 dark:bg-sky-400/20",
    barText: "text-sky-800 dark:text-sky-200",
    border: "border-sky-200 dark:border-sky-900/40",
  },
};

const statusStyle: Record<LeaveStatus, string> = {
  อนุมัติ: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ไม่อนุมัติ: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  รอดำเนินการ: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function leaveLabel(ev: LeaveEvent) {
  // ✅ เอาแค่ “ประเภทหลัก” (ไม่เอา subType / code เช่น FIELD_W)
  const cat = String((ev as any)?.category || "").trim() || "รายการ";
  return cat;
}
function leaveTypeWithSub(ev: any) {
  const cat = leaveLabel(ev); // ประเภทหลัก
  const sub = String(ev?.subType || ev?.subtype || ev?.leaveSubType || "").trim();
  if (!sub || sub === "FIELD_WORK") return cat;
  return `${cat} • ${sub}`;
}
function leaveTimeRange(ev: LeaveEvent) {
  // ✅ เวลาเฉพาะกรณี “วันเดียวกัน” และมีเวลา (รายชั่วโมง/นาที)
  const sRaw = String((ev as any)?.startAt || "");
  const eRaw = String((ev as any)?.endAt || "");
  if (!sRaw || !eRaw) return "";

  const sNorm = sRaw.includes("T") ? sRaw : sRaw.replace(" ", "T");
  const eNorm = eRaw.includes("T") ? eRaw : eRaw.replace(" ", "T");

  const same = sNorm.slice(0, 10) === eNorm.slice(0, 10);
  const hasTime = sNorm.includes("T") && eNorm.includes("T");
  if (!same || !hasTime) return "";

  const s = parseLocalDateTime(sNorm);
  const e = parseLocalDateTime(eNorm);
  const sMin = s.getHours() * 60 + s.getMinutes();
  const eMin = e.getHours() * 60 + e.getMinutes();
  return `${formatTimeFromMinutes(sMin)}-${formatTimeFromMinutes(eMin)}`;
}


// ===== helpers for mapping requests =====
type RequestLike = {
  id?: string;
  requestNo?: string;

  uid?: string;
  userUid?: string;
  ownerUid?: string;
  createdByUid?: string;
  createdBy?: string;
  userId?: string;

  category?: string;
  subType?: string;
  status?: string;
  // ✅ รองรับ schema ที่เป็น 2-stage / final status
  finalStatus?: string;
  stage2?: { status?: string } | any;
  approval?: { status?: string } | any;
  workflow?: { finalStatus?: string; status?: string } | any;
  startAt?: any;
  endAt?: any;
  reason?: string;

  type?: string;
  startDate?: any;
  endDate?: any;
  startTime?: string;
  endTime?: string;
  note?: string;
  employeeName?: string;
  employeeNo?: string;
  createdByEmail?: string;
  phone?: string;
  submittedAt?: any;
  approvedAt?: any;
  decidedAt?: any;
  updatedAt?: any;
  attachments?: EventAttachment[];
  files?: EventAttachment[];
};



function normalizeCategory(x?: string): LeaveCategory {
  if (
    x === "ลากิจ" ||
    x === "ลาป่วย" ||
    x === "ลาพักร้อน" ||
    x === "ลากรณีพิเศษ" ||
    x === "ปฏิบัติงานนอกสถานที่"
  )
    return x;
  if (x === "ลาคลอด" || x === "ลาราชการทหาร" || x === "ลาเพื่อทำหมัน") return "ลากรณีพิเศษ";
  return "ลากิจ";
}

function normalizeSubType(x?: string, cat?: LeaveCategory): LeaveSubType {
  const all: LeaveSubType[] = [
    "ลากิจปกติ",
    "ลากิจฉุกเฉิน",
    "ลาป่วยทั่วไป",
    "ลาหมอนัด",
    "ลาแบบมีใบรับรองแพทย์",
    "ลาพักร้อน",
    "ลาคลอด",
    "ลาราชการทหาร",
    "ลาเพื่อทำหมัน",
    "อื่นๆ",
    "FIELD_WORK",
  ];

  if (x && all.includes(x as LeaveSubType)) return x as LeaveSubType;

  if (typeof x === "string" && x.includes("ทำหมัน")) return "ลาเพื่อทำหมัน";

  if (cat === "ปฏิบัติงานนอกสถานที่") return "FIELD_WORK";
  if (cat === "ลาป่วย") return "ลาป่วยทั่วไป";
  if (cat === "ลาพักร้อน") return "ลาพักร้อน";
  if (cat === "ลากรณีพิเศษ") return "อื่นๆ";
  return "ลากิจปกติ";
}

function normalizeStatus(x?: string): LeaveStatus {
  if (x === "อนุมัติ" || x === "ไม่อนุมัติ" || x === "รอดำเนินการ") return x;
  if (x === "APPROVED") return "อนุมัติ";
  if (x === "REJECTED") return "ไม่อนุมัติ";
  if (x === "PENDING") return "รอดำเนินการ";
  return "รอดำเนินการ";
}

function normUpper(x: any) {
  return String(x ?? "").trim().toUpperCase();
}

/** ✅ หาสถานะสุดท้ายของคำร้องลา (กัน schema หลายแบบ) */
function pickFinalStatus(r: RequestLike): any {
  return (
    (r as any)?.finalStatus ??
    (r as any)?.workflow?.finalStatus ??
    (r as any)?.workflow?.status ??
    (r as any)?.stage2?.status ??
    (r as any)?.approval?.status ??
    (r as any)?.status ??
    ""
  );
}

/** ✅ Calendar ต้องโชว์เฉพาะที่ "อนุมัติแล้ว" */
function isApprovedRequest(r: RequestLike): boolean {
  const raw = pickFinalStatus(r);
  const txt = String(raw ?? "").trim();
  const up = txt.toUpperCase();

  // exact TH
  if (txt === "อนุมัติ") return true;
  if (txt === "ไม่อนุมัติ" || txt === "รอดำเนินการ") return false;

  // exact EN
  if (up === "APPROVED") return true;
  if (up === "REJECTED" || up === "PENDING") return false;

  // fallback เผื่อ schema แปลก ๆ
  const th = normalizeStatus(txt);
  return th === "อนุมัติ";
}

// ✅ Select ธีมกลาง (ใช้ inputTheme.control + ทำลูกศรให้สวย/คุมได้)
function ThemedSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;

  return (
    <div className="relative">
      <select
        {...rest}
        className={[
          inputTheme.control,
          "h-9 py-0 text-sm font-semibold",
          "appearance-none pr-10",
          className,
        ].join(" ")}
      >
        {children}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}



function employeeNameOrFallback(ev: Pick<LeaveEvent, "employeeName">) {
  const s = String(ev?.employeeName || "").trim();
  return s || "ไม่ระบุชื่อ";
}

function eventListLabel(ev: LeaveEvent) {
  const name = employeeNameOrFallback(ev);
  const type = leaveTypeWithSub(ev);
  return `${name} • ${type}`;
}

export default function ApprovedLeaveCalendarPage() {
  const { calendarRequests, loadingCalendar } = useLeave();
  const dialog = useDialogCenter();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ทั้งหมด");

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [openingAttachmentKey, setOpeningAttachmentKey] = useState("");

  const holidayMap = useMemo(() => buildThaiHolidayMapAround(currentMonth.getFullYear()), [currentMonth]);
  const selectedISO = toISODate(selectedDate);
  const selectedHolidays = holidayMap.get(selectedISO) ?? [];

  const approvedRequests = useMemo(() => {
    return ((calendarRequests ?? []) as LeaveRequest[]).filter((r) => isApprovedRequest(r as RequestLike));
  }, [calendarRequests]);

  const leaveEventsAll: LeaveEvent[] = useMemo(() => {
    return approvedRequests.map((r) => {
      const requestNo = String(r.requestNo || r.id || `${r.startAt}-${r.endAt}` || "-").trim() || "-";
      const category = normalizeCategory(r.category);
      const subType = normalizeSubType(r.subType, category);
      const startAt = ensureISODateTime(r.startAt);
      const endAt = ensureISODateTime(r.endAt);

      return {
        id: String(r.id || requestNo || `${startAt}-${endAt}`),
        requestNo,
        category,
        subType,
        status: "อนุมัติ",
        startAt,
        endAt,
        note: r.reason || "",
        employeeName: String(r.employeeName || "").trim() || "ไม่ระบุชื่อ",
        employeeNo: String(r.employeeNo || "").trim() || "",
        createdByEmail: pickStr(r.createdByEmail),
        phone: pickStr((r as any).phone),
        submittedAt: (r as any).submittedAt,
        actionAt: (r as any).approvedAt ?? (r as any).decidedAt ?? (r as any).updatedAt,
        attachments: ((Array.isArray((r as any).attachments) ? (r as any).attachments : (r as any).files) ?? []) as EventAttachment[],
      };
    });
  }, [approvedRequests]);

  const leaveEvents: LeaveEvent[] = useMemo(() => {
    return leaveEventsAll.filter((ev) => {
      const okCat = categoryFilter === "ทั้งหมด" ? true : ev.category === categoryFilter;
      return okCat;
    });
  }, [leaveEventsAll, categoryFilter]);

  const weekStartsOn: 0 | 1 = 1;
  const cells = useMemo(() => buildCalendarCells(currentMonth, weekStartsOn), [currentMonth]);

  const occMap = useMemo(() => {
    const m = new Map<string, DayOccurrence[]>();
    for (const ev of leaveEvents) {
      for (const occ of splitEventByDay(ev)) {
        if (!m.has(occ.date)) m.set(occ.date, []);
        m.get(occ.date)!.push(occ);
      }
    }
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        const timeDiff = (a.startMin ?? 0) - (b.startMin ?? 0);
        if (timeDiff !== 0) return timeDiff;
        const nameDiff = employeeNameOrFallback(a.event).localeCompare(employeeNameOrFallback(b.event), "th");
        if (nameDiff !== 0) return nameDiff;
        return String(a.event.requestNo || "").localeCompare(String(b.event.requestNo || ""), "th");
      });
      m.set(k, list);
    }
    return m;
  }, [leaveEvents]);

  const barMap = useMemo(() => {
    const m = new Map<string, BarSeg[]>();

    for (const ev of leaveEvents) {
      const sISO = datePart(ev.startAt);
      const eISO = datePart(ev.endAt);

      const hasTimeStart = ev.startAt.includes("T");
      const hasTimeEnd = ev.endAt.includes("T");
      const allDay = !(hasTimeStart && hasTimeEnd);

      if (allDay && sISO === eISO) {
        continue;
      }

      const days = eachDayISOInRange(sISO, eISO);
      const isTimedSingleDay = !allDay && sISO === eISO;

      for (const d of days) {
        if (!m.has(d)) m.set(d, []);
        m.get(d)!.push({
          event: ev,
          date: d,
          isStart: d === sISO,
          isEnd: d === eISO,
          isTimedSingleDay,
        });
      }
    }

    for (const [k, list] of m.entries()) {
      list.sort((a, b) => {
        const categoryDiff = a.event.category.localeCompare(b.event.category, "th");
        if (categoryDiff !== 0) return categoryDiff;
        const nameDiff = employeeNameOrFallback(a.event).localeCompare(employeeNameOrFallback(b.event), "th");
        if (nameDiff !== 0) return nameDiff;
        return a.event.requestNo.localeCompare(b.event.requestNo, "th");
      });
      m.set(k, list);
    }

    return m;
  }, [leaveEvents]);

  const selectedOcc = useMemo(() => occMap.get(selectedISO) ?? [], [occMap, selectedISO]);

  const totalMinutesSelected = useMemo(() => {
    let sum = 0;
    for (const occ of selectedOcc) {
      if (occ.allDay) continue;
      sum += Math.max(0, (occ.endMin ?? 0) - (occ.startMin ?? 0));
    }
    return sum;
  }, [selectedOcc]);

  const goPrevMonth = () => setCurrentMonth((m) => addMonths(m, -1));
  const goNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToday = () => {
    const t = new Date();
    setCurrentMonth(startOfMonth(t));
    setSelectedDate(t);
  };

  const clearFilters = async () => {
    setCategoryFilter("ทั้งหมด");

    await dialog.success("ตั้งค่าเริ่มต้นเป็น: ประเภท = ทั้งหมด", {
      title: "ล้างตัวกรองแล้ว",
    });
  };

  const monthTitle = useMemo(() => {
    const d = currentMonth;
    const m = d.toLocaleString("th-TH", { month: "long" });
    return `${m} ${d.getFullYear()}`;
  }, [currentMonth]);

  const isCellInMonth = (d: Date) => d.getMonth() === currentMonth.getMonth();

  const pickCellEvents = (iso: string) => {
    const occ = occMap.get(iso) ?? [];
    const bars = barMap.get(iso) ?? [];
    const allDaySingles = occ.filter((x) => x.allDay);
    return { allDaySingles, bars, occ };
  };

  const isWeekend = (d: Date) => {
    const day = d.getDay();
    return day === 0;
  };

  function formatOccurrenceTimeLabel(occ: DayOccurrence) {
    if (occ.allDay) return "ทั้งวัน";
    return `${formatTimeFromMinutes(occ.startMin ?? 0)} - ${formatTimeFromMinutes(occ.endMin ?? 0)} น.`;
  }

  function formatEventRangeLabel(ev: LeaveEvent) {
    const startHasTime = String(ev.startAt || "").includes("T");
    const endHasTime = String(ev.endAt || "").includes("T");
    const left = startHasTime ? formatThaiDateTimeValue(ev.startAt) : formatThaiDateValue(ev.startAt);
    const right = endHasTime ? formatThaiDateTimeValue(ev.endAt) : formatThaiDateValue(ev.endAt);
    return `${left} ถึง ${right}`;
  }

  async function openAttachment(att: EventAttachment) {
    try {
      const direct = pickStr(att?.url, att?.signedUrl, att?.downloadUrl);
      if (direct) {
        window.open(direct, "_blank", "noopener,noreferrer");
        return;
      }

      let key = attachmentStorageKey(att);

      if (!key && typeof (leaveSvc as any).getAttachmentKey === "function") {
        key = pickStr((leaveSvc as any).getAttachmentKey(att as any), key);
      }

      if (!key) {
        await dialog.alert("ไม่พบ path ของไฟล์แนบ", { title: "เปิดไฟล์ไม่สำเร็จ", variant: "warning" });
        return;
      }

      setOpeningAttachmentKey(key);

      let url = "";
      if (typeof (leaveSvc as any).getSignedUrlForKey === "function") {
        url = await (leaveSvc as any).getSignedUrlForKey(key);
      } else if (typeof (leaveSvc as any).getSignedUrlForAttachment === "function") {
        url = await (leaveSvc as any).getSignedUrlForAttachment(att);
      }

      if (!url) {
        await dialog.alert("ระบบยังไม่มีฟังก์ชันเปิดไฟล์แนบ", {
          title: "เปิดไฟล์ไม่สำเร็จ",
          variant: "warning",
        });
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[ApprovedLeaveCalendarPage] openAttachment error:", error);
      await dialog.alert("เปิดไฟล์ไม่สำเร็จ (อาจหมดอายุ หรือไฟล์ถูกลบ)", {
        title: "เปิดไฟล์ไม่สำเร็จ",
        variant: "danger",
      });
    } finally {
      setOpeningAttachmentKey("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{monthTitle}</div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              เฉพาะคำร้องที่อนุมัติแล้ว
            </span>
            {loadingCalendar && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                กำลังโหลด...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AppButton variant="outline" size="sm" onClick={goPrevMonth}>
              ◀
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={goToday}>
              วันนี้
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={goNextMonth}>
              ▶
            </AppButton>

            <AppButton variant="outline" size="sm" onClick={clearFilters}>
              ล้างตัวกรอง
            </AppButton>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">ประเภท</span>
            <ThemedSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="ลากิจ">ลากิจ</option>
              <option value="ลาป่วย">ลาป่วย</option>
              <option value="ลาพักร้อน">ลาพักร้อน</option>
              <option value="ลากรณีพิเศษ">ลากรณีพิเศษ</option>
            </ThemedSelect>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">แสดง {leaveEvents.length} รายการ</span>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl">
          <div
            className="mt-4 grid grid-cols-7 rounded-2xl p-2"
            style={{ background: `linear-gradient(90deg, ${BRAND_PURPLE} 0%, #7A2A86 55%, ${BRAND_PURPLE} 100%)` }}
          >
            {dayLabelsMonFirst.map((d) => (
              <div key={d} className="text-center text-base font-extrabold text-white">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const iso = toISODate(d);
              const inMonth = isCellInMonth(d);
              const { allDaySingles, bars } = pickCellEvents(iso);

              const isSelected = sameDay(d, selectedDate);
              const dayNum = d.getDate();
              const weekend = isWeekend(d);

              const holidays = holidayMap.get(iso) ?? [];
              const hasHoliday = holidays.length > 0;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={[
                    "relative min-h-[94px] border-t border-l border-gray-200 p-2 text-left transition hover:bg-violet-50/50 dark:border-gray-800 dark:hover:bg-violet-900/10",
                    !inMonth ? "bg-gray-50/60 dark:bg-gray-900/40" : "bg-white dark:bg-gray-900",
                    isSelected ? "ring-2 ring-inset ring-violet-500" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={[
                        "text-sm font-extrabold leading-none -mt-0.5",
                        !inMonth ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100",
                        weekend ? "text-red-500 dark:text-red-300" : "",
                      ].join(" ")}
                    >
                      {dayNum}
                    </div>

                    {hasHoliday && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[12px] font-extrabold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                        วันหยุด
                      </span>
                    )}
                  </div>

                  {hasHoliday && (
                    <div className="mt-1 line-clamp-1 text-[12px] font-semibold text-rose-700 dark:text-rose-200">
                      {holidays[0]?.name}
                      {holidays.length > 1 ? ` +${holidays.length - 1}` : ""}
                    </div>
                  )}

                  <div className="mt-1 space-y-1">
                    {allDaySingles.slice(0, 2).map((occ) => {
                      const ev = occ.event;
                      const st = catStyle[ev.category];
                      return (
                        <div
                          key={`${ev.id}:${iso}:all`}
                          className={[
                            "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-extrabold",
                            st.barBg,
                            st.barText,
                            st.border,
                          ].join(" ")}
                          title={eventListLabel(ev)}
                        >
                          <span className={["h-2 w-2 rounded-full", st.dot].join(" ")} />
                          <span className="truncate">{eventListLabel(ev)}</span>
                        </div>
                      );
                    })}

                    {bars.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {bars.slice(0, 2).map((seg) => {
                          const ev = seg.event;
                          const st = catStyle[ev.category];

                          const showText =
                            seg.isStart ||
                            (String(ev.startAt || "").slice(0, 10) === String(ev.endAt || "").slice(0, 10) &&
                              String(ev.startAt || "").slice(0, 10) === iso);

                          return (
                            <div
                              key={`${ev.id}:${iso}:bar`}
                              className={[
                                "w-full border px-2 py-1 text-[12px] font-extrabold flex items-center",
                                "min-h-[26px] leading-tight",
                                st.barBg,
                                st.barText,
                                st.border,
                                seg.isStart ? "rounded-l-lg" : "",
                                seg.isEnd ? "rounded-r-lg" : "",
                              ].join(" ")}
                              title={`${eventListLabel(ev)}${leaveTimeRange(ev) ? ` ${leaveTimeRange(ev)}` : ""}`}
                            >
                              {showText ? (
                                <div className="flex w-full flex-col">
                                  <div className="truncate">{employeeNameOrFallback(ev)}</div>
                                  <div className="truncate text-[9px] font-bold opacity-90">
                                    {leaveLabel(ev)}
                                    {leaveTimeRange(ev) ? ` • ${leaveTimeRange(ev)}` : ""}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {bars.length > 2 && (
                          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            +{bars.length - 2} อีก
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">คำอธิบายสี</div>
              <div className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                หน้านี้จะแสดงเฉพาะคำร้องลาที่อนุมัติแล้วของพนักงานทุกคนในระบบ
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                "ลากิจ",
                "ลาป่วย",
                "ลาพักร้อน",
                "ลากรณีพิเศษ",
              ] as LeaveCategory[]
            ).map((cat) => {
              const st = catStyle[cat];
              return (
                <div
                  key={cat}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <span className={["h-3.5 w-3.5 shrink-0 rounded-full", st.dot].join(" ")} />
                  <div className="text-sm font-extrabold text-gray-800 dark:text-gray-200">{cat}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">
              รายการวันที่ {selectedISO}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              รวมเวลา (เฉพาะแบบระบุเวลา): {formatDurationMinutes(totalMinutesSelected)}
            </div>
          </div>

          {selectedHolidays.length > 0 && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-100">
              <div className="font-extrabold">วันหยุด / วันสำคัญ</div>
              <ul className="mt-1 list-disc pl-5">
                {selectedHolidays.map((h, i) => (
                  <li key={`${h.dateISO ?? "holiday"}-${i}`}>{h.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 space-y-4">
            {selectedOcc.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400">
                ไม่มีรายการในวันนี้
              </div>
            ) : (
              selectedOcc.map((occ, idx) => {
                const ev = occ.event;
                const st = catStyle[ev.category];
                const statusCls = statusStyle[ev.status];
                const attachments = Array.isArray(ev.attachments) ? ev.attachments : [];

                return (
                  <div
                    key={`${ev.id}:${selectedISO}:${idx}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                          {employeeNameOrFallback(ev)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{ev.employeeNo || "-"}</span>
                          <span>•</span>
                          <span className="break-all">{ev.createdByEmail || "-"}</span>
                          <span>•</span>
                          <span>{ev.phone || "-"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold", statusCls].join(" ")}>
                          <span className={["h-2.5 w-2.5 rounded-full", st.dot].join(" ")} />
                          {ev.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">เลขคำร้อง</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{ev.requestNo || "-"}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ประเภท</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{leaveTypeWithSub(ev)}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ช่วงเวลาของวันที่เลือก</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{formatOccurrenceTimeLabel(occ)}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">วันยื่นคำร้อง</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{formatThaiDateTimeValue(ev.submittedAt)}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">วันที่อนุมัติ / อัปเดต</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{formatThaiDateTimeValue(ev.actionAt)}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">สถานะ</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{ev.status}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50 xl:col-span-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ช่วงวันที่ลา (เริ่ม - สิ้นสุด)</div>
                        <div className="mt-1 text-base font-extrabold text-gray-900 dark:text-gray-100">{formatEventRangeLabel(ev)}</div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50 xl:col-span-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">หมายเหตุ</div>
                        <div className="mt-1 whitespace-pre-wrap text-base font-semibold text-gray-900 dark:text-gray-100">
                          {ev.note || "-"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50 xl:col-span-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ไฟล์แนบ</div>

                        {attachments.length === 0 ? (
                          <div className="mt-1 text-base font-semibold text-gray-500 dark:text-gray-400">-</div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {attachments.map((att, attIndex) => {
                              const attKey = attachmentStorageKey(att) || `${ev.id}:${attIndex}`;
                              const isOpening = openingAttachmentKey === attKey;
                              return (
                                <div
                                  key={attKey}
                                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center md:justify-between"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                      {attachmentDisplayName(att, attIndex)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatFileSize(att?.size) || "ไฟล์แนบ"}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => void openAttachment(att)}
                                    disabled={isOpening}
                                    className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-extrabold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-200"
                                  >
                                    {isOpening ? "กำลังเปิดไฟล์..." : "ดูไฟล์แนบ"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
