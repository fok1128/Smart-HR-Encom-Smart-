// src/services/files.ts
import { getAuth } from "firebase/auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function getToken() {
  const u = getAuth().currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken();
}

export type UploadedAttachment = {
  name: string;
  size: number;
  storagePath: string;
  contentType?: string;
};

/** ขอ signed url จาก backend เพื่อเปิดไฟล์ใน Supabase Storage */
export async function getSignedUrl(key: string) {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE}/files/signed-url?key=${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

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

  // backend ส่งได้ทั้ง key/name/size/contentType หรือ attachments[]
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
