import { jsx as _jsx } from "react/jsx-runtime";
import SignInForm from "../../components/auth/SignInForm";
import AuthPageLayout from "./AuthPageLayout";
export default function SignIn() {
    return (_jsx(AuthPageLayout, { children: _jsx(SignInForm, {}) }));
}
