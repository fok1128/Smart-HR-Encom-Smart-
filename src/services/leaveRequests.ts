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

export type LeaveMode = "allDay" | "time";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

export type LeaveRequestDoc = {
  id: string;
  requestNo: string;

  uid: string;
  email?: string | null;

  category: string;
  subType: string;

  mode: LeaveMode;
  startAt: string; // allDay => YYYY-MM-DD, time => YYYY-MM-DDTHH:mm
  endAt: string;

  reason: string;

  files?: { name: string; size: number }[];
  attachments?: { name: string; size: number }[];

  status: LeaveStatus;

  submittedAt?: any;
  updatedAt?: any;

  decisionNote?: string | null;
  approvedBy?: { uid: string; email?: string | null } | null;
  rejectedBy?: { uid: string; email?: string | null } | null;
  approvedAt?: any;
  rejectedAt?: any;
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

export async function createLeaveRequest(payload: {
  uid: string;
  email?: string | null;
  category: string;
  subType: string;
  mode: LeaveMode;
  startAt: string;
  endAt: string;
  reason: string;
  files?: { name: string; size: number }[];
  attachments?: { name: string; size: number }[];
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

// ✅ เพิ่ม onError optional + กัน uid ว่าง + ใส่ error callback ให้ onSnapshot
export function listenMyLeaveRequests(
  uid: string,
  cb: (rows: LeaveRequestDoc[]) => void,
  onError?: (message: string) => void
) {
  if (!uid) {
    cb([]);
    return () => {};
  }

  // ✅ ใช้ where อย่างเดียว ไม่ orderBy -> ไม่ต้องสร้าง composite index
  const qy = query(colRef, where("uid", "==", uid));

  return onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LeaveRequestDoc[];

      // ✅ sort ฝั่ง client แทน (submittedAt อาจเป็น Timestamp)
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
        err?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านใบลาของคุณ (permission denied)"
          : err?.message || "โหลดใบลาของคุณไม่สำเร็จ";
      onError?.(msg);
      cb([]);
    }
  );
}

/** ✅ สำหรับหน้าอนุมัติ (PENDING) */
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
        err?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านใบลาที่รออนุมัติ (permission denied)"
          : err?.message || "โหลดใบลาที่รออนุมัติไม่สำเร็จ";
      onError?.(msg);
      cb([]);
    }
  );
}

/** ✅ Admin แก้ไข */
export async function adminUpdateLeaveRequest(id: string, patch: Partial<LeaveRequestDoc>) {
  await updateDoc(doc(db, "leave_requests", id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/** ✅ Admin ลบ */
export async function adminDeleteLeaveRequest(id: string) {
  await deleteDoc(doc(db, "leave_requests", id));
}

/** ✅ อนุมัติ/ปฏิเสธ */
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
