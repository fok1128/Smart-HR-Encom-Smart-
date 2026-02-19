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
  limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getSignedUrl } from "./files";

export type AnnouncementAttachment = {
  key: string;
  name: string;
  size?: number;
  contentType?: string;
};

export type AnnouncementLink = {
  url: string;
  label?: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;

  /** ✅ new: multiple */
  attachments?: AnnouncementAttachment[] | null;
  links?: AnnouncementLink[] | null;

  /** ✅ legacy/new-single (keep for backward compat) */
  fileKey?: string | null;
  fileName?: string | null;
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

/** ✅ upload single file */
export async function uploadAnnouncementFile(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<AnnouncementAttachment> {
  if (!uid) throw new Error("MISSING_UID");
  if (!file) throw new Error("MISSING_FILE");

  const token = await getIdToken();

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "announcement");

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

  return { key: up.key, name: up.name, size: up.size, contentType: up.contentType };
}

/** ✅ upload multiple files by looping single upload (safe, no backend change) */
export async function uploadAnnouncementFiles(
  uid: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<AnnouncementAttachment[]> {
  const list = (files || []).filter(Boolean);
  if (!list.length) return [];

  const out: AnnouncementAttachment[] = [];
  for (let i = 0; i < list.length; i++) {
    // เริ่มต้น progress คร่าว ๆ
    const base = Math.floor((i / list.length) * 100);
    onProgress?.(Math.max(1, base));

    // ✅ ส่ง progress ของไฟล์นี้ให้ map เป็น overall progress
    const att = await uploadAnnouncementFile(uid, list[i], (p) => {
      const start = (i / list.length) * 100;
      const span = (1 / list.length) * 100;
      const overall = Math.floor(start + (Math.max(0, Math.min(p, 100)) / 100) * span);
      onProgress?.(Math.max(1, Math.min(100, overall)));
    });

    out.push(att);

    const done = Math.floor(((i + 1) / list.length) * 100);
    onProgress?.(done);
  }
  return out;
}

/** ✅ signed url (cached via files.ts) */
export async function getAnnouncementSignedUrl(fileKey: string): Promise<string> {
  return getSignedUrl(fileKey);
}

export async function createAnnouncement(params: {
  title: string;
  body: string;

  /** ✅ new */
  attachments?: AnnouncementAttachment[] | null;
  links?: AnnouncementLink[] | null;

  /** legacy */
  fileKey?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;

  createdBy: { uid: string; email?: string };
  pinned?: boolean;
}) {
  const atts = params.attachments ?? null;

  // ✅ backward compat: keep fileKey/fileName = first attachment if provided
  const first = Array.isArray(atts) && atts.length ? atts[0] : null;

  return addDoc(collection(db, COL), {
    title: params.title,
    body: params.body,

    // ✅ new (multiple)
    attachments: atts,
    links: params.links ?? null,

    // ✅ keep old fields for existing UI/records
    fileKey: params.fileKey ?? (first?.key ?? null),
    fileName: params.fileName ?? (first?.name ?? null),
    fileUrl: params.fileUrl ?? null,

    pinned: !!params.pinned,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: params.createdBy,
  });
}

/** ✅ create with multiple files (preferred) */
export async function createAnnouncementWithFiles(
  params: {
    title: string;
    body: string;
    createdBy: { uid: string; email?: string };
    pinned?: boolean;
    links?: AnnouncementLink[] | null;
  },
  files?: File[] | null,
  onProgress?: (percent: number) => void
) {
  const list = (files || []).filter(Boolean);
  if (list.length) {
    const atts = await uploadAnnouncementFiles(params.createdBy.uid, list, onProgress);
    return createAnnouncement({
      ...params,
      attachments: atts,
      links: params.links ?? null,
      fileUrl: null,
      // fileKey/fileName จะถูก set จาก attachment แรกอัตโนมัติ
    });
  }

  return createAnnouncement({
    ...params,
    attachments: null,
    links: params.links ?? null,
    fileKey: null,
    fileName: null,
    fileUrl: null,
  });
}

/** ✅ keep old API (single file) for compatibility */
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
  const files = file ? [file] : [];
  return createAnnouncementWithFiles(params, files, onProgress);
}

export function listenAnnouncements(
  cb: (items: Announcement[]) => void,
  onError?: (message: string) => void,
  opts?: { limit?: number }
) {
  const lim = Math.max(1, Math.min(Number(opts?.limit ?? 50), 200));
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(lim));

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
  data: Partial<
    Pick<
      Announcement,
      | "title"
      | "body"
      | "attachments"
      | "links"
      | "fileKey"
      | "fileName"
      | "fileUrl"
      | "pinned"
    >
  >
) {
  // ✅ if attachments provided, also keep fileKey/fileName as first attachment (compat)
  const atts = data.attachments;
  const first = Array.isArray(atts) && atts.length ? atts[0] : null;

  await updateDoc(doc(db, COL, id), {
    ...data,
    ...(atts !== undefined
      ? {
          fileKey: data.fileKey ?? (first?.key ?? null),
          fileName: data.fileName ?? (first?.name ?? null),
        }
      : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function setAnnouncementPinned(id: string, pinned: boolean) {
  await updateDoc(doc(db, COL, id), {
    pinned,
    updatedAt: serverTimestamp(),
  });
}
