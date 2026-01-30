import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
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

export type LeaveAttachment = { name: string; size: number };

export type LeaveRequest = {
  id: string;
  uid: string;
  createdByEmail?: string;

  requestNo: string;
  category: LeaveCategory;
  subType: LeaveSubType;
  startAt: string; // YYYY-MM-DD | YYYY-MM-DDTHH:mm
  endAt: string; // YYYY-MM-DD | YYYY-MM-DDTHH:mm
  reason: string;
  attachments: LeaveAttachment[];
  status: LeaveStatus;
  submittedAt: string; // ISO string
};

type SubmitInput = Omit<
  LeaveRequest,
  "id" | "uid" | "createdByEmail" | "requestNo" | "status" | "submittedAt"
>;

type LeaveCtx = {
  requests: LeaveRequest[];
  loading: boolean;

  submitLeave: (input: SubmitInput) => Promise<LeaveRequest>;

  updateStatus: (id: string, status: LeaveStatus) => Promise<void>;
  updateRequest: (
    id: string,
    patch: Partial<
      Pick<LeaveRequest, "category" | "subType" | "startAt" | "endAt" | "reason" | "attachments">
    >
  ) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
};

const LeaveContext = createContext<LeaveCtx | null>(null);

const pad2 = (n: number) => String(n).padStart(2, "0");

function genRequestNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LV-${y}${m}${day}-${rand}`;
}

function normalizeDateOnly(s: string) {
  return String(s || "").slice(0, 10);
}
function normalizeDateTimeLocal(s: string) {
  return String(s || "").slice(0, 16);
}
function isTimed(s: string) {
  return String(s || "").includes("T");
}
function normalizeRange(startAt: string, endAt: string) {
  const timed = isTimed(startAt) || isTimed(endAt);
  const s = timed ? normalizeDateTimeLocal(startAt) : normalizeDateOnly(startAt);
  const e = timed ? normalizeDateTimeLocal(endAt) : normalizeDateOnly(endAt);
  if (new Date(e).getTime() < new Date(s).getTime()) return { startAt: s, endAt: s };
  return { startAt: s, endAt: e };
}

function tsToMs(ts: unknown): number {
  const anyTs = ts as { toDate?: () => Date };
  const d = anyTs?.toDate?.();
  return d instanceof Date ? d.getTime() : 0;
}
function tsToISO(ts: unknown): string {
  const anyTs = ts as { toDate?: () => Date };
  const d = anyTs?.toDate?.();
  return d instanceof Date ? d.toISOString() : new Date(0).toISOString();
}

function explainFsError(err: FirestoreError) {
  if (err.code === "permission-denied") {
    return "สิทธิ์อ่านข้อมูลไม่พอ (permission-denied) — ตรวจ Firestore Rules";
  }
  if (err.code === "failed-precondition") {
    return "Query ต้องสร้าง Index ก่อน (failed-precondition) — กดลิงก์ใน Console เพื่อ Create Index";
  }
  return err.message || String(err);
}

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;

    const u = auth.currentUser;

    // ยังไม่ login firebase → เคลียร์
    if (!u) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const colRef = collection(db, "leave_requests");
    const myQuery = query(colRef, where("uid", "==", u.uid));
    const adminQuery = query(colRef);

    let triedFallback = false;

    const subscribe = (qy: Query<DocumentData>) => {
      if (unsub) unsub();
      setLoading(true);

      unsub = onSnapshot(
        qy,
        (snap: QuerySnapshot<DocumentData>) => {
          if (cancelled) return;

          const rows: Array<LeaveRequest & { _ms: number }> = snap.docs.map(
            (d: QueryDocumentSnapshot<DocumentData>) => {
              const data = d.data() as Record<string, any>;
              const ms = tsToMs(data.submittedAt);

              return {
                id: d.id,
                uid: data.uid,
                createdByEmail: data.createdByEmail ?? undefined,

                requestNo: data.requestNo,
                category: data.category,
                subType: data.subType,
                startAt: data.startAt,
                endAt: data.endAt,
                reason: data.reason,
                attachments: data.attachments ?? [],
                status: (data.status ?? "รอดำเนินการ") as LeaveStatus,
                submittedAt: tsToISO(data.submittedAt),
                _ms: ms,
              };
            }
          );

          rows.sort((a, b) => b._ms - a._ms);
          setRequests(rows.map(({ _ms, ...r }) => r));
          setLoading(false);
        },
        (err: FirestoreError) => {
          if (cancelled) return;

          console.error("listen leave_requests error:", err, explainFsError(err));
          setLoading(false);

          // ✅ กัน admin อ่านทั้งหมดไม่ได้ → fallback มาอ่านของตัวเอง
          if (err.code === "permission-denied") {
            if (isAdmin && !triedFallback) {
              triedFallback = true;
              subscribe(myQuery);
              return;
            }
            setRequests([]);
            return;
          }

          // ✅ ถ้า query ต้องสร้าง index / อื่น ๆ → ไม่ให้เว็บพัง แค่ยังไม่โชว์ข้อมูล
          setRequests([]);
        }
      );
    };

    subscribe(isAdmin ? adminQuery : myQuery);

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [isAdmin]);

  const submitLeave = async (input: SubmitInput): Promise<LeaveRequest> => {
    const u = auth.currentUser;
    if (!u) throw new Error("NOT_AUTHENTICATED");

    const { startAt, endAt } = normalizeRange(input.startAt, input.endAt);
    const requestNo = genRequestNo();

    const payload = {
      uid: u.uid,
      createdByEmail: u.email ?? null,

      requestNo,
      category: input.category,
      subType: input.subType,
      startAt,
      endAt,
      reason: input.reason,
      attachments: input.attachments ?? [],

      status: "รอดำเนินการ" as LeaveStatus,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, "leave_requests"), payload);

    return {
      id: ref.id,
      uid: u.uid,
      createdByEmail: u.email ?? undefined,
      requestNo,
      category: input.category,
      subType: input.subType,
      startAt,
      endAt,
      reason: input.reason,
      attachments: input.attachments ?? [],
      status: "รอดำเนินการ",
      submittedAt: new Date().toISOString(),
    };
  };

  const updateStatus = async (id: string, status: LeaveStatus) => {
    if (!isAdmin) throw new Error("FORBIDDEN");
    await updateDoc(
      doc(db, "leave_requests", id),
      {
        status,
        updatedAt: serverTimestamp(),
      } as any
    );
  };

  const updateRequest: LeaveCtx["updateRequest"] = async (id, patch) => {
    if (!isAdmin) throw new Error("FORBIDDEN");

    const next: Record<string, any> = { ...patch, updatedAt: serverTimestamp() };

    if (patch.startAt || patch.endAt) {
      const cur = requests.find((r) => r.id === id);
      const s = patch.startAt ?? cur?.startAt ?? "";
      const e = patch.endAt ?? cur?.endAt ?? "";
      const norm = normalizeRange(s, e);
      next.startAt = norm.startAt;
      next.endAt = norm.endAt;
    }

    await updateDoc(doc(db, "leave_requests", id), next as any);
  };

  const deleteRequest = async (id: string) => {
    if (!isAdmin) throw new Error("FORBIDDEN");
    await deleteDoc(doc(db, "leave_requests", id));
  };

  const value: LeaveCtx = useMemo(
    () => ({ requests, loading, submitLeave, updateStatus, updateRequest, deleteRequest }),
    [requests, loading]
  );

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used within <LeaveProvider />");
  return ctx;
}
