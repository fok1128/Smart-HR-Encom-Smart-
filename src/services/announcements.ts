import { db } from "../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export type Announcement = {
  id: string;
  title: string;
  body: string;

  // ✅ เปลี่ยนแนวทาง: เก็บ key ไว้ แล้วค่อยขอ signed url ตอนจะเปิด
  fileKey?: string | null;
  fileName?: string | null;

  // ✅ ยังรองรับของเก่าไว้กันพัง (ถ้ามี record เก่าที่เป็น url อยู่แล้ว)
  fileUrl?: string | null;

  pinned?: boolean;
  createdAt?: any;
  updatedAt?: any;

  createdBy?: { uid: string; email?: string };
};

const COL = "announcements";

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function getIdToken() {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken();
}

function normalizeUploadResponse(data: any, f: File) {
  const first = (Array.isArray(data?.attachments) && data.attachments[0]) || null;

  const key = String(first?.storagePath || first?.key || data?.key || "").trim();
  if (!key) throw new Error("UPLOAD_OK_BUT_MISSING_KEY");

  const name = first?.name || data?.name || f.name;
  const size = first?.size || data?.size || f.size;
  const contentType = first?.contentType || data?.contentType || f.type || undefined;

  return { key, name, size, contentType };
}

/**
 * ✅ อัปโหลดไฟล์ประกาศไป Supabase Storage ผ่าน Backend (/files/upload)
 * คืนค่า { key, name } เพื่อเอาไปใส่ fileKey/fileName
 */
export async function uploadAnnouncementFile(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ key: string; name: string }> {
  if (!uid) throw new Error("MISSING_UID");
  if (!file) throw new Error("MISSING_FILE");

  const token = await getIdToken();

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "announcement");

  // หมายเหตุ: fetch อัปโหลดแบบนี้ “ไม่มี progress จริง” เหมือน uploadBytesResumable
  // เลยยิง onProgress แบบง่าย ๆ
  onProgress?.(1);

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    const msg = data?.error || `UPLOAD_FAILED (${res.status})`;
    throw new Error(msg);
  }

  const up = normalizeUploadResponse(data, file);
  onProgress?.(100);

  return { key: up.key, name: up.name };
}

/**
 * ✅ ขอ signed url เพื่อเปิดไฟล์ประกาศ
 */
export async function getAnnouncementSignedUrl(fileKey: string): Promise<string> {
  const token = await getIdToken();
  const url = `${API_BASE}/files/signed-url?key=${encodeURIComponent(fileKey)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok || !data?.signedUrl) {
    const msg = data?.error || `SIGNED_URL_FAILED (${res.status})`;
    throw new Error(msg);
  }

  return data.signedUrl as string;
}

export async function createAnnouncement(params: {
  title: string;
  body: string;

  fileKey?: string | null;
  fileName?: string | null;

  // legacy
  fileUrl?: string | null;

  createdBy: { uid: string; email?: string };
  pinned?: boolean;
}) {
  return addDoc(collection(db, COL), {
    title: params.title,
    body: params.body,

    // ✅ new
    fileKey: params.fileKey ?? null,
    fileName: params.fileName ?? null,

    // ✅ legacy (กัน record เก่า)
    fileUrl: params.fileUrl ?? null,

    pinned: !!params.pinned,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: params.createdBy,
  });
}

/**
 * ✅ สะดวกสุด: ถ้ามีไฟล์แนบ ให้อัปโหลดก่อน แล้วค่อย createAnnouncement
 */
export async function createAnnouncementWithFile(
  params: {
    title: string;
    body: string;
    createdBy: { uid: string; email?: string };
    pinned?: boolean;
  },
  file?: File | null,
  onProgress?: (percent: number) => void
) {
  if (file) {
    const up = await uploadAnnouncementFile(params.createdBy.uid, file, onProgress);
    return createAnnouncement({
      ...params,
      fileKey: up.key,
      fileName: up.name,
      fileUrl: null, // ✅ ไม่ใช้ firebase url แล้ว
    });
  }

  return createAnnouncement({
    ...params,
    fileKey: null,
    fileName: null,
    fileUrl: null,
  });
}

// ✅ เพิ่ม onError แบบ optional (โค้ดเก่าเรียก listenAnnouncements(cb) ยังใช้ได้เหมือนเดิม)
export function listenAnnouncements(
  cb: (items: Announcement[]) => void,
  onError?: (message: string) => void
) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const rows: Announcement[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      cb(rows);
    },
    (err) => {
      console.error("listen announcements error:", err);

      const msg =
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านประกาศ (permission denied)"
          : (err as any)?.message || "โหลดประกาศไม่สำเร็จ";

      onError?.(msg);
      cb([]);
    }
  );
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, COL, id));
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Pick<Announcement, "title" | "body" | "fileKey" | "fileName" | "fileUrl" | "pinned">>
) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function setAnnouncementPinned(id: string, pinned: boolean) {
  await updateDoc(doc(db, COL, id), {
    pinned,
    updatedAt: serverTimestamp(),
  });
}
