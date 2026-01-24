import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalenderIcon, ChevronDownIcon, GridIcon, HorizontaLDots, ListIcon, PageIcon, PlugInIcon, TableIcon, UserCircleIcon, } from "./src/icons";
import { useSidebar } from "./src/context/SidebarContext";
import SidebarWidget from "./src/layout/SidebarWidget";

// --- โค้ดส่วนที่เหลือของคุณเหมือนเดิมทั้งหมด ---
const navItems = [
    {
        icon: _jsx(GridIcon, {}),
        name: "Dashboard",
        subItems: [{ name: "Ecommerce", path: "/", pro: false }],
    },
    {
        icon: _jsx(CalenderIcon, {}),
        name: "Calendar",
        path: "/calendar",
    },
    {
        icon: _jsx(UserCircleIcon, {}),
        name: "User Profile",
        path: "/profile",
    },
    {
        name: "Forms",
        icon: _jsx(ListIcon, {}),
        subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
    },
    {
        name: "Tables",
        icon: _jsx(TableIcon, {}),
        subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
    },
    {
        name: "Pages",
        icon: _jsx(PageIcon, {}),
        subItems: [
            { name: "Blank Page", path: "/blank", pro: false },
            { name: "404 Error", path: "/error-404", pro: false },
        ],
    },
];
const othersItems = [
    {
        icon: _jsx(PlugInIcon, {}),
        name: "Authentication",
        subItems: [
            { name: "Sign In", path: "/signin", pro: false },
            { name: "Sign Up", path: "/signup", pro: false },
            { name: "Forgot Password", path: "/forgot password", pro: false },
        ],
    },
];
const AppSidebar = () => {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
    const location = useLocation();
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [subMenuHeight, setSubMenuHeight] = useState({});
    const subMenuRefs = useRef({});
    const isActive = useCallback((path) => location.pathname === path, [location.pathname]);
    useEffect(() => {
        let submenuMatched = false;
        ["main", "others"].forEach((menuType) => {
            const items = menuType === "main" ? navItems : othersItems;
            items.forEach((nav, index) => {
                nav.subItems?.forEach((subItem) => {
                    if (isActive(subItem.path)) {
                        setOpenSubmenu({ type: menuType, index });
                        submenuMatched = true;
                    }
                });
            });
        });
        if (!submenuMatched)
            setOpenSubmenu(null);
    }, [location, isActive]);
    useEffect(() => {
        if (openSubmenu !== null) {
            const key = `${openSubmenu.type}-${openSubmenu.index}`;
            const el = subMenuRefs.current[key];
            if (el) {
                setSubMenuHeight((prev) => ({
                    ...prev,
                    [key]: el.scrollHeight || 0,
                }));
            }
        }
    }, [openSubmenu]);
    const handleSubmenuToggle = (index, menuType) => {
        setOpenSubmenu((prev) => {
            if (prev && prev.type === menuType && prev.index === index)
                return null;
            return { type: menuType, index };
        });
    };
    const renderMenuItems = (items, menuType) => (_jsx("ul", { className: "flex flex-col gap-4", children: items.map((nav, index) => (_jsxs("li", { children: [nav.subItems ? (_jsxs("button", { onClick: () => handleSubmenuToggle(index, menuType), className: `menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? "menu-item-active"
                        : "menu-item-inactive"} cursor-pointer ${!isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "lg:justify-start"}`, children: [_jsx("span", { className: `menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"}`, children: nav.icon }), (isExpanded || isHovered || isMobileOpen) && (_jsx("span", { className: "menu-item-text", children: nav.name })), (isExpanded || isHovered || isMobileOpen) && (_jsx(ChevronDownIcon, { className: `ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                                openSubmenu?.index === index
                                ? "rotate-180 text-brand-500"
                                : ""}` }))] })) : (nav.path && (_jsxs(Link, { to: nav.path, className: `menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`, children: [_jsx("span", { className: `menu-item-icon-size ${isActive(nav.path)
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"}`, children: nav.icon }), (isExpanded || isHovered || isMobileOpen) && (_jsx("span", { className: "menu-item-text", children: nav.name }))] }))), nav.subItems && (isExpanded || isHovered || isMobileOpen) && (_jsx("div", { ref: (el) => {
                        subMenuRefs.current[`${menuType}-${index}`] = el;
                    }, className: "overflow-hidden transition-all duration-300", style: {
                        height: openSubmenu?.type === menuType && openSubmenu?.index === index
                            ? `${subMenuHeight[`${menuType}-${index}`]}px`
                            : "0px",
                    }, children: _jsx("ul", { className: "mt-2 space-y-1 ml-9", children: nav.subItems.map((subItem) => (_jsx("li", { children: _jsxs(Link, { to: subItem.path, className: `menu-dropdown-item ${isActive(subItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"}`, children: [subItem.name, _jsxs("span", { className: "flex items-center gap-1 ml-auto", children: [subItem.new && (_jsx("span", { className: `ml-auto ${isActive(subItem.path)
                                                    ? "menu-dropdown-badge-active"
                                                    : "menu-dropdown-badge-inactive"} menu-dropdown-badge`, children: "new" })), subItem.pro && (_jsx("span", { className: `ml-auto ${isActive(subItem.path)
                                                    ? "menu-dropdown-badge-active"
                                                    : "menu-dropdown-badge-inactive"} menu-dropdown-badge`, children: "pro" }))] })] }) }, subItem.name))) }) }))] }, nav.name))) }));
    return (_jsxs("aside", { className: `fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
                ? "w-[290px]"
                : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`, onMouseEnter: () => !isExpanded && setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx("div", { className: `py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`, children: _jsx(Link, { to: "/", children: isExpanded || isHovered || isMobileOpen ? (_jsxs(_Fragment, { children: [_jsx("img", { className: "dark:hidden", src: "/images/logo/logo.svg", alt: "Logo", width: 150, height: 40 }), _jsx("img", { className: "hidden dark:block", src: "/images/logo/logo-dark.svg", alt: "Logo", width: 150, height: 40 })] })) : (_jsx("img", { src: "/images/logo/logo-icon.svg", alt: "Logo", width: 32, height: 32 })) }) }), _jsxs("div", { className: "flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar", children: [_jsx("nav", { className: "mb-6", children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: `mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                                                ? "lg:justify-center"
                                                : "justify-start"}`, children: isExpanded || isHovered || isMobileOpen ? ("Menu") : (_jsx(HorizontaLDots, { className: "size-6" })) }), renderMenuItems(navItems, "main")] }), _jsxs("div", { className: "", children: [_jsx("h2", { className: `mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                                                ? "lg:justify-center"
                                                : "justify-start"}`, children: isExpanded || isHovered || isMobileOpen ? ("Others") : (_jsx(HorizontaLDots, { className: "size-6" })) }), renderMenuItems(othersItems, "others")] })] }) }), isExpanded || isHovered || isMobileOpen ? _jsx(SidebarWidget, {}) : null] })] }));
};
export default AppSidebar;
