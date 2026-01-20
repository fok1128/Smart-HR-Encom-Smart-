import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type User = {
  fname: string;
  lname: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (user: User, remember: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 นาที
const LOCAL_KEY = "demoSession"; // remember me
const TEMP_KEY = "demoSession_temp"; // ไม่ remember (session)

function safeParseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearAllSessionKeys() {
  // ✅ เคลียร์ให้หมด กัน build เก่า/ใหม่ค้าง key คนละชื่อ
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem(TEMP_KEY);
  sessionStorage.removeItem(LOCAL_KEY);
  sessionStorage.removeItem(TEMP_KEY);
}

function loadInitialUser(): User | null {
  if (typeof window === "undefined") return null;

  // ✅ priority: localStorage ก่อน แล้วค่อย sessionStorage
  const fromLocal = safeParseUser(localStorage.getItem(LOCAL_KEY));
  if (fromLocal) return fromLocal;

  const fromSession = safeParseUser(sessionStorage.getItem(TEMP_KEY));
  if (fromSession) return fromSession;

  // ถ้าอ่านไม่ได้/พัง เคลียร์ทิ้ง
  clearAllSessionKeys();
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const timeoutRef = useRef<number | null>(null);

  // ✅ โหลด session ครั้งแรก
  useEffect(() => {
    const initialUser = loadInitialUser();
    setUser(initialUser);
    setLastActivity(initialUser ? Date.now() : null);
    setLoading(false);
  }, []);

  const login = (newUser: User, remember: boolean) => {
    const now = Date.now();
    setUser(newUser);
    setLastActivity(now);

    if (remember) {
      // ✅ remember = localStorage
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newUser));
      sessionStorage.removeItem(TEMP_KEY);
    } else {
      // ✅ ไม่ remember = sessionStorage
      sessionStorage.setItem(TEMP_KEY, JSON.stringify(newUser));
      localStorage.removeItem(LOCAL_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    setLastActivity(null);

    // ✅ เคลียร์ session ทั้งหมด
    clearAllSessionKeys();

    // ✅ เคลียร์ timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // ✅ จับ activity
  useEffect(() => {
    if (!user) return;

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

  // ✅ ตั้ง timer auto logout
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

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(logout, remaining);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, lastActivity]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
