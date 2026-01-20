"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatePicker;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var flatpickr_1 = require("flatpickr");
require("flatpickr/dist/flatpickr.css");
var Label_1 = require("./Label");
var icons_1 = require("../../icons");
function DatePicker(_a) {
    var id = _a.id, mode = _a.mode, onChange = _a.onChange, label = _a.label, defaultDate = _a.defaultDate, placeholder = _a.placeholder;
    (0, react_1.useEffect)(function () {
        var flatPickr = (0, flatpickr_1.default)("#".concat(id), {
            mode: mode || "single",
            static: true,
            monthSelectorType: "static",
            dateFormat: "Y-m-d",
            defaultDate: defaultDate,
            onChange: onChange,
        });
        return function () {
            if (!Array.isArray(flatPickr)) {
                flatPickr.destroy();
            }
        };
    }, [mode, onChange, id, defaultDate]);
    return ((0, jsx_runtime_1.jsxs)("div", { children: [label && (0, jsx_runtime_1.jsx)(Label_1.default, { htmlFor: id, children: label }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("input", { id: id, placeholder: placeholder, className: "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800" }), (0, jsx_runtime_1.jsx)("span", { className: "absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400", children: (0, jsx_runtime_1.jsx)(icons_1.CalenderIcon, { className: "size-6" }) })] })] }));
}
