"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Blank;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../components/common/PageBreadCrumb");
var PageMeta_1 = require("../components/common/PageMeta");
function Blank() {
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Blank Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Blank Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Blank Page" }), (0, jsx_runtime_1.jsx)("div", { className: "min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto w-full max-w-[630px] text-center", children: [(0, jsx_runtime_1.jsx)("h3", { className: "mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl", children: "Card Title Here" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500 dark:text-gray-400 sm:text-base", children: "Start putting content on grids or panels, you can also use different combinations of grids.Please check out the dashboard and other pages" })] }) })] }));
}
