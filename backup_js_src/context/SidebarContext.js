"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = exports.useSidebar = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var SidebarContext = (0, react_1.createContext)(undefined);
var useSidebar = function () {
    var context = (0, react_1.useContext)(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};
exports.useSidebar = useSidebar;
var SidebarProvider = function (_a) {
    var children = _a.children;
    var _b = (0, react_1.useState)(true), isExpanded = _b[0], setIsExpanded = _b[1];
    var _c = (0, react_1.useState)(false), isMobileOpen = _c[0], setIsMobileOpen = _c[1];
    var _d = (0, react_1.useState)(false), isMobile = _d[0], setIsMobile = _d[1];
    var _e = (0, react_1.useState)(false), isHovered = _e[0], setIsHovered = _e[1];
    var _f = (0, react_1.useState)(null), activeItem = _f[0], setActiveItem = _f[1];
    var _g = (0, react_1.useState)(null), openSubmenu = _g[0], setOpenSubmenu = _g[1];
    (0, react_1.useEffect)(function () {
        var handleResize = function () {
            var mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setIsMobileOpen(false);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return function () {
            window.removeEventListener("resize", handleResize);
        };
    }, []);
    var toggleSidebar = function () {
        setIsExpanded(function (prev) { return !prev; });
    };
    var toggleMobileSidebar = function () {
        setIsMobileOpen(function (prev) { return !prev; });
    };
    var toggleSubmenu = function (item) {
        setOpenSubmenu(function (prev) { return (prev === item ? null : item); });
    };
    return ((0, jsx_runtime_1.jsx)(SidebarContext.Provider, { value: {
            isExpanded: isMobile ? false : isExpanded,
            isMobileOpen: isMobileOpen,
            isHovered: isHovered,
            activeItem: activeItem,
            openSubmenu: openSubmenu,
            toggleSidebar: toggleSidebar,
            toggleMobileSidebar: toggleMobileSidebar,
            setIsHovered: setIsHovered,
            setActiveItem: setActiveItem,
            toggleSubmenu: toggleSubmenu,
        }, children: children }));
};
exports.SidebarProvider = SidebarProvider;
