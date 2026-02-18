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

  // ✅ backend ใหม่ส่ง top-level มาแล้วด้วย
  avatarUrl?: string;
  avatarPath?: string;
  storagePath?: string;
  avatar?: { url?: string; storagePath?: string; path?: string } | null;
};

export type MeResponse = MeResponseRaw & {
  fname?: string;
  lname?: string;
  position?: string;

  // ✅ ให้ header ใช้ง่าย
  avatarUrl?: string;
  avatarPath?: string;
  storagePath?: string;
  avatar?: { url?: string; storagePath?: string; path?: string };

  employeeNo?: string;
  phone?: string;

  // ✅ เพิ่ม flag เพื่อรู้ว่า role/profile พร้อมแล้วหรือยัง
  _lite?: boolean;
};

type AuthContextType = {
  user: MeResponse | null;

  /**
   * ✅ loading = แค่ "กำลัง bootstrap firebase auth" หรือ "กำลัง login/logout"
   * (ไม่ใช่รอ /me)
   */
  loading: boolean;

  /** ✅ roleReady = ได้ /me แล้ว (role จริงพร้อม) */
  roleReady: boolean;

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

  // ถ้า avatarUrl ไม่ใช่ URL จริง ให้ถือว่าเป็น path
  const finalUrl = isHttpUrl(avatarUrl) ? avatarUrl : "";
  const finalPath = avatarPath || (!isHttpUrl(avatarUrl) ? pickStr(avatarUrl) : "");

  return {
    ...raw,
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

/** ✅ warmup เฉพาะ prod และ "ห้าม block" */
async function warmUpBackendProdOnly() {
  if (!import.meta.env.PROD) return;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    // fire-and-forget (ไม่ await ใน caller)
    await fetch(`${API_BASE}/health`, { signal: ctl.signal });
    clearTimeout(t);
  } catch {
    // no-op
  }
}

/** ✅ สร้าง user แบบ lite เพื่อเข้าเว็บไว (role ยังไม่พร้อม) */
function buildLiteUser(fbUser: FirebaseUser): MeResponse {
  const email = fbUser.email ?? null;
  const display = pickStr(fbUser.displayName);
  return {
    ok: true,
    uid: fbUser.uid,
    email,
    role: "LOADING", // สำคัญ: role ยังไม่พร้อม
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

  // กัน fetch /me ซ้อน/ทับกัน
  const meSeqRef = useRef(0);
  const meInflightRef = useRef<Promise<MeResponse> | null>(null);

  // ใช้ให้ login() resolve เร็ว (ไม่รอ /me)
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
    // ✅ warmup แบบไม่ block
    void warmUpBackendProdOnly();
  }, []);

  const hydrateMeInBackground = async (fbUser: FirebaseUser) => {
    const mySeq = ++meSeqRef.current;

    try {
      // กันยิงซ้อน: ถ้ามี inflight อยู่ ให้ใช้ตัวเดิม
      if (!meInflightRef.current) {
        meInflightRef.current = fetchMeWithClaimsRefresh(fbUser).finally(() => {
          meInflightRef.current = null;
        });
      }
      const me = await meInflightRef.current;

      // ถ้ามีรอบใหม่กว่าแล้ว ให้ทิ้งผลลัพธ์นี้
      if (mySeq !== meSeqRef.current) return;

      setUser(me);
      setRoleReady(true);
      // debug
      // console.log("[AuthContext me.avatarPath]", me?.avatarPath, me?.storagePath, me?.avatar);
    } catch (e) {
      // ถ้า /me พัง อย่าทำให้ทั้งแอปหลุด ให้คง lite ไว้ก่อน
      console.error("Hydrate /me error:", e);
      // role ยังไม่ ready
      setRoleReady(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      // loading นี้หมายถึงแค่ "รู้สถานะ firebase auth แล้วหรือยัง"
      // พอรู้แล้วให้ false ทันที (ไม่รอ /me)
      try {
        if (!fbUser) {
          setUser(null);
          setRoleReady(false);
          rejectPendingLogin(new Error("AUTH_SIGNED_OUT"));
          setLoading(false);
          return;
        }

        // ✅ 1) เข้าเว็บไว: set lite user ก่อน
        const lite = buildLiteUser(fbUser);
        setUser(lite);
        setRoleReady(false);

        // ✅ login() ให้ resolve ตอนนี้เลย (ไม่รอ /me)
        resolvePendingLogin(lite);

        // ✅ 2) /me ค่อยตามหลังแบบ background
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

  useEffect(() => {
    const onUpdated = async () => {
      const fbUser = auth.currentUser;
      if (!fbUser) return;

      // ไม่ต้อง setLoading(true) ให้ UI หน่วง
      // แค่ re-hydrate /me แบบ background
      void hydrateMeInBackground(fbUser);
    };

    window.addEventListener("profile-updated", onUpdated);
    return () => window.removeEventListener("profile-updated", onUpdated);
  }, []);

  const login: AuthContextType["login"] = async (email, password, remember) => {
    // loading = เฉพาะตอนกด login จริง ๆ (เพื่อ disable ปุ่ม/ฟอร์ม)
    setLoading(true);

    if (pendingLoginRef.current) {
      setLoading(false);
      throw new Error("LOGIN_IN_PROGRESS");
    }

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      // ✅ รอแค่ auth state change (lite) ไม่รอ /me
      const waitLite = new Promise<MeResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingLoginRef.current = null;
          reject(new Error("LOGIN_TIMEOUT_WAITING_AUTH"));
        }, 12000);
        pendingLoginRef.current = { resolve, reject, timer };
      });

      await signInWithEmailAndPassword(auth, email, password);

      // พอ onAuthStateChanged ยิง จะ resolve ตรงนั้น
      return await waitLite;
    } finally {
      setLoading(false);
    }
  };

  const logout: AuthContextType["logout"] = async () => {
    setLoading(true);
    try {
      rejectPendingLogin(new Error("LOGOUT_DURING_LOGIN"));
      await signOut(auth);
      setUser(null);
      setRoleReady(false);
      // onAuthStateChanged จะตามมาจัดการซ้ำอีกทีด้วย
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ user, loading, roleReady, login, logout }),
    [user, loading, roleReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
