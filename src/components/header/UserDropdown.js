import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
export default function UserDropdown() {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const handleSignOut = () => {
        logout();
        setOpen(false);
        navigate("/signin", { replace: true });
    };
    // ปิด dropdown เมื่อคลิกข้างนอก + ตอนกด Esc
    useEffect(() => {
        const onClickOutside = (e) => {
            if (!menuRef.current)
                return;
            if (!menuRef.current.contains(e.target))
                setOpen(false);
        };
        const onEsc = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onClickOutside);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);
    if (!user)
        return null;
    // ✅ ใช้ u แทน user เพื่อให้ TS ไม่ error เรื่อง property ไม่อยู่ใน type
    const u = user;
    const fullName = (u.displayName ??
        u.name ??
        `${u.fname ?? ""} ${u.lname ?? ""}`.trim()) ||
        u.email ||
        "User";
    const email = u.email ?? "";
    // ถ้าคุณมีรูปจริงค่อยผูกทีหลัง (ตอนนี้ fallback ไว้ให้สวยขึ้น)
    const avatarUrl = u.avatarUrl ?? "";
    const initials = fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "U";
    return (_jsxs("div", { className: "relative", ref: menuRef, children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), className: `flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${open
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"}`, "aria-haspopup": "menu", "aria-expanded": open, children: [avatarUrl ? (_jsx("img", { src: avatarUrl, alt: fullName, className: "h-10 w-10 rounded-full object-cover" })) : (_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200", children: initials })), _jsxs("div", { className: "hidden text-left sm:block", children: [_jsx("div", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: fullName }), _jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: email })] }), _jsx("svg", { className: `h-4 w-4 text-gray-500 transition-transform dark:text-gray-400 ${open ? "rotate-180" : ""}`, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z", clipRule: "evenodd" }) })] }), open && (_jsxs("div", { className: "absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900", children: [_jsxs("div", { className: "px-4 py-3", children: [_jsx("div", { className: "text-base font-semibold text-gray-900 dark:text-gray-100", children: fullName }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: email })] }), _jsx("div", { className: "h-px bg-gray-200 dark:bg-gray-800" }), _jsxs("div", { className: "p-2", children: [_jsxs(Link, { to: "/profile", onClick: () => setOpen(false), className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800", children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M20 21a8 8 0 1 0-16 0", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }), "Edit profile"] }), _jsxs("button", { type: "button", className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800", children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1l-.4-2.7H9.1l-.4 2.7a8 8 0 0 0-1.7 1l-2.5-1-2 3.4 2.1 1.6a7.97 7.97 0 0 0-.1 1 7.97 7.97 0 0 0 .1 1L2.5 16.6l2 3.4 2.5-1a8 8 0 0 0 1.7 1l.4 2.7h5.8l.4-2.7a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2.1-1.6Z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }), "Account settings"] }), _jsxs("button", { type: "button", className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800", children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M12 16v-4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M12 8h.01", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }), "Support"] })] }), _jsx("div", { className: "h-px bg-gray-200 dark:bg-gray-800" }), _jsx("div", { className: "p-2", children: _jsxs("button", { type: "button", onClick: handleSignOut, className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800", children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M10 17l5-5-5-5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M15 12H3", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M21 3v18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }), "Sign out"] }) })] }))] }));
}
