// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { auth } from "../firebase";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";

type ApiUser = {
  email?: string | null;
  displayName?: string;
  name?: string;
  fname?: string;
  lname?: string;
  avatarUrl?: string;

  employeeNo?: string;
  phone?: string;
};

type Employee = {
  fname?: string;
  lname?: string;
  position?: string;
  avatarUrl?: string;

  employeeNo?: string;
  phone?: string;
};

type ClaimSync = {
  ok?: boolean;
  changed?: boolean;
  role?: string;
};

type MeResponseRaw = {
  ok: boolean;
  uid: string;
  email: string | null;
  role: string;
  user?: ApiUser | null;
  employee?: Employee | null;
  projectId?: string;

  claimSync?: ClaimSync;
};

export type MeResponse = MeResponseRaw & {
  fname?: string;
  lname?: string;
  position?: string;
  avatarUrl?: string;

  employeeNo?: string;
  phone?: string;
};

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<MeResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function normalizeMe(raw: MeResponseRaw): MeResponse {
  const fname = raw.employee?.fname ?? raw.user?.fname;
  const lname = raw.employee?.lname ?? raw.user?.lname;
  const position = raw.employee?.position;
  const avatarUrl = raw.employee?.avatarUrl ?? raw.user?.avatarUrl;

  const employeeNo = pickStr(raw.employee?.employeeNo, raw.user?.employeeNo);
  const phone = pickStr(raw.employee?.phone, raw.user?.phone);

  return {
    ...raw,
    fname,
    lname,
    position,
    avatarUrl,
    employeeNo: employeeNo || undefined,
    phone: phone || undefined,
  };
}

async function fetchMe(idToken: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error || `ME_${res.status}`;
    throw new Error(msg);
  }

  return normalizeMe(data as MeResponseRaw);
}

async function fetchMeWithClaimsRefresh(fbUser: FirebaseUser): Promise<MeResponse> {
  const token1 = await fbUser.getIdToken();
  const me1 = await fetchMe(token1);

  if (me1?.claimSync?.changed) {
    // ✅ บังคับ refresh token เพื่อดึง claim ใหม่
    await fbUser.getIdToken(true);
    const token2 = await fbUser.getIdToken();
    const me2 = await fetchMe(token2);
    return me2;
  }

  return me1;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ ใช้สำหรับให้ login() รอผลจาก onAuthStateChanged()
  const pendingLoginRef = useRef<{
    resolve: (me: MeResponse) => void;
    reject: (e: unknown) => void;
    timer: any;
  } | null>(null);

  const resolvePendingLogin = (me: MeResponse) => {
    const p = pendingLoginRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingLoginRef.current = null;
    p.resolve(me);
  };

  const rejectPendingLogin = (e: unknown) => {
    const p = pendingLoginRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingLoginRef.current = null;
    p.reject(e);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      try {
        if (!fbUser) {
          setUser(null);
          // ถ้ากำลัง login แล้วโดนตัดเป็น null ให้ reject
          rejectPendingLogin(new Error("AUTH_SIGNED_OUT"));
          return;
        }

        // ✅ จุดเดียวที่ยิง /me ตอน auth state เปลี่ยน
        const me = await fetchMeWithClaimsRefresh(fbUser);
        setUser(me);

        // ✅ ถ้า login() กำลังรออยู่ ให้ตอบกลับตรงนี้ (โดยไม่ยิง /me ซ้ำ)
        resolvePendingLogin(me);
      } catch (e) {
        console.error("Auth bootstrap error:", e);
        setUser(null);
        rejectPendingLogin(e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ เมื่อมีการอัปเดตโปรไฟล์ (phone/avatar) ให้ refetch /me เพื่อให้ทั้งเว็บอัปเดตทันที
  useEffect(() => {
    const onUpdated = async () => {
      const fbUser = auth.currentUser;
      if (!fbUser) return;
      try {
        setLoading(true);
        const me = await fetchMeWithClaimsRefresh(fbUser);
        setUser(me);
      } catch (e) {
        console.error("Auth refresh after profile-updated error:", e);
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener("profile-updated", onUpdated);
    return () => window.removeEventListener("profile-updated", onUpdated);
  }, []);

  const login: AuthContextType["login"] = async (email, password, remember) => {
    setLoading(true);

    // กันกด login ซ้ำ ๆ
    if (pendingLoginRef.current) {
      throw new Error("LOGIN_IN_PROGRESS");
    }

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      // ❗️ไม่จำเป็นต้อง signOut ก่อน signIn (มันทำให้ state กระตุก/ยิง event เพิ่ม)
      // ถ้าอยากคงไว้จริง ๆ ก็ทำได้ แต่จะเสี่ยงเกิด state change เพิ่ม
      // try { await signOut(auth); } catch {}

      // ✅ สร้าง promise รอ onAuthStateChanged() fetch /me แล้วค่อย resolve
      const waitMe = new Promise<MeResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingLoginRef.current = null;
          reject(new Error("LOGIN_TIMEOUT_WAITING_ME"));
        }, 15000); // 15s กันค้าง
        pendingLoginRef.current = { resolve, reject, timer };
      });

      await signInWithEmailAndPassword(auth, email, password);

      // ✅ คืนค่า me จาก onAuthStateChanged (ไม่ยิง /me ซ้ำ)
      return await waitMe;
    } finally {
      setLoading(false);
    }
  };

  const logout: AuthContextType["logout"] = async () => {
    setLoading(true);
    try {
      // ถ้ามี login pending อยู่ ให้ยกเลิก
      rejectPendingLogin(new Error("LOGOUT_DURING_LOGIN"));
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
