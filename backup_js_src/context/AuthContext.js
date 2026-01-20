"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.AuthProvider = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var AuthContext = (0, react_1.createContext)(undefined);
var SESSION_TIMEOUT = 30 * 1000; // 30 นาที
var SESSION_KEY = "demoSession";
// อ่าน user จาก localStorage ตอนเริ่มต้น
function loadInitialUser() {
    if (typeof window === "undefined")
        return null;
    var stored = localStorage.getItem(SESSION_KEY);
    if (!stored)
        return null;
    try {
        var parsed = JSON.parse(stored);
        if (!(parsed === null || parsed === void 0 ? void 0 : parsed.email)) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return parsed;
    }
    catch (e) {
        console.error("Failed to parse session user", e);
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}
var AuthProvider = function (_a) {
    var children = _a.children;
    var initialUser = loadInitialUser();
    // ถ้าเคยติ๊ก keep me → initialUser จะไม่ null ตอนเปิดเว็บ
    var _b = (0, react_1.useState)(initialUser), user = _b[0], setUser = _b[1];
    var _c = (0, react_1.useState)(initialUser ? Date.now() : null), lastActivity = _c[0], setLastActivity = _c[1];
    var timeoutRef = (0, react_1.useRef)(null);
    // ========== LOGIN / LOGOUT ==========
    var login = function (newUser, remember) {
        var now = Date.now();
        setUser(newUser);
        setLastActivity(now);
        if (remember) {
            // จำ user ข้ามการปิดหน้า/รีเฟรช
            localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        }
        else {
            // ไม่จำ session
            localStorage.removeItem(SESSION_KEY);
        }
    };
    var logout = function () {
        setUser(null);
        setLastActivity(null);
        // ลบเฉพาะ session ไม่ยุ่งกับบัญชี demoUser
        localStorage.removeItem(SESSION_KEY);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };
    // ========== จับ activity ในหน้าเว็บ ==========
    (0, react_1.useEffect)(function () {
        if (!user)
            return;
        var handleActivity = function () {
            setLastActivity(Date.now());
        };
        window.addEventListener("click", handleActivity);
        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keydown", handleActivity);
        window.addEventListener("scroll", handleActivity);
        window.addEventListener("touchstart", handleActivity);
        return function () {
            window.removeEventListener("click", handleActivity);
            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            window.removeEventListener("scroll", handleActivity);
            window.removeEventListener("touchstart", handleActivity);
        };
    }, [user]);
    // ========== ตั้ง timer auto logout จาก lastActivity (เฉพาะรอบที่เปิดอยู่) ==========
    (0, react_1.useEffect)(function () {
        if (!user || lastActivity === null) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            return;
        }
        var now = Date.now();
        var elapsed = now - lastActivity;
        var remaining = SESSION_TIMEOUT - elapsed;
        if (remaining <= 0) {
            logout();
            return;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(function () {
            logout();
        }, remaining);
        return function () {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user, lastActivity]);
    return ((0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: { user: user, login: login, logout: logout }, children: children }));
};
exports.AuthProvider = AuthProvider;
var useAuth = function () {
    var ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
};
exports.useAuth = useAuth;
