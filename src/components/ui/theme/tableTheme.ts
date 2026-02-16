// src/components/ui/theme/tableTheme.ts
export const tableTheme = {
  // wrapper ภายนอก (ถ้าตารางล้น ให้ scroll แนวนอน)
  wrap: "w-full overflow-x-auto",

  // กรอบตาราง
  shell: "overflow-hidden rounded-2xl border border-violet-400/80",

  // ตัว table
  table: "w-full border-collapse",

  // ส่วนหัว / ส่วน body
  thead: "bg-violet-50/60 text-gray-900",
  tbody: "divide-y divide-violet-100 bg-white",

  // cell มาตรฐาน (กันธีมหลุด)
  th: "px-4 py-3 text-left text-sm font-extrabold text-gray-900 whitespace-nowrap",
  td: "px-4 py-3 text-sm font-semibold text-gray-800",

  // hover แถว (optional)
  trHover: "hover:bg-violet-50/40 transition-colors",
};
