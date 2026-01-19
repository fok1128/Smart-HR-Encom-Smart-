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
  login: (user: User, remember: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 1000; // 30 นาที
const SESSION_KEY = "demoSession";

// อ่าน user จาก localStorage ตอนเริ่มต้น
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
  const initialUser = loadInitialUser();

  // ถ้าเคยติ๊ก keep me → initialUser จะไม่ null ตอนเปิดเว็บ
  const [user, setUser] = useState<User | null>(initialUser);
  const [lastActivity, setLastActivity] = useState<number | null>(
    initialUser ? Date.now() : null
  );

  const timeoutRef = useRef<number | null>(null);

  // ========== LOGIN / LOGOUT ==========

  const login = (newUser: User, remember: boolean) => {
    const now = Date.now();
    setUser(newUser);
    setLastActivity(now);

    if (remember) {
      // จำ user ข้ามการปิดหน้า/รีเฟรช
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    } else {
      // ไม่จำ session
      localStorage.removeItem(SESSION_KEY);
    }
  };

  const logout = () => {
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

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

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

  // ========== ตั้ง timer auto logout จาก lastActivity (เฉพาะรอบที่เปิดอยู่) ==========

  useEffect(() => {
    if (!user || lastActivity === null) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const now = Date.now();
    const elapsed = now - lastActivity;
    const remaining = SESSION_TIMEOUT - elapsed;

    if (remaining <= 0) {
      logout();
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      logout();
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, lastActivity]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
