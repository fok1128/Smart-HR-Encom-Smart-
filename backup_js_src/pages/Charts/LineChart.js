"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LineChart;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../../components/common/PageBreadCrumb");
var ComponentCard_1 = require("../../components/common/ComponentCard");
var LineChartOne_1 = require("../../components/charts/line/LineChartOne");
var PageMeta_1 = require("../../components/common/PageMeta");
function LineChart() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Chart Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Chart Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Line Chart" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-6", children: (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Line Chart 1", children: (0, jsx_runtime_1.jsx)(LineChartOne_1.default, {}) }) })] }));
}
