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
  loading: boolean; // ✅ เพิ่ม
  login: (user: User, remember: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000; // ✅ 30 นาทีจริง
const SESSION_KEY = "demoSession";

function loadInitialUser(): User | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as User;
    if (!parsed?.email) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse session user", e);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); // ✅ เพิ่ม

  const timeoutRef = useRef<number | null>(null);

  // ✅ โหลด session ครั้งแรกแบบชัวร์ ๆ
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
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    } else {
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
