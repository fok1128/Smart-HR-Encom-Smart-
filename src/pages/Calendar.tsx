import { useMemo, useState } from "react";
import { useLeave } from "../context/LeaveContext";
import { useAuth } from "../context/AuthContext";
import { buildThaiHolidayMapAround } from "../services/utils/thHolidays";

// ===== Types (ทำให้ไฟล์นี้ไม่พึ่ง type ที่ export จาก context) =====
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

type LeaveStatus = "อนุมัติ" | "ไม่อนุมัติ" | "รอดำเนินการ";

// ✅ รองรับรายวัน/หลายวัน + รายชั่วโมง/รายนาที
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
};

const dayLabelsMonFirst = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const datePart = (s: string) => s.split("T")[0];

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1);

function parseLocalDateTime(input: string): Date {
  const [dPart, tPartRaw] = input.split("T");
  const [y, m, d] = dPart.split("-").map(Number);
  let hh = 0, mm = 0;
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

  const hasTimeStart = ev.startAt.includes("T");
  const hasTimeEnd = ev.endAt.includes("T");
  const allDay = !(hasTimeStart && hasTimeEnd);

  const days = eachDayISOInRange(sISO, eISO);

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
const catStyle: Record<
  LeaveCategory,
  { dot: string; barBg: string; barText: string; border: string }
> = {
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
};

const statusStyle: Record<LeaveStatus, string> = {
  อนุมัติ: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ไม่อนุมัติ: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  รอดำเนินการ: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function leaveLabel(ev: LeaveEvent) {
  if (ev.category === "ลาพักร้อน") return "ลาพักร้อน";
  return `${ev.category} • ${ev.subType}`;
}

// ===== helpers for mapping requests =====
type RequestLike = {
  id?: string;
  requestNo?: string;

  // ✅ เจ้าของคำร้อง (สำคัญมากสำหรับ filter)
  uid?: string;
  userUid?: string;
  ownerUid?: string;
  createdByUid?: string;
  createdBy?: string;
  userId?: string;

  category?: string;
  subType?: string;
  status?: string;
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
  if (x === "ลากิจ" || x === "ลาป่วย" || x === "ลาพักร้อน" || x === "ลากรณีพิเศษ") return x;
  if (x === "ลาคลอด" || x === "ลาราชการทหาร") return "ลากรณีพิเศษ";
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
    "อื่นๆ",
  ];
  if (x && all.includes(x as LeaveSubType)) return x as LeaveSubType;

  if (cat === "ลาป่วย") return "ลาป่วยทั่วไป";
  if (cat === "ลาพักร้อน") return "ลาพักร้อน";
  if (cat === "ลากรณีพิเศษ") return "อื่นๆ";
  return "ลากิจปกติ";
}

function normalizeStatus(x?: string): LeaveStatus {
  if (x === "อนุมัติ" || x === "ไม่อนุมัติ" || x === "รอดำเนินการ") return x;
  // เผื่อหลุด EN
  if (x === "APPROVED") return "อนุมัติ";
  if (x === "REJECTED") return "ไม่อนุมัติ";
  if (x === "PENDING") return "รอดำเนินการ";
  return "รอดำเนินการ";
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

export default function Calendar() {
  const { calendarRequests, loadingCalendar } = useLeave();
  const { user } = useAuth() as any;

  // ✅ uid ของคนที่ล็อกอิน (กันหลุด: ให้เห็นเฉพาะของตัวเอง)
  const myUid: string = String(user?.uid || "").trim();

  // ✅ holiday map (ปีก่อน/ปีนี้/ปีหน้า)
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const holidayMap = useMemo(() => {
    return buildThaiHolidayMapAround(currentMonth.getFullYear());
  }, [currentMonth]);

  const selectedISO = toISODate(selectedDate);
  const selectedHolidays = holidayMap.get(selectedISO) ?? [];

  // ✅ IMPORTANT: ปฏิทินต้องโชว์เฉพาะของตัวเองเท่านั้น
  const myCalendarRequests: RequestLike[] = useMemo(() => {
    const list = (calendarRequests ?? []) as unknown as RequestLike[];
    if (!myUid) return []; // ถ้ายังไม่รู้ uid -> ไม่โชว์อะไร (กันข้อมูลรั่ว)
    return list.filter((r) => {
      const owner = getRequestOwnerUid(r);
      return owner && owner === myUid;
    });
  }, [calendarRequests, myUid]);

  // ✅ แปลงคำร้อง -> event ใช้ในปฏิทิน
  const leaveEvents: LeaveEvent[] = useMemo(() => {
    return (myCalendarRequests ?? []).map((r) => {
      const requestNo = r.requestNo ?? r.id ?? "-";
      const category = normalizeCategory(r.category ?? r.type);
      const subType = normalizeSubType(r.subType, category);
      const status = normalizeStatus(r.status);

      const startDateISO = toISODateFromAny(r.startAt ?? r.startDate);
      const endDateISO = toISODateFromAny(r.endAt ?? r.endDate);

      const startAt =
        typeof r.startAt === "string"
          ? r.startAt
          : r.startTime
          ? toTimedISO(startDateISO, r.startTime)
          : startDateISO;

      const endAt =
        typeof r.endAt === "string"
          ? r.endAt
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
        const seg: BarSeg = { event: ev, date: sISO, isStart: true, isEnd: true };
        if (!m.has(sISO)) m.set(sISO, []);
        m.get(sISO)!.push(seg);
        continue;
      }

      if (sISO === eISO) continue;

      const days = eachDayISOInRange(sISO, eISO);
      for (const d of days) {
        const seg: BarSeg = { event: ev, date: d, isStart: d === sISO, isEnd: d === eISO };
        if (!m.has(d)) m.set(d, []);
        m.get(d)!.push(seg);
      }
    }

    for (const [k, list] of m.entries()) {
      list.sort((a, b) => {
        const as = a.event.startAt;
        const bs = b.event.startAt;
        if (as !== bs) return as < bs ? -1 : 1;
        return a.event.id < b.event.id ? -1 : 1;
      });
      m.set(k, list);
    }

    return m;
  }, [leaveEvents]);

  const monthTitle = useMemo(() => {
    return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(currentMonth);
  }, [currentMonth]);

  const selectedOccs = occMap.get(selectedISO) ?? [];

  const goToday = () => {
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    return leaveEvents
      .filter((ev) => {
        const s = parseLocalDateTime(ev.startAt);
        const e = parseLocalDateTime(ev.endAt);
        return e >= monthStart && s <= monthEnd;
      })
      .sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
  }, [leaveEvents, currentMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">ปฏิทินวันลา</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            วันหยุดไทย + วันลา • ลาหลายวันเป็นแถบต่อเนื่อง • รองรับระบุเวลา
            {loadingCalendar ? " • กำลังโหลด..." : ""}
          </p>
          {!myUid && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
              ไม่พบข้อมูลผู้ใช้ (uid) — ปฏิทินจะไม่แสดงข้อมูลเพื่อความปลอดภัย
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={goToday}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          วันนี้
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Calendar */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth((d) => addMonths(d, -1))}
                className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                aria-label="Previous month"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
                className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                aria-label="Next month"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{monthTitle}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">เลือกวันเพื่อดูรายละเอียด</div>
          </div>

          {/* Day header */}
          <div className="mt-4 grid grid-cols-7 gap-2">
            {dayLabelsMonFirst.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((d) => {
              const inMonth = d.getMonth() === currentMonth.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selectedDate);
              const iso = toISODate(d);

              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const holidays = holidayMap.get(iso) ?? [];
              const isHoliday = holidays.length > 0;

              const barSegs = barMap.get(iso) ?? [];
              const occs = occMap.get(iso) ?? [];
              const timedOccs = occs.filter((o) => !o.allDay);

              const dowIndex = (d.getDay() - 1 + 7) % 7;

              const maxBars = 2;
              const showBars = barSegs.slice(0, maxBars);
              const moreBars = barSegs.length - showBars.length;

              const holidayTitle = isHoliday ? holidays.map((h) => h.name).join(", ") : "";

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  title={holidayTitle}
                  className={[
                    "relative h-20 rounded-xl border text-left transition dark:border-gray-800",
                    "overflow-visible",
                    inMonth
                      ? "border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                      : "border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-gray-800/80",
                    isSelected ? "ring-3 ring-brand-500/20 border-brand-300 dark:border-brand-800" : "",
                    isHoliday ? "bg-red-50/60 dark:bg-red-900/10" : "",
                  ].join(" ")}
                >
                  {/* Bars */}
                  <div className="pointer-events-none absolute inset-0">
                    {showBars.map((seg, i) => {
                      const ev = seg.event;
                      const style = catStyle[ev.category];
                      const leftRound = seg.isStart || dowIndex === 0;
                      const rightRound = seg.isEnd || dowIndex === 6;

                      const base = "absolute left-[-4px] right-[-4px]";
                      const roundCls = `${leftRound ? "rounded-l-lg" : ""} ${rightRound ? "rounded-r-lg" : ""}`;

                      const barH = 14;
                      const barGap = 4;
                      const baseBottom = 6;
                      const bottom = baseBottom + i * (barH + barGap);

                      return (
                        <div
                          key={`${ev.id}-${i}`}
                          className={`${base} ${roundCls} ${style.barBg} ${style.border} border h-[14px]`}
                          style={{ bottom }}
                        >
                          {(seg.isStart || dowIndex === 0) && (
                            <div className={`px-2 text-[10px] font-semibold leading-[14px] ${style.barText} truncate`}>
                              {leaveLabel(ev)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Date number */}
                  <div
                    className={[
                      "absolute top-2 left-2 z-20 text-sm font-semibold leading-none",
                      isToday ? "text-brand-500" : "text-gray-900 dark:text-gray-100",
                      !inMonth ? "text-gray-600 dark:text-gray-400" : "",
                      isHoliday ? "text-red-600 dark:text-red-300" : "",
                      !isHoliday && inMonth && isWeekend ? "text-red-600/80 dark:text-red-300/80" : "",
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </div>

                  {/* Holiday badge (สั้น ๆ) */}
                  {isHoliday && (
                    <div className="absolute left-2 top-7 z-20 max-w-[75%] truncate rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200">
                      {holidays[0].name}
                      {holidays.length > 1 ? ` +${holidays.length - 1}` : ""}
                    </div>
                  )}

                  {/* Dot categories */}
                  {(timedOccs.length > 0 || barSegs.length > 0) && (
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                      {Array.from(new Set([...barSegs.map((b) => b.event.category), ...timedOccs.map((o) => o.event.category)]))
                        .slice(0, 3)
                        .map((cat) => (
                          <span key={cat} className={`inline-flex h-2 w-2 rounded-full ${catStyle[cat].dot}`} title={cat} />
                        ))}

                      {moreBars > 0 && (
                        <span className="ml-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">+{moreBars}</span>
                      )}
                    </div>
                  )}

                  {/* timed hint (ถ้าไม่มี holiday badge จะโชว์ตรงนี้พอดี) */}
                  {!isHoliday && timedOccs[0]?.startMin != null && timedOccs[0]?.endMin != null && (
                    <div className="absolute left-2 top-7 z-20 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      {formatTimeFromMinutes(timedOccs[0].startMin)}–{formatTimeFromMinutes(timedOccs[0].endMin)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {(Object.keys(catStyle) as LeaveCategory[]).map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className={`inline-flex h-2 w-2 rounded-full ${catStyle[c].dot}`} />
                <span className="text-gray-600 dark:text-gray-300">{c}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-300">วันหยุดไทย</span>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">รายละเอียดวันที่เลือก</div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {new Intl.DateTimeFormat("th-TH", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(selectedDate)}
              </div>
            </div>

            <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200">
              {selectedOccs.length} รายการลา
            </span>
          </div>

          {/* ✅ Holidays */}
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/15 dark:text-red-200">
            <div className="font-semibold">วันหยุด / วันสำคัญ</div>
            {selectedHolidays.length === 0 ? (
              <div className="mt-1 text-red-700/80 dark:text-red-200/80">ไม่มีวันหยุดในวันนี้</div>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {selectedHolidays.map((h, idx) => (
                  <li key={`${h.dateISO}-${idx}`}>{h.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">เลขคำร้อง</th>
                  <th className="px-3 py-2 font-semibold">ประเภท</th>
                  <th className="px-3 py-2 font-semibold">สถานะ</th>
                  <th className="px-3 py-2 font-semibold">เวลา</th>
                  <th className="px-3 py-2 font-semibold">ระยะเวลา</th>
                  <th className="px-3 py-2 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {selectedOccs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={6}>
                      ไม่มีรายการลาในวันนี้
                    </td>
                  </tr>
                ) : (
                  selectedOccs.map((occ, idx) => {
                    const ev = occ.event;
                    const style = catStyle[ev.category];

                    const timeText = occ.allDay
                      ? "ทั้งวัน"
                      : `${formatTimeFromMinutes(occ.startMin!)}–${formatTimeFromMinutes(occ.endMin!)}`;

                    const durMin = occ.allDay ? 0 : occ.endMin! - occ.startMin!;
                    const durText = occ.allDay ? "ทั้งวัน" : formatDurationMinutes(durMin);

                    return (
                      <tr key={`${ev.id}-${idx}`} className="bg-white dark:bg-gray-900">
                        <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{ev.requestNo}</td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-2 w-2 rounded-full ${style.dot}`} />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{leaveLabel(ev)}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[ev.status]}`}>
                            {ev.status}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{timeText}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{durText}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{ev.note || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Month list */}
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">รายการในเดือนนี้ (ช่วงเวลา)</div>

            <div className="mt-2 space-y-2">
              {monthEvents.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">เดือนนี้ยังไม่มีข้อมูล</div>
              ) : (
                monthEvents.map((ev) => {
                  const style = catStyle[ev.category];
                  const startTxt = ev.startAt.replace("T", " ");
                  const endTxt = ev.endAt.replace("T", " ");

                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2 w-2 rounded-full ${style.dot}`} />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {ev.requestNo} • {startTxt} → {endTxt}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">{leaveLabel(ev)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
