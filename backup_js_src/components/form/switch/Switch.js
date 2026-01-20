"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var Switch = function (_a) {
    var label = _a.label, _b = _a.defaultChecked, defaultChecked = _b === void 0 ? false : _b, _c = _a.disabled, disabled = _c === void 0 ? false : _c, onChange = _a.onChange, _d = _a.color, color = _d === void 0 ? "blue" : _d;
    var _e = (0, react_1.useState)(defaultChecked), isChecked = _e[0], setIsChecked = _e[1];
    var handleToggle = function () {
        if (disabled)
            return;
        var newCheckedState = !isChecked;
        setIsChecked(newCheckedState);
        if (onChange) {
            onChange(newCheckedState);
        }
    };
    var switchColors = color === "blue"
        ? {
            background: isChecked
                ? "bg-brand-500 "
                : "bg-gray-200 dark:bg-white/10", // Blue version
            knob: isChecked
                ? "translate-x-full bg-white"
                : "translate-x-0 bg-white",
        }
        : {
            background: isChecked
                ? "bg-gray-800 dark:bg-white/10"
                : "bg-gray-200 dark:bg-white/10", // Gray version
            knob: isChecked
                ? "translate-x-full bg-white"
                : "translate-x-0 bg-white",
        };
    return ((0, jsx_runtime_1.jsxs)("label", { className: "flex cursor-pointer select-none items-center gap-3 text-sm font-medium ".concat(disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"), onClick: handleToggle, children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "block transition duration-150 ease-linear h-6 w-11 rounded-full ".concat(disabled
                            ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
                            : switchColors.background) }), (0, jsx_runtime_1.jsx)("div", { className: "absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ".concat(switchColors.knob) })] }), label] }));
};
exports.default = Switch;
