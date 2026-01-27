import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase"; // ✅ ใช้ auth ตัวเดียวกับ AuthContext
function mapAuthError(err) {
    // รองรับ Firebase error ที่มี code
    const anyErr = err;
    const code = anyErr?.code;
    const msg = anyErr?.message ||
        (typeof err === "string" ? err : "") ||
        "ล็อกอินไม่สำเร็จ";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        return "Email หรือ Password ไม่ถูกต้อง";
    }
    if (code === "auth/user-not-found") {
        return "ไม่พบบัญชีผู้ใช้นี้";
    }
    if (code === "auth/too-many-requests") {
        return "ลองใหม่อีกครั้งภายหลัง (พยายามล็อกอินหลายครั้งเกินไป)";
    }
    // เผื่อบางที message เป็น auth/...
    if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) {
        return "Email หรือ Password ไม่ถูกต้อง";
    }
    if (msg.includes("auth/user-not-found"))
        return "ไม่พบบัญชีผู้ใช้นี้";
    if (msg.includes("auth/too-many-requests"))
        return "ลองใหม่อีกครั้งภายหลัง";
    // errors ที่เราสร้างเอง
    if (msg === "FIREBASE_NOT_SIGNED_IN") {
        return "ระบบไม่ได้ sign-in Firebase จริง (มีโค้ด/ไฟล์เก่าทับ หรือ auth ถูกสร้างคนละตัว)";
    }
    if (msg === "FIREBASE_EMAIL_MISMATCH") {
        return "Firebase session ไม่ตรงกับอีเมลที่กรอก (มี session เก่าคาอยู่)";
    }
    return msg;
}
export default function SignInForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // ✅ กันคนล็อกอินแล้วกลับมา /signin
    useEffect(() => {
        if (!authLoading && user)
            navigate("/", { replace: true });
    }, [user, authLoading, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const emailTrim = email.trim();
        const passRaw = password; // ❌ อย่า trim password
        if (!emailTrim || !passRaw) {
            setError("กรุณากรอก Email และ Password ให้ครบ");
            return;
        }
        try {
            setLoading(true);
            // Debug ให้เห็นชัด
            console.log("[SignIn] submit", { email: emailTrim, hasPwd: passRaw.length > 0 });
            console.log("[SignIn] BEFORE login currentUser =", auth.currentUser?.email ?? "(none)");
            // ✅ ต้องเป็น Firebase sign-in ของจริง ถ้ารหัสมั่วต้อง throw
            await login(emailTrim, passRaw, remember);
            // ✅ จุดสำคัญ: ถ้า Firebase ไม่ได้ sign-in จริง → ห้ามไปต่อ
            const cu = auth.currentUser;
            console.log("[SignIn] AFTER login currentUser =", cu?.email ?? "(none)");
            if (!cu)
                throw new Error("FIREBASE_NOT_SIGNED_IN");
            if (cu.email && cu.email !== emailTrim)
                throw new Error("FIREBASE_EMAIL_MISMATCH");
            // ✅ ไปหน้าที่ตั้งใจจะไป
            const state = location.state;
            const from = state?.from?.pathname;
            const target = from && from !== "/signin" && from !== "/signup" && from !== "/reset-password"
                ? from
                : "/";
            navigate(target, { replace: true });
        }
        catch (err) {
            console.error("[SignIn] error:", err);
            setError(mapAuthError(err));
        }
        finally {
            setLoading(false);
        }
    };
    const inputBlackBorder = "border border-gray-900 bg-transparent focus:border-black focus:ring-0 focus:outline-none " +
        "dark:border-gray-200 dark:focus:border-white";
    return (_jsx("div", { className: "flex h-full w-full items-center justify-center px-6 sm:px-10", children: _jsxs("div", { className: "w-full max-w-md xl:max-w-lg 2xl:max-w-2xl", children: [_jsx("h1", { className: "font-bold text-gray-900 dark:text-white leading-tight", children: _jsx("span", { className: "block text-3xl xl:text-4xl 2xl:text-5xl", children: "Smart HR" }) }), _jsx("p", { className: "mt-5 text-gray-600 dark:text-gray-300 text-base xl:text-lg 2xl:text-xl", children: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19" }), error && (_jsx("div", { className: "mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "mt-10 space-y-6 2xl:space-y-7", children: [_jsxs("div", { children: [_jsx("div", { className: "text-base xl:text-lg 2xl:text-xl", children: _jsxs(Label, { children: ["Email ", _jsx("span", { className: "text-red-500", children: "*" })] }) }), _jsx("div", { className: "mt-2", children: _jsx(Input, { type: "email", placeholder: "Enter your email", value: email, onChange: (e) => setEmail(e.target.value), className: inputBlackBorder }) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-base xl:text-lg 2xl:text-xl", children: _jsxs(Label, { children: ["Password ", _jsx("span", { className: "text-red-500", children: "*" })] }) }), _jsxs("div", { className: "relative mt-2", children: [_jsx(Input, { type: showPassword ? "text" : "password", placeholder: "Enter your password", value: password, onChange: (e) => setPassword(e.target.value), className: inputBlackBorder }), _jsx("button", { type: "button", onClick: () => setShowPassword((s) => !s), className: "absolute -translate-y-1/2 right-4 top-1/2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white", "aria-label": showPassword ? "Hide password" : "Show password", children: showPassword ? (_jsx(EyeIcon, { className: "w-5 h-5 xl:w-6 xl:h-6" })) : (_jsx(EyeCloseIcon, { className: "w-5 h-5 xl:w-6 xl:h-6" })) })] })] }), _jsx("div", { className: "flex items-center", children: _jsxs("label", { className: "flex items-center gap-3 text-sm xl:text-base 2xl:text-lg text-gray-700 dark:text-gray-300", children: [_jsx(Checkbox, { id: "keep-logged-in", checked: remember, onChange: () => setRemember((v) => !v), className: "border border-gray-900 dark:border-gray-200 focus:ring-0" }), "Keep me logged in"] }) }), _jsx("div", { className: "pt-2", children: _jsx("button", { type: "submit", disabled: loading || authLoading, className: "w-full rounded-lg bg-green-600 px-4 py-3 text-base font-medium text-white hover:bg-green-700 disabled:opacity-60 xl:py-4 xl:text-lg 2xl:text-xl", children: loading ? "Signing in..." : "Sign in" }) }), _jsxs("div", { className: "pt-2 text-center text-xs xl:text-sm text-gray-500 dark:text-gray-400", children: ["\u00A9 ", new Date().getFullYear(), " Smart HR PEA ENCOM SMART SOLUTION CO., LTD."] })] })] }) }));
}
