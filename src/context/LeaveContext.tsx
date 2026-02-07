// LeaveContext.tsx
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

export type LeaveStatus = "รอดำเนินการ" | "อนุมัติ" | "ไม่อนุมัติ";
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

  // ✅ snapshot ผู้ยื่น
  employeeNo?: string;
  employeeName?: string;
  phone?: string;

  requestNo: string;
  category: LeaveCategory;
  subType: LeaveSubType;
  startAt: string;
  endAt: string;
  reason?: string;

  attachments?: { name: string; size: number; url?: string; storagePath?: string; key?: string }[];
  files?: { name: string; size: number }[];

  status: LeaveStatus;

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

  calendarRequests: LeaveRequest[];
  loadingCalendar: boolean;

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

function normRole(role?: string) {
  return String(role || "").trim().toUpperCase();
}
function isApproverRole(role?: string) {
  const r = normRole(role);
  return ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"].includes(r);
}

function normalizeStatusToThai(s: any): LeaveStatus {
  const v = String(s || "").trim();
  if (v === "PENDING") return "รอดำเนินการ";
  if (v === "APPROVED") return "อนุมัติ";
  if (v === "REJECTED") return "ไม่อนุมัติ";
  if (v === "รอดำเนินการ") return "รอดำเนินการ";
  if (v === "อนุมัติ") return "อนุมัติ";
  if (v === "ไม่อนุมัติ") return "ไม่อนุมัติ";
  return "รอดำเนินการ";
}

function tsToMs(ts: any): number {
  try {
    if (ts?.toDate) return ts.toDate().getTime();
    if (typeof ts?.seconds === "number") return ts.seconds * 1000;
    const d = ts instanceof Date ? ts : ts ? new Date(ts) : null;
    return d ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

function sortLatestFirst(a: LeaveRequest, b: LeaveRequest) {
  const at = tsToMs(a.submittedAt) || tsToMs(a.createdAt) || tsToMs(a.updatedAt);
  const bt = tsToMs(b.submittedAt) || tsToMs(b.createdAt) || tsToMs(b.updatedAt);
  return bt - at;
}

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function mapDocToLeaveRequest(d: any): LeaveRequest {
  const data: any = d.data();
  return {
    id: d.id,
    uid: data.uid,
    createdByEmail: pickStr(data.createdByEmail, data.email, data.userEmail) || undefined,

    employeeNo: pickStr(data.employeeNo, data.empNo, data.createdByEmployeeNo) || undefined,
    employeeName: pickStr(data.employeeName, data.createdByName, data.requesterName) || undefined,
    phone: pickStr(data.phone, data.createdByPhone, data.tel, data.mobile) || undefined,

    requestNo: data.requestNo,
    category: data.category,
    subType: data.subType,
    startAt: data.startAt,
    endAt: data.endAt,
    reason: data.reason ?? "",

    attachments: data.attachments ?? [],
    files: data.files ?? [],

    status: normalizeStatusToThai(data.status),

    submittedAt: data.submittedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,

    rejectReason: data.rejectReason ?? undefined,
    decisionNote: data.decisionNote ?? undefined,

    decidedAt: data.decidedAt ?? undefined,
    approvedAt: data.approvedAt ?? undefined,
    rejectedAt: data.rejectedAt ?? undefined,
  };
}

export function LeaveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const role = normRole(user?.role);
  const isAdmin = role === "ADMIN";
  const canApprove = isApproverRole(role);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [calendarRequests, setCalendarRequests] = useState<LeaveRequest[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  // 1) Stream หน้า Approve
  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, "leave_requests");

    const qy = canApprove
      ? query(colRef, where("status", "in", ["รอดำเนินการ", "PENDING"]))
      : query(colRef, where("uid", "==", user.uid));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => mapDocToLeaveRequest(d));
        rows.sort(sortLatestFirst);
        setRequests(rows);
        setLoading(false);
      },
      (err: any) => {
        console.error("LeaveContext onSnapshot error:", err);
        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, canApprove]);

  // 2) Stream หน้า Calendar
  useEffect(() => {
    if (!user?.uid) {
      setCalendarRequests([]);
      setLoadingCalendar(false);
      return;
    }

    setLoadingCalendar(true);
    const colRef = collection(db, "leave_requests");

    const qy = canApprove ? query(colRef) : query(colRef, where("uid", "==", user.uid));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => mapDocToLeaveRequest(d));
        rows.sort(sortLatestFirst);
        setCalendarRequests(rows);
        setLoadingCalendar(false);
      },
      (err: any) => {
        console.error("LeaveContext calendar onSnapshot error:", err);
        setCalendarRequests([]);
        setLoadingCalendar(false);
      }
    );

    return () => unsub();
  }, [user?.uid, canApprove]);

  const submitLeave = async (payload: LeavePayload) => {
    if (!user?.uid) throw new Error("UNAUTHORIZED");

    const requestNo = genRequestNo6();

    // ✅ เอาจาก AuthContext ที่ normalize แล้ว (สำคัญมาก)
    const employeeNo = pickStr((user as any)?.employeeNo, (user as any)?.empNo, (user as any)?.employee?.employeeNo) || null;
    const uf = pickStr((user as any)?.fname, (user as any)?.user?.fname, (user as any)?.employee?.fname);
    const ul = pickStr((user as any)?.lname, (user as any)?.user?.lname, (user as any)?.employee?.lname);
    const employeeName = `${uf} ${ul}`.trim() || null;

    const phone = pickStr((user as any)?.phone, (user as any)?.employee?.phone, (user as any)?.user?.phone) || null;

    const docRef = await addDoc(collection(db, "leave_requests"), {
      uid: user.uid,
      createdByEmail: user.email ?? null,

      // ✅ snapshot (เอาไว้ให้ทุกหน้าโชว์ได้ โดยไม่อ่าน users ของคนอื่น)
      employeeNo,
      employeeName,
      phone,

      requestNo,
      category: payload.category,
      subType: payload.subType,
      startAt: payload.startAt,
      endAt: payload.endAt,
      reason: payload.reason ?? "",

      attachments: payload.attachments ?? [],

      status: "รอดำเนินการ",
      rejectReason: null,
      decisionNote: null,
      decidedAt: null,

      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: docRef.id, requestNo };
  };

  const updateStatus = async (id: string, status: LeaveStatus, reason?: string) => {
    if (!canApprove) throw new Error("FORBIDDEN");

    // ✅ patch อยู่ใน whitelist rules แน่นอน
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
      const note = (reason ?? "").trim();
      patch.rejectReason = note || null;
      patch.decisionNote = note || null;
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

    try {
      const colRef = collection(db, "leave_requests");

      const qList = [
        query(colRef, where("uid", "==", uid)),
        query(colRef, where("createdByUid", "==", uid)),
        query(colRef, where("userId", "==", uid)),
      ];

      const uniq = new Map<string, any>();
      for (const qy of qList) {
        const snap = await getDocs(qy);
        snap.docs.forEach((d) => uniq.set(d.id, d));
      }

      if (uniq.size === 0) return 0;

      const docs = Array.from(uniq.values());
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
    } catch (err: any) {
      console.error("deleteRequestsByUid error:", err);
      if (String(err?.code || "").includes("permission-denied")) {
        throw new Error("permission-denied: rules ไม่อนุญาตให้ลบ (Missing or insufficient permissions)");
      }
      throw err;
    }
  };

  const value: LeaveCtx = useMemo(
    () => ({
      requests,
      loading,
      calendarRequests,
      loadingCalendar,
      submitLeave,
      updateStatus,
      deleteRequest,
      deleteRequestsByUid,
    }),
    [requests, loading, calendarRequests, loadingCalendar]
  );

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used within LeaveProvider");
  return ctx;
}
