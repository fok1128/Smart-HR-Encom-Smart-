import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GridIcon, UserCircleIcon, CalenderIcon, ListIcon, PieChartIcon, PlugInIcon, HorizontaLDots, } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
const LOGO_SRC = "/images/logo/company-logo3.jpg";
const navItems = [
    { icon: _jsx(GridIcon, {}), name: "ประกาศ / หน้าแรก", path: "/" },
    { icon: _jsx(UserCircleIcon, {}), name: "Profile", path: "/profile" },
    { icon: _jsx(CalenderIcon, {}), name: "ปฏิทินวันลา", path: "/calendar" },
    { icon: _jsx(ListIcon, {}), name: "ยื่นใบลา", path: "/leave/submit" }, // ✅
    { icon: _jsx(PieChartIcon, {}), name: "ตรวจสอบสถานะคำขอ", path: "/leave/status" }, // ✅
];
const AppSidebar = () => {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;
    // ✅ ไฮไลต์เมนูให้ติดแม้มี subpath
    const isActive = useCallback((path) => location.pathname === path || location.pathname.startsWith(path + "/"), [location.pathname]);
    const handleLogout = () => {
        logout();
        navigate("/signin", { replace: true });
    };
    return (_jsxs("aside", { className: `fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
                ? "w-[290px]"
                : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`, onMouseEnter: () => !isExpanded && setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx("div", { className: `py-6 flex ${isCollapsed ? "lg:justify-center" : "justify-start"}`, children: _jsxs(Link, { to: "/", className: "flex items-center gap-3", children: [_jsx("div", { className: "h-10 w-10 overflow-hidden rounded-xl bg-white", children: _jsx("img", { src: LOGO_SRC, alt: "Company Logo", className: "h-full w-full object-contain" }) }), !isCollapsed && (_jsxs("div", { className: "leading-tight", children: [_jsx("div", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Smart HR" }), _jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Encom Smart Solution" })] }))] }) }), _jsxs("div", { className: "flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar", children: [_jsx("nav", { className: "mb-6", children: _jsxs("div", { children: [_jsx("h2", { className: `mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${isCollapsed ? "lg:justify-center" : "justify-start"}`, children: !isCollapsed ? "Menu" : _jsx(HorizontaLDots, { className: "size-6" }) }), _jsx("ul", { className: "flex flex-col gap-4", children: navItems.map((nav) => (_jsx("li", { children: _jsxs(Link, { to: nav.path, className: `menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"} ${isCollapsed ? "lg:justify-center" : "lg:justify-start"}`, children: [_jsx("span", { className: `menu-item-icon-size ${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`, children: nav.icon }), !isCollapsed && (_jsx("span", { className: "menu-item-text font-semibold", children: nav.name }))] }) }, nav.name))) })] }) }), _jsx("div", { className: "mt-auto pb-6", children: _jsxs("button", { type: "button", onClick: handleLogout, className: `menu-item group w-full ${isCollapsed ? "lg:justify-center" : "lg:justify-start"} menu-item-inactive`, children: [_jsx("span", { className: "menu-item-icon-size menu-item-icon-inactive", children: _jsx(PlugInIcon, {}) }), !isCollapsed && _jsx("span", { className: "menu-item-text font-semibold", children: "Logout" })] }) })] })] }));
};
export default AppSidebar;
