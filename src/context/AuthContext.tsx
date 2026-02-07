// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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

  // ✅ เพิ่ม
  employeeNo?: string;
  phone?: string;
};

type Employee = {
  fname?: string;
  lname?: string;
  position?: string;
  avatarUrl?: string;

  // ✅ เพิ่ม
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

// ✅ ตัวที่ UI ใช้จริง
export type MeResponse = MeResponseRaw & {
  fname?: string;
  lname?: string;
  position?: string;
  avatarUrl?: string;

  // ✅ เพิ่มให้หน้าอื่นๆ ใช้ได้เลย
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

// ✅ map ข้อมูลจาก backend ให้เป็นรูปเดียวกับที่ UI อ่านง่าย
function normalizeMe(raw: MeResponseRaw): MeResponse {
  const fname = raw.employee?.fname ?? raw.user?.fname;
  const lname = raw.employee?.lname ?? raw.user?.lname;
  const position = raw.employee?.position;
  const avatarUrl = raw.employee?.avatarUrl ?? raw.user?.avatarUrl;

  // ✅ เพิ่ม: employeeNo/phone (พยายามหยิบจาก employee ก่อน)
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      try {
        if (!fbUser) {
          setUser(null);
          return;
        }

        const me = await fetchMeWithClaimsRefresh(fbUser);
        setUser(me);
      } catch (e) {
        console.error("Auth bootstrap error:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login: AuthContextType["login"] = async (email, password, remember) => {
    setLoading(true);
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      try {
        await signOut(auth);
      } catch {
        // ignore
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;

      const fbEmail = fbUser?.email ?? auth.currentUser?.email ?? null;
      if (!fbEmail) throw new Error("FIREBASE_NO_CURRENT_USER");

      const me = await fetchMeWithClaimsRefresh(fbUser);
      setUser(me);
      return me;
    } finally {
      setLoading(false);
    }
  };

  const logout: AuthContextType["logout"] = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
