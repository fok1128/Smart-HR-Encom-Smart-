"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var sizeClasses = {
    xsmall: "h-6 w-6 max-w-6",
    small: "h-8 w-8 max-w-8",
    medium: "h-10 w-10 max-w-10",
    large: "h-12 w-12 max-w-12",
    xlarge: "h-14 w-14 max-w-14",
    xxlarge: "h-16 w-16 max-w-16",
};
var statusSizeClasses = {
    xsmall: "h-1.5 w-1.5 max-w-1.5",
    small: "h-2 w-2 max-w-2",
    medium: "h-2.5 w-2.5 max-w-2.5",
    large: "h-3 w-3 max-w-3",
    xlarge: "h-3.5 w-3.5 max-w-3.5",
    xxlarge: "h-4 w-4 max-w-4",
};
var statusColorClasses = {
    online: "bg-success-500",
    offline: "bg-error-400",
    busy: "bg-warning-500",
};
var Avatar = function (_a) {
    var src = _a.src, _b = _a.alt, alt = _b === void 0 ? "User Avatar" : _b, _c = _a.size, size = _c === void 0 ? "medium" : _c, _d = _a.status, status = _d === void 0 ? "none" : _d;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative  rounded-full ".concat(sizeClasses[size]), children: [(0, jsx_runtime_1.jsx)("img", { src: src, alt: alt, className: "object-cover rounded-full" }), status !== "none" && ((0, jsx_runtime_1.jsx)("span", { className: "absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-gray-900 ".concat(statusSizeClasses[size], " ").concat(statusColorClasses[status] || "") }))] }));
};
exports.default = Avatar;
