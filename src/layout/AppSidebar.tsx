console.log("✅ SMART HR SIDEBAR LOADED");
import type { ReactNode } from "react";
import { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  GridIcon,
  UserCircleIcon,
  CalenderIcon,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
  HorizontaLDots,
} from "../icons";

import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

type NavItem = {
  name: string;
  icon: ReactNode;
  path: string;
};

const LOGO_SRC = "/images/logo/company-logo3.jpg";

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "ประกาศ / หน้าแรก", path: "/" },
  { icon: <UserCircleIcon />, name: "Profile", path: "/profile" },
  { icon: <CalenderIcon />, name: "ปฏิทินวันลา", path: "/calendar" },
  { icon: <ListIcon />, name: "ยื่นใบลา", path: "/leave/request" },
  { icon: <PieChartIcon />, name: "ตรวจสอบสถานะคำขอ", path: "/leave/status" },
];

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ===== Brand: Logo + Smart HR ===== */}
      <div
        className={`py-6 flex ${
          isCollapsed ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl bg-white">
            <img
              src={LOGO_SRC}
              alt="Company Logo"
              className="h-full w-full object-contain"
            />
          </div>

          {!isCollapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Smart HR
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Encom Smart Solution
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* ===== Menu ===== */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div>
            <h2
              className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                isCollapsed ? "lg:justify-center" : "justify-start"
              }`}
            >
              {!isCollapsed ? "Menu" : <HorizontaLDots className="size-6" />}
            </h2>

            <ul className="flex flex-col gap-4">
              {navItems.map((nav) => (
                <li key={nav.name}>
                  <Link
                    to={nav.path}
                    className={`menu-item group ${
                      isActive(nav.path)
                        ? "menu-item-active"
                        : "menu-item-inactive"
                    } ${
                      isCollapsed ? "lg:justify-center" : "lg:justify-start"
                    }`}
                  >
                    <span
                      className={`menu-item-icon-size ${
                        isActive(nav.path)
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      }`}
                    >
                      {nav.icon}
                    </span>

                    {!isCollapsed && (
                      <span className="menu-item-text font-semibold">{nav.name}</span> /* ปรับตัวหนังสือ */
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* ===== Logout bottom ===== */}
        <div className="mt-auto pb-6">
          <button
            type="button"
            onClick={handleLogout}
            className={`menu-item group w-full ${
              isCollapsed ? "lg:justify-center" : "lg:justify-start"
            } menu-item-inactive`}
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <PlugInIcon />
            </span>
            {!isCollapsed && <span className="menu-item-text font-semibold">Logout</span> /* ปรับตัวหนังสือ */
}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
