"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var icons_1 = require("../icons");
var SidebarContext_1 = require("../context/SidebarContext");
var SidebarWidget_1 = require("./SidebarWidget");
console.log("GridIcon =", icons_1.GridIcon);
console.log("CalenderIcon =", icons_1.CalenderIcon);
console.log("ChevronDownIcon =", icons_1.ChevronDownIcon);
console.log("HorizontaLDots =", icons_1.HorizontaLDots);
// --- โค้ดส่วนที่เหลือของคุณเหมือนเดิมทั้งหมด ---
var navItems = [
    {
        icon: (0, jsx_runtime_1.jsx)(icons_1.GridIcon, {}),
        name: "Dashboard",
        subItems: [{ name: "Ecommerce", path: "/", pro: false }],
    },
    {
        icon: (0, jsx_runtime_1.jsx)(icons_1.CalenderIcon, {}),
        name: "Calendar",
        path: "/calendar",
    },
    {
        icon: (0, jsx_runtime_1.jsx)(icons_1.UserCircleIcon, {}),
        name: "User Profile",
        path: "/profile",
    },
    {
        name: "Forms",
        icon: (0, jsx_runtime_1.jsx)(icons_1.ListIcon, {}),
        subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
    },
    {
        name: "Tables",
        icon: (0, jsx_runtime_1.jsx)(icons_1.TableIcon, {}),
        subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
    },
    {
        name: "Pages",
        icon: (0, jsx_runtime_1.jsx)(icons_1.PageIcon, {}),
        subItems: [
            { name: "Blank Page", path: "/blank", pro: false },
            { name: "404 Error", path: "/error-404", pro: false },
        ],
    },
];
var othersItems = [
    {
        icon: (0, jsx_runtime_1.jsx)(icons_1.PlugInIcon, {}),
        name: "Authentication",
        subItems: [
            { name: "Sign In", path: "/signin", pro: false },
            { name: "Sign Up", path: "/signup", pro: false },
            { name: "Forgot Password", path: "/forgot password", pro: false },
        ],
    },
];
var AppSidebar = function () {
    var _a = (0, SidebarContext_1.useSidebar)(), isExpanded = _a.isExpanded, isMobileOpen = _a.isMobileOpen, isHovered = _a.isHovered, setIsHovered = _a.setIsHovered;
    var location = (0, react_router_dom_1.useLocation)();
    var _b = (0, react_1.useState)(null), openSubmenu = _b[0], setOpenSubmenu = _b[1];
    var _c = (0, react_1.useState)({}), subMenuHeight = _c[0], setSubMenuHeight = _c[1];
    var subMenuRefs = (0, react_1.useRef)({});
    var isActive = (0, react_1.useCallback)(function (path) { return location.pathname === path; }, [location.pathname]);
    (0, react_1.useEffect)(function () {
        var submenuMatched = false;
        ["main", "others"].forEach(function (menuType) {
            var items = menuType === "main" ? navItems : othersItems;
            items.forEach(function (nav, index) {
                var _a;
                (_a = nav.subItems) === null || _a === void 0 ? void 0 : _a.forEach(function (subItem) {
                    if (isActive(subItem.path)) {
                        setOpenSubmenu({ type: menuType, index: index });
                        submenuMatched = true;
                    }
                });
            });
        });
        if (!submenuMatched)
            setOpenSubmenu(null);
    }, [location, isActive]);
    (0, react_1.useEffect)(function () {
        if (openSubmenu !== null) {
            var key_1 = "".concat(openSubmenu.type, "-").concat(openSubmenu.index);
            var el_1 = subMenuRefs.current[key_1];
            if (el_1) {
                setSubMenuHeight(function (prev) {
                    var _a;
                    return (__assign(__assign({}, prev), (_a = {}, _a[key_1] = el_1.scrollHeight || 0, _a)));
                });
            }
        }
    }, [openSubmenu]);
    var handleSubmenuToggle = function (index, menuType) {
        setOpenSubmenu(function (prev) {
            if (prev && prev.type === menuType && prev.index === index)
                return null;
            return { type: menuType, index: index };
        });
    };
    var renderMenuItems = function (items, menuType) { return ((0, jsx_runtime_1.jsx)("ul", { className: "flex flex-col gap-4", children: items.map(function (nav, index) { return ((0, jsx_runtime_1.jsxs)("li", { children: [nav.subItems ? ((0, jsx_runtime_1.jsxs)("button", { onClick: function () { return handleSubmenuToggle(index, menuType); }, className: "menu-item group ".concat((openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.type) === menuType && (openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.index) === index
                        ? "menu-item-active"
                        : "menu-item-inactive", " cursor-pointer ").concat(!isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "lg:justify-start"), children: [(0, jsx_runtime_1.jsx)("span", { className: "menu-item-icon-size  ".concat((openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.type) === menuType && (openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.index) === index
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"), children: nav.icon }), (isExpanded || isHovered || isMobileOpen) && ((0, jsx_runtime_1.jsx)("span", { className: "menu-item-text", children: nav.name })), (isExpanded || isHovered || isMobileOpen) && ((0, jsx_runtime_1.jsx)(icons_1.ChevronDownIcon, { className: "ml-auto w-5 h-5 transition-transform duration-200 ".concat((openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.type) === menuType &&
                                (openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.index) === index
                                ? "rotate-180 text-brand-500"
                                : "") }))] })) : (nav.path && ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: nav.path, className: "menu-item group ".concat(isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"), children: [(0, jsx_runtime_1.jsx)("span", { className: "menu-item-icon-size ".concat(isActive(nav.path)
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"), children: nav.icon }), (isExpanded || isHovered || isMobileOpen) && ((0, jsx_runtime_1.jsx)("span", { className: "menu-item-text", children: nav.name }))] }))), nav.subItems && (isExpanded || isHovered || isMobileOpen) && ((0, jsx_runtime_1.jsx)("div", { ref: function (el) {
                        subMenuRefs.current["".concat(menuType, "-").concat(index)] = el;
                    }, className: "overflow-hidden transition-all duration-300", style: {
                        height: (openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.type) === menuType && (openSubmenu === null || openSubmenu === void 0 ? void 0 : openSubmenu.index) === index
                            ? "".concat(subMenuHeight["".concat(menuType, "-").concat(index)], "px")
                            : "0px",
                    }, children: (0, jsx_runtime_1.jsx)("ul", { className: "mt-2 space-y-1 ml-9", children: nav.subItems.map(function (subItem) { return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: subItem.path, className: "menu-dropdown-item ".concat(isActive(subItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"), children: [subItem.name, (0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1 ml-auto", children: [subItem.new && ((0, jsx_runtime_1.jsx)("span", { className: "ml-auto ".concat(isActive(subItem.path)
                                                    ? "menu-dropdown-badge-active"
                                                    : "menu-dropdown-badge-inactive", " menu-dropdown-badge"), children: "new" })), subItem.pro && ((0, jsx_runtime_1.jsx)("span", { className: "ml-auto ".concat(isActive(subItem.path)
                                                    ? "menu-dropdown-badge-active"
                                                    : "menu-dropdown-badge-inactive", " menu-dropdown-badge"), children: "pro" }))] })] }) }, subItem.name)); }) }) }))] }, nav.name)); }) })); };
    return ((0, jsx_runtime_1.jsxs)("aside", { className: "fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 \n        ".concat(isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
                ? "w-[290px]"
                : "w-[90px]", "\n        ").concat(isMobileOpen ? "translate-x-0" : "-translate-x-full", "\n        lg:translate-x-0"), onMouseEnter: function () { return !isExpanded && setIsHovered(true); }, onMouseLeave: function () { return setIsHovered(false); }, children: [(0, jsx_runtime_1.jsx)("div", { className: "py-8 flex ".concat(!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"), children: (0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: "/", children: isExpanded || isHovered || isMobileOpen ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("img", { className: "dark:hidden", src: "/images/logo/logo.svg", alt: "Logo", width: 150, height: 40 }), (0, jsx_runtime_1.jsx)("img", { className: "hidden dark:block", src: "/images/logo/logo-dark.svg", alt: "Logo", width: 150, height: 40 })] })) : ((0, jsx_runtime_1.jsx)("img", { src: "/images/logo/logo-icon.svg", alt: "Logo", width: 32, height: 32 })) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar", children: [(0, jsx_runtime_1.jsx)("nav", { className: "mb-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ".concat(!isExpanded && !isHovered
                                                ? "lg:justify-center"
                                                : "justify-start"), children: isExpanded || isHovered || isMobileOpen ? ("Menu") : ((0, jsx_runtime_1.jsx)(icons_1.HorizontaLDots, { className: "size-6" })) }), renderMenuItems(navItems, "main")] }), (0, jsx_runtime_1.jsxs)("div", { className: "", children: [(0, jsx_runtime_1.jsx)("h2", { className: "mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ".concat(!isExpanded && !isHovered
                                                ? "lg:justify-center"
                                                : "justify-start"), children: isExpanded || isHovered || isMobileOpen ? ("Others") : ((0, jsx_runtime_1.jsx)(icons_1.HorizontaLDots, { className: "size-6" })) }), renderMenuItems(othersItems, "others")] })] }) }), isExpanded || isHovered || isMobileOpen ? (0, jsx_runtime_1.jsx)(SidebarWidget_1.default, {}) : null] })] }));
};
exports.default = AppSidebar;
