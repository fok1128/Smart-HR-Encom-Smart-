// src/services/files.ts
import { getAuth } from "firebase/auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function getToken(forceRefresh = false) {
  const u = getAuth().currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken(forceRefresh);
}

export type UploadedAttachment = {
  name: string;
  size: number;
  storagePath: string;
  contentType?: string;
};

function normalizeStorageKey(key: string) {
  let k = String(key || "").trim();

  // ถ้าเผลอส่งเป็น URL มา ไม่ต้อง normalize
  if (/^https?:\/\//i.test(k)) return k;

  // ตัด query/hash เผื่อใครเก็บแปลกๆ
  k = k.split("?")[0].split("#")[0];

  // ตัด / นำหน้า
  k = k.replace(/^\/+/, "");

  // บางคนเก็บเป็น public/xxx ให้ตัดออก (แล้วให้ backend map เอง)
  k = k.replace(/^public\//i, "");

  return k;
}

/** ขอ signed url จาก backend เพื่อเปิดไฟล์ใน Supabase Storage */
export async function getSignedUrl(key: string) {
  const normalized = normalizeStorageKey(key);

  // ถ้าเป็น URL อยู่แล้ว ใช้ได้เลย
  if (/^https?:\/\//i.test(normalized)) return normalized;

  // try 1: token ปกติ
  let token = await getToken(false);
  let res = await fetch(
    `${API_BASE}/files/signed-url?key=${encodeURIComponent(normalized)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // ถ้าโดน 401/403 ลอง refresh token แล้ว retry อีกครั้ง
  if (res.status === 401 || res.status === 403) {
    token = await getToken(true);
    res = await fetch(
      `${API_BASE}/files/signed-url?key=${encodeURIComponent(normalized)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || "SIGNED_URL_FAILED");
  return data.signedUrl as string;
}

/** อัปโหลดไฟล์ไป Supabase ผ่าน backend (/files/upload) */
export async function uploadFile(file: File, folder: string) {
  const token = await getToken();

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
