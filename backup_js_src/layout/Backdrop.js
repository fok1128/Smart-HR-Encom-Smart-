"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var SidebarContext_1 = require("../context/SidebarContext");
var Backdrop = function () {
    var _a = (0, SidebarContext_1.useSidebar)(), isMobileOpen = _a.isMobileOpen, toggleMobileSidebar = _a.toggleMobileSidebar;
    if (!isMobileOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-40 bg-gray-900/50 lg:hidden", onClick: toggleMobileSidebar }));
};
exports.default = Backdrop;
