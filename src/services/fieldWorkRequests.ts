// src/services/fieldWorkRequests.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  getDocs,
  limit,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export type FieldWorkAttachment = {
  name: string;
  size: number;
  storagePath: string;
  contentType?: string;
};

// ✅ NEW: snapshot ผู้ยื่น
export type FieldWorkSubmitter = {
  uid: string;
  email?: string | null;
  fname?: string;
  lname?: string;
  fullName?: string;
  phone?: string;
  employeeNo?: string;
  role?: string;
};

export type FieldWorkRequestDoc = {
  id: string;
  requestNo: string;

  uid: string;
  email?: string | null;

  // ✅ NEW
  submitter?: FieldWorkSubmitter | null;

  startAt: string; // YYYY-MM-DDTHH:mm
  endAt: string;
  place: string;
  note?: string | null;

  attachments?: FieldWorkAttachment[];

  status: "APPROVED";
  approvedBy: "SYSTEM";
  approvedAt?: any;
  submittedAt?: any;
  updatedAt?: any;
};

const colRef = collection(db, "field_work_requests");

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function rand4() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
function genRequestNo(d = new Date()) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `FW-${y}${m}${day}-${rand4()}`;
}

async function getToken() {
  const u = getAuth().currentUser;
  if (!u) throw new Error("UNAUTHORIZED");
  return u.getIdToken();
}

function mapAttachment(x: any): FieldWorkAttachment | null {
  if (!x) return null;
  const storagePath = String(x.storagePath || x.path || x.key || "");
  if (!storagePath) return null;
  return {
    name: String(x.name || "file"),
    size: Number(x.size || 0),
    storagePath,
    contentType: x.contentType ? String(x.contentType) : undefined,
  };
}

// ✅ helper: normalize submitter
function normalizeSubmitter(s: any): FieldWorkSubmitter | null {
  if (!s) return null;
  const uid = String(s.uid || "").trim();
  if (!uid) return null;

  const fname = String(s.fname || "").trim();
  const lname = String(s.lname || "").trim();
  const fullName =
    String(s.fullName || "").trim() || `${fname} ${lname}`.trim() || "";

  const phone = String(s.phone || "").trim() || undefined;
  const employeeNo = String(s.employeeNo || "").trim() || undefined;
  const role = String(s.role || "").trim() || undefined;

  return {
    uid,
    email: s.email ?? null,
    fname: fname || undefined,
    lname: lname || undefined,
    fullName: fullName || undefined,
    phone,
    employeeNo,
    role,
  };
}

/**
 * ✅ upload files -> attachments
 * รองรับ backend ที่คืน:
 * - { ok:true, attachments:[...] }
 * - { ok:true, files:[...] }
 * - { ok:true, key, name, size, contentType } (compat)
 */
export async function uploadFieldWorkFiles(files: File[]) {
  if (!files?.length) return [] as FieldWorkAttachment[];

  const token = await getToken();
  const fd = new FormData();

  fd.append("folder", "field_work_requests");
  for (const f of files) fd.append("files", f);

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    const err = data?.error || "UPLOAD_FAILED";
    if (err === "FOLDER_NOT_ALLOWED") {
      throw new Error("โฟลเดอร์อัปโหลดไม่ถูกอนุญาต (backend ยังไม่เปิด field_work_requests)");
    }
    if (err === "FILE_TYPE_NOT_ALLOWED") {
      throw new Error("ชนิดไฟล์ไม่ถูกต้อง (อนุญาตเฉพาะ PDF/รูปภาพ)");
    }
    if (err === "FILE_TOO_LARGE") {
      throw new Error("ไฟล์ใหญ่เกินกำหนด");
    }
    throw new Error(err);
  }

  const arr =
    (Array.isArray(data.attachments) && data.attachments) ||
    (Array.isArray(data.files) && data.files) ||
    null;

  if (arr) {
    return arr.map(mapAttachment).filter(Boolean) as FieldWorkAttachment[];
  }

  if (data.key || data.storagePath) {
    const one = mapAttachment({
      name: data.name,
      size: data.size,
      storagePath: data.storagePath || data.key,
      contentType: data.contentType,
    });
    return one ? [one] : [];
  }

  return [];
}

// ✅ create แบบไม่มีไฟล์ (เผื่ออนาคตเรียกใช้)
export async function createFieldWorkRequest(payload: {
  uid: string;
  email?: string | null;
  startAt: string;
  endAt: string;
  place: string;
  note?: string;
  submitter?: FieldWorkSubmitter | null;
}) {
  const requestNo = genRequestNo();

  const clean: any = {
    uid: payload.uid,
    email: payload.email ?? null,
    submitter: normalizeSubmitter(payload.submitter) || null,

    startAt: payload.startAt,
    endAt: payload.endAt,
    place: payload.place,
    requestNo,

    status: "APPROVED",
    approvedBy: "SYSTEM",
    approvedAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const note = String(payload.note ?? "").trim();
  if (note) clean.note = note;

  const docRef = await addDoc(colRef, clean);
  return { id: docRef.id, requestNo };
}

/**
 * ✅ create พร้อมไฟล์แนบ + submitter snapshot
 */
export async function createFieldWorkRequestWithFiles(payload: {
  uid: string;
  email?: string | null;
  startAt: string;
  endAt: string;
  place: string;
  note?: string;

  // ✅ NEW
  submitter?: FieldWorkSubmitter | null;

  files?: File[];
  attachments?: FieldWorkAttachment[];
}) {
  const attachments =
    payload.attachments?.length
      ? payload.attachments
      : payload.files?.length
        ? await uploadFieldWorkFiles(payload.files)
        : [];

  const requestNo = genRequestNo();

  const clean: any = {
    uid: payload.uid,
    email: payload.email ?? null,

    // ✅ ตัวจบ: เก็บ snapshot ลง doc เลย
    submitter: normalizeSubmitter(payload.submitter) || null,

    startAt: payload.startAt,
    endAt: payload.endAt,
    place: payload.place,
    requestNo,

    status: "APPROVED",
    approvedBy: "SYSTEM",
    approvedAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const note = String(payload.note ?? "").trim();
  if (note) clean.note = note;

  if (attachments.length) clean.attachments = attachments;

  const docRef = await addDoc(colRef, clean);
  return { id: docRef.id, requestNo, attachmentsCount: attachments.length };
}

export function listenMyFieldWorkRequests(
  uid: string,
  cb: (rows: FieldWorkRequestDoc[]) => void,
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
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as DocumentData),
      })) as FieldWorkRequestDoc[];

      rows.sort((a, b) => {
        const ams = a.submittedAt?.toDate?.()?.getTime?.() ?? 0;
        const bms = b.submittedAt?.toDate?.()?.getTime?.() ?? 0;
        return bms - ams;
      });

      cb(rows);
    },
    (err) => {
      console.error("listenMyFieldWorkRequests error:", err);
      const msg =
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านงานนอกสถานที่ของคุณ (permission denied)"
          : (err as any)?.message || "โหลดงานนอกสถานที่ไม่สำเร็จ";
      onError?.(msg);
      cb([]);
    }
  );
}

export function listenAllFieldWorkRequests(
  cb: (rows: FieldWorkRequestDoc[]) => void,
  onError?: (message: string) => void
) {
  const qy = query(colRef);

  return onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as DocumentData),
      })) as FieldWorkRequestDoc[];

      rows.sort((a, b) => {
        const ams = a.submittedAt?.toDate?.()?.getTime?.() ?? 0;
        const bms = b.submittedAt?.toDate?.()?.getTime?.() ?? 0;
        return bms - ams;
      });

      cb(rows);
    },
    (err) => {
      console.error("listenAllFieldWorkRequests error:", err);
      const msg =
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านงานนอกสถานที่ของทุกคน (permission denied)"
          : (err as any)?.message || "โหลดประวัติไม่สำเร็จ";
      onError?.(msg);
      cb([]);
    }
  );
}

export async function deleteFieldWorkRequest(id: string) {
  if (!id) throw new Error("MISSING_ID");
  await deleteDoc(doc(db, "field_work_requests", id));
}

// -----------------------------
// Legacy helper (รองรับเอกสารเก่า)
// ✅ FIX: users ของคุณไม่มี fname/lname แต่มี employeeNo → ไป employees/{employeeNo}
// -----------------------------
export async function getUserProfileByUid(
  uid: string
): Promise<{ fullName: string; phone: string }> {
  const safeUid = String(uid || "").trim();
  if (!safeUid) return { fullName: "", phone: "" };

  const pickFromAny = (d: any) => {
    const fn = String(d?.fname || d?.firstName || d?.firstname || "").trim();
    const ln = String(d?.lname || d?.lastName || d?.lastname || "").trim();
    const displayName = String(d?.displayName || d?.name || d?.fullName || "").trim();

    const fullName = ([fn, ln].filter(Boolean).join(" ").trim() || displayName || "").trim();

    const phone =
      String(d?.phone || d?.tel || d?.mobile || d?.phoneNumber || "").trim() ||
      String((Array.isArray(d?.phones) && d.phones[0]) || "").trim();

    return { fullName, phone };
  };

  // 1) users/{uid} เพื่อเอา employeeNo (และเผื่อมีชื่อ)
  try {
    const uSnap = await getDoc(doc(db, "users", safeUid));
    if (uSnap.exists()) {
      const uData = uSnap.data();

      // เผื่อบางคนมี fullName ใน users
      const fromUser = pickFromAny(uData);
      if (fromUser.fullName || fromUser.phone) return fromUser;

      // ✅ ตัวจริงของระบบคุณ: users มี employeeNo → employees/{employeeNo}
      const employeeNo = String((uData as any)?.employeeNo || "").trim();
      if (employeeNo) {
        const eSnap = await getDoc(doc(db, "employees", employeeNo));
        if (eSnap.exists()) return pickFromAny(eSnap.data());
      }
    }
  } catch {
    // อ่าน users ไม่ได้ก็ไป fallback ต่อ
  }

  // 2) fallback เผื่อโปรเจกต์เก่าเคยใช้ employees/{uid}
  try {
    const eByUid = await getDoc(doc(db, "employees", safeUid));
    if (eByUid.exists()) return pickFromAny(eByUid.data());
  } catch {}

  // 3) fallback เผื่อในอนาคตมี authUid
  try {
    const empCol = collection(db, "employees");
    const qEmp = query(empCol, where("authUid", "==", safeUid), limit(1));
    const sEmp = await getDocs(qEmp);
    if (!sEmp.empty) return pickFromAny(sEmp.docs[0].data());
  } catch {}

  return { fullName: "", phone: "" };
}

export async function getUserFullNameByUid(uid: string) {
  const p = await getUserProfileByUid(uid);
  return p.fullName;
}
