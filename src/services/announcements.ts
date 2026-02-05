import { db, storage } from "../firebase";
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
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  fileUrl?: string | null;
  fileName?: string | null;

  pinned?: boolean;
  createdAt?: any;
  updatedAt?: any;

  createdBy?: { uid: string; email?: string };
};

const COL = "announcements";

/**
 * ✅ อัปโหลดไฟล์ประกาศด้วย Firebase Storage SDK (แก้ค้าง 0% + CORS)
 * คืนค่า {url, name} เพื่อเอาไปใส่ fileUrl/fileName ได้เลย
 */
export async function uploadAnnouncementFile(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; name: string; path: string }> {
  if (!uid) throw new Error("MISSING_UID");
  if (!file) throw new Error("MISSING_FILE");

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `announcement_files/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || undefined,
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          const percent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress?.(Math.min(100, Math.max(0, percent)));
        }
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, name: file.name, path });
      }
    );
  });
}

export async function createAnnouncement(params: {
  title: string;
  body: string;
  fileUrl?: string | null;
  fileName?: string | null;
  createdBy: { uid: string; email?: string };
  pinned?: boolean;
}) {
  return addDoc(collection(db, COL), {
    title: params.title,
    body: params.body,
    fileUrl: params.fileUrl ?? null,
    fileName: params.fileName ?? null,

    pinned: !!params.pinned,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    createdBy: params.createdBy,
  });
}

/**
 * ✅ สะดวกสุด: ถ้ามีไฟล์แนบ ให้เรียกตัวนี้
 * มันจะอัปโหลดก่อน แล้วค่อย createAnnouncement ให้เอง
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
      fileUrl: up.url,
      fileName: up.name,
    });
  }
  return createAnnouncement({ ...params, fileUrl: null, fileName: null });
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
      cb([]); // ✅ กัน UI พัง
    }
  );
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, COL, id));
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Pick<Announcement, "title" | "body" | "fileUrl" | "fileName" | "pinned">>
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
