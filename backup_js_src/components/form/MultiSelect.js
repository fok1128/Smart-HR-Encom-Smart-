"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var MultiSelect = function (_a) {
    var label = _a.label, options = _a.options, _b = _a.defaultSelected, defaultSelected = _b === void 0 ? [] : _b, value = _a.value, onChange = _a.onChange, _c = _a.disabled, disabled = _c === void 0 ? false : _c, _d = _a.placeholder, placeholder = _d === void 0 ? "Select options" : _d;
    var isControlled = value !== undefined;
    var _e = (0, react_1.useState)(defaultSelected), internalSelected = _e[0], setInternalSelected = _e[1];
    var selectedOptions = isControlled ? value : internalSelected;
    var _f = (0, react_1.useState)(false), isOpen = _f[0], setIsOpen = _f[1];
    var _g = (0, react_1.useState)(-1), focusedIndex = _g[0], setFocusedIndex = _g[1];
    var dropdownRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var handleClickOutside = function (event) {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return function () {
                return document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [isOpen]);
    var updateSelection = function (newSelected) {
        if (!isControlled)
            setInternalSelected(newSelected);
        onChange === null || onChange === void 0 ? void 0 : onChange(newSelected);
    };
    var toggleDropdown = function () {
        if (!disabled) {
            setIsOpen(function (prev) { return !prev; });
            setFocusedIndex(-1);
        }
    };
    var handleSelect = function (optionValue) {
        var newSelected = selectedOptions.includes(optionValue)
            ? selectedOptions.filter(function (v) { return v !== optionValue; })
            : __spreadArray(__spreadArray([], selectedOptions, true), [optionValue], false);
        updateSelection(newSelected);
    };
    var removeOption = function (optionValue) {
        updateSelection(selectedOptions.filter(function (v) { return v !== optionValue; }));
    };
    var handleKeyDown = function (e) {
        if (disabled)
            return;
        e.preventDefault();
        switch (e.key) {
            case "Enter":
                if (!isOpen) {
                    setIsOpen(true);
                }
                else if (focusedIndex >= 0) {
                    handleSelect(options[focusedIndex].value);
                }
                break;
            case "Escape":
                setIsOpen(false);
                break;
            case "ArrowDown":
                if (!isOpen) {
                    setIsOpen(true);
                }
                else {
                    setFocusedIndex(function (prev) { return (prev < options.length - 1 ? prev + 1 : 0); });
                }
                break;
            case "ArrowUp":
                if (isOpen) {
                    setFocusedIndex(function (prev) { return (prev > 0 ? prev - 1 : options.length - 1); });
                }
                break;
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "w-full", ref: dropdownRef, children: [(0, jsx_runtime_1.jsx)("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", id: "".concat(label, "-label"), children: label }), (0, jsx_runtime_1.jsx)("div", { className: "relative z-20 inline-block w-full", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative flex flex-col items-center", children: [(0, jsx_runtime_1.jsx)("div", { onClick: toggleDropdown, onKeyDown: handleKeyDown, className: "w-full", role: "combobox", "aria-expanded": isOpen, "aria-haspopup": "listbox", "aria-labelledby": "".concat(label, "-label"), "aria-disabled": disabled, tabIndex: disabled ? -1 : 0, children: (0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex min-h-11  rounded-lg border border-gray-300 py-1.5 pl-3 pr-3 shadow-theme-xs outline-hidden transition focus:border-brand-300 focus:shadow-focus-ring dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-300 ".concat(disabled
                                    ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
                                    : "cursor-pointer"), children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap flex-auto gap-2", children: selectedOptions.length > 0 ? (selectedOptions.map(function (value) {
                                            var _a;
                                            var text = ((_a = options.find(function (opt) { return opt.value === value; })) === null || _a === void 0 ? void 0 : _a.text) || value;
                                            return ((0, jsx_runtime_1.jsxs)("div", { className: "group flex items-center justify-center rounded-full border-[0.7px] border-transparent bg-gray-100 py-1 pl-2.5 pr-2 text-sm text-gray-800 hover:border-gray-200 dark:bg-gray-800 dark:text-white/90 dark:hover:border-gray-800", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-initial max-w-full", children: text }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: function (e) {
                                                            e.stopPropagation();
                                                            if (!disabled)
                                                                removeOption(value);
                                                        }, disabled: disabled, className: "pl-2 text-gray-500 cursor-pointer group-hover:text-gray-400 dark:text-gray-400 disabled:cursor-not-allowed", "aria-label": "Remove ".concat(text), children: (0, jsx_runtime_1.jsx)("svg", { className: "fill-current", width: "14", height: "14", viewBox: "0 0 14 14", xmlns: "http://www.w3.org/2000/svg", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z" }) }) })] }, value));
                                        })) : ((0, jsx_runtime_1.jsx)("div", { className: "w-full h-full p-1 pr-2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none", children: placeholder })) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center self-start py-1 pl-1 pr-1 w-7", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: function (e) {
                                                e.stopPropagation();
                                                toggleDropdown();
                                            }, disabled: disabled, className: "w-5 h-5 text-gray-700 outline-hidden cursor-pointer focus:outline-hidden dark:text-gray-400 disabled:cursor-not-allowed", children: (0, jsx_runtime_1.jsx)("svg", { className: "stroke-current transition-transform ".concat(isOpen ? "rotate-180" : ""), width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: (0, jsx_runtime_1.jsx)("path", { d: "M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }) })] }) }), isOpen && ((0, jsx_runtime_1.jsx)("div", { className: "absolute left-0 z-40 w-full overflow-y-auto bg-white rounded-lg shadow-sm top-full max-h-select dark:bg-gray-900", onClick: function (e) { return e.stopPropagation(); }, role: "listbox", "aria-label": label, children: options.map(function (option, index) {
                                var isSelected = selectedOptions.includes(option.value);
                                var isFocused = index === focusedIndex;
                                return ((0, jsx_runtime_1.jsx)("div", { className: "hover:bg-primary/5 w-full cursor-pointer rounded-t border-b border-gray-200 dark:border-gray-800 ".concat(isFocused ? "bg-primary/5" : "", " ").concat(isSelected ? "bg-primary/10" : ""), onClick: function () { return handleSelect(option.value); }, role: "option", "aria-selected": isSelected, children: (0, jsx_runtime_1.jsx)("div", { className: "relative flex w-full items-center p-2 pl-2", children: (0, jsx_runtime_1.jsx)("div", { className: "mx-2 leading-6 text-gray-800 dark:text-white/90", children: option.text }) }) }, option.value));
                            }) }))] }) })] }));
};
exports.default = MultiSelect;
