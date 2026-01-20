"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var ComponentCard = function (_a) {
    var title = _a.title, children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b, _c = _a.desc, desc = _c === void 0 ? "" : _c;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ".concat(className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 py-5", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-medium text-gray-800 dark:text-white/90", children: title }), desc && ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: desc }))] }), (0, jsx_runtime_1.jsx)("div", { className: "p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6", children: (0, jsx_runtime_1.jsx)("div", { className: "space-y-6", children: children }) })] }));
};
exports.default = ComponentCard;
