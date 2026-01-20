"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropdownItem = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_router_dom_1 = require("react-router-dom");
var DropdownItem = function (_a) {
    var _b = _a.tag, tag = _b === void 0 ? "button" : _b, to = _a.to, onClick = _a.onClick, onItemClick = _a.onItemClick, _c = _a.baseClassName, baseClassName = _c === void 0 ? "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" : _c, _d = _a.className, className = _d === void 0 ? "" : _d, children = _a.children;
    var combinedClasses = "".concat(baseClassName, " ").concat(className).trim();
    var handleClick = function (event) {
        if (tag === "button") {
            event.preventDefault();
        }
        if (onClick)
            onClick();
        if (onItemClick)
            onItemClick();
    };
    if (tag === "a" && to) {
        return ((0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: to, className: combinedClasses, onClick: handleClick, children: children }));
    }
    return ((0, jsx_runtime_1.jsx)("button", { onClick: handleClick, className: combinedClasses, children: children }));
};
exports.DropdownItem = DropdownItem;
