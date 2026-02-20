import React from "react";

type Variant = "primary" | "secondary" | "outline" | "outlinePill" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AppButton({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = "button",
  onClick,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  const base =
    "inline-flex items-center justify-center gap-2 font-semibold select-none " +
    "transition-all duration-150 " +
    "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 " +
    "active:scale-[0.99] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-sm rounded-xl",
    md: "h-10 px-4 text-sm rounded-2xl",
    lg: "h-11 px-5 text-base rounded-2xl",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-violet-800 text-white border border-violet-800 " +
      "hover:bg-violet-900 hover:border-violet-900 shadow-sm shadow-violet-800/25",

    secondary:
      "bg-gray-100 text-gray-900 border border-gray-200 " +
      "hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 " +
      "dark:text-gray-100 dark:hover:bg-gray-700",

    outline:
      "bg-transparent border border-violet-400/80 text-violet-700 " +
      "hover:bg-violet-50/70 hover:border-violet-500 " +
      "dark:border-violet-500/30 dark:text-violet-200 dark:hover:bg-violet-500/10",

    outlinePill:
      "rounded-full bg-transparent border border-violet-400/80 text-violet-700 font-extrabold " +
      "hover:bg-violet-50/70 hover:border-violet-500 " +
      "dark:border-violet-500/30 dark:text-violet-200 dark:hover:bg-violet-500/10",

    danger:
      "bg-rose-600 text-white border border-rose-600 " +
      "hover:bg-rose-700 hover:border-rose-700 shadow-sm shadow-rose-600/20",

    ghost:
      "bg-transparent border border-transparent text-violet-700 " +
      "hover:bg-violet-50/70 dark:text-violet-200 dark:hover:bg-violet-500/10",
  };

  const spinnerClass =
    variant === "primary" || variant === "danger"
      ? "border-white/60 border-t-white"
      : "border-violet-400/50 border-t-violet-700 dark:border-violet-300/40 dark:border-t-violet-200";

  return (
    <button
      {...rest} // ✅ วางก่อน เพื่อไม่ให้ทับ type / onClick ของเรา
      type={type} // ✅ ล็อก type ที่เราตั้งไว้
      disabled={isDisabled}
      className={cn(base, sizes[size], variants[variant], fullWidth && "w-full", className)}
      onClick={(e) => {
        // ✅ ปุ่มทั่วไปไม่ควร submit form
        if (type !== "submit") e.preventDefault();
        onClick?.(e);
      }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className={cn("h-4 w-4 animate-spin rounded-full border-2", spinnerClass)} />
          <span>กำลังทำงาน...</span>
        </span>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
