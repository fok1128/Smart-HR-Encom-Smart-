"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignUp;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageMeta_1 = require("../../components/common/PageMeta");
var AuthPageLayout_1 = require("./AuthPageLayout");
var SignUpForm_1 = require("../../components/auth/SignUpForm");
function SignUp() {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js SignUp Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js SignUp Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(AuthPageLayout_1.default, { children: (0, jsx_runtime_1.jsx)(SignUpForm_1.default, {}) })] }));
}
