"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var TextArea = function (_a) {
    var _b = _a.placeholder, placeholder = _b === void 0 ? "Enter your message" : _b, // Default placeholder
    _c = _a.rows, // Default placeholder
    rows = _c === void 0 ? 3 : _c, // Default number of rows
    _d = _a.value, // Default number of rows
    value = _d === void 0 ? "" : _d, // Default value
    onChange = _a.onChange, // Callback for changes
    _e = _a.className, // Callback for changes
    className = _e === void 0 ? "" : _e, // Additional custom styles
    _f = _a.disabled, // Additional custom styles
    disabled = _f === void 0 ? false : _f, // Disabled state
    _g = _a.error, // Disabled state
    error = _g === void 0 ? false : _g, // Error state
    _h = _a.hint, // Error state
    hint = _h === void 0 ? "" : _h;
    var handleChange = function (e) {
        if (onChange) {
            onChange(e.target.value);
        }
    };
    var textareaClasses = "w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden ".concat(className, " ");
    if (disabled) {
        textareaClasses += " bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed opacity40 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
    else if (error) {
        textareaClasses += " bg-transparent  border-gray-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-error-800";
    }
    else {
        textareaClasses += " bg-transparent text-gray-900 dark:text-gray-300 text-gray-900 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("textarea", { placeholder: placeholder, rows: rows, value: value, onChange: handleChange, disabled: disabled, className: textareaClasses }), hint && ((0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm ".concat(error ? "text-error-500" : "text-gray-500 dark:text-gray-400"), children: hint }))] }));
};
exports.default = TextArea;
