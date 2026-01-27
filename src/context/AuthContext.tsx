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
} from "firebase/auth";

type MeResponse = {
  ok: boolean;
  uid: string;
  email: string | null;
  role: string;
  user: any; // users/{uid}
  employee: any; // employees/{employeeNo}
  projectId?: string;
};

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function fetchMe(idToken: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error || `ME_${res.status}`;
    throw new Error(msg);
  }
  return data as MeResponse;
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

        const token = await fbUser.getIdToken();
        const me = await fetchMe(token);
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

    // ✅ สำคัญ: เคลียร์ user เก่าก่อนเสมอ
    setUser(null);

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      // ✅ สำคัญ: ถ้ามี session เก่าค้างอยู่ ให้ signOut ก่อน
      if (auth.currentUser) {
        await signOut(auth);
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);

      const token = await cred.user.getIdToken();
      const me = await fetchMe(token);
      setUser(me);
    } catch (e) {
      // ✅ ถ้าล็อกอินพัง ต้องไม่เหลือ user ค้าง
      setUser(null);
      // กัน session แปลก ๆ ค้าง (บางเคส)
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
      throw e;
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
