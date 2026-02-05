// src/devtools.ts
import { getAuth } from "firebase/auth";

/**
 * 1) testMe
 */
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

/**
 * 2) Network Spy
 */
function isStorageUrl(url: any) {
  return typeof url === "string" && url.includes("firebasestorage.googleapis.com");
}

export function installNetworkSpy() {
  if ((window as any).__NET_SPY_INSTALLED__) return;
  (window as any).__NET_SPY_INSTALLED__ = true;

  // ---- spy fetch ----
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: any[]) => {
    const url = args?.[0];
    if (isStorageUrl(url)) {
      console.warn("[NET-SPY][fetch] storage url =", url);
      console.trace("[NET-SPY][fetch] stack");
    }
    return origFetch(...args);
  };

  // ---- spy XHR ----
  const OrigXHR = window.XMLHttpRequest;

  class SpyXHR extends OrigXHR {
    private __url: any;

    open(method: string, url: string, ...rest: any[]) {
      this.__url = url;
      if (isStorageUrl(url)) {
        console.warn("[NET-SPY][xhr.open] method =", method, "url =", url);
        console.trace("[NET-SPY][xhr.open] stack");
      }
      // @ts-ignore
      return super.open(method, url, ...rest);
    }

    send(body?: any) {
      if (isStorageUrl(this.__url)) {
        console.warn("[NET-SPY][xhr.send] url =", this.__url);
        console.trace("[NET-SPY][xhr.send] stack");
      }
      // @ts-ignore
      return super.send(body);
    }
  }

  // @ts-ignore
  window.XMLHttpRequest = SpyXHR;

  console.log("✅ NET-SPY installed (fetch + XHR)");
}

/**
 * 3) installDevTools (export ชื่อให้ตรง!)
 */
export function installDevTools() {
  if (!import.meta.env.DEV) return;

  (window as any).testMe = testMe;
  installNetworkSpy();

  console.log("✅ DevTools installed: window.testMe(), NET-SPY");
}
