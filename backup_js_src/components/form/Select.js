"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var Select = function (_a) {
    var options = _a.options, _b = _a.placeholder, placeholder = _b === void 0 ? "Select an option" : _b, onChange = _a.onChange, _c = _a.className, className = _c === void 0 ? "" : _c, _d = _a.defaultValue, defaultValue = _d === void 0 ? "" : _d;
    // Manage the selected value
    var _e = (0, react_1.useState)(defaultValue), selectedValue = _e[0], setSelectedValue = _e[1];
    var handleChange = function (e) {
        var value = e.target.value;
        setSelectedValue(value);
        onChange(value); // Trigger parent handler
    };
    return ((0, jsx_runtime_1.jsxs)("select", { className: "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ".concat(selectedValue
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-400", " ").concat(className), value: selectedValue, onChange: handleChange, children: [(0, jsx_runtime_1.jsx)("option", { value: "", disabled: true, className: "text-gray-700 dark:bg-gray-900 dark:text-gray-400", children: placeholder }), options.map(function (option) { return ((0, jsx_runtime_1.jsx)("option", { value: option.value, className: "text-gray-700 dark:bg-gray-900 dark:text-gray-400", children: option.label }, option.value)); })] }));
};
exports.default = Select;
