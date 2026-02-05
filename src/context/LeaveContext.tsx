import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

/** สถานะ */
export type LeaveStatus = "รอดำเนินการ" | "อนุมัติ" | "ไม่อนุมัติ";

/** ประเภท (ให้ตรงกับหน้า Submit/Calendar) */
export type LeaveCategory = "ลากิจ" | "ลาป่วย" | "ลาพักร้อน" | "ลากรณีพิเศษ";
export type LeaveSubType =
  | "ลากิจปกติ"
  | "ลากิจฉุกเฉิน"
  | "ลาป่วยทั่วไป"
  | "ลาหมอนัด"
  | "ลาแบบมีใบรับรองแพทย์"
  | "ลาพักร้อน"
  | "ลาคลอด"
  | "ลาราชการทหาร"
  | "อื่นๆ";

export type LeaveRequest = {
  id: string;
  uid: string;
  createdByEmail?: string;

  requestNo: string;
  category: LeaveCategory;
  subType: LeaveSubType;
  startAt: string;
  endAt: string;
  reason?: string;

  // ✅ รองรับไฟล์แบบมี url/storagePath
  attachments?: { name: string; size: number; url?: string; storagePath?: string }[];

  status: LeaveStatus;
  createdAt?: any;
  updatedAt?: any;

  rejectReason?: string;
  decidedAt?: any;
};

type LeavePayload = {
  category: LeaveCategory;
  subType: LeaveSubType;
  startAt: string;
  endAt: string;
  reason: string;

  // ✅ แก้ให้ตรงกับ LeaveRequest.attachments
  attachments?: { name: string; size: number; url?: string; storagePath?: string }[];
};

type LeaveCtx = {
  requests: LeaveRequest[];
  loading: boolean;

  submitLeave: (payload: LeavePayload) => Promise<{ id: string; requestNo: string }>;
  updateStatus: (id: string, status: LeaveStatus, reason?: string) => Promise<void>;

  deleteRequest: (id: string) => Promise<void>;
  deleteRequestsByUid: (uid: string) => Promise<number>;
};

const LeaveContext = createContext<LeaveCtx | undefined>(undefined);

function genRequestNo6() {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

function isApproverRole(role?: string) {
  const r = (role || "").toUpperCase();
  return ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"].includes(r);
}

export function LeaveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const role = (user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const canApprove = isApproverRole(role);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const colRef = collection(db, "leave_requests");

    // ✅ USER: อ่านของตัวเอง
    // ✅ Approver: อ่านเฉพาะ "รอดำเนินการ" กัน permission-denied ถ้า rules ไม่ให้ read ทั้ง collection
    const qy = canApprove
      ? query(colRef, where("status", "==", "รอดำเนินการ"))
      : query(colRef, where("uid", "==", user.uid));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: LeaveRequest[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            uid: data.uid,
            createdByEmail: data.createdByEmail,

            requestNo: data.requestNo,
            category: data.category,
            subType: data.subType,
            startAt: data.startAt,
            endAt: data.endAt,
            reason: data.reason ?? "",
            attachments: data.attachments ?? [],

            status: data.status as LeaveStatus,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,

            rejectReason: data.rejectReason ?? undefined,
            decidedAt: data.decidedAt ?? undefined,
          };
        });

        rows.sort((a, b) => {
          const at = a.createdAt?.seconds ?? 0;
          const bt = b.createdAt?.seconds ?? 0;
          return bt - at;
        });

        setRequests(rows);
        setLoading(false);
      },
      (err: any) => {
        console.error("LeaveContext onSnapshot error:", err);

        const msg =
          err?.code === "permission-denied"
            ? "ไม่มีสิทธิ์อ่านข้อมูลการลา (permission denied)"
            : err?.message || "โหลดข้อมูลการลาไม่สำเร็จ";

        // ✅ กัน TS6133: ใช้ msg จริง (ถ้ามี toast ก็เปลี่ยนเป็น toast(msg) ได้)
        console.warn(msg);

        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, canApprove]);

  const submitLeave = async (payload: LeavePayload) => {
    if (!user?.uid) throw new Error("UNAUTHORIZED");

    const requestNo = genRequestNo6();

    const docRef = await addDoc(collection(db, "leave_requests"), {
      uid: user.uid,
      createdByEmail: user.email ?? null,

      requestNo,
      category: payload.category,
      subType: payload.subType,
      startAt: payload.startAt,
      endAt: payload.endAt,
      reason: payload.reason ?? "",
      attachments: payload.attachments ?? [],

      status: "รอดำเนินการ",
      rejectReason: null,
      decidedAt: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: docRef.id, requestNo };
  };

  const updateStatus = async (id: string, status: LeaveStatus, reason?: string) => {
    if (!canApprove) throw new Error("FORBIDDEN");

    const patch: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === "อนุมัติ" || status === "ไม่อนุมัติ") {
      patch.decidedAt = serverTimestamp();
    }

    if (status === "ไม่อนุมัติ") {
      patch.rejectReason = (reason ?? "").trim();
    } else {
      patch.rejectReason = null;
    }

    await updateDoc(doc(db, "leave_requests", id), patch);
  };

  const deleteRequest = async (id: string) => {
    if (!isAdmin) throw new Error("FORBIDDEN");
    await deleteDoc(doc(db, "leave_requests", id));
  };

  const deleteRequestsByUid = async (uid: string) => {
    if (!isAdmin) throw new Error("FORBIDDEN");

    const colRef = collection(db, "leave_requests");
    const qy = query(colRef, where("uid", "==", uid));
    const snap = await getDocs(qy);

    if (snap.empty) return 0;

    const docs = snap.docs;
    const BATCH_LIMIT = 450;

    let deleted = 0;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const chunk = docs.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += chunk.length;
    }
    return deleted;
  };

  const value: LeaveCtx = useMemo(
    () => ({
      requests,
      loading,
      submitLeave,
      updateStatus,
      deleteRequest,
      deleteRequestsByUid,
    }),
    [requests, loading]
  );

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used within LeaveProvider");
  return ctx;
}
