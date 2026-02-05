import { auth } from "../firebase";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function getToken() {
  const u = auth.currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken();
}

export async function uploadFile(file: File, folder: "leave" | "announcement" | "profile") {
  const token = await getToken();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "UPLOAD_FAILED");
  return data as { key: string; name: string; size: number; contentType: string };
}

export async function getSignedUrl(key: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/files/signed-url?key=${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "SIGNED_URL_FAILED");
  return data.signedUrl as string;
}
