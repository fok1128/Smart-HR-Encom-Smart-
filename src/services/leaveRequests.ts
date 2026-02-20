// src/services/leaveRequests.ts
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export type LeaveMode = "allDay" | "time";

// legacy status (ไว้ใช้กับ query/หน้าเก่า)
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

// ✅ overall workflow
export type OverallStatus =
  | "PENDING_HR"
  | "REJECTED_BY_HR"
  | "PENDING_MANAGER"
  | "REJECTED_BY_MANAGER"
  | "APPROVED"
  | "CANCELED";

export type StepStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
export type ManagerStepStatus = "LOCKED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

export type Actor = { uid: string; email?: string | null; role?: string | null; name?: string | null };

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

  startYMD?: string | null;
  endYMD?: string | null;
  leaveYear?: number | null;

  reason: string;

  files?: { name: string; size: number }[];
  attachments?: LeaveAttachment[];

  // ✅ legacy (final status)
  status: LeaveStatus;

  // ✅ new workflow
  overallStatus?: OverallStatus;
  hrStatus?: StepStatus;
  hrComment?: string | null;
  hrActionAt?: any;
  hrActionBy?: Actor | null;

  managerStatus?: ManagerStepStatus;
  managerComment?: string | null;
  managerActionAt?: any;
  managerActionBy?: Actor | null;

  canceledByRole?: "USER" | "HR" | "EXECUTIVE_MANAGER" | "ADMIN" | null;
  canceledBy?: Actor | null;
  canceledReason?: string | null;
  canceledAt?: any;

  submittedAt?: any;
  updatedAt?: any;

  // legacy decision fields (ยังใช้ได้)
  decisionNote?: string | null;
  approvedBy?: { uid: string; email?: string | null } | null;
  rejectedBy?: { uid: string; email?: string | null } | null;
  approvedAt?: any;
  rejectedAt?: any;
  decidedAt?: any;

  rejectReason?: string | null;

  createdByEmail?: string | null;
  employeeNo?: string | null;
  employeeName?: string | null;
  phone?: string | null;

  workdaysCount?: number;
  leaveUnits?: number | null;

  isRetroactive?: boolean;
  retroReason?: string | null;

  requireMedicalCert?: boolean;
  medicalCertDueAt?: string | null;

  medicalCertProvided?: boolean;
  medicalCertSubmittedAt?: string | null;
  medicalCertSource?: "UPLOADED_WITH_REQUEST" | "UPLOADED_LATER" | null;
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

/** ✅ helper: POST JSON + แนบ Bearer token (กัน payload เป็น {}) */
async function postJson(path: string, body: any) {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    const msg = data?.error || data?.message || `REQUEST_FAILED (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export function getAttachmentKey(att: any): string | null {
  return String(att?.storagePath || att?.key || "").trim() || null;
}

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

function normalizeUploadResponse(data: any, f: File): LeaveAttachment {
  const first = (Array.isArray(data?.attachments) && data.attachments[0]) || null;

  const key = String(first?.storagePath || first?.key || data?.key || "").trim();
  if (!key) throw new Error("UPLOAD_OK_BUT_MISSING_KEY");

  const name = first?.name || data?.name || f.name;
  const size = first?.size || data?.size || f.size;
  const contentType = first?.contentType || data?.contentType || f.type || undefined;

  return { name, size, storagePath: key, contentType };
}

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
    fd.append("file", f);
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

/** ✅ ลบไฟล์แนบออกจากคำร้อง + ลบใน Supabase จริง (ใช้กับหน้าแก้ไขคำร้อง) */
export async function deleteFilesFromLeaveRequest(input: { requestId: string; keys: string[] }) {
  const requestId = String(input?.requestId || "").trim();
  const keys = Array.isArray(input?.keys) ? input.keys.filter(Boolean) : [];

  if (!requestId) throw new Error("MISSING_REQUEST_ID");
  if (!keys.length) throw new Error("MISSING_KEYS");

  const results: any[] = [];
  for (const key of keys) {
    // ✅ backend ต้องรับ { requestId, key }
    const data = await postJson("/files/delete", { requestId, key });
    results.push(data);
  }
  return results;
}

/** ✅ ดึงคำร้อง 1 ใบ */
export async function getLeaveRequestById(id: string): Promise<LeaveRequestDoc | null> {
  if (!id) return null;
  const snap = await getDoc(doc(db, "leave_requests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as LeaveRequestDoc;
}

/** ✅ create: ตั้งค่า workflow 2 ชั้นตั้งแต่ต้น */
export async function createLeaveRequest(
  payload: Omit<LeaveRequestDoc, "id" | "requestNo" | "status" | "submittedAt" | "updatedAt">
) {
  const requestNo = genRequestNo();
  const docRef = await addDoc(colRef, {
    ...payload,
    requestNo,

    // legacy
    status: "PENDING",

    // new workflow
    overallStatus: "PENDING_HR",
    hrStatus: "PENDING",
    hrComment: null,
    hrActionAt: null,
    hrActionBy: null,

    managerStatus: "LOCKED",
    managerComment: null,
    managerActionAt: null,
    managerActionBy: null,

    canceledByRole: null,
    canceledBy: null,
    canceledReason: null,
    canceledAt: null,

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
    files: (files || []).map((f) => ({ name: f.name, size: f.size })),
    attachments,
  });
}

export async function addLeaveAttachments(
  leaveRequestId: string,
  uid: string,
  files: File[],
  onProgress?: (percent: number) => void
) {
  if (!leaveRequestId) throw new Error("MISSING_LEAVE_REQUEST_ID");
  if (!uid) throw new Error("MISSING_UID");

  const attachments = await uploadLeaveAttachments(uid, files, onProgress);
  const legacyFiles = (files || []).map((f) => ({ name: f.name, size: f.size }));

  await updateDoc(doc(db, "leave_requests", leaveRequestId), {
    attachments: arrayUnion(...attachments),
    files: arrayUnion(...legacyFiles),
    updatedAt: serverTimestamp(),
  });

  return attachments;
}

/** ✅ แก้ไขคำร้องของ “เจ้าของ” (ได้เฉพาะตอนยังรอ HR) */
export async function updateMyPendingLeaveRequest(
  id: string,
  uid: string,
  patch: Partial<
    Pick<LeaveRequestDoc, "category" | "subType" | "startAt" | "endAt" | "reason" | "attachments" | "files">
  >,
  newFiles?: File[],
  onProgress?: (percent: number) => void
) {
  if (!id) throw new Error("MISSING_ID");
  if (!uid) throw new Error("MISSING_UID");

  // ✅ upload เพิ่ม (ถ้ามี)
  let addAtts: LeaveAttachment[] = [];
  let addLegacy: { name: string; size: number }[] = [];

  if (newFiles && newFiles.length > 0) {
    addAtts = await uploadLeaveAttachments(uid, newFiles, onProgress);
    addLegacy = newFiles.map((f) => ({ name: f.name, size: f.size }));
  }

  const out: any = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  // เพิ่มไฟล์แบบ arrayUnion (ไม่ทับของเดิม)
  if (addAtts.length > 0) out.attachments = arrayUnion(...addAtts);
  if (addLegacy.length > 0) out.files = arrayUnion(...addLegacy);

  await updateDoc(doc(db, "leave_requests", id), out);
}

/** ✅ cancel โดย “เจ้าของ” (ได้เฉพาะตอนยังรอ HR) */
export async function cancelMyPendingLeaveRequest(id: string, by: Actor, reason: string) {
  if (!id) throw new Error("MISSING_ID");
  if (!by?.uid) throw new Error("MISSING_ACTOR");
  const r = String(reason || "").trim();
  if (!r) throw new Error("MISSING_CANCEL_REASON");

  await updateDoc(doc(db, "leave_requests", id), {
    status: "CANCELED",
    overallStatus: "CANCELED",

    hrStatus: "CANCELED",
    hrComment: r,
    hrActionAt: serverTimestamp(),
    hrActionBy: by,

    managerStatus: "LOCKED",
    managerComment: null,
    managerActionAt: null,
    managerActionBy: null,

    canceledByRole: "USER",
    canceledBy: by,
    canceledReason: r,
    canceledAt: serverTimestamp(),

    decidedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** ✅ Queue สำหรับ Approver ตาม role */
export function listenApproverQueue(
  role: string,
  cb: (rows: LeaveRequestDoc[]) => void,
  onError?: (message: string) => void
) {
  const R = String(role || "").toUpperCase();

  // ADMIN เห็นทั้งสองคิวรวม (ยังไม่จบ)
  if (R === "ADMIN") {
    const qy = query(colRef, where("status", "==", "PENDING"), orderBy("submittedAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LeaveRequestDoc[]),
      (err) => {
        console.error(err);
        onError?.((err as any)?.message || "โหลดคิวไม่สำเร็จ");
        cb([]);
      }
    );
  }

  // HR เห็นเฉพาะ pending_hr
  if (R === "HR") {
    const qy = query(colRef, where("overallStatus", "==", "PENDING_HR"), orderBy("submittedAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LeaveRequestDoc[]),
      (err) => {
        console.error(err);
        onError?.((err as any)?.message || "โหลดคิว HR ไม่สำเร็จ");
        cb([]);
      }
    );
  }

  // EXECUTIVE_MANAGER เห็นเฉพาะ pending_manager
  if (R === "EXECUTIVE_MANAGER") {
    const qy = query(colRef, where("overallStatus", "==", "PENDING_MANAGER"), orderBy("submittedAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LeaveRequestDoc[]),
      (err) => {
        console.error(err);
        onError?.((err as any)?.message || "โหลดคิวผู้บริหารไม่สำเร็จ");
        cb([]);
      }
    );
  }

  // role อื่นไม่ควรเรียก
  cb([]);
  return () => {};
}

/** ✅ HR approve -> ส่งต่อให้ผู้บริหาร */
export async function hrApproveLeaveRequest(id: string, by: Actor, comment?: string) {
  await updateDoc(doc(db, "leave_requests", id), {
    // workflow
    hrStatus: "APPROVED",
    hrComment: comment?.trim() || null,
    hrActionAt: serverTimestamp(),
    hrActionBy: by,

    managerStatus: "PENDING",
    overallStatus: "PENDING_MANAGER",

    // legacy: ยังไม่ final
    status: "PENDING",

    updatedAt: serverTimestamp(),
  });
}

/** ✅ HR reject (ต้องมีเหตุผล) -> จบ */
export async function hrRejectLeaveRequest(id: string, by: Actor, reason: string) {
  const r = String(reason || "").trim();
  if (!r) throw new Error("MISSING_REJECT_REASON");

  await updateDoc(doc(db, "leave_requests", id), {
    hrStatus: "REJECTED",
    hrComment: r,
    hrActionAt: serverTimestamp(),
    hrActionBy: by,

    managerStatus: "LOCKED",
    overallStatus: "REJECTED_BY_HR",

    // legacy final
    status: "REJECTED",
    rejectReason: r,
    rejectedBy: { uid: by.uid, email: by.email ?? null },
    rejectedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });
}

/** ✅ ผู้บริหาร approve -> final */
export async function managerApproveLeaveRequest(id: string, by: Actor, comment?: string) {
  await updateDoc(doc(db, "leave_requests", id), {
    managerStatus: "APPROVED",
    managerComment: comment?.trim() || null,
    managerActionAt: serverTimestamp(),
    managerActionBy: by,

    overallStatus: "APPROVED",

    // legacy final
    status: "APPROVED",
    approvedBy: { uid: by.uid, email: by.email ?? null },
    approvedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });
}

/** ✅ ผู้บริหาร reject -> final */
export async function managerRejectLeaveRequest(id: string, by: Actor, reason: string) {
  const r = String(reason || "").trim();
  if (!r) throw new Error("MISSING_REJECT_REASON");

  await updateDoc(doc(db, "leave_requests", id), {
    managerStatus: "REJECTED",
    managerComment: r,
    managerActionAt: serverTimestamp(),
    managerActionBy: by,

    overallStatus: "REJECTED_BY_MANAGER",

    // legacy final
    status: "REJECTED",
    rejectReason: r,
    rejectedBy: { uid: by.uid, email: by.email ?? null },
    rejectedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });
}

/** ✅ cancel โดย HR/EXECUTIVE_MANAGER/ADMIN (ต้องมีเหตุผล) */
export async function approverCancelLeaveRequest(
  id: string,
  by: Actor,
  byRole: "HR" | "EXECUTIVE_MANAGER" | "ADMIN",
  reason: string
) {
  const r = String(reason || "").trim();
  if (!r) throw new Error("MISSING_CANCEL_REASON");

  const patch: any = {
    status: "CANCELED",
    overallStatus: "CANCELED",

    canceledByRole: byRole,
    canceledBy: by,
    canceledReason: r,
    canceledAt: serverTimestamp(),

    decidedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // สะท้อนลง step ที่เกี่ยวข้อง
  if (byRole === "HR") {
    patch.hrStatus = "CANCELED";
    patch.hrComment = r;
    patch.hrActionAt = serverTimestamp();
    patch.hrActionBy = by;
  } else {
    patch.managerStatus = "CANCELED";
    patch.managerComment = r;
    patch.managerActionAt = serverTimestamp();
    patch.managerActionBy = by;
  }

  await updateDoc(doc(db, "leave_requests", id), patch);
}

/** ✅ ของเดิม: listen ใบลาของฉัน */
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
        const ams = (a as any).submittedAt?.toDate?.()?.getTime?.() ?? 0;
        const bms = (b as any).submittedAt?.toDate?.()?.getTime?.() ?? 0;
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

/** ✅ ของเดิม: คำนวณลากิจใช้ไปแล้ว */
export async function getMyBusinessLeaveUsage(uid: string, year: number): Promise<number> {
  if (!uid) return 0;

  const start = `${year}-01-01`;
  const end = `${year}-12-31T23:59`;

  const qy = query(
    colRef,
    where("uid", "==", uid),
    where("category", "==", "ลากิจ"),
    where("startAt", ">=", start),
    where("startAt", "<=", end)
  );

  const snap = await getDocs(qy);
  let sum = 0;

  snap.docs.forEach((d) => {
    const data: any = d.data();
    const status = String(data.status || "").toUpperCase();
    if (status !== "PENDING" && status !== "APPROVED") return;

    const units = typeof data.leaveUnits === "number" ? data.leaveUnits : null;
    const wd = typeof data.workdaysCount === "number" ? data.workdaysCount : 0;

    sum += units != null ? units : wd;
  });

  return Number(sum.toFixed(2));
}

/** ✅ admin delete (เหมือนเดิม) */
export async function adminDeleteLeaveRequest(id: string) {
  await deleteDoc(doc(db, "leave_requests", id));
}
