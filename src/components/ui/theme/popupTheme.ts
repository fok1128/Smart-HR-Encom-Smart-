// src/components/ui/theme/popupTheme.ts
export type PopupVariant = "info" | "success" | "warning" | "danger";

export const popupTheme = {
  z: {
    toast: "z-[6000]",
    modal: "z-[7000]",
    confirm: "z-[8000]",
  },

  css: `
  @keyframes popIn {
    0%   { transform: translateY(14px) scale(.985); opacity: 0; filter: blur(2px); }
    100% { transform: translateY(0px) scale(1); opacity: 1; filter: blur(0px); }
  }
  @keyframes popOut {
    0%   { transform: translateY(0px) scale(1); opacity: 1; }
    100% { transform: translateY(14px) scale(.985); opacity: 0; }
  }

  .popup-glow {
    box-shadow:
      0 22px 60px rgba(0,0,0,.22),
      0 0 0 1px rgba(255,255,255,.25) inset,
      0 0 40px rgba(236,72,153,.08),
      0 0 60px rgba(168,85,247,.06);
  }
  .dark .popup-glow {
    box-shadow:
      0 22px 60px rgba(0,0,0,.55),
      0 0 0 1px rgba(255,255,255,.08) inset,
      0 0 40px rgba(236,72,153,.10),
      0 0 60px rgba(168,85,247,.08);
  }

  /* ✅ purple glow (แรงขึ้นแบบเห็นชัด) */
  .popup-glow-purple {
    box-shadow:
      0 26px 82px rgba(0,0,0,.26),
      0 0 0 1px rgba(255,255,255,.28) inset,
      0 0 34px rgba(168,85,247,.28),
      0 0 90px rgba(168,85,247,.26),
      0 0 150px rgba(168,85,247,.18),
      0 0 46px rgba(236,72,153,.14);
  }
  .dark .popup-glow-purple {
    box-shadow:
      0 30px 96px rgba(0,0,0,.70),
      0 0 0 1px rgba(255,255,255,.10) inset,
      0 0 38px rgba(168,85,247,.32),
      0 0 110px rgba(168,85,247,.28),
      0 0 170px rgba(168,85,247,.20),
      0 0 52px rgba(236,72,153,.16);
  }
`,

  backdrop: (visible: boolean) =>
    ["absolute inset-0", "bg-black/35", "backdrop-blur-sm", visible ? "opacity-100" : "opacity-0"].join(" "),

  centerWrap: (zClass: string) => ["fixed inset-0", zClass, "flex items-center justify-center px-4"].join(" "),

  cardBase: [
    "w-full overflow-hidden rounded-3xl",
    "bg-white dark:bg-gray-900",
    "border border-gray-200 dark:border-gray-800",
    "shadow-2xl popup-glow",
  ].join(" "),

  // ✅ เปลี่ยนให้ใช้ glow ม่วงชัดขึ้น
  cardStrongPurple: [
    "w-full overflow-hidden rounded-3xl shadow-2xl popup-glow-purple",
    "bg-white dark:bg-gray-900",
    "border-2 border-purple-400/70 dark:border-purple-300/25",
    "ring-1 ring-purple-400/25 dark:ring-purple-300/15",
  ].join(" "),

  topBarPurple: "h-[5px] w-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600",
  topBarSoft: "h-[4px] w-full bg-gradient-to-r from-fuchsia-400/70 via-purple-400/45 to-pink-400/60",

  title: "text-xl font-extrabold text-gray-900 dark:text-gray-50",
  desc: "mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200",

  iconWrapBase: "grid h-11 w-11 place-items-center rounded-2xl border",
  iconWrapPurple: [
    "bg-purple-500/10 border-purple-200/70 dark:border-purple-200/15",
    "text-purple-700 dark:text-purple-200",
  ].join(" "),

  iconWrapByVariant: {
    info: "border-fuchsia-200/70 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-200/10 dark:bg-fuchsia-500/10 dark:text-fuchsia-200",
    success:
      "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-200/10 dark:bg-emerald-500/10 dark:text-emerald-200",
    warning:
      "border-amber-200/70 bg-amber-50 text-amber-800 dark:border-amber-200/10 dark:bg-amber-500/10 dark:text-amber-200",
    danger:
      "border-rose-200/70 bg-rose-50 text-rose-800 dark:border-rose-200/10 dark:bg-rose-500/10 dark:text-rose-200",
  } as const,

  ringByVariant: {
    info: "ring-fuchsia-400/15",
    success: "ring-emerald-400/18",
    warning: "ring-amber-400/18",
    danger: "ring-rose-400/18",
  } as const,

  barByVariant: {
    info: "from-fuchsia-400/70 via-purple-400/45 to-pink-400/60",
    success: "from-emerald-400/70 via-purple-400/45 to-pink-400/60",
    warning: "from-amber-400/75 via-purple-400/40 to-pink-400/55",
    danger: "from-rose-400/75 via-purple-400/40 to-fuchsia-400/55",
  } as const,

  badgeByVariant: {
    info: "border-fuchsia-300/40 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-200/10 dark:bg-fuchsia-500/10 dark:text-fuchsia-200",
    success:
      "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:border-emerald-200/10 dark:bg-emerald-500/10 dark:text-emerald-200",
    warning:
      "border-amber-300/40 bg-amber-50 text-amber-900 dark:border-amber-200/10 dark:bg-amber-500/10 dark:text-amber-200",
    danger:
      "border-rose-300/40 bg-rose-50 text-rose-900 dark:border-rose-200/10 dark:bg-rose-500/10 dark:text-rose-200",
  } as const,

  iconByVariant: {
    info: "i",
    success: "✓",
    warning: "!",
    danger: "×",
  } as const,

  btnBase: ["h-11 rounded-2xl px-5 text-sm font-extrabold transition", "active:scale-[0.99]"].join(" "),
  btnConfirm: "text-white shadow-lg",

  btnConfirmSuccess: ["bg-emerald-600 hover:bg-emerald-700","focus:ring-emerald-500/30","text-white",].join(" "),
  btnConfirmDanger: ["bg-red-600 hover:bg-red-700","focus:ring-red-500/30","text-white",].join(" "),

  btnCancelDanger:
    "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900/40 dark:hover:bg-red-950/45",

  btnCloseIcon: [
    "group inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
    "border-gray-200 bg-white",
    "hover:bg-gray-50 hover:shadow-lg",
    "dark:border-gray-800 dark:bg-gray-950/60 dark:hover:bg-gray-900",
  ].join(" "),
} as const;
