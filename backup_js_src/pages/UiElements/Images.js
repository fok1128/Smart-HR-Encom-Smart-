"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Images;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../../components/common/PageBreadCrumb");
var ResponsiveImage_1 = require("../../components/ui/images/ResponsiveImage");
var TwoColumnImageGrid_1 = require("../../components/ui/images/TwoColumnImageGrid");
var ThreeColumnImageGrid_1 = require("../../components/ui/images/ThreeColumnImageGrid");
var ComponentCard_1 = require("../../components/common/ComponentCard");
var PageMeta_1 = require("../../components/common/PageMeta");
function Images() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Images Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Images page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Images" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-5 sm:space-y-6", children: [(0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Responsive image", children: (0, jsx_runtime_1.jsx)(ResponsiveImage_1.default, {}) }), (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Image in 2 Grid", children: (0, jsx_runtime_1.jsx)(TwoColumnImageGrid_1.default, {}) }), (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Image in 3 Grid", children: (0, jsx_runtime_1.jsx)(ThreeColumnImageGrid_1.default, {}) })] })] }));
}
