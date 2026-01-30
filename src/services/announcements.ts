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
        err?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านประกาศ (permission denied)"
          : err?.message || "โหลดประกาศไม่สำเร็จ";

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
