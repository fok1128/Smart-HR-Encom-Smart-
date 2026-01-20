"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var Button = function (_a) {
    var children = _a.children, _b = _a.size, size = _b === void 0 ? "md" : _b, _c = _a.variant, variant = _c === void 0 ? "primary" : _c, startIcon = _a.startIcon, endIcon = _a.endIcon, onClick = _a.onClick, _d = _a.className, className = _d === void 0 ? "" : _d, _e = _a.disabled, disabled = _e === void 0 ? false : _e, _f = _a.type, type = _f === void 0 ? "button" : _f;
    var sizeClasses = {
        sm: "px-4 py-3 text-sm",
        md: "px-5 py-3.5 text-sm",
    };
    var variantClasses = {
        primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
        outline: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    };
    return ((0, jsx_runtime_1.jsxs)("button", { type: type, className: "inline-flex items-center justify-center gap-2 rounded-lg transition ".concat(className, " ").concat(sizeClasses[size], " ").concat(variantClasses[variant], " ").concat(disabled ? "cursor-not-allowed opacity-50" : ""), onClick: onClick, disabled: disabled, children: [startIcon && (0, jsx_runtime_1.jsx)("span", { className: "flex items-center", children: startIcon }), children, endIcon && (0, jsx_runtime_1.jsx)("span", { className: "flex items-center", children: endIcon })] }));
};
exports.default = Button;
