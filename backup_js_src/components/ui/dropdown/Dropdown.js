"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dropdown = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var Dropdown = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b;
    var dropdownRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var handleClickOutside = function (event) {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !event.target.closest(".dropdown-toggle")) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return function () {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { ref: dropdownRef, className: "absolute z-40  right-0 mt-2  rounded-xl border border-gray-200 bg-white  shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ".concat(className), children: children }));
};
exports.Dropdown = Dropdown;
