// src/services/files.ts
import { getAuth, onAuthStateChanged } from "firebase/auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

// ===== helpers =====
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isHttpUrl(x: string) {
  return /^https?:\/\//i.test(String(x || "").trim());
}

function normalizeStorageKey(key: string) {
  let k = String(key || "").trim();
  if (isHttpUrl(k)) return k; // already url

  // ตัด query/hash (กันเคสหลุด ?token=... ใน key)
  k = k.split("?")[0].split("#")[0];

  // ตัด / นำหน้า, public/ นำหน้า
  k = k.replace(/^\/+/, "");
  k = k.replace(/^public\//i, "");

  return k;
}

/**
 * ✅ รอให้ currentUser มาแบบ event-driven (ไม่ polling)
 * - ป้องกัน race หลัง login/refresh
 * - ลดการหน่วง/loop
 */
async function waitForUser(timeoutMs = 4500) {
  const auth = getAuth();
  if (auth.currentUser) return auth.currentUser;

  return new Promise<ReturnType<typeof getAuth>["currentUser"]>((resolve) => {
    let unsub: (() => void) | null = null;

    const t = setTimeout(() => {
      try {
        unsub?.();
      } catch {
        // ignore
      }
      resolve(null);
    }, timeoutMs);

    unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(t);
      try {
        unsub?.();
      } catch {
        // ignore
      }
      resolve(u);
    });
  });
}

async function getToken(forceRefresh = false) {
  const auth = getAuth();
  const u = auth.currentUser ?? (await waitForUser());
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken(forceRefresh);
}

// ===== types =====
export type UploadedAttachment = {
  name: string;
  size: number;
  storagePath: string;
  contentType?: string;
};

// ===== signed-url cache (ลด login ช้า / กันยิงซ้ำ) =====

// ✅ cache นานขึ้น (เหมาะกับ signed url อายุ ~1 ชม.)
const DEFAULT_TTL_MS = 45 * 60 * 1000;

// cache: key -> { url, exp }
const signedUrlCache = new Map<string, { url: string; exp: number }>();
// inflight: key -> promise(url)
const inflight = new Map<string, Promise<string>>();

/** เคลียร์ cache key เดียว (ถ้าต้องการ) */
export function invalidateSignedUrlCache(key: string) {
  const k = normalizeStorageKey(key);
  signedUrlCache.delete(k);
  inflight.delete(k);
}

/** เคลียร์ cache ทั้งหมด (ถ้าต้องการ เช่น ตอน logout) */
export function invalidateAllSignedUrlCache() {
  signedUrlCache.clear();
  inflight.clear();
}

function getCached(normalized: string) {
  const now = Date.now();
  const hit = signedUrlCache.get(normalized);
  if (hit && hit.exp > now) return hit.url;
  if (hit) signedUrlCache.delete(normalized); // exp แล้วลบทิ้ง
  return null;
}

function setCached(normalized: string, url: string, ttlMs = DEFAULT_TTL_MS) {
  signedUrlCache.set(normalized, { url, exp: Date.now() + ttlMs });
}

type SignedUrlResponse = { ok: boolean; signedUrl?: string; error?: string };

/** fetch signed-url พร้อม retry ที่จำเป็นเท่านั้น */
async function fetchSignedUrlOnce(normalized: string, token: string) {
  const res = await fetch(
    `${API_BASE}/files/signed-url?key=${encodeURIComponent(normalized)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = (await res.json().catch(() => null)) as SignedUrlResponse | null;
  return { res, data };
}

/**
 * ✅ ขอ signed url จาก backend เพื่อเปิดไฟล์ใน Supabase Storage
 * - cache 45 นาที
 * - inflight กันยิงซ้ำ
 * - 401/403 => refresh token แล้ว retry 1 ครั้ง
 * - 5xx/เครือข่าย => backoff เบา ๆ 1 ครั้ง
 *
 * ✅ IMPORTANT FIX:
 * - ถ้า backend ไม่คืน signedUrl ที่เป็น https:// ให้ throw ทันที (ห้ามคืน key กลับไป)
 *   เพราะถ้าหลุดไปเป็น src="177...jpg" จะกลายเป็น request ไปที่ localhost:5173 แล้วเจอ 400 แบบที่คุณเห็น
 */
export async function getSignedUrl(key: string) {
  const normalized = normalizeStorageKey(key);

  // already url
  if (isHttpUrl(normalized)) return normalized;

  if (!normalized) throw new Error("SIGNED_URL_EMPTY_KEY");

  // cache hit
  const cached = getCached(normalized);
  if (cached) return cached;

  // inflight hit
  const p0 = inflight.get(normalized);
  if (p0) return p0;

  const job = (async () => {
    // 1) token ปกติ
    let token = await getToken(false);
    let { res, data } = await fetchSignedUrlOnce(normalized, token);

    // 2) 401/403 -> refresh token แล้ว retry 1 ครั้ง
    if (res.status === 401 || res.status === 403) {
      token = await getToken(true);
      ({ res, data } = await fetchSignedUrlOnce(normalized, token));
    }

    // 3) server error -> retry เบา ๆ 1 ครั้ง
    if (!res.ok && res.status >= 500) {
      await sleep(300);
      ({ res, data } = await fetchSignedUrlOnce(normalized, token));
    }

    const signed = data?.signedUrl ? String(data.signedUrl).trim() : "";

    // ❌ ห้ามปล่อยค่าที่ไม่ใช่ URL เต็มออกไป
    if (!res.ok || !data?.ok || !signed) {
      signedUrlCache.delete(normalized);
      const msg = data?.error || `SIGNED_URL_${res.status || "FAILED"}`;
      throw new Error(msg);
    }

    // ✅ validate ให้เป็น https/http เท่านั้น
    if (!isHttpUrl(signed)) {
      signedUrlCache.delete(normalized);
      // log ไว้ช่วย debug ได้เลย
      console.warn("[getSignedUrl] SIGNED_URL_INVALID", { key: normalized, signed });
      throw new Error("SIGNED_URL_INVALID");
    }

    setCached(normalized, signed);
    return signed;
  })();

  inflight.set(normalized, job);

  try {
    return await job;
  } finally {
    inflight.delete(normalized);
  }
}

/** อัปโหลดไฟล์ไป Supabase ผ่าน backend (/files/upload) */
export async function uploadFile(file: File, folder: string) {
  const token = await getToken(false);

  const fd = new FormData();
  fd.append("folder", folder);
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || "UPLOAD_FAILED");

  const a: UploadedAttachment =
    data?.attachments?.[0] ||
    (data?.key
      ? {
          name: data.name,
          size: data.size,
          storagePath: data.key,
          contentType: data.contentType,
        }
      : null);

  if (!a?.storagePath) throw new Error("UPLOAD_NO_STORAGE_PATH");
  return a;
}

// ==========================
// ✅ Delete attachments (owner-only via backend)
// ==========================
export async function deleteFilesFromLeaveRequest(params: {
  requestId: string;
  keys: string[];
}) {
  const { requestId, keys } = params || ({} as any);
  if (!requestId || !Array.isArray(keys) || keys.length === 0) {
    throw new Error("requestId/keys required");
  }

  const token = await getToken(false);

  const res = await fetch(`${API_BASE}/files/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ requestId, keys }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok)
    throw new Error(data?.error || `DELETE_FAILED (${res.status})`);
  return data;
}