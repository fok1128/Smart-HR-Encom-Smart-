// src/services/utils/thHolidays.ts
import Holidays from "date-holidays";

export type ThaiHoliday = {
  dateISO: string; // YYYY-MM-DD
  name: string;
  type?: string;
};

const hd = new Holidays("TH");

/** แปลง Date -> YYYY-MM-DD (local) */
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function safeToDate(x: any): Date | null {
  try {
    if (!x) return null;
    if (x instanceof Date) return x;
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * ดึงวันหยุดไทยของ "ปี" แล้วทำเป็น Map<YYYY-MM-DD, ThaiHoliday[]>
 * - รองรับกรณี 1 วันมีหลาย holiday
 */
export function buildThaiHolidayMap(year: number) {
  const map = new Map<string, ThaiHoliday[]>();

  const list = hd.getHolidays(year) || [];
  for (const h of list as any[]) {
    const anyH = h as any; // ✅ กัน TS แดงเรื่อง localName / shape ของ object
    const d = safeToDate(anyH?.date);
    if (!d) continue;

    const iso = toISODate(d);

    const item: ThaiHoliday = {
      dateISO: iso,
      name: String(anyH?.name || anyH?.localName || "Holiday"),
      type: anyH?.type,
    };

    if (!map.has(iso)) map.set(iso, []);
    map.get(iso)!.push(item);
  }

  // เรียงชื่อให้ดูนิ่ง ๆ
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, "th"));
    map.set(k, arr);
  }

  return map;
}

/** helper รวม 3 ปี (ปีก่อน/ปีนี้/ปีหน้า) กันเลื่อนเดือนข้ามปี */
export function buildThaiHolidayMapAround(year: number) {
  const m = new Map<string, ThaiHoliday[]>();
  const years = [year - 1, year, year + 1];

  for (const y of years) {
    const one = buildThaiHolidayMap(y);
    for (const [k, v] of one.entries()) {
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(...v);
    }
  }

  // de-dup เผื่อชื่อซ้ำ
  for (const [k, arr] of m.entries()) {
    const uniq = new Map<string, ThaiHoliday>();
    arr.forEach((x) => uniq.set(`${x.name}`, x));
    m.set(
      k,
      Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name, "th"))
    );
  }

  return m;
}
