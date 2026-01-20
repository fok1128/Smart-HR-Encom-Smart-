"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var Badge = function (_a) {
    var _b = _a.variant, variant = _b === void 0 ? "light" : _b, _c = _a.color, color = _c === void 0 ? "primary" : _c, _d = _a.size, size = _d === void 0 ? "md" : _d, startIcon = _a.startIcon, endIcon = _a.endIcon, children = _a.children;
    var baseStyles = "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium";
    // Define size styles
    var sizeStyles = {
        sm: "text-theme-xs", // Smaller padding and font size
        md: "text-sm", // Default padding and font size
    };
    // Define color styles for variants
    var variants = {
        light: {
            primary: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
            success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
            error: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
            warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
            info: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500",
            light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
            dark: "bg-gray-500 text-white dark:bg-white/5 dark:text-white",
        },
        solid: {
            primary: "bg-brand-500 text-white dark:text-white",
            success: "bg-success-500 text-white dark:text-white",
            error: "bg-error-500 text-white dark:text-white",
            warning: "bg-warning-500 text-white dark:text-white",
            info: "bg-blue-light-500 text-white dark:text-white",
            light: "bg-gray-400 dark:bg-white/5 text-white dark:text-white/80",
            dark: "bg-gray-700 text-white dark:text-white",
        },
    };
    // Get styles based on size and color variant
    var sizeClass = sizeStyles[size];
    var colorStyles = variants[variant][color];
    return ((0, jsx_runtime_1.jsxs)("span", { className: "".concat(baseStyles, " ").concat(sizeClass, " ").concat(colorStyles), children: [startIcon && (0, jsx_runtime_1.jsx)("span", { className: "mr-1", children: startIcon }), children, endIcon && (0, jsx_runtime_1.jsx)("span", { className: "ml-1", children: endIcon })] }));
};
exports.default = Badge;
