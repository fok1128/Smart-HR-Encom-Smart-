import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
export default function SignIn() {
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "Smart HR @PEA ENCOM SMART", description: "This is React.js SignIn Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(AuthLayout, { children: _jsx(SignInForm, {}) })] }));
}
