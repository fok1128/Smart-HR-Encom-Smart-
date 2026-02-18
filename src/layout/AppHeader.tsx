// src/components/common/AppHeader.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { getSignedUrl, invalidateSignedUrlCache } from "../services/files";
import { Menu, X } from "lucide-react";

type AnyObj = Record<string, any>;

type UserProfile = {
  uid?: string;
  email?: string | null;

  fname?: string;
  lname?: string;
  position?: string;

  // flat
  avatarUrl?: string;
  avatar?: any; // บางทีเป็น object
  photoURL?: string;
  photoUrl?: string;
  profilePhoto?: string;
  avatarPath?: string;
  storagePath?: string;

  // nested
  avatarData?: { storagePath?: string; path?: string; url?: string } | null;
  avatarFile?: { storagePath?: string; path?: string; url?: string } | null;
  avatarObj?: { storagePath?: string; path?: string; url?: string } | null;
  avatarInfo?: { storagePath?: string; path?: string; url?: string } | null;

  displayName?: string;
  name?: string;
};

const BRAND_PURPLE = "#6B1F78";
const ACCENT_YELLOW = "#D6BE13";
const ACCENT_GREEN = "#2D5C0E";

const isDev = import.meta.env.DEV;

function getInitials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "U";
}

// ✅ ข้าม object/function เพื่อกัน [object Object]
function pickStr(...vals: any[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const t = typeof v;
    if (t === "object" || t === "function") continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function looksLikeHttpUrl(s: string) {
  return /^https?:\/\//i.test(String(s || "").trim());
}

function stripQuery(s: string) {
  const t = String(s || "").trim();
  const i = t.indexOf("?");
  return i >= 0 ? t.slice(0, i) : t;
}

function normalizeKey(raw: string) {
  let k = stripQuery(raw).trim();
  if (k.startsWith("/")) k = k.slice(1);
  if (k.startsWith("public/")) k = k.slice("public/".length);
  return k;
}

function looksLikeStoragePath(s: string) {
  const k = normalizeKey(s);
  if (!k) return false;
  if (looksLikeHttpUrl(k)) return false;
  return k.includes("/");
}

/** cache-bust แบบไม่แตะ query (ไม่ทำให้ token/signature เพี้ยน) */
function fragmentBust(url: string) {
  const base = String(url || "").split("#")[0];
  return `${base}#v=${Date.now()}`;
}

/** ดึง nested path จาก user object ได้หลายแบบ (รวม avatar object) */
function getNestedAvatarKey(u: AnyObj | null) {
  if (!u) return "";

  const a = (u as AnyObj).avatar;
  const b = (u as AnyObj).avatarData;
  const c = (u as AnyObj).avatarFile;
  const d = (u as AnyObj).avatarObj;
  const e = (u as AnyObj).avatarInfo;

  const aStorage = a && typeof a === "object" ? a.storagePath : undefined;
  const aPath = a && typeof a === "object" ? a.path : undefined;
  const aUrl = a && typeof a === "object" ? a.url : undefined;

  return pickStr(
    aStorage,
    aPath,
    aUrl,

    b?.storagePath,
    b?.path,
    b?.url,

    c?.storagePath,
    c?.path,
    c?.url,

    d?.storagePath,
    d?.path,
    d?.url,

    e?.storagePath,
    e?.path,
    e?.url
  );
}

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user } = useAuth();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  const u = user as unknown as (UserProfile & AnyObj) | null;

  const employeeName = useMemo(() => {
    const full = [u?.fname, u?.lname].filter(Boolean).join(" ").trim();
    return full || u?.displayName || u?.name || "พนักงาน";
  }, [u?.fname, u?.lname, u?.displayName, u?.name]);

  const employeePosition = useMemo(() => u?.position || "พนักงาน", [u?.position]);

  // ✅ ทำ rawAvatar ให้ dependency เป็น "ค่าที่ใช้จริง" ไม่ใช้ u ทั้งก้อน (กัน rerun เกิน)
  const rawAvatar = useMemo(() => {
    const nested = getNestedAvatarKey(u);

    // ✅ จัดลำดับ: path ก่อน url (ของคุณเป็น storagePath)
    return pickStr(
      u?.avatarPath,
      u?.storagePath,

      u?.avatarUrl,
      u?.photoURL,
      u?.photoUrl,
      u?.profilePhoto,

      nested
    );
  }, [
    u?.avatarPath,
    u?.storagePath,
    u?.avatarUrl,
    u?.photoURL,
    u?.photoUrl,
    u?.profilePhoto,
    // nested: ใส่เฉพาะ field ที่อาจเปลี่ยนจริง ๆ
    (u as any)?.avatar,
    (u as any)?.avatarData,
    (u as any)?.avatarFile,
    (u as any)?.avatarObj,
    (u as any)?.avatarInfo,
  ]);

  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string>("");
  const [imgOk, setImgOk] = useState(true);

  // ✅ track request เพื่อกันผลลัพธ์ทับกัน
  const reqIdRef = useRef(0);

  // ✅ จำ key ล่าสุดที่เป็น storagePath (ไว้ invalidate ตอน error)
  const lastStorageKeyRef = useRef<string>("");

  useEffect(() => {
    const raw = String(rawAvatar || "").trim();

    // เพิ่ม req id ทุกครั้งที่ rawAvatar เปลี่ยน
    const myReqId = ++reqIdRef.current;

    if (isDev) console.log("[AppHeader/avatar] rawAvatar =", raw);

    if (!raw) {
      lastStorageKeyRef.current = "";
      setImgOk(true);
      setResolvedAvatarUrl(""); // ไม่มีรูป -> ใช้ initials
      return;
    }

    // 1) URL อยู่แล้ว -> set ทันที (และไม่ต้องล้างรูปก่อน)
    if (looksLikeHttpUrl(raw)) {
      lastStorageKeyRef.current = "";
      setImgOk(true);
      setResolvedAvatarUrl(raw);
      return;
    }

    // 2) storagePath -> ขอ signed-url แบบ async
    const key = normalizeKey(raw);
    if (looksLikeStoragePath(key)) {
      lastStorageKeyRef.current = key;

      // ✅ ไม่ต้อง setResolvedAvatarUrl("") เพื่อกันกระพริบ
      // ปล่อยให้รูปเดิมโชว์ไปก่อน จนกว่าจะได้ url ใหม่

      (async () => {
        try {
          const url = await getSignedUrl(key);
          if (isDev) console.log("[AppHeader/avatar] signedUrl =", url);

          // กันผลลัพธ์เก่ามาทับ
          if (reqIdRef.current !== myReqId) return;

          setImgOk(true);
          setResolvedAvatarUrl(url);
        } catch (e) {
          console.error("[AppHeader/avatar] resolve error:", e);
          if (reqIdRef.current !== myReqId) return;

          // ถ้าพัง ให้ fallback เป็น initials
          setImgOk(false);
          setResolvedAvatarUrl("");
        }
      })();

      return;
    }

    // 3) fallback string อื่น ๆ
    lastStorageKeyRef.current = "";
    setImgOk(true);
    setResolvedAvatarUrl(raw);
  }, [rawAvatar]);

  const handleImgError = async () => {
    setImgOk(false);

    const key = lastStorageKeyRef.current;
    if (!key) return;

    // ✅ invalidate cache ก่อน retry (กันได้ url เดิมที่เสีย/หมดอายุ)
    invalidateSignedUrlCache(key);

    try {
      const url = await getSignedUrl(key);
      if (isDev) console.log("[AppHeader/avatar] retry signedUrl =", url);

      if (url) {
        setImgOk(true);
        setResolvedAvatarUrl(fragmentBust(url));
      }
    } catch (e) {
      console.warn("[AppHeader/avatar] retry failed:", e);
      setResolvedAvatarUrl("");
    }
  };

  return (
    <header
      className="relative sticky top-0 z-[60] w-full text-white shadow-sm"
      style={{
        background: `linear-gradient(90deg, ${BRAND_PURPLE} 0%, #7A2A86 55%, ${BRAND_PURPLE} 100%)`,
      }}
    >
      <div
        className="h-[6px] w-full"
        style={{
          background: `linear-gradient(90deg, ${ACCENT_YELLOW} 0%, ${ACCENT_GREEN} 100%)`,
          opacity: 0.95,
        }}
      />

      <div className="relative flex items-center justify-between w-full px-3 py-3 lg:px-6 lg:py-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
            className={[
              "inline-flex items-center justify-center",
              "w-10 h-10 lg:w-11 lg:h-11",
              "rounded-2xl",
              "bg-white/10 hover:bg-white/15 active:bg-white/20",
              "ring-1 ring-white/20 hover:ring-white/35",
              "shadow-[0_10px_22px_rgba(0,0,0,0.18)]",
              "transition",
            ].join(" ")}
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="leading-tight">
            <div className="text-sm font-semibold sm:text-base">
              ระบบการลา Online Encom Smart Solution
            </div>
            <div className="text-xs text-white/80">Smart HR Dashboard</div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-sm font-extrabold tracking-[0.2px] text-white">
                {employeeName}
              </div>
              <div className="text-xs text-white/75">{employeePosition}</div>
            </div>

            {resolvedAvatarUrl && imgOk ? (
              <img
                src={resolvedAvatarUrl}
                alt="employee avatar"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/25 shadow-[0_12px_26px_rgba(0,0,0,0.22)]"
                onLoad={() => isDev && console.log("[AppHeader/avatar] img loaded")}
                onError={handleImgError}
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-sm font-extrabold text-gray-800 ring-2 ring-white/25 shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
                {getInitials(employeeName)}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
