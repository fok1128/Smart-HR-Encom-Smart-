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

type ApiUser = {
  email?: string | null;
  displayName?: string;
  name?: string;
  fname?: string;
  lname?: string;
  avatarUrl?: string;
};

type Employee = {
  fname?: string;
  lname?: string;
  position?: string;
  avatarUrl?: string;
};

type MeResponseRaw = {
  ok: boolean;
  uid: string;
  email: string | null;
  role: string;
  user?: ApiUser | null;
  employee?: Employee | null;
  projectId?: string;
};

// ✅ ตัวที่ UI ใช้จริง: มี field แบบ "top-level" ให้เรียกได้เลย
export type MeResponse = MeResponseRaw & {
  fname?: string;
  lname?: string;
  position?: string;
  avatarUrl?: string;
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

// ✅ map ข้อมูลจาก backend ให้เป็นรูปเดียวกับที่ UI อ่านง่าย
function normalizeMe(raw: MeResponseRaw): MeResponse {
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

      const fbEmail = cred.user?.email ?? auth.currentUser?.email ?? null;
      if (!fbEmail) {
        throw new Error("FIREBASE_NO_CURRENT_USER");
      }

      const token = await cred.user.getIdToken();
      const me = await fetchMe(token);
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
