import { useMemo, useState } from "react";

type LeaveStatus = "รอดำเนินการ" | "อนุมัติ" | "ไม่อนุมัติ";
type LeaveType = "ลาพักร้อน" | "ลากิจ" | "ลาป่วย" | "อื่นๆ";

type LeaveEvent = {
  date: string; // YYYY-MM-DD
  type: LeaveType;
  status: LeaveStatus;
  note?: string;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1);

function buildCalendarCells(monthDate: Date, weekStartsOn: 0 | 1 = 1) {
  const monthStart = startOfMonth(monthDate);
  const firstDayIndex = (monthStart.getDay() - weekStartsOn + 7) % 7;

  // 6 weeks grid (42 ช่อง) กันเลย์เอาท์กระโดด
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

const dayLabelsMonFirst = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

const leaveTypeStyle: Record<
  LeaveType,
  { dot: string; chip: string; chipText: string; softBg: string; border: string }
> = {
  ลาป่วย: {
    dot: "bg-red-500",
    chip: "bg-red-50 dark:bg-red-900/30",
    chipText: "text-red-700 dark:text-red-300",
    softBg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-900/40",
  },
  ลากิจ: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 dark:bg-amber-900/30",
    chipText: "text-amber-700 dark:text-amber-300",
    softBg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-900/40",
  },
  ลาพักร้อน: {
    dot: "bg-green-500",
    chip: "bg-green-50 dark:bg-green-900/30",
    chipText: "text-green-700 dark:text-green-300",
    softBg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-900/40",
  },
  อื่นๆ: {
    dot: "bg-purple-500",
    chip: "bg-purple-50 dark:bg-purple-900/30",
    chipText: "text-purple-700 dark:text-purple-300",
    softBg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-900/40",
  },
};

const statusStyle: Record<LeaveStatus, string> = {
  อนุมัติ: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ไม่อนุมัติ: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  รอดำเนินการ: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function uniqLeaveTypes(events: LeaveEvent[]): LeaveType[] {
  const set = new Set<LeaveType>();
  for (const e of events) set.add(e.type);
  return Array.from(set);
}

export default function Calendar() {
  // ✅ demo events (ยังไม่ต่อ DB) — ต่อจริงทีหลังก็แทนชุดนี้ได้เลย
  const leaveEvents: LeaveEvent[] = [
    { date: "2026-01-10", type: "ลาป่วย", status: "อนุมัติ", note: "ไข้หวัด" },
    { date: "2026-01-15", type: "ลากิจ", status: "รอดำเนินการ", note: "ธุระส่วนตัว" },
    { date: "2026-01-22", type: "ลาพักร้อน", status: "อนุมัติ" },
    { date: "2026-01-28", type: "อื่นๆ", status: "ไม่อนุมัติ", note: "เอกสารไม่ครบ" },
  ];

  // ✅ เริ่มสัปดาห์วันจันทร์ ให้ตรงปฏิทินจริง
  const weekStartsOn: 0 | 1 = 1;

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const dayLabels = dayLabelsMonFirst;

  const cells = useMemo(
    () => buildCalendarCells(currentMonth, weekStartsOn),
    [currentMonth]
  );

  const eventMap = useMemo(() => {
    const m = new Map<string, LeaveEvent[]>();
    for (const ev of leaveEvents) {
      if (!m.has(ev.date)) m.set(ev.date, []);
      m.get(ev.date)!.push(ev);
    }
    return m;
  }, [leaveEvents]);

  const monthTitle = useMemo(() => {
    return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(
      currentMonth
    );
  }, [currentMonth]);

  const selectedISO = toISODate(selectedDate);
  const selectedEvents = eventMap.get(selectedISO) ?? [];

  const monthEvents = useMemo(() => {
    const ym = `${currentMonth.getFullYear()}-${pad2(currentMonth.getMonth() + 1)}`;
    return leaveEvents
      .filter((x) => x.date.startsWith(ym))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [leaveEvents, currentMonth]);

  const goToday = () => {
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            ปฏิทินวันลา
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            แยกสีตามประเภทลา • กดวันเพื่อดูรายละเอียด
          </p>
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
        {/* Calendar Card */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          {/* Month Controls */}
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

            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {monthTitle}
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              เลือกวันเพื่อดูรายละเอียด
            </div>
          </div>

          {/* Day header */}
          <div className="mt-4 grid grid-cols-7 gap-2">
            {dayLabels.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400"
              >
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

              const events = eventMap.get(iso) ?? [];
              const hasEvents = events.length > 0;

              const isWeekend = d.getDay() === 0 || d.getDay() === 6; // อา/ส
              const isDimWeekend = inMonth && isWeekend;

              const types = hasEvents ? uniqLeaveTypes(events) : [];
              const firstType = types[0];

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={[
                    "relative h-16 rounded-xl border text-left transition",
                    "px-3 py-2",
                    "dark:border-gray-800",
                    inMonth
                      ? "border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                      : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-500 dark:hover:bg-gray-800",
                    isDimWeekend ? "opacity-70" : "",
                    isSelected ? "ring-3 ring-brand-500/20 border-brand-300 dark:border-brand-800" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={[
                        "text-sm font-semibold",
                        isToday ? "text-brand-500" : "text-gray-900 dark:text-gray-100",
                        !inMonth ? "text-gray-400 dark:text-gray-500" : "",
                      ].join(" ")}
                    >
                      {d.getDate()}
                    </div>

                    {/* Dots by leave type */}
                    {hasEvents && (
                      <div className="mt-1 flex items-center gap-1">
                        {types.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className={`inline-flex h-2 w-2 rounded-full ${leaveTypeStyle[t].dot}`}
                            title={t}
                          />
                        ))}
                        {types.length > 3 ? (
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            +{types.length - 3}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Small label for first leave type */}
                  {hasEvents && firstType && (
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold border",
                          leaveTypeStyle[firstType].chip,
                          leaveTypeStyle[firstType].chipText,
                          leaveTypeStyle[firstType].border,
                        ].join(" ")}
                      >
                        {firstType}
                      </span>

                      {events.length > 1 ? (
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          +{events.length - 1}
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {(["ลาป่วย", "ลากิจ", "ลาพักร้อน", "อื่นๆ"] as LeaveType[]).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className={`inline-flex h-2 w-2 rounded-full ${leaveTypeStyle[t].dot}`} />
                <span className="text-gray-600 dark:text-gray-300">{t}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                รายละเอียดวันที่เลือก
              </div>
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
              {selectedEvents.length} รายการ
            </span>
          </div>

          {/* Table (สรุปเป็นตารางสวยๆ) */}
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              สรุปรายการของวัน
            </div>

            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2 font-semibold">ประเภท</th>
                    <th className="px-3 py-2 font-semibold">สถานะ</th>
                    <th className="px-3 py-2 font-semibold">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {selectedEvents.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={3}>
                        ไม่มีรายการ
                      </td>
                    </tr>
                  ) : (
                    selectedEvents.map((ev, idx) => (
                      <tr key={`row-${idx}`} className="bg-white dark:bg-gray-900">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-2 w-2 rounded-full ${leaveTypeStyle[ev.type].dot}`} />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {ev.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[ev.status]}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                          {ev.note ?? "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Month list */}
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              รายการในเดือนนี้
            </div>
            <div className="mt-2 space-y-2">
              {monthEvents.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  เดือนนี้ยังไม่มีข้อมูล
                </div>
              ) : (
                monthEvents.map((ev, idx) => (
                  <div
                    key={`${ev.date}-m-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-2 w-2 rounded-full ${leaveTypeStyle[ev.type].dot}`} />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {ev.date}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">{ev.type}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
