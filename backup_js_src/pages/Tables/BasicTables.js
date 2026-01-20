"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BasicTables;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../../components/common/PageBreadCrumb");
var ComponentCard_1 = require("../../components/common/ComponentCard");
var PageMeta_1 = require("../../components/common/PageMeta");
var BasicTableOne_1 = require("../../components/tables/BasicTables/BasicTableOne");
function BasicTables() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Basic Tables" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-6", children: (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Basic Table 1", children: (0, jsx_runtime_1.jsx)(BasicTableOne_1.default, {}) }) })] }));
}
