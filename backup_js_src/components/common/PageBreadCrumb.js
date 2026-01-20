"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_router_dom_1 = require("react-router-dom");
var PageBreadcrumb = function (_a) {
    var pageTitle = _a.pageTitle;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-semibold text-gray-800 dark:text-white/90", "x-text": "pageName", children: pageTitle }), (0, jsx_runtime_1.jsx)("nav", { children: (0, jsx_runtime_1.jsxs)("ol", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { className: "inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400", to: "/", children: ["Home", (0, jsx_runtime_1.jsx)("svg", { className: "stroke-current", width: "17", height: "16", viewBox: "0 0 17 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: (0, jsx_runtime_1.jsx)("path", { d: "M6.0765 12.667L10.2432 8.50033L6.0765 4.33366", stroke: "", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }) })] }) }), (0, jsx_runtime_1.jsx)("li", { className: "text-sm text-gray-800 dark:text-white/90", children: pageTitle })] }) })] }));
};
exports.default = PageBreadcrumb;
