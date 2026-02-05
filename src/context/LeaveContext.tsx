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

/** สถานะ (หน้าเว็บใช้ไทย) */
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
  attachments?: { name: string; size: number; url?: string; storagePath?: string; key?: string }[];

  // เผื่อของเก่า
  files?: { name: string; size: number }[];

  status: LeaveStatus;

  // รองรับของเก่า/ใหม่
  createdAt?: any;
  submittedAt?: any;
  updatedAt?: any;

  rejectReason?: string;
  decisionNote?: string;
  decidedAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
};

type LeavePayload = {
  category: LeaveCategory;
  subType: LeaveSubType;
  startAt: string;
  endAt: string;
  reason: string;

  attachments?: { name: string; size: number; url?: string; storagePath?: string; key?: string }[];
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

/** ✅ normalize สถานะจากของใหม่/ของเก่าให้เป็นไทย */
function normalizeStatusToThai(s: any): LeaveStatus {
  const v = String(s || "").trim();

  // ของใหม่ (EN)
  if (v === "PENDING") return "รอดำเนินการ";
  if (v === "APPROVED") return "อนุมัติ";
  if (v === "REJECTED") return "ไม่อนุมัติ";

  // ของเก่า (TH)
  if (v === "รอดำเนินการ") return "รอดำเนินการ";
  if (v === "อนุมัติ") return "อนุมัติ";
  if (v === "ไม่อนุมัติ") return "ไม่อนุมัติ";

  return "รอดำเนินการ";
}

/** ✅ เอาไว้ sort โดยไม่ต้อง orderBy ใน query (กันเรื่อง index) */
function tsToMs(ts: any): number {
  try {
    // Firestore Timestamp
    if (ts?.toDate) return ts.toDate().getTime();
    if (typeof ts?.seconds === "number") return ts.seconds * 1000;
    // string / Date
    const d = ts instanceof Date ? ts : ts ? new Date(ts) : null;
    return d ? d.getTime() : 0;
  } catch {
    return 0;
  }
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

    /**
     * ✅ USER: อ่านของตัวเองทั้งหมด
     * ✅ Approver: อ่านเฉพาะ pending แต่ครอบทั้งของใหม่/ของเก่า
     *
     * 🔥 สำคัญ: ไม่ใช้ orderBy เพื่อไม่ต้องสร้าง composite index
     */
    const qy = canApprove
      ? query(colRef, where("status", "in", ["รอดำเนินการ", "PENDING"]))
      : query(colRef, where("uid", "==", user.uid));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: LeaveRequest[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            uid: data.uid,
            createdByEmail: data.createdByEmail ?? data.email ?? undefined,

            requestNo: data.requestNo,
            category: data.category,
            subType: data.subType,
            startAt: data.startAt,
            endAt: data.endAt,
            reason: data.reason ?? "",

            attachments: data.attachments ?? [],
            files: data.files ?? [],

            status: normalizeStatusToThai(data.status),

            createdAt: data.createdAt,
            submittedAt: data.submittedAt,
            updatedAt: data.updatedAt,

            rejectReason: data.rejectReason ?? undefined,
            decisionNote: data.decisionNote ?? undefined,

            decidedAt: data.decidedAt ?? undefined,
            approvedAt: data.approvedAt ?? undefined,
            rejectedAt: data.rejectedAt ?? undefined,
          };
        });

        // ✅ sort ฝั่ง client (แทน orderBy)
        rows.sort((a, b) => {
          const at = tsToMs(a.submittedAt) || tsToMs(a.createdAt) || tsToMs(a.updatedAt);
          const bt = tsToMs(b.submittedAt) || tsToMs(b.createdAt) || tsToMs(b.updatedAt);
          return bt - at;
        });

        setRequests(rows);
        setLoading(false);
      },
      (err: any) => {
        // ถ้าเจอ error จะเห็นใน console ชัด ๆ
        console.error("LeaveContext onSnapshot error:", err);
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

      // ✅ มี submittedAt ไว้ด้วย
      submittedAt: serverTimestamp(),
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

    if (status === "อนุมัติ") patch.approvedAt = serverTimestamp();
    if (status === "ไม่อนุมัติ") patch.rejectedAt = serverTimestamp();

    if (status === "ไม่อนุมัติ") {
      patch.rejectReason = (reason ?? "").trim();
      patch.decisionNote = (reason ?? "").trim() || null;
    } else {
      patch.rejectReason = null;
      patch.decisionNote = null;
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
