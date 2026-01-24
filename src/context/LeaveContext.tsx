import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
  requestNo: string;
  category: LeaveCategory;
  subType: LeaveSubType;
  startAt: string; // all-day: YYYY-MM-DD | timed: YYYY-MM-DDTHH:mm
  endAt: string;   // all-day: YYYY-MM-DD | timed: YYYY-MM-DDTHH:mm
  reason: string;
  attachments: LeaveAttachment[];
  status: LeaveStatus;
  submittedAt: string; // ISO string
};

type SubmitInput = Omit<LeaveRequest, "requestNo" | "status" | "submittedAt">;

type LeaveCtx = {
  requests: LeaveRequest[];
  submitLeave: (input: SubmitInput) => LeaveRequest;
  updateStatus: (requestNo: string, status: LeaveStatus) => void;
  clearAll: () => void;
};

const LeaveContext = createContext<LeaveCtx | null>(null);

const STORAGE_KEY = "smart_hr_leave_requests_v1";

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
  return String(s || "").slice(0, 10); // YYYY-MM-DD
}
function normalizeDateTimeLocal(s: string) {
  return String(s || "").slice(0, 16); // YYYY-MM-DDTHH:mm
}
function isTimed(s: string) {
  return s.includes("T");
}
function normalizeRange(startAt: string, endAt: string) {
  const timed = isTimed(startAt) || isTimed(endAt);

  const s = timed ? normalizeDateTimeLocal(startAt) : normalizeDateOnly(startAt);
  const e = timed ? normalizeDateTimeLocal(endAt) : normalizeDateOnly(endAt);

  // กัน end < start
  if (new Date(e).getTime() < new Date(s).getTime()) return { startAt: s, endAt: s };
  return { startAt: s, endAt: e };
}

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LeaveRequest[];
      if (Array.isArray(parsed)) setRequests(parsed);
    } catch {
      // ignore
    }
  }, []);

  // save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch {
      // ignore
    }
  }, [requests]);

  const submitLeave = useCallback((input: SubmitInput) => {
    const { startAt, endAt } = normalizeRange(input.startAt, input.endAt);

    const created: LeaveRequest = {
      requestNo: genRequestNo(),
      category: input.category,
      subType: input.subType,
      startAt,
      endAt,
      reason: input.reason,
      attachments: input.attachments ?? [],
      status: "รอดำเนินการ",
      submittedAt: new Date().toISOString(),
    };

    setRequests((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateStatus = useCallback((requestNo: string, status: LeaveStatus) => {
    setRequests((prev) => prev.map((r) => (r.requestNo === requestNo ? { ...r, status } : r)));
  }, []);

  const clearAll = useCallback(() => setRequests([]), []);

  const value = useMemo(() => ({ requests, submitLeave, updateStatus, clearAll }), [
    requests,
    submitLeave,
    updateStatus,
    clearAll,
  ]);

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used within <LeaveProvider />");
  return ctx;
}
