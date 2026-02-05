import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export type LeaveMode = "allDay" | "time";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

/**
 * ✅ แนบไฟล์แบบใหม่ (Supabase ผ่าน Backend)
 * - storagePath = key ที่ได้จาก /files/upload
 *
 * ยังรองรับของเดิม (url/path) ไว้กันพังข้อมูลเก่า
 */
export type LeaveAttachment =
  | { name: string; size: number }
  | { name: string; size: number; storagePath: string; contentType?: string }
  | { name: string; size: number; url: string; path?: string; contentType?: string }
  | { name: string; size: number; key: string; contentType?: string };

export type LeaveRequestDoc = {
  id: string;
  requestNo: string;

  uid: string;
  email?: string | null;

  category: string;
  subType: string;

  mode: LeaveMode;
  startAt: string;
  endAt: string;

  reason: string;

  // legacy
  files?: { name: string; size: number }[];

  // new
  attachments?: LeaveAttachment[];

  status: LeaveStatus;

  submittedAt?: any;
  updatedAt?: any;

  decisionNote?: string | null;
  approvedBy?: { uid: string; email?: string | null } | null;
  rejectedBy?: { uid: string; email?: string | null } | null;
  approvedAt?: any;
  rejectedAt?: any;

  // legacy
  rejectReason?: string | null;
};

const colRef = collection(db, "leave_requests");

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function rand4() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
export function genRequestNo(d = new Date()) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `LV-${y}${m}${day}-${rand4()}`;
}

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

async function getIdToken() {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken();
}

/** ✅ helper: ดึง key/storagePath จาก attachment */
export function getAttachmentKey(att: any): string | null {
  return String(att?.storagePath || att?.key || "").trim() || null;
}

/**
 * ✅ ขอ signed url จาก backend เพื่อใช้เปิดไฟล์บน Supabase
 */
export async function getSignedUrlForKey(key: string): Promise<string> {
  const token = await getIdToken();
  const url = `${API_BASE}/files/signed-url?key=${encodeURIComponent(key)}`;

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

/**
 * ✅ normalize response จาก backend ให้เป็น attachment แบบมาตรฐานเสมอ
 */
function normalizeUploadResponse(data: any, f: File): LeaveAttachment {
  const first =
    (Array.isArray(data?.attachments) && data.attachments[0]) || null;

  const key =
    String(first?.storagePath || first?.key || data?.key || "").trim();

  if (!key) throw new Error("UPLOAD_OK_BUT_MISSING_KEY");

  const name = first?.name || data?.name || f.name;
  const size = first?.size || data?.size || f.size;
  const contentType = first?.contentType || data?.contentType || f.type || undefined;

  return {
    name,
    size,
    storagePath: key,
    contentType,
  };
}

/**
 * ✅ อัปโหลดไฟล์แนบไป Supabase Storage ผ่าน Backend (/files/upload)
 * คืน attachments ที่มี storagePath (key)
 *
 * NOTE: ส่ง field เดียวพอ (กันอัปโหลดซ้ำ 2 เท่า)
 */
export async function uploadLeaveAttachments(
  uid: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<LeaveAttachment[]> {
  if (!uid || !files?.length) return [];

  const token = await getIdToken();
  const total = files.length;
  const out: LeaveAttachment[] = [];

  for (let i = 0; i < total; i++) {
    const f = files[i];

    const fd = new FormData();
    fd.append("file", f);          // ✅ ส่งแค่อันเดียวพอ
    fd.append("folder", "leave");

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

    out.push(normalizeUploadResponse(data, f));

    const pct = Math.round(((i + 1) / total) * 100);
    onProgress?.(pct);
  }

  return out;
}

export async function createLeaveRequest(payload: {
  uid: string;
  email?: string | null;
  category: string;
  subType: string;
  mode: LeaveMode;
  startAt: string;
  endAt: string;
  reason: string;

  // legacy
  files?: { name: string; size: number }[];

  // new
  attachments?: LeaveAttachment[];
}) {
  const requestNo = genRequestNo();
  const docRef = await addDoc(colRef, {
    ...payload,
    requestNo,
    status: "PENDING",
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, requestNo };
}

export async function createLeaveRequestWithFiles(
  payload: Omit<Parameters<typeof createLeaveRequest>[0], "attachments" | "files">,
  files: File[],
  onProgress?: (percent: number) => void
) {
  const attachments = await uploadLeaveAttachments(payload.uid, files, onProgress);
  return createLeaveRequest({
    ...payload,
    files: files.map((f) => ({ name: f.name, size: f.size })), // legacy เผื่อใช้
    attachments, // ✅ สำคัญ: admin ต้องใช้ตัวนี้
  });
}

export function listenMyLeaveRequests(
  uid: string,
  cb: (rows: LeaveRequestDoc[]) => void,
  onError?: (message: string) => void
) {
  if (!uid) {
    cb([]);
    return () => {};
  }

  const qy = query(colRef, where("uid", "==", uid));

  return onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LeaveRequestDoc[];

      rows.sort((a, b) => {
        const ams = a.submittedAt?.toDate?.()?.getTime?.() ?? 0;
        const bms = b.submittedAt?.toDate?.()?.getTime?.() ?? 0;
        return bms - ams;
      });

      cb(rows);
    },
    (err) => {
      console.error("listenMyLeaveRequests error:", err);
      const msg =
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านใบลาของคุณ (permission denied)"
          : (err as any)?.message || "โหลดใบลาของคุณไม่สำเร็จ";
      onError?.(msg);
      cb([]);
    }
  );
}

export function listenPendingLeaveRequests(
  cb: (rows: LeaveRequestDoc[]) => void,
  onError?: (message: string) => void
) {
  const qy = query(colRef, where("status", "==", "PENDING"), orderBy("submittedAt", "desc"));
  return onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(rows as LeaveRequestDoc[]);
    },
    (err) => {
      console.error("listenPendingLeaveRequests error:", err);
      const msg =
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านใบลาที่รออนุมัติ (permission denied)"
          : (err as any)?.message || "โหลดใบลาที่รออนุมัติไม่สำเร็จ";
      onError?.(msg);
      cb([]);
    }
  );
}

export async function adminUpdateLeaveRequest(id: string, patch: Partial<LeaveRequestDoc>) {
  await updateDoc(doc(db, "leave_requests", id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function adminDeleteLeaveRequest(id: string) {
  await deleteDoc(doc(db, "leave_requests", id));
}

export async function approveLeaveRequest(
  id: string,
  by: { uid: string; email?: string | null },
  note?: string
) {
  await updateDoc(doc(db, "leave_requests", id), {
    status: "APPROVED",
    approvedBy: by,
    approvedAt: serverTimestamp(),
    decisionNote: note || null,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectLeaveRequest(
  id: string,
  by: { uid: string; email?: string | null },
  note?: string
) {
  await updateDoc(doc(db, "leave_requests", id), {
    status: "REJECTED",
    rejectedBy: by,
    rejectedAt: serverTimestamp(),
    decisionNote: note || null,
    updatedAt: serverTimestamp(),
  });
}
