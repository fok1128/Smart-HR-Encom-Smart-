// src/pages/LeaveApprovePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";
import AppButton from "../components/common/AppButton";
import {
  LeaveRequestDoc,
  listenApproverQueue,
  hrApproveLeaveRequest,
  hrRejectLeaveRequest,
  managerApproveLeaveRequest,
  managerRejectLeaveRequest,
  approverCancelLeaveRequest,
  adminDeleteLeaveRequest,
} from "../services/leaveRequests";

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function badge(s: string) {
  const x = String(s || "").toUpperCase();
  if (x.includes("APPROVED"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (x.includes("REJECT"))
    return "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200";
  if (x.includes("CANCEL"))
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
  if (x.includes("PENDING"))
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200";
  if (x.includes("LOCK"))
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export default function LeaveApprovePage() {
  const { user } = useAuth();
  const dialog = useDialogCenter();

  const role = String(user?.role || "").toUpperCase();
  const canHR = role === "HR" || role === "ADMIN";
  const canMgr = role === "EXECUTIVE_MANAGER" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const [rows, setRows] = useState<LeaveRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setErr("");

    const unsub = listenApproverQueue(
      role,
      (r) => {
        setRows(r || []);
        setLoading(false);
      },
      (m) => {
        setErr(m || "โหลดคิวไม่สำเร็จ");
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsub?.();
  }, [role]);

  const title = useMemo(() => {
    if (role === "HR") return "อนุมัติคำขอการลา (HR)";
    if (role === "EXECUTIVE_MANAGER") return "อนุมัติคำขอการลา (ผู้บริหาร)";
    if (role === "ADMIN") return "อนุมัติคำขอการลา (ADMIN/DEV)";
    return "อนุมัติคำขอการลา";
  }, [role]);

  const actor = useMemo(() => {
    const name = `${pickStr((user as any)?.fname)} ${pickStr((user as any)?.lname)}`.trim();
    return {
      uid: user?.uid || "",
      email: user?.email ?? null,
      role,
      name: name || null,
    };
  }, [user?.uid, user?.email, (user as any)?.fname, (user as any)?.lname, role]);

  async function promptReason(titleText: string, variant: "danger" | "warning") {
    const r = await dialog.prompt("กรุณากรอกเหตุผล", {
      title: titleText,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
      variant,
      required: true,
      minLen: 1,
      maxLen: 300,
      placeholder: "เช่น เอกสารไม่ครบ / วันลาเกินสิทธิ์ / ข้อมูลไม่ถูกต้อง ...",
      label: "เหตุผล",
      size: "md",
    });
    if (r === null) return null;
    const s = String(r || "").trim();
    if (!s) return null;
    return s;
  }

  async function doHRApprove(r: LeaveRequestDoc) {
    setBusyId(r.id);
    try {
      const c = await dialog.prompt("เพิ่มหมายเหตุ (ไม่ใส่ก็ได้)", {
        title: "HR อนุมัติ",
        confirmText: "ส่งต่อให้ผู้บริหาร",
        cancelText: "ยกเลิก",
        variant: "success",
        required: false,
        maxLen: 300,
        placeholder: "หมายเหตุถึงผู้บริหาร/พนักงาน...",
        label: "หมายเหตุ",
        size: "md",
      });
      if (c === null) return;

      await hrApproveLeaveRequest(r.id, actor, String(c || "").trim() || undefined);
      await dialog.success("ส่งต่อให้ผู้บริหารแล้ว", { title: "อนุมัติ (ขั้น HR) สำเร็จ" });
    } catch (e: any) {
      await dialog.alert(e?.message || String(e), { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusyId("");
    }
  }

  async function doHRReject(r: LeaveRequestDoc) {
    const reason = await promptReason("HR ไม่อนุมัติ", "danger");
    if (!reason) return;

    setBusyId(r.id);
    try {
      await hrRejectLeaveRequest(r.id, actor, reason);
      await dialog.success("อัปเดตสถานะเรียบร้อย", { title: "ไม่อนุมัติ (HR) สำเร็จ" });
    } catch (e: any) {
      await dialog.alert(e?.message || String(e), { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusyId("");
    }
  }

  async function doMgrApprove(r: LeaveRequestDoc) {
    const hrOk = String((r as any).hrStatus || "").toUpperCase() === "APPROVED";
    if (!hrOk && role !== "ADMIN") {
      await dialog.alert("คำร้องนี้ยังไม่ผ่าน HR", { title: "ทำรายการไม่ได้", variant: "danger" });
      return;
    }

    setBusyId(r.id);
    try {
      const c = await dialog.prompt("เพิ่มหมายเหตุ (ไม่ใส่ก็ได้)", {
        title: "ผู้บริหารอนุมัติ",
        confirmText: "อนุมัติ",
        cancelText: "ยกเลิก",
        variant: "success",
        required: false,
        maxLen: 300,
        placeholder: "หมายเหตุถึงพนักงาน...",
        label: "หมายเหตุ",
        size: "md",
      });
      if (c === null) return;

      await managerApproveLeaveRequest(r.id, actor, String(c || "").trim() || undefined);
      await dialog.success("อัปเดตสถานะเรียบร้อย", { title: "อนุมัติสำเร็จ" });
    } catch (e: any) {
      await dialog.alert(e?.message || String(e), { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusyId("");
    }
  }

  async function doMgrReject(r: LeaveRequestDoc) {
    const hrOk = String((r as any).hrStatus || "").toUpperCase() === "APPROVED";
    if (!hrOk && role !== "ADMIN") {
      await dialog.alert("คำร้องนี้ยังไม่ผ่าน HR", { title: "ทำรายการไม่ได้", variant: "danger" });
      return;
    }

    const reason = await promptReason("ผู้บริหารไม่อนุมัติ", "danger");
    if (!reason) return;

    setBusyId(r.id);
    try {
      await managerRejectLeaveRequest(r.id, actor, reason);
      await dialog.success("อัปเดตสถานะเรียบร้อย", { title: "ไม่อนุมัติ (ผู้บริหาร) สำเร็จ" });
    } catch (e: any) {
      await dialog.alert(e?.message || String(e), { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusyId("");
    }
  }

  async function doCancel(r: LeaveRequestDoc) {
    const reason = await promptReason("ยกเลิกคำร้องนี้", "warning");
    if (!reason) return;

    setBusyId(r.id);
    try {
      const byRole = (role === "HR" ? "HR" : role === "EXECUTIVE_MANAGER" ? "EXECUTIVE_MANAGER" : "ADMIN") as
        | "HR"
        | "EXECUTIVE_MANAGER"
        | "ADMIN";
      await approverCancelLeaveRequest(r.id, actor, byRole, reason);
      await dialog.success("ยกเลิกคำร้องเรียบร้อย", { title: "ยกเลิกสำเร็จ" });
    } catch (e: any) {
      await dialog.alert(e?.message || String(e), { title: "ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusyId("");
    }
  }

  async function doDelete(r: LeaveRequestDoc) {
    const who = pickStr((r as any).employeeName, r.email, "-");
    const reqNo = pickStr((r as any).requestNo, r.id);

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
      await adminDeleteLeaveRequest(r.id);
      await dialog.success("ลบคำร้องเรียบร้อยแล้ว", { title: "ลบสำเร็จ" });
    } catch (e: any) {
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

      {/* ✅ เอากรอบใหญ่ด้านหลังออก: เหลือแค่พื้นที่โปร่งๆ */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            กำลังโหลดข้อมูล…
          </div>
        ) : err ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200">
            โหลดไม่สำเร็จ: {err}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            ไม่มีคำขอในคิวของคุณ
          </div>
        ) : (
          <div className="grid gap-4">
            {rows.map((r: any) => {
              const who = pickStr(r.employeeName, r.email, "-");
              const reqNo = pickStr(r.requestNo, r.id);
              const when = `${pickStr(r.startAt, "-")} → ${pickStr(r.endAt, "-")}`;
              const isBusy = busyId === r.id;

              const hrS = String(r.hrStatus || "PENDING");
              const mgrS = String(r.managerStatus || "LOCKED");
              const overall = String(r.overallStatus || "");

              const hrApproved = String(r.hrStatus || "").toUpperCase() === "APPROVED";
              const mgrLocked = !hrApproved;

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
                        {overall ? <span className="ml-2 text-[11px] text-gray-400">({overall})</span> : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-3 py-1 ${badge(hrS)}`}>HR: {hrS}</span>
                        <span className={`rounded-full px-3 py-1 ${badge(mgrS)}`}>ผู้บริหาร: {mgrS}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canHR && role === "HR" && (
                        <>
                          <AppButton variant="primary" disabled={isBusy} onClick={() => doHRApprove(r)}>
                            HR อนุมัติ
                          </AppButton>
                          <AppButton variant="danger" disabled={isBusy} onClick={() => doHRReject(r)}>
                            HR ไม่อนุมัติ
                          </AppButton>
                          <AppButton variant="outline" disabled={isBusy} onClick={() => doCancel(r)}>
                            ยกเลิก
                          </AppButton>
                        </>
                      )}

                      {canMgr && role === "EXECUTIVE_MANAGER" && (
                        <>
                          <AppButton variant="primary" disabled={isBusy || mgrLocked} onClick={() => doMgrApprove(r)}>
                            อนุมัติ
                          </AppButton>
                          <AppButton variant="danger" disabled={isBusy || mgrLocked} onClick={() => doMgrReject(r)}>
                            ไม่อนุมัติ
                          </AppButton>
                          <AppButton variant="outline" disabled={isBusy} onClick={() => doCancel(r)}>
                            ยกเลิก
                          </AppButton>
                        </>
                      )}

                      {isAdmin && role === "ADMIN" && (
                        <>
                          {String((r as any).overallStatus || "").toUpperCase() === "PENDING_HR" ? (
                            <>
                              <AppButton variant="primary" disabled={isBusy} onClick={() => doHRApprove(r)}>
                                (ADMIN) HR Approve
                              </AppButton>
                              <AppButton variant="danger" disabled={isBusy} onClick={() => doHRReject(r)}>
                                (ADMIN) HR Reject
                              </AppButton>
                            </>
                          ) : null}

                          {String((r as any).overallStatus || "").toUpperCase() === "PENDING_MANAGER" ? (
                            <>
                              <AppButton variant="primary" disabled={isBusy} onClick={() => doMgrApprove(r)}>
                                (ADMIN) Mgr Approve
                              </AppButton>
                              <AppButton variant="danger" disabled={isBusy} onClick={() => doMgrReject(r)}>
                                (ADMIN) Mgr Reject
                              </AppButton>
                            </>
                          ) : null}

                          <AppButton variant="outline" disabled={isBusy} onClick={() => doCancel(r)}>
                            Cancel
                          </AppButton>
                          <AppButton variant="outline" disabled={isBusy} onClick={() => doDelete(r)}>
                            Delete
                          </AppButton>
                        </>
                      )}
                    </div>
                  </div>

                  {role === "EXECUTIVE_MANAGER" && mgrLocked ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                      รอ HR อนุมัติก่อน จึงจะดำเนินการในขั้นผู้บริหารได้
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
