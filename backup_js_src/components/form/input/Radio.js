"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var Radio = function (_a) {
    var id = _a.id, name = _a.name, value = _a.value, checked = _a.checked, label = _a.label, onChange = _a.onChange, _b = _a.className, className = _b === void 0 ? "" : _b, _c = _a.disabled, disabled = _c === void 0 ? false : _c;
    return ((0, jsx_runtime_1.jsxs)("label", { htmlFor: id, className: "relative flex cursor-pointer  select-none items-center gap-3 text-sm font-medium ".concat(disabled
            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            : "text-gray-700 dark:text-gray-400", " ").concat(className), children: [(0, jsx_runtime_1.jsx)("input", { id: id, name: name, type: "radio", value: value, checked: checked, onChange: function () { return !disabled && onChange(value); }, className: "sr-only", disabled: disabled }), (0, jsx_runtime_1.jsx)("span", { className: "flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] ".concat(checked
                    ? "border-brand-500 bg-brand-500"
                    : "bg-transparent border-gray-300 dark:border-gray-700", " ").concat(disabled
                    ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-700"
                    : ""), children: (0, jsx_runtime_1.jsx)("span", { className: "h-2 w-2 rounded-full bg-white ".concat(checked ? "block" : "hidden") }) }), label] }));
};
exports.default = Radio;
