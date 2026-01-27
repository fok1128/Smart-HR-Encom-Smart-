import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState, } from "react";
import { auth } from "../firebase";
import { browserLocalPersistence, browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut, } from "firebase/auth";
const AuthContext = createContext(undefined);
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
// ✅ map ข้อมูลจาก backend ให้เป็นรูปเดียวกับที่ UI อ่านง่าย
function normalizeMe(raw) {
    const fname = raw.employee?.fname ?? raw.user?.fname;
    const lname = raw.employee?.lname ?? raw.user?.lname;
    const position = raw.employee?.position;
    const avatarUrl = raw.employee?.avatarUrl ?? raw.user?.avatarUrl;
    return {
        ...raw,
        fname,
        lname,
        position,
        avatarUrl,
    };
}
async function fetchMe(idToken) {
    const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const msg = data?.error || `ME_${res.status}`;
        throw new Error(msg);
    }
    return normalizeMe(data);
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            setLoading(true);
            try {
                if (!fbUser) {
                    setUser(null);
                    return;
                }
                const token = await fbUser.getIdToken();
                const me = await fetchMe(token);
                setUser(me);
            }
            catch (e) {
                console.error("Auth bootstrap error:", e);
                setUser(null);
            }
            finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);
    const login = async (email, password, remember) => {
        setLoading(true);
        try {
            await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
            try {
                await signOut(auth);
            }
            catch {
                // ignore
            }
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const fbEmail = cred.user?.email ?? auth.currentUser?.email ?? null;
            if (!fbEmail) {
                throw new Error("FIREBASE_NO_CURRENT_USER");
            }
            const token = await cred.user.getIdToken();
            const me = await fetchMe(token);
            setUser(me);
            return me;
        }
        finally {
            setLoading(false);
        }
    };
    const logout = async () => {
        setLoading(true);
        try {
            await signOut(auth);
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    };
    const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
