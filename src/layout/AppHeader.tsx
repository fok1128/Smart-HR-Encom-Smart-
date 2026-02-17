// src/components/common/AppHeader.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { getSignedUrl } from "../services/files";
import { Menu, X } from "lucide-react";

type UserProfile = {
  uid?: string;
  email?: string | null;

  fname?: string;
  lname?: string;
  position?: string;

  avatarUrl?: string;
  avatar?: string;
  photoURL?: string;
  photoUrl?: string;
  profilePhoto?: string;
  avatarPath?: string;
  storagePath?: string;

  displayName?: string;
  name?: string;
};

const BRAND_PURPLE = "#6B1F78";
const ACCENT_YELLOW = "#D6BE13";
const ACCENT_GREEN = "#2D5C0E";

function getInitials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "U";
}

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
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

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user } = useAuth();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  const u = user as unknown as UserProfile | null;

  const employeeName = useMemo(() => {
    const full = [u?.fname, u?.lname].filter(Boolean).join(" ").trim();
    return full || u?.displayName || u?.name || (u?.email ?? "") || "พนักงาน";
  }, [u?.fname, u?.lname, u?.displayName, u?.name, u?.email]);

  const employeePosition = useMemo(() => u?.position || "พนักงาน", [u?.position]);

  const rawAvatar = useMemo(() => {
    return pickStr(
      u?.avatarUrl,
      u?.avatar,
      u?.photoURL,
      u?.photoUrl,
      u?.profilePhoto,
      u?.avatarPath,
      u?.storagePath
    );
  }, [u?.avatarUrl, u?.avatar, u?.photoURL, u?.photoUrl, u?.profilePhoto, u?.avatarPath, u?.storagePath]);

  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string>("");
  const [imgOk, setImgOk] = useState(true);

  const prevRawRef = useRef<string>("");
  const retriedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const raw = String(rawAvatar || "").trim();
      if (!raw) {
        prevRawRef.current = "";
        retriedRef.current = false;
        if (alive) {
          setResolvedAvatarUrl("");
          setImgOk(true);
        }
        return;
      }

      if (prevRawRef.current === raw) return;

      prevRawRef.current = raw;
      retriedRef.current = false;

      if (alive) {
        setResolvedAvatarUrl("");
        setImgOk(true);
      }

      try {
        if (looksLikeHttpUrl(raw)) {
          if (alive) setResolvedAvatarUrl(raw);
          return;
        }

        const key = normalizeKey(raw);
        if (looksLikeStoragePath(key)) {
          const url = await getSignedUrl(key);
          const bust = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
          if (alive) setResolvedAvatarUrl(bust);
          return;
        }

        if (alive) setResolvedAvatarUrl(raw);
      } catch (e) {
        console.error("[avatar] resolve error:", e);
        if (alive) setResolvedAvatarUrl("");
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [rawAvatar]);

  const handleImgError = async () => {
    setImgOk(false);

    const raw = String(rawAvatar || "").trim();
    if (!raw) return;
    if (retriedRef.current) return;

    const key = normalizeKey(raw);
    if (!looksLikeStoragePath(key)) return;

    retriedRef.current = true;

    try {
      const url = await getSignedUrl(key);
      if (url) {
        const bust = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
        setImgOk(true);
        setResolvedAvatarUrl(bust);
      }
    } catch (e) {
      console.warn("[avatar] retry signed-url failed:", e);
    }
  };

  return (
    <header className="relative sticky top-0 z-[60] w-full text-white shadow-sm"
      style={{
        background: `linear-gradient(90deg, ${BRAND_PURPLE} 0%, #7A2A86 55%, ${BRAND_PURPLE} 100%)`,
      }}
    >
      {/* ✅ เงาแบบเนียน (ไม่เป็นหมอก) */}
      

      {/* ✅ CI accent line */}
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
            {/* text */}
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-sm font-extrabold tracking-[0.2px] text-white">
                {employeeName}
              </div>
              <div className="text-xs text-white/75">{employeePosition}</div>
            </div>

            {/* avatar */}
            {resolvedAvatarUrl && imgOk ? (
              <img
                src={resolvedAvatarUrl}
                alt="employee avatar"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/25 shadow-[0_12px_26px_rgba(0,0,0,0.22)]"
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
