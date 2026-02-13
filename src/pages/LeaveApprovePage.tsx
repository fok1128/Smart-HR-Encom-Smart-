// src/pages/LeaveApprovePage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | string;

type LeaveDoc = {
  id: string;
  uid?: string;
  email?: string | null;
  employeeName?: string | null;
  employeeNo?: string | null;

  category?: string;
  subType?: string;
  mode?: "allDay" | "time" | string;

  startAt?: string;
  endAt?: string;
  reason?: string;

  requestNo?: string;
  status?: LeaveStatus;

  submittedAt?: any;
  updatedAt?: any;

  decidedAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
  approvedBy?: string | null;
  rejectedBy?: string | null;

  workdaysCount?: number;
};

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

const COL = "leave_requests";

export default function LeaveApprovePage() {
  const { user } = useAuth();
  const dialog = useDialogCenter();

  const [rows, setRows] = useState<LeaveDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setErr("");

    const q = query(
      collection(db, COL),
      where("status", "==", "PENDING"),
      orderBy("submittedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LeaveDoc[];
        setRows(next);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e.message || String(e));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const title = useMemo(() => "อนุมัติคำขอการลา", []);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
  if (!user?.uid) {
    await dialog.alert("ยังไม่เข้าสู่ระบบ", { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
    return;
  }

  const uName = pickStr((user as any)?.fname, (user as any)?.firstName, (user as any)?.displayName, user.email);

  // ✅ ถ้า REJECTED ต้องกรอกเหตุผล
  let rejectReason = "";
  if (status === "REJECTED") {
    const reason = await dialog.prompt("กรุณากรอกเหตุผลในการไม่อนุมัติ", {
      title: "เหตุผลไม่อนุมัติ",
      confirmText: "ยืนยันไม่อนุมัติ",
      cancelText: "ยกเลิก",
      variant: "danger",
      required: true,
      minLen: 1,
      maxLen: 300,
      placeholder: "เช่น เอกสารไม่ครบ / วันลาเกินสิทธิ์ / ข้อมูลไม่ถูกต้อง ...",
      label: "เหตุผล",
      size: "md",
    });

    // กดยกเลิก
    if (reason === null) return;

    // กันกรณีหลุด (แต่ required=true จะกันให้แล้ว)
    rejectReason = reason.trim();
    if (!rejectReason) return;
  }

  setBusyId(id);
  try {
    const patch: any = {
      status,
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (status === "APPROVED") {
      patch.approvedAt = serverTimestamp();
      patch.approvedBy = uName || user.email || "APPROVER";
    } else {
      patch.rejectedAt = serverTimestamp();
      patch.rejectedBy = uName || user.email || "APPROVER";
      patch.rejectReason = rejectReason; // ✅ rules อนุญาตอยู่แล้ว
    }

    await updateDoc(doc(db, COL, id), patch);

    await dialog.success("อัปเดตสถานะเรียบร้อยแล้ว", {
      title: status === "APPROVED" ? "อนุมัติสำเร็จ" : "ไม่อนุมัติสำเร็จ",
    });
  } catch (e: any) {
    console.error(e);
    await dialog.alert(e?.message || String(e), { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
  } finally {
    setBusyId("");
  }
}


  async function askDelete(r: LeaveDoc) {
    const who = pickStr(r.employeeName, r.email, "-");
    const reqNo = pickStr(r.requestNo, r.id);

    const ok = await dialog.confirm(`คุณกำลังจะลบ: ${who} · ${reqNo}`, {
      title: "ยืนยันลบคำร้องนี้",
      confirmText: "ลบเลย",
      cancelText: "ยกเลิก",
      variant: "danger",
      size: "md",
    });

    if (!ok) return;

    setBusyId(r.id);
    try {
      await deleteDoc(doc(db, COL, r.id));
      await dialog.success("ลบคำร้องเรียบร้อยแล้ว", { title: "ลบสำเร็จ" });
    } catch (e: any) {
      console.error(e);
      await dialog.alert(e?.message || String(e), { title: "ลบไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-teal-600">หน้าหลัก</span> <span className="mx-2">›</span> อนุมัติคำขอ
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">กำลังโหลดข้อมูล…</div>
        ) : err ? (
          <div className="text-sm font-semibold text-red-600">โหลดไม่สำเร็จ: {err}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">ไม่มีคำขอที่รออนุมัติ</div>
        ) : (
          <div className="grid gap-4">
            {rows.map((r) => {
              const who = pickStr(r.employeeName, r.email, "-");
              const reqNo = pickStr(r.requestNo, r.id);
              const when = `${pickStr(r.startAt, "-")} → ${pickStr(r.endAt, "-")}`;
              const isBusy = busyId === r.id;

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                        {pickStr(r.category, "-")} · {pickStr(r.subType, "-")}
                      </div>

                      <div className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        ผู้ยื่น: <span className="text-gray-900 dark:text-gray-100">{who}</span>
                        {r.employeeNo ? <span className="ml-2 text-xs text-gray-500">({r.employeeNo})</span> : null}
                      </div>

                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        ช่วงเวลา: <span className="font-semibold">{when}</span>
                        {typeof r.workdaysCount === "number" ? (
                          <span className="ml-2 text-xs text-gray-500">• {r.workdaysCount} วันทำการ</span>
                        ) : null}
                      </div>

                      {r.reason ? <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{r.reason}</div> : null}

                      <div className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        เลขคำร้อง: <span className="font-extrabold text-gray-800 dark:text-gray-100">{reqNo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setStatus(r.id, "APPROVED")}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        อนุมัติ
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setStatus(r.id, "REJECTED")}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        ไม่อนุมัติ
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => askDelete(r)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        title="ลบคำร้อง"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
