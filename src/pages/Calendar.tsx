// src/pages/Calendar.tsx
import { useEffect, useMemo, useState, type SelectHTMLAttributes } from "react";
import { useLeave } from "../context/LeaveContext";
import { useAuth } from "../context/AuthContext";
import { buildThaiHolidayMapAround } from "../services/utils/thHolidays";
import { listenMyFieldWorkRequests, type FieldWorkRequestDoc } from "../services/fieldWorkRequests";
import AppButton from "../components/common/AppButton";
import { useDialogCenter } from "../components/common/DialogCenter";
import { inputTheme } from "../components/ui/theme/inputTheme";

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

type StatusFilter = "ทั้งหมด" | LeaveStatus;
type CategoryFilter = "ทั้งหมด" | LeaveCategory;

// ✅ Event
type LeaveEvent = {
  id: string;
  requestNo: string;
  category: LeaveCategory;
  subType: LeaveSubType;
  status: LeaveStatus;
  startAt: string;
  endAt: string;
  note?: string;
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
};

function toISODateFromAny(v: any): string {
  if (!v) return toISODate(new Date());
  if (typeof v === "string") return v.includes("T") ? v.slice(0, 10) : v;
  if (typeof v?.toDate === "function") return toISODate(v.toDate());
  if (v instanceof Date) return toISODate(v);
  const d = new Date(v);
  return toISODate(isNaN(d.getTime()) ? new Date() : d);
}

function toTimedISO(dateISO: string, hhmm?: string) {
  if (!hhmm) return dateISO;
  return `${dateISO}T${hhmm.slice(0, 5)}`;
}

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
  const th = normalizeStatus(typeof raw === "string" ? raw : String(raw ?? ""));
  if (th === "อนุมัติ") return true;

  // กันเคสที่เก็บเป็นไทยแบบยาว ๆ
  if (typeof raw === "string" && raw.includes("อนุมัติ")) return true;

  // กันเคสที่เก็บเป็น EN
  const up = normUpper(raw);
  return up === "APPROVED";
}

function getRequestOwnerUid(r: RequestLike): string {
  const uid =
    (r as any).uid ??
    (r as any).userUid ??
    (r as any).ownerUid ??
    (r as any).createdByUid ??
    (r as any).createdBy ??
    (r as any).userId ??
    "";
  return String(uid || "").trim();
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

export default function Calendar() {
  const { calendarRequests, loadingCalendar } = useLeave();
  const { user } = useAuth() as any;
  const dialog = useDialogCenter();

  const myUid: string = String(user?.uid || "").trim();

  // ✅ field work state
  const [fwRows, setFwRows] = useState<FieldWorkRequestDoc[]>([]);
  const [fwErr, setFwErr] = useState<string>("");

  useEffect(() => {
    if (!myUid) {
      setFwRows([]);
      return;
    }
    setFwErr("");
    const unsub = listenMyFieldWorkRequests(
      myUid,
      (rows) => setFwRows(rows),
      (msg) => setFwErr(msg || "โหลดงานนอกสถานที่ไม่สำเร็จ")
    );
    return () => unsub?.();
  }, [myUid]);

  // ✅ FILTER UI
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("อนุมัติ");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ทั้งหมด");

  // ✅ holiday map
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const holidayMap = useMemo(() => buildThaiHolidayMapAround(currentMonth.getFullYear()), [currentMonth]);
  const selectedISO = toISODate(selectedDate);
  const selectedHolidays = holidayMap.get(selectedISO) ?? [];

  // ✅ leave_requests ของฉันเท่านั้น
  const myCalendarRequests: RequestLike[] = useMemo(() => {
    const list = (calendarRequests ?? []) as unknown as RequestLike[];
    if (!myUid) return [];
    return list.filter((r) => getRequestOwnerUid(r) === myUid);
  }, [calendarRequests, myUid]);

  // ✅ map leave_requests -> events (SHOW ONLY APPROVED ✅)
  const leaveEventsFromLeave: LeaveEvent[] = useMemo(() => {
    return (myCalendarRequests ?? []).filter(isApprovedRequest).map((r) => {
      const requestNo = r.requestNo ?? r.id ?? "-";
      const category = normalizeCategory(r.category ?? r.type);
      const subType = normalizeSubType(r.subType, category);
      const status = normalizeStatus(r.status);

      const startDateISO = toISODateFromAny(r.startAt ?? r.startDate);
      const endDateISO = toISODateFromAny(r.endAt ?? r.endDate);

      const startAt =
        typeof r.startAt === "string"
          ? ensureISODateTime(r.startAt)
          : r.startTime
          ? toTimedISO(startDateISO, r.startTime)
          : startDateISO;

      const endAt =
        typeof r.endAt === "string"
          ? ensureISODateTime(r.endAt)
          : r.endTime
          ? toTimedISO(endDateISO, r.endTime)
          : endDateISO;

      return {
        id: requestNo,
        requestNo,
        category,
        subType,
        status,
        startAt,
        endAt,
        note: r.reason ?? r.note ?? "",
      };
    });
  }, [myCalendarRequests]);

  // ✅ map field_work_requests -> events
  const leaveEventsFromFW: LeaveEvent[] = useMemo(() => {
    return (fwRows ?? []).map((r) => {
      const requestNo = r.requestNo ?? r.id ?? "-";
      return {
        id: requestNo,
        requestNo,
        category: "ปฏิบัติงานนอกสถานที่",
        subType: "FIELD_WORK",
        status: "อนุมัติ", // auto approve
        startAt: ensureISODateTime(r.startAt),
        endAt: ensureISODateTime(r.endAt),
        note: `${r.place}${r.note ? ` • ${r.note}` : ""}`,
      };
    });
  }, [fwRows]);

  const leaveEventsAll: LeaveEvent[] = useMemo(() => {
    return [...leaveEventsFromLeave, ...leaveEventsFromFW];
  }, [leaveEventsFromLeave, leaveEventsFromFW]);

  // ✅ APPLY FILTERS
  const leaveEvents: LeaveEvent[] = useMemo(() => {
    return leaveEventsAll.filter((ev) => {
      const okStatus = statusFilter === "ทั้งหมด" ? true : ev.status === statusFilter;
      const okCat = categoryFilter === "ทั้งหมด" ? true : ev.category === categoryFilter;
      return okStatus && okCat;
    });
  }, [leaveEventsAll, statusFilter, categoryFilter]);

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
        return (a.startMin ?? 0) - (b.startMin ?? 0);
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
        // single-day allDay => render as pill in cell list
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
        const ac = a.event.category;
        const bc = b.event.category;
        if (ac !== bc) return ac.localeCompare(bc);
        return a.event.requestNo.localeCompare(b.event.requestNo);
      });
      m.set(k, list);
    }

    return m;
  }, [leaveEvents]);

  const selectedOcc = occMap.get(selectedISO) ?? [];
  

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
  setStatusFilter("อนุมัติ");
  setCategoryFilter("ทั้งหมด");

  await dialog.success("ตั้งค่าเริ่มต้นเป็น: สถานะ = อนุมัติ, ประเภท = ทั้งหมด", {
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

  // ===== Render =====
  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{monthTitle}</div>
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

        {/* Fieldwork error */}
        {!!fwErr && (
          <div className="mt-3">
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              {fwErr}
            </div>
          </div>
        )}

        {/* FILTER BAR */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">สถานะ</span>
            <ThemedSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="อนุมัติ">อนุมัติ</option>
            </ThemedSelect>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">ประเภท</span>
            <ThemedSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="ลากิจ">ลากิจ</option>
              <option value="ลาป่วย">ลาป่วย</option>
              <option value="ลาพักร้อน">ลาพักร้อน</option>
              <option value="ลากรณีพิเศษ">ลากรณีพิเศษ</option>
              <option value="ปฏิบัติงานนอกสถานที่">ปฏิบัติงานนอกสถานที่</option>
            </ThemedSelect>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">แสดง {leaveEvents.length} รายการ</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="mt-3 overflow-hidden rounded-2xl">
          {/* Weekdays */}
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

          {/* Cells */}
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
                  {/* Top row: day number + holiday marker */}
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

                  {/* holiday names (small) */}
                  {hasHoliday && (
                    <div className="mt-1 line-clamp-1 text-[12px] font-semibold text-rose-700 dark:text-rose-200">
                      {holidays[0]?.name}
                      {holidays.length > 1 ? ` +${holidays.length - 1}` : ""}
                    </div>
                  )}

                  {/* all-day singles list */}
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
                        >
                          <span className={["h-2 w-2 rounded-full", st.dot].join(" ")} />
                          <span className="truncate">{leaveTypeWithSub(ev)}</span>
                        </div>
                      );
                    })}

                    {/* multi-day bars indicator */}
{bars.length > 0 && (
  <div className="mt-1 space-y-1">
    {bars.slice(0, 2).map((seg) => {
      const ev = seg.event;
      const st = catStyle[ev.category];

      // ✅ โชว์ข้อความเฉพาะวันเริ่ม (หรือกรณี timed single-day) กันซ้ำทุกวัน
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
          title={`${leaveTypeWithSub(ev)}${leaveTimeRange(ev) ? ` ${leaveTimeRange(ev)}` : ""}`}
        >
          {showText ? (
            <div className="flex w-full flex-col">
              <div className="truncate">{leaveLabel(ev)}</div>
              {leaveTimeRange(ev) ? (
                <div className="truncate text-[9px] font-bold opacity-90">{leaveTimeRange(ev)}</div>
              ) : null}
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

      {/* Detail panel */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Selected day details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">
              รายการวันที่ {selectedISO}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              รวมเวลา (เฉพาะแบบระบุเวลา): {formatDurationMinutes(totalMinutesSelected)}
            </div>
          </div>

          {/* Holiday list */}
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

          <div className="mt-3 overflow-hidden rounded-2xl">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-extrabold text-gray-700 dark:bg-gray-800/40 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">ประเภท</th>
                  <th className="px-3 py-2 text-left">ช่วงเวลา</th>
                  <th className="px-3 py-2 text-left">หมายเหตุ</th>
                  <th className="px-3 py-2 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {selectedOcc.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400" colSpan={4}>
                      ไม่มีรายการในวันนี้
                    </td>
                  </tr>
                ) : (
                  selectedOcc.map((occ, idx) => {
                    const ev = occ.event;
                    const st = catStyle[ev.category];
                    const statusCls = statusStyle[ev.status];
                    const timeLabel = occ.allDay
                      ? `${datePart(ev.startAt)} - ${datePart(ev.endAt)} (ทั้งวัน)`
                      : `${formatTimeFromMinutes(occ.startMin ?? 0)} - ${formatTimeFromMinutes(occ.endMin ?? 0)} น.`;

                    return (
                      <tr key={`${ev.id}:${idx}`}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className={["h-2 w-2 rounded-full", st.dot].join(" ")} />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{leaveTypeWithSub(ev)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{timeLabel}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{ev.note || "-"}</td>
                        <td className="px-3 py-3">
                          <span className={["rounded-full px-2 py-0.5 text-xs font-extrabold", statusCls].join(" ")}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">คำอธิบายสี</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                "ลากิจ",
                "ลาป่วย",
                "ลาพักร้อน",
                "ลากรณีพิเศษ",
                "ปฏิบัติงานนอกสถานที่",
              ] as LeaveCategory[]
            ).map((cat) => {
              const st = catStyle[cat];
              return (
                <div
                  key={cat}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                >
                  <span className={["h-3 w-3 rounded-full", st.dot].join(" ")} />
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 text-sm font-semibold text-gray-600 dark:text-gray-300">
            หมายเหตุ: หน้านี้จะแสดงเฉพาะคำร้องลาที่ “อนุมัติแล้ว” เท่านั้น (APPROVED / อนุมัติ)
          </div>
        </div>
      </div>
    </div>
  );
}