import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
const LeaveContext = createContext(null);
const STORAGE_KEY = "smart_hr_leave_requests_v1";
const pad2 = (n) => String(n).padStart(2, "0");
function genRequestNo() {
    const d = new Date();
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `LV-${y}${m}${day}-${rand}`;
}
function normalizeDateOnly(s) {
    return String(s || "").slice(0, 10); // YYYY-MM-DD
}
function normalizeDateTimeLocal(s) {
    return String(s || "").slice(0, 16); // YYYY-MM-DDTHH:mm
}
function isTimed(s) {
    return s.includes("T");
}
function normalizeRange(startAt, endAt) {
    const timed = isTimed(startAt) || isTimed(endAt);
    const s = timed ? normalizeDateTimeLocal(startAt) : normalizeDateOnly(startAt);
    const e = timed ? normalizeDateTimeLocal(endAt) : normalizeDateOnly(endAt);
    // กัน end < start
    if (new Date(e).getTime() < new Date(s).getTime())
        return { startAt: s, endAt: s };
    return { startAt: s, endAt: e };
}
export function LeaveProvider({ children }) {
    const [requests, setRequests] = useState([]);
    // load
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                setRequests(parsed);
        }
        catch {
            // ignore
        }
    }, []);
    // save
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
        }
        catch {
            // ignore
        }
    }, [requests]);
    const submitLeave = useCallback((input) => {
        const { startAt, endAt } = normalizeRange(input.startAt, input.endAt);
        const created = {
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
    const updateStatus = useCallback((requestNo, status) => {
        setRequests((prev) => prev.map((r) => (r.requestNo === requestNo ? { ...r, status } : r)));
    }, []);
    const clearAll = useCallback(() => setRequests([]), []);
    const value = useMemo(() => ({ requests, submitLeave, updateStatus, clearAll }), [
        requests,
        submitLeave,
        updateStatus,
        clearAll,
    ]);
    return _jsx(LeaveContext.Provider, { value: value, children: children });
}
export function useLeave() {
    const ctx = useContext(LeaveContext);
    if (!ctx)
        throw new Error("useLeave must be used within <LeaveProvider />");
    return ctx;
}
