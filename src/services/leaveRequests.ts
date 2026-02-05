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
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebase";

export type LeaveMode = "allDay" | "time";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

// ✅ รองรับแนบไฟล์แบบใหม่ (มี url/path) แต่ยังไม่พังของเดิม
export type LeaveAttachment =
  | { name: string; size: number }
  | { name: string; size: number; url: string; path: string; contentType?: string };

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

  // เดิม
  files?: { name: string; size: number }[];
  // ใหม่ (ยังรับของเดิมได้)
  attachments?: LeaveAttachment[];

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

/**
 * ✅ อัปโหลดไฟล์แนบด้วย Firebase Storage SDK (แก้ค้าง 0% + CORS)
 * คืนค่าเป็น attachments ที่มี url/path พร้อมบันทึกลง Firestore ได้เลย
 */
export async function uploadLeaveAttachments(
  uid: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<LeaveAttachment[]> {
  if (!uid || !files?.length) return [];

  // รวม progress แบบง่าย ๆ
  let doneBytes = 0;
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const uploads = files.map(
    (file) =>
      new Promise<LeaveAttachment>((resolve, reject) => {
        const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
        const path = `leave_attachments/${uid}/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, path);

        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type || undefined,
        });

        let lastBytes = 0;

        task.on(
          "state_changed",
          (snap) => {
            const inc = snap.bytesTransferred - lastBytes;
            lastBytes = snap.bytesTransferred;
            doneBytes += Math.max(0, inc);

            if (totalBytes > 0) {
              const percent = Math.round((doneBytes / totalBytes) * 100);
              onProgress?.(Math.min(100, Math.max(0, percent)));
            }
          },
          (err) => reject(err),
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({
              name: file.name,
              size: file.size,
              url,
              path,
              contentType: file.type || undefined,
            });
          }
        );
      })
  );

  return Promise.all(uploads);
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

  // เดิม
  files?: { name: string; size: number }[];
  // ใหม่ (รองรับทั้งแบบเดิมและแบบมี url/path)
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

/**
 * ✅ สะดวกสุด: อัปโหลดไฟล์ก่อน แล้วค่อยสร้างใบลา
 * ใช้แทน createLeaveRequest ได้เลย (ถ้าหน้า UI มี File[])
 */
export async function createLeaveRequestWithFiles(
  payload: Omit<Parameters<typeof createLeaveRequest>[0], "attachments" | "files">,
  files: File[],
  onProgress?: (percent: number) => void
) {
  const attachments = await uploadLeaveAttachments(payload.uid, files, onProgress);
  return createLeaveRequest({
    ...payload,
    // เผื่อหน้าเดิมยังโชว์รายชื่อไฟล์จาก files/attachments
    files: files.map((f) => ({ name: f.name, size: f.size })),
    attachments,
  });
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
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านใบลาของคุณ (permission denied)"
          : (err as any)?.message || "โหลดใบลาของคุณไม่สำเร็จ";
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
        (err as any)?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่านใบลาที่รออนุมัติ (permission denied)"
          : (err as any)?.message || "โหลดใบลาที่รออนุมัติไม่สำเร็จ";
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
