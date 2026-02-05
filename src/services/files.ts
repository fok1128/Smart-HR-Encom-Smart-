import { getAuth } from "firebase/auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function getToken() {
  const u = getAuth().currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken();
}

/** ขอ signed url จาก backend เพื่อเปิดไฟล์ใน Supabase Storage */
export async function getSignedUrl(key: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/files/signed-url?key=${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || "SIGNED_URL_FAILED");
  return data.signedUrl as string;
}
