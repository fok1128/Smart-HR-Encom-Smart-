// src/devtools.ts
import { getAuth } from "firebase/auth";

export async function testMe() {
  try {
    const auth = getAuth();
    const u = auth.currentUser;

    if (!u) {
      console.log("❌ No currentUser (ยังไม่ login หรือ auth ยังไม่พร้อม)");
      return null;
    }

    const token = await u.getIdToken();
    const res = await fetch("http://localhost:4000/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => null);
    console.log("✅ /me response:", data);
    return data;
  } catch (e) {
    console.error("testMe error:", e);
    return null;
  }
}

function envOn(v: any) {
  return String(v ?? "").trim() === "1" || String(v ?? "").toLowerCase() === "true";
}

// ✅ storage detector: ถ้าอยากเพิ่มโดเมนอื่นค่อยเติม
function isStorageLikeUrl(url: any) {
  if (typeof url !== "string") return false;
  const s = url.toLowerCase();
  return (
    s.includes("firebasestorage.googleapis.com") ||
    s.includes("supabase.co/storage") ||
    s.includes("/storage/v1/")
  );
}

export function installNetworkSpy() {
  if ((window as any).__NET_SPY_INSTALLED__) return;

  const DISABLE = envOn(import.meta.env.VITE_NET_SPY_DISABLE);

  // ✅ ค่า default: ไม่ยุ่ง storage เสมอ (แก้ปัญหา preflight / log รก)
  const IGNORE_STORAGE =
    envOn(import.meta.env.VITE_NET_SPY_IGNORE_STORAGE) || true;

  if (DISABLE) {
    console.log("🟡 NET-SPY disabled by env: VITE_NET_SPY_DISABLE");
    return;
  }

  (window as any).__NET_SPY_INSTALLED__ = true;

  const origFetch: typeof window.fetch = window.fetch.bind(window);
  const OrigXHR = window.XMLHttpRequest;

  (window as any).__NET_SPY_ORIG_FETCH__ = origFetch;
  (window as any).__NET_SPY_ORIG_XHR__ = OrigXHR;

  window.fetch = (async (...args: Parameters<typeof fetch>) => {
    const url = args?.[0] as any;
    const urlStr = typeof url === "string" ? url : String(url?.url ?? "");

    if (!IGNORE_STORAGE && isStorageLikeUrl(urlStr)) {
      console.warn("[NET-SPY][fetch] storage-ish url =", urlStr);
      console.trace("[NET-SPY][fetch] stack");
    }

    return origFetch(...args);
  }) as typeof window.fetch;

  class SpyXHR extends OrigXHR {
    private __url: any;

    open(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      this.__url = url;
      const urlStr = String(url);

      if (!IGNORE_STORAGE && isStorageLikeUrl(urlStr)) {
        console.warn("[NET-SPY][xhr.open] method =", method, "url =", urlStr);
        console.trace("[NET-SPY][xhr.open] stack");
      }

      return super.open(
        method,
        url as any,
        async ?? true,
        username ?? undefined,
        password ?? undefined
      );
    }

    send(body?: any) {
      const urlStr = String(this.__url ?? "");

      if (!IGNORE_STORAGE && isStorageLikeUrl(urlStr)) {
        console.warn("[NET-SPY][xhr.send] url =", urlStr);
        console.trace("[NET-SPY][xhr.send] stack");
      }

      return super.send(body);
    }
  }

  window.XMLHttpRequest = SpyXHR as any;

  (window as any).disableNetSpy = () => {
    try {
      const f = (window as any).__NET_SPY_ORIG_FETCH__;
      const x = (window as any).__NET_SPY_ORIG_XHR__;
      if (f) window.fetch = f;
      if (x) window.XMLHttpRequest = x;
      (window as any).__NET_SPY_INSTALLED__ = false;
      console.log("✅ NET-SPY disabled (restored original fetch + XHR)");
    } catch (e) {
      console.error("disableNetSpy error:", e);
    }
  };

  console.log(`✅ NET-SPY installed | IGNORE_STORAGE=${IGNORE_STORAGE ? "ON" : "OFF"}`);
}

export function installDevTools() {
  if (!import.meta.env.DEV) return;

  (window as any).testMe = testMe;

  installNetworkSpy();

  console.log("✅ DevTools installed: window.testMe(), window.disableNetSpy()");
}
