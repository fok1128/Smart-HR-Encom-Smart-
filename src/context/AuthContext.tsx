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

type ApiAvatar =
  | string
  | { url?: string; storagePath?: string; path?: string; key?: string }
  | null;

type ApiUser = {
  email?: string | null;
  displayName?: string;
  name?: string;
  fname?: string;
  lname?: string;

  avatarUrl?: string;
  avatarPath?: string;
  storagePath?: string;
  avatar?: ApiAvatar;

  employeeNo?: string;
  phone?: string;
};

type Employee = {
  fname?: string;
  lname?: string;
  position?: string;

  avatarUrl?: string;
  avatarPath?: string;
  storagePath?: string;
  avatar?: ApiAvatar;

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

  // ✅ backend /me ส่งมา
  lineUserId?: string | null;

  avatarUrl?: string;
  avatarPath?: string;
  storagePath?: string;
  avatar?: { url?: string; storagePath?: string; path?: string } | null;
};

export type MeResponse = MeResponseRaw & {
  fname?: string;
  lname?: string;
  position?: string;

  avatarUrl?: string;
  avatarPath?: string;
  storagePath?: string;
  avatar?: { url?: string; storagePath?: string; path?: string };

  employeeNo?: string;
  phone?: string;

  _lite?: boolean;
};

type AuthContextType = {
  user: MeResponse | null;

  /** loading = bootstrap firebase auth / login/logout (ไม่รอ /me) */
  loading: boolean;

  /** roleReady = ได้ /me แล้ว (ข้อมูลจริงพร้อม รวมถึง lineUserId) */
  roleReady: boolean;

  login: (email: string, password: string, remember: boolean) => Promise<MeResponse>;
  logout: () => Promise<void>;

  /** ✅ เรียก refresh /me แบบ manual (ใช้หลังเชื่อม LINE สำเร็จ) */
  refreshMe: () => Promise<MeResponse | null>;
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

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(String(s || "").trim());
}

function normalizeAvatarObj(
  a: any
): { url?: string; storagePath?: string; path?: string } | undefined {
  if (!a) return undefined;

  if (typeof a === "string") {
    const s = a.trim();
    if (!s) return undefined;
    if (isHttpUrl(s)) return { url: s };
    return { storagePath: s, path: s };
  }

  if (typeof a === "object") {
    const url = pickStr(a.url);
    const sp = pickStr(a.storagePath, a.path, a.key);
    const path = pickStr(a.path, a.key, a.storagePath);
    if (!url && !sp && !path) return undefined;
    return {
      url: url || undefined,
      storagePath: sp || undefined,
      path: path || undefined,
    };
  }

  return undefined;
}

function normalizeMe(raw: MeResponseRaw): MeResponse {
  const fname = raw.employee?.fname ?? raw.user?.fname;
  const lname = raw.employee?.lname ?? raw.user?.lname;
  const position = raw.employee?.position;

  const empA = normalizeAvatarObj(raw.employee?.avatar);
  const userA = normalizeAvatarObj(raw.user?.avatar);
  const topA = raw.avatar ? normalizeAvatarObj(raw.avatar) : undefined;

  const avatarUrl = pickStr(
    raw.avatarUrl,
    raw.employee?.avatarUrl,
    raw.user?.avatarUrl,
    topA?.url,
    empA?.url,
    userA?.url
  );

  const avatarPath = pickStr(
    raw.avatarPath,
    raw.storagePath,
    raw.employee?.avatarPath,
    raw.employee?.storagePath,
    raw.user?.avatarPath,
    raw.user?.storagePath,
    topA?.storagePath,
    topA?.path,
    empA?.storagePath,
    empA?.path,
    userA?.storagePath,
    userA?.path
  );

  const employeeNo = pickStr(raw.employee?.employeeNo, raw.user?.employeeNo);
  const phone = pickStr(raw.employee?.phone, raw.user?.phone);

  const finalUrl = isHttpUrl(avatarUrl) ? avatarUrl : "";
  const finalPath = avatarPath || (!isHttpUrl(avatarUrl) ? pickStr(avatarUrl) : "");

  return {
    ...raw, // ✅ lineUserId จะติดมาด้วย
    fname,
    lname,
    position,

    avatarUrl: finalUrl || undefined,
    avatarPath: finalPath || undefined,
    storagePath: finalPath || undefined,
    avatar: {
      url: finalUrl || undefined,
      storagePath: finalPath || undefined,
      path: finalPath || undefined,
    },

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

async function warmUpBackendProdOnly() {
  if (!import.meta.env.PROD) return;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    await fetch(`${API_BASE}/health`, { signal: ctl.signal });
    clearTimeout(t);
  } catch {}
}

function buildLiteUser(fbUser: FirebaseUser): MeResponse {
  const email = fbUser.email ?? null;
  const display = pickStr(fbUser.displayName);
  return {
    ok: true,
    uid: fbUser.uid,
    email,
    role: "LOADING",
    user: {
      email,
      displayName: display || undefined,
      name: display || undefined,
      fname: undefined,
      lname: undefined,
    },
    employee: null,
    projectId: undefined,
    claimSync: { ok: true, changed: false, role: "LOADING" },

    // ✅ lineUserId ยังไม่รู้ใน lite
    lineUserId: undefined,

    avatarUrl: undefined,
    avatarPath: undefined,
    storagePath: undefined,
    avatar: undefined,

    fname: undefined,
    lname: undefined,
    position: undefined,
    employeeNo: undefined,
    phone: undefined,

    _lite: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleReady, setRoleReady] = useState(false);

  const meSeqRef = useRef(0);
  const meInflightRef = useRef<Promise<MeResponse> | null>(null);

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
    void warmUpBackendProdOnly();
  }, []);

  const hydrateMeInBackground = async (fbUser: FirebaseUser) => {
    const mySeq = ++meSeqRef.current;

    try {
      if (!meInflightRef.current) {
        meInflightRef.current = fetchMeWithClaimsRefresh(fbUser).finally(() => {
          meInflightRef.current = null;
        });
      }
      const me = await meInflightRef.current;

      if (mySeq !== meSeqRef.current) return;

      setUser(me);
      setRoleReady(true);
    } catch (e) {
      console.error("Hydrate /me error:", e);
      setRoleReady(false);
    }
  };

  // ✅ refreshMe แบบ manual (ใช้หลังเชื่อม LINE)
  const refreshMe = async (): Promise<MeResponse | null> => {
    const fb = auth.currentUser;
    if (!fb) return null;
    try {
      const me = await fetchMeWithClaimsRefresh(fb);
      setUser(me);
      setRoleReady(true);
      return me;
    } catch (e) {
      console.error("refreshMe error:", e);
      return null;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          setRoleReady(false);
          rejectPendingLogin(new Error("AUTH_SIGNED_OUT"));
          setLoading(false);
          return;
        }

        const lite = buildLiteUser(fbUser);
        setUser(lite);
        setRoleReady(false);

        resolvePendingLogin(lite);

        void hydrateMeInBackground(fbUser);

        setLoading(false);
      } catch (e) {
        console.error("Auth bootstrap error:", e);
        setUser(null);
        setRoleReady(false);
        rejectPendingLogin(e);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
    setLoading(true);

    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

    // login firebase
    await signInWithEmailAndPassword(auth, email, password);

    // return lite เร็ว ๆ (จะ hydrate /me ตามหลัง)
    const fb = auth.currentUser;
    if (!fb) {
      setLoading(false);
      throw new Error("FIREBASE_NOT_SIGNED_IN");
    }

    const lite = buildLiteUser(fb);

    // ให้ login() resolve เร็ว (ไม่รอ /me)
    const p = new Promise<MeResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingLoginRef.current = null;
        resolve(lite);
      }, 1200);
      pendingLoginRef.current = { resolve, reject, timer };
    });

    setLoading(false);
    return p;
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setRoleReady(false);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, roleReady, login, logout, refreshMe }),
    [user, loading, roleReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}