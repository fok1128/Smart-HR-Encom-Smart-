"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var jsx_runtime_1 = require("react/jsx-runtime");
var EcommerceMetrics_1 = require("../../components/ecommerce/EcommerceMetrics");
var MonthlySalesChart_1 = require("../../components/ecommerce/MonthlySalesChart");
var StatisticsChart_1 = require("../../components/ecommerce/StatisticsChart");
var MonthlyTarget_1 = require("../../components/ecommerce/MonthlyTarget");
var RecentOrders_1 = require("../../components/ecommerce/RecentOrders");
var DemographicCard_1 = require("../../components/ecommerce/DemographicCard");
var PageMeta_1 = require("../../components/common/PageMeta");
function Home() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-12 gap-4 md:gap-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "col-span-12 space-y-6 xl:col-span-7", children: [(0, jsx_runtime_1.jsx)(EcommerceMetrics_1.default, {}), (0, jsx_runtime_1.jsx)(MonthlySalesChart_1.default, {})] }), (0, jsx_runtime_1.jsx)("div", { className: "col-span-12 xl:col-span-5", children: (0, jsx_runtime_1.jsx)(MonthlyTarget_1.default, {}) }), (0, jsx_runtime_1.jsx)("div", { className: "col-span-12", children: (0, jsx_runtime_1.jsx)(StatisticsChart_1.default, {}) }), (0, jsx_runtime_1.jsx)("div", { className: "col-span-12 xl:col-span-5", children: (0, jsx_runtime_1.jsx)(DemographicCard_1.default, {}) }), (0, jsx_runtime_1.jsx)("div", { className: "col-span-12 xl:col-span-7", children: (0, jsx_runtime_1.jsx)(RecentOrders_1.default, {}) })] })] }));
}
