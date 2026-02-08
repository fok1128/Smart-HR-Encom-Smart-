// src/devtools.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db, auth } from "./firebase";

/**
 * helper: สรุป error ให้ดูง่าย
 */
function errInfo(e: any) {
  const rawMsg = String(e?.message || "");
  const rawStack = String(e?.stack || "");
  return {
    name: e?.name,
    code: e?.code,
    message: rawMsg,
    stack: rawStack,
  };
}

/**
 * 0) testTokenClaims
 */
export async function testTokenClaims(force = true) {
  try {
    const u = auth.currentUser;
    if (!u) return { ok: false, error: "NO_AUTH" };

    const r = await u.getIdTokenResult(force);
    console.log("✅ token claims =", r.claims);
    console.log("role claim =", (r.claims as any)?.role);
    return { ok: true, claims: r.claims };
  } catch (e) {
    console.error("❌ testTokenClaims error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 1) testMe
 */
export async function testMe() {
  try {
    const u = auth.currentUser;

    if (!u) {
      console.log("❌ No currentUser (ยังไม่ login หรือ auth ยังไม่พร้อม)");
      return { ok: false, error: "NO_AUTH" };
    }

    const token = await u.getIdToken();
    const res = await fetch("http://localhost:4000/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => null);
    console.log("✅ /me response:", data);
    return { ok: true, data };
  } catch (e) {
    console.error("❌ testMe error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 2) testProjectInfo
 * โชว์ว่าแอปกำลังชี้ไป Firebase project ไหน / user ไหน
 */
export async function testProjectInfo() {
  try {
    const u = auth.currentUser;

    console.log("🔎 auth.currentUser:", {
      uid: u?.uid,
      email: u?.email,
    });

    // @ts-ignore
    const projectId = db?.app?.options?.projectId;
    // @ts-ignore
    const appId = db?.app?.options?.appId;

    console.log("🔎 firebase project:", { projectId, appId });
    return { ok: true, uid: u?.uid ?? null, email: u?.email ?? null, projectId, appId };
  } catch (e) {
    console.error("❌ testProjectInfo error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 3) testReadMyUserDoc
 */
export async function testReadMyUserDoc() {
  try {
    const u = auth.currentUser;
    if (!u) return { ok: false, error: "NO_AUTH" };

    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);

    const data = snap.exists() ? snap.data() : null;

    console.log("✅ users/{uid} readable:", {
      exists: snap.exists(),
      data,
    });

    return { ok: true, exists: snap.exists(), data };
  } catch (e) {
    console.error("❌ testReadMyUserDoc error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 4) testLeaveReadOne
 */
export async function testLeaveReadOne() {
  try {
    const qy = query(collection(db, "leave_requests"), limit(1));
    const snap = await getDocs(qy);

    console.log("✅ leave_requests read ok. size =", snap.size);

    const first = snap.docs[0];
    if (first) {
      const d = first.data() as any;
      console.log("🔎 first doc id =", first.id);
      console.log("🔎 first doc keys =", Object.keys(d || {}));
      console.log("🔎 first doc uid =", d?.uid);
      console.log("🔎 first doc status =", d?.status);
    } else {
      console.log("ℹ️ no docs in leave_requests (size=0)");
    }

    return { ok: true, size: snap.size, firstId: first?.id ?? null };
  } catch (e) {
    console.error("❌ testLeaveReadOne error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 4.1) testLeaveReadById
 */
export async function testLeaveReadById(docId: string) {
  try {
    if (!docId) return { ok: false, error: "NO_DOC_ID" };

    const ref = doc(db, "leave_requests", docId);
    const snap = await getDoc(ref);

    console.log(`✅ get leave_requests/${docId}:`, {
      exists: snap.exists(),
      data: snap.exists() ? snap.data() : null,
    });

    return { ok: true, exists: snap.exists(), data: snap.exists() ? snap.data() : null };
  } catch (e) {
    console.error("❌ testLeaveReadById error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 4.2) testListLeaveCollections
 */
export async function testListLeaveCollections() {
  const names = ["leave_requests", "leave_request", "leaveRequests"] as const;

  const out: any[] = [];
  for (const name of names) {
    try {
      const snap = await getDocs(query(collection(db, name), limit(1)));
      console.log(`✅ read ${name} ok. size=`, snap.size);
      out.push({ name, ok: true, size: snap.size, firstId: snap.docs[0]?.id ?? null });
    } catch (e) {
      console.error(`❌ read ${name} failed:`, errInfo(e));
      out.push({ name, ok: false, error: errInfo(e) });
    }
  }

  return out;
}

/**
 * 4.3) testLeavePendingQuery
 */
export async function testLeavePendingQuery() {
  try {
    const qy = query(
      collection(db, "leave_requests"),
      where("status", "in", ["PENDING", "รอดำเนินการ"]),
      orderBy("submittedAt", "desc"),
      limit(5)
    );
    const snap = await getDocs(qy);
    console.log("✅ leave_requests pending query ok. size=", snap.size);
    console.log("ids:", snap.docs.map((d) => d.id));
    return { ok: true, size: snap.size, ids: snap.docs.map((d) => d.id) };
  } catch (e) {
    console.error("❌ testLeavePendingQuery error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 4.4) testAuthRefreshToken
 */
export async function testAuthRefreshToken() {
  try {
    const u = auth.currentUser;
    if (!u) return { ok: false, error: "NO_AUTH" };

    const t = await u.getIdToken(true);
    console.log("✅ refreshed idToken (len) =", t?.length);
    return { ok: true, tokenLen: t?.length ?? 0 };
  } catch (e) {
    console.error("❌ testAuthRefreshToken error:", errInfo(e));
    return { ok: false, error: errInfo(e) };
  }
}

/**
 * 5) Network Spy
 */
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
  const IGNORE_STORAGE = envOn(import.meta.env.VITE_NET_SPY_IGNORE_STORAGE) || true;

  if (DISABLE) {
    console.log("🟡 NET-SPY disabled by env: VITE_NET_SPY_DISABLE");
    return;
  }

  (window as any).__NET_SPY_INSTALLED__ = true;

  const origFetch = window.fetch.bind(window) as typeof window.fetch;
// ...
window.fetch = (async (...args: Parameters<typeof fetch>) => {
  const url0 = args?.[0] as any;
  const urlStr = typeof url0 === "string" ? url0 : String(url0?.url ?? "");

  if (!IGNORE_STORAGE && isStorageLikeUrl(urlStr)) {
    console.warn("[NET-SPY][fetch] storage-ish url =", urlStr);
    console.trace("[NET-SPY][fetch] stack");
  }

  return origFetch(...args);
}) as typeof window.fetch;

  const OrigXHR = window.XMLHttpRequest;
(window as any).__NET_SPY_ORIG_XHR__ = OrigXHR;

// ✅ wrap แทน extends
window.XMLHttpRequest = function XMLHttpRequestPatched(this: XMLHttpRequest) {
  const xhr = new OrigXHR();

  let __url = "";

  const origOpen = xhr.open.bind(xhr);
  xhr.open = (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) => {
    __url = String(url);

    if (!IGNORE_STORAGE && isStorageLikeUrl(__url)) {
      console.warn("[NET-SPY][xhr.open] method =", method, "url =", __url);
      console.trace("[NET-SPY][xhr.open] stack");
    }

    return origOpen(method, url as any, async ?? true, username ?? undefined, password ?? undefined);
  };

  const origSend = xhr.send.bind(xhr);
  xhr.send = (body?: any) => {
    if (!IGNORE_STORAGE && isStorageLikeUrl(__url)) {
      console.warn("[NET-SPY][xhr.send] url =", __url);
      console.trace("[NET-SPY][xhr.send] stack");
    }
    return origSend(body);
  };

  return xhr;
} as any;

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

/**
 * 6) installDevTools
 */
export function installDevTools() {
  if (!import.meta.env.DEV) return;

  // claims
  (window as any).testTokenClaims = testTokenClaims;

  // basics
  (window as any).testMe = testMe;
  (window as any).testProjectInfo = testProjectInfo;
  (window as any).testReadMyUserDoc = testReadMyUserDoc;

  // leave tests
  (window as any).testLeaveReadOne = testLeaveReadOne;
  (window as any).testLeaveReadById = testLeaveReadById;
  (window as any).testListLeaveCollections = testListLeaveCollections;
  (window as any).testLeavePendingQuery = testLeavePendingQuery;
  (window as any).testAuthRefreshToken = testAuthRefreshToken;

  installNetworkSpy();

  console.log(
    "✅ DevTools installed:",
    "window.testTokenClaims(force),",
    "window.testMe(), window.testProjectInfo(), window.testReadMyUserDoc(),",
    "window.testLeaveReadOne(), window.testLeaveReadById(id), window.testListLeaveCollections(),",
    "window.testLeavePendingQuery(), window.testAuthRefreshToken(), NET-SPY"
  );
}
