"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Videos;
var jsx_runtime_1 = require("react/jsx-runtime");
var ComponentCard_1 = require("../../components/common/ComponentCard");
var PageBreadCrumb_1 = require("../../components/common/PageBreadCrumb");
var PageMeta_1 = require("../../components/common/PageMeta");
var FourIsToThree_1 = require("../../components/ui/videos/FourIsToThree");
var OneIsToOne_1 = require("../../components/ui/videos/OneIsToOne");
var SixteenIsToNine_1 = require("../../components/ui/videos/SixteenIsToNine");
var TwentyOneIsToNine_1 = require("../../components/ui/videos/TwentyOneIsToNine");
function Videos() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Videos Tabs | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Videos page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Videos" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-5 sm:space-y-6", children: [(0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Video Ratio 16:9", children: (0, jsx_runtime_1.jsx)(SixteenIsToNine_1.default, {}) }), (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Video Ratio 4:3", children: (0, jsx_runtime_1.jsx)(FourIsToThree_1.default, {}) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-5 sm:space-y-6", children: [(0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Video Ratio 21:9", children: (0, jsx_runtime_1.jsx)(TwentyOneIsToNine_1.default, {}) }), (0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Video Ratio 1:1", children: (0, jsx_runtime_1.jsx)(OneIsToOne_1.default, {}) })] })] })] }));
}
