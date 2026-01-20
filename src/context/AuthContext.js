import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useRef, } from "react";
const AuthContext = createContext(undefined);
const SESSION_TIMEOUT = 30 * 60 * 1000; // ✅ 30 นาทีจริง
const SESSION_KEY = "demoSession";
function loadInitialUser() {
    if (typeof window === "undefined")
        return null;
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored)
        return null;
    try {
        const parsed = JSON.parse(stored);
        if (!parsed?.email) {
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
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [lastActivity, setLastActivity] = useState(null);
    const [loading, setLoading] = useState(true); // ✅ เพิ่ม
    const timeoutRef = useRef(null);
    // ✅ โหลด session ครั้งแรกแบบชัวร์ ๆ
    useEffect(() => {
        const initialUser = loadInitialUser();
        setUser(initialUser);
        setLastActivity(initialUser ? Date.now() : null);
        setLoading(false);
    }, []);
    const login = (newUser, remember) => {
        const now = Date.now();
        setUser(newUser);
        setLastActivity(now);
        if (remember) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        }
        else {
            localStorage.removeItem(SESSION_KEY);
        }
    };
    const logout = () => {
        setUser(null);
        setLastActivity(null);
        localStorage.removeItem(SESSION_KEY);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };
    // จับ activity
    useEffect(() => {
        if (!user)
            return;
        const handleActivity = () => setLastActivity(Date.now());
        window.addEventListener("click", handleActivity);
        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keydown", handleActivity);
        window.addEventListener("scroll", handleActivity);
        window.addEventListener("touchstart", handleActivity);
        return () => {
            window.removeEventListener("click", handleActivity);
            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            window.removeEventListener("scroll", handleActivity);
            window.removeEventListener("touchstart", handleActivity);
        };
    }, [user]);
    // ตั้ง timer auto logout
    useEffect(() => {
        if (!user || lastActivity === null) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            return;
        }
        const now = Date.now();
        const remaining = SESSION_TIMEOUT - (now - lastActivity);
        if (remaining <= 0) {
            logout();
            return;
        }
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(logout, remaining);
        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
        };
    }, [user, lastActivity]);
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, logout }, children: children }));
};
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
