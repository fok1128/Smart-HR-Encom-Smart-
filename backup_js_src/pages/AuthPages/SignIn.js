"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignIn;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageMeta_1 = require("../../components/common/PageMeta");
var AuthPageLayout_1 = require("./AuthPageLayout");
var SignInForm_1 = require("../../components/auth/SignInForm");
function SignIn() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "Smart HR @PEA ENCOM SMART", description: "This is React.js SignIn Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(AuthPageLayout_1.default, { children: (0, jsx_runtime_1.jsx)(SignInForm_1.default, {}) })] }));
}
