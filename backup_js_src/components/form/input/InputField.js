"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var Input = function (_a) {
    var _b = _a.type, type = _b === void 0 ? "text" : _b, id = _a.id, name = _a.name, placeholder = _a.placeholder, value = _a.value, onChange = _a.onChange, _c = _a.className, className = _c === void 0 ? "" : _c, min = _a.min, max = _a.max, step = _a.step, _d = _a.disabled, disabled = _d === void 0 ? false : _d, _e = _a.success, success = _e === void 0 ? false : _e, _f = _a.error, error = _f === void 0 ? false : _f, hint = _a.hint;
    var inputClasses = " h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ".concat(className);
    if (disabled) {
        inputClasses += " text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 opacity-40";
    }
    else if (error) {
        inputClasses += "  border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800";
    }
    else if (success) {
        inputClasses += "  border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800";
    }
    else {
        inputClasses += " bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800";
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("input", { type: type, id: id, name: name, placeholder: placeholder, value: value, onChange: onChange, min: min, max: max, step: step, disabled: disabled, className: inputClasses }), hint && ((0, jsx_runtime_1.jsx)("p", { className: "mt-1.5 text-xs ".concat(error
                    ? "text-error-500"
                    : success
                        ? "text-success-500"
                        : "text-gray-500"), children: hint }))] }));
};
exports.default = Input;
