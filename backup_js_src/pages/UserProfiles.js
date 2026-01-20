"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserProfiles;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../components/common/PageBreadCrumb");
var UserMetaCard_1 = require("../components/UserProfile/UserMetaCard");
var UserInfoCard_1 = require("../components/UserProfile/UserInfoCard");
var UserAddressCard_1 = require("../components/UserProfile/UserAddressCard");
var PageMeta_1 = require("../components/common/PageMeta");
function UserProfiles() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Profile" }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7", children: "Profile" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)(UserMetaCard_1.default, {}), (0, jsx_runtime_1.jsx)(UserInfoCard_1.default, {}), (0, jsx_runtime_1.jsx)(UserAddressCard_1.default, {})] })] })] }));
}
