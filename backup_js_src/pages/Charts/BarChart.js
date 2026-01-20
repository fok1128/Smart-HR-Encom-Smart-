"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BarChart;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../../components/common/PageBreadCrumb");
var ComponentCard_1 = require("../../components/common/ComponentCard");
var BarChartOne_1 = require("../../components/charts/bar/BarChartOne");
var PageMeta_1 = require("../../components/common/PageMeta");
function BarChart() {
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Chart Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Chart Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Bar Chart" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-6", children: (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Bar Chart 1", children: (0, jsx_runtime_1.jsx)(BarChartOne_1.default, {}) }) })] }));
}
