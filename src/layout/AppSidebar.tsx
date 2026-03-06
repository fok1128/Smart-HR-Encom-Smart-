import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

import {
  House,
  UserCircle,
  CalendarBlank,
  FilePlus,
  FileText,
  SealCheck,
  Briefcase,
  ClockCounterClockwiseIcon,
  Clipboard,
  SignOut,
} from "@phosphor-icons/react";

type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  action?: () => void;
};

const LOGO_SRC = "/images/logo/smart-hr-logo.png";

const BRAND_PURPLE = "#6B1F78";
const ACCENT_YELLOW = "#D6BE13";
const ACCENT_GREEN = "#2D5C0E";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const location = useLocation();

  const role = String(user?.role || "").toUpperCase();
  const canApprove = ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"].includes(role);

  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  const isActive = useCallback(
    (path: string) => {
      const cur = location.pathname;
      if (path === "/") return cur === "/";
      return cur === path || cur.startsWith(path + "/");
    },
    [location.pathname]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/signin", { replace: true });
    }
  }, [logout, navigate]);

  const navItems: NavItem[] = useMemo(() => {
    const iconProps = {
      size: 22,
      weight: "duotone" as const,
      color: "currentColor" as const,
    };

    const base: NavItem[] = [
      { icon: <House {...iconProps} />, name: "ประกาศ / หน้าแรก", path: "/" },
      { icon: <UserCircle {...iconProps} />, name: "Profile", path: "/profile" },
      { icon: <CalendarBlank {...iconProps} />, name: "ปฏิทินวันลา", path: "/calendar" },

      { icon: <FilePlus {...iconProps} />, name: "ยื่นใบลา", path: "/leave/submit" },
      { icon: <SealCheck {...iconProps} />, name: "ตรวจสอบสถานะคำขอ", path: "/leave/status" },
      { icon: <FileText {...iconProps} />, name: "ใบลาของฉัน", path: "/my-leaves" },

      { icon: <Briefcase {...iconProps} />, name: "แจ้งปฏิบัติงานนอกสถานที่", path: "/field-work" },
      { icon: <ClockCounterClockwiseIcon {...iconProps} />, name: "ประวัติออกปฏิบัติงาน", path: "/field-work/history" },
    ];

    if (canApprove) {
      base.push(
        { icon: <Clipboard {...iconProps} />, name: "อนุมัติใบลา", path: "/leave/approve" },
        { icon: <ClockCounterClockwiseIcon {...iconProps} />, name: "ประวัติการอนุมัติ", path: "/leave/approve-history" }
      );
    }

    base.push({
      icon: <SignOut {...iconProps} />,
      name: "Logout",
      action: handleLogout,
    });

    return base;
  }, [canApprove, handleLogout]);

  const itemBase =
    "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 select-none";
  const itemAlign = isCollapsed ? "justify-center" : "justify-start";

  const itemInactive =
    "text-slate-700 hover:bg-[#6B1F78]/7 hover:ring-1 hover:ring-[#6B1F78]/15 dark:text-slate-200 dark:hover:bg-white/10";

  const itemActive =
    "bg-gradient-to-r from-[#6B1F78]/16 via-[#6B1F78]/10 to-transparent text-[#6B1F78] ring-1 ring-[#6B1F78]/20 shadow-[0_10px_22px_rgba(107,31,120,0.10)] dark:bg-white/10 dark:text-white";

  const iconBox = "grid place-items-center rounded-xl w-11 h-11 transition-all duration-200";
  const iconInactive =
    "bg-transparent text-[#2D5C0E] group-hover:text-[#2D5C0E] dark:text-[#2D5C0E]/90";
  const iconActive =
    "bg-white text-[#2D5C0E] ring-1 ring-[#6B1F78]/15 shadow-[0_10px_18px_rgba(17,24,39,0.10)] dark:bg-white/15 dark:text-[#D6BE13]";

  return (
    <aside
      className={cn(
        "fixed left-0 z-50",
        "top-16 lg:top-0",
        "h-[calc(100vh-4rem)] lg:h-screen",
        "bg-white dark:bg-gray-900",
        "border-r border-gray-200 dark:border-gray-800",
        "transition-all duration-300 ease-in-out",
        "lg:translate-x-0",
        "flex flex-col",
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand */}
      <div className="px-4 pt-6 pb-6 shrink-0">
        <Link to="/" className="flex w-full justify-center">
          <div className="flex flex-col items-center w-full">
            <div
              className={cn(
                "w-full overflow-hidden rounded-2xl transition-all duration-300",
                "border border-transparent shadow-none",
                "bg-white dark:bg-gray-900",
                isCollapsed ? "p-1.5" : "p-2"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center overflow-hidden rounded-xl",
                  isCollapsed ? "h-[52px]" : "h-[86px]"
                )}
              >
                <img
                  src={LOGO_SRC}
                  alt="Smart HR Logo"
                  className={cn(
                    "block object-contain",
                    isCollapsed ? "h-full w-full" : "max-h-full w-full"
                  )}
                  draggable={false}
                />
              </div>
            </div>

            {!isCollapsed && (
              <div
                className="mt-4 h-[4px] w-42 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${ACCENT_YELLOW} 0%, ${ACCENT_GREEN} 100%)`,
                  opacity: 0.95,
                }}
              />
            )}
          </div>
        </Link>

        <div className="mt-6 border-t border-gray-200/70 dark:border-gray-800/70" />
      </div>

      {/* Menu */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4">
        <nav className="pt-1">
          <ul className="flex flex-col gap-2">
            {navItems.map((nav) => {
              const isLink = !!nav.path;
              const active = isLink ? isActive(nav.path!) : false;

              const content = (
                <>
                  {!isCollapsed && (
                    <span
                      className={cn(
                        "h-7 w-1 rounded-full transition",
                        active ? "bg-[#6B1F78]" : "bg-transparent"
                      )}
                    />
                  )}

                  <span className={cn(iconBox, active ? iconActive : iconInactive)}>
                    <span className="text-current">{nav.icon}</span>
                  </span>

                  {!isCollapsed && (
                    <span className="text-sm font-semibold tracking-[0.1px]">{nav.name}</span>
                  )}
                </>
              );

              return (
                <li key={nav.name}>
                  {isLink ? (
                    <Link
                      to={nav.path!}
                      className={cn(itemBase, itemAlign, active ? itemActive : itemInactive)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={nav.action}
                      className={cn(itemBase, itemAlign, "w-full", itemInactive)}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;