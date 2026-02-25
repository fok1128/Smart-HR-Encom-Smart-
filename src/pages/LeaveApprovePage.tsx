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

// ✅ namespace import: กัน export บางตัวไม่มีแล้ว build พัง
import * as leaveSvc from "../services/leaveRequests";

type AnyAttachment = Record<string, any>;

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function pickVal<T = any>(...vals: any[]): T | null {
  for (const v of vals) {
    if (v !== null && v !== undefined && v !== "") return v as T;
  }
  return null;
}

function toDateSafe(v: any): Date | null {
  if (!v) return null;

  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }

  if (typeof v?.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return !isNaN(d.getTime()) ? d : null;
  }

  if (typeof v?._seconds === "number") {
    const d = new Date(v._seconds * 1000);
    return !isNaN(d.getTime()) ? d : null;
  }

  if (typeof v === "string") {
    const d = new Date(v);
    return !isNaN(d.getTime()) ? d : null;
  }

  return null;
}

function formatDateTimeFirestore(v: any): string {
  const d = toDateSafe(v);
  if (!d) {
    const s = String(v ?? "").trim();
    return s ? s : "-";
  }
  return d.toLocaleString("th-TH");
}

function formatRange(r: any): string {
  const sRaw = pickVal(r.startAt, r.startDate, r.from, r.startTime, r.start);
  const eRaw = pickVal(r.endAt, r.endDate, r.to, r.endTime, r.end);

  const sd = toDateSafe(sRaw);
  const ed = toDateSafe(eRaw);

  const sTxt = sd ? sd.toLocaleString("th-TH") : pickStr(sRaw, "-");
  const eTxt = ed ? ed.toLocaleString("th-TH") : pickStr(eRaw, "-");

  return `${sTxt} → ${eTxt}`;
}

function badge(s: string) {
  const x = String(s || "").toUpperCase();
  if (x.includes("APPROVED"))
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800/40";
  if (x.includes("REJECT") || x.includes("DENY") || x.includes("NOT"))
    return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800/40";
  if (x.includes("CANCEL"))
    return "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700";
  if (x.includes("LOCK"))
    return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
  if (x.includes("PENDING"))
    return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/40";
  return "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-200 dark:border-violet-800/40";
}

function normalizeMode(r: any): "TIME" | "DAY" | "" {
  const raw = pickStr(r.mode, r.leaveMode, r.unit, r.timeMode, r.type);
  const x = String(raw || "").toUpperCase();
  if (!x) return "";
  if (x.includes("TIME") || x === "HOUR" || x === "HOURS") return "TIME";
  if (x.includes("DAY")) return "DAY";
  return "";
}

function calcLeaveDurationText(r: any): string {
  const mode = normalizeMode(r);

  const startD = toDateSafe(pickVal(r.startAt, r.startDate, r.from, r.startTime, r.start));
  const endD = toDateSafe(pickVal(r.endAt, r.endDate, r.to, r.endTime, r.end));

  // TIME: แสดงชั่วโมง
  if (mode === "TIME") {
    if (typeof r?.hours === "number") return `${r.hours} ชั่วโมง`;
    if (typeof r?.hour === "number") return `${r.hour} ชั่วโมง`;
    if (typeof r?.durationHours === "number") return `${r.durationHours} ชั่วโมง`;

    if (startD && endD) {
      const ms = endD.getTime() - startD.getTime();
      const hrs = ms / (1000 * 60 * 60);
      if (!isNaN(hrs) && hrs > 0) {
        const pretty = Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1);
        return `${pretty} ชั่วโมง`;
      }
    }
    return "-";
  }

  // DAY: แสดงวันทำการ
  if (typeof r?.workdaysCount === "number") return `${r.workdaysCount} วันทำการ`;
  if (typeof r?.days === "number") return `${r.days} วัน`;
  if (typeof r?.durationDays === "number") return `${r.durationDays} วัน`;

  // fallback จาก diff
  if (startD && endD) {
    const ms = endD.getTime() - startD.getTime();
    const days = ms / (1000 * 60 * 60 * 24);
    if (!isNaN(days) && days >= 0) {
      const d = Math.max(1, Math.round(days));
      return `${d} วัน`;
    }
  }

  return "-";
}

function pickAttachments(r: any): AnyAttachment[] {
  const a = (r?.attachments ?? r?.files ?? r?.fileAttachments ?? r?.file ?? []) as any;
  return Array.isArray(a) ? a : [];
}

function attachmentLabel(att: AnyAttachment, i: number) {
  return pickStr(att?.name, att?.filename, att?.originalName, att?.fileName) || `ไฟล์แนบ ${i + 1}`;
}

function attachmentKey(att: AnyAttachment): string {
  return pickStr(att?.storagePath, att?.key, att?.path);
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
  const [signingKey, setSigningKey] = useState<string>("");

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
    if (role === "ADMIN") return "อนุมัติคำขอการลา (ADMIN)";
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

  async function openAttachment(att: AnyAttachment) {
    try {
      const direct = pickStr(att?.url, att?.signedUrl, att?.downloadUrl);
      if (direct) {
        window.open(direct, "_blank", "noopener,noreferrer");
        return;
      }

      let key = attachmentKey(att);

      if (!key && typeof (leaveSvc as any).getAttachmentKey === "function") {
        key = pickStr((leaveSvc as any).getAttachmentKey(att as any), key);
      }

      if (!key) {
        await dialog.alert("ไม่พบ path ของไฟล์แนบ", { title: "เปิดไฟล์ไม่สำเร็จ", variant: "warning" });
        return;
      }

      setSigningKey(key);

      let url = "";
      if (typeof (leaveSvc as any).getSignedUrlForKey === "function") {
        url = await (leaveSvc as any).getSignedUrlForKey(key);
      } else if (typeof (leaveSvc as any).getSignedUrlForAttachment === "function") {
        url = await (leaveSvc as any).getSignedUrlForAttachment(att);
      }

      if (!url) {
        await dialog.alert("ระบบยังไม่มีฟังก์ชันสร้าง signed URL สำหรับไฟล์แนบ", {
          title: "เปิดไฟล์ไม่สำเร็จ",
          variant: "warning",
        });
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("[LeaveApprove] openAttachment error:", e);
      await dialog.alert("เปิดไฟล์ไม่สำเร็จ (อาจหมดอายุ หรือไฟล์ถูกลบ)", {
        title: "เปิดไฟล์ไม่สำเร็จ",
        variant: "danger",
      });
    } finally {
      setSigningKey("");
    }
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
    <div className="px-0 pt-1 pb-6 space-y-4">
      {/* ✅ หัวข้อไปมุมขวาบนเหมือนหน้าตัวอย่าง */}
      <div className="flex items-center justify-between gap-3">
  {/* ✅ ซ้ายบนเหมือนรูปแรก */}
   <div className="text-xl font-extrabold text-gray-900 dark:text-gray-100">{title}</div>

  {/* เผื่ออนาคตอยากใส่ปุ่ม/ตัวกรองขวา (ตอนนี้เว้นไว้ไม่ให้ layout พัง) */}
  <div />
</div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          กำลังโหลด...
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
          โหลดไม่สำเร็จ: {err}
        </div>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          ไม่มีคำขอในคิวของคุณ
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((r: any) => {
            const reqNo = pickStr(r.requestNo, r.id);

            // ✅ ผู้ยื่น + Email ใต้เลขคำร้อง (ชัด + fallback)
            const email = pickStr(r.email, r.userEmail, "");
            const whoName = pickStr(r.employeeName, r.fullname, r.fullName, r.name, r.displayName);
            const who = pickStr(whoName, email, "-");
            const emailText = email ? email : "-";

            const phone = pickStr(r.phone, r.phoneNumber, r.tel, r.mobile, "-");
            const isBusy = busyId === r.id;

            const hrS = String(r.hrStatus || "PENDING");
            const mgrS = String(r.managerStatus || "LOCKED");

            const submittedRaw = pickVal(r.submittedAt, r.createdAt, r.appliedAt, r.createdTime, r.created_on);
            const submittedText = formatDateTimeFirestore(submittedRaw);

            const leaveRange = formatRange(r);
            const durationText = calcLeaveDurationText(r);

            const hrApproved = String(r.hrStatus || "").toUpperCase() === "APPROVED";
            const mgrLocked = !hrApproved;

            const atts = pickAttachments(r);

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
              >
                {/* ✅ หัวการ์ด: ประเภทลา + badges (จัดให้อยู่บรรทัดเดียวสวยๆ) */}
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                    {pickStr(r.category, "-")} · {pickStr(r.subType, "-")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold md:justify-end">
                    <span className={`rounded-full px-3 py-1 ${badge(hrS)}`}>HR: {hrS}</span>
                    <span className={`rounded-full px-3 py-1 ${badge(mgrS)}`}>ผู้บริหาร: {mgrS}</span>
                  </div>
                </div>

                {/* แถว 1: เลขคำร้อง | (ใต้เลขคำร้อง: ผู้ยื่น + Email) */}
                <div className="mt-3">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    เลขคำร้อง: <span className="font-extrabold text-gray-900 dark:text-gray-100">{reqNo}</span>
                  </div>

                  <div className="mt-1 space-y-0.5 text-sm">
                    <div className="text-gray-700 dark:text-gray-200">
                      <span className="font-semibold">ผู้ยื่น:</span>{" "}
                      <span className="font-extrabold text-gray-900 dark:text-gray-100">{who}</span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-200">
                      <span className="font-semibold">Email:</span>{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{emailText}</span>
                    </div>
                  </div>
                </div>

                {/* แถว 2: วันเวลาที่ยื่น */}
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">วันเวลาที่ยื่น:</span>{" "}
                  <span className="font-semibold">{submittedText}</span>
                </div>

                {/* แถว 3: ช่วงวันเวลาที่ลา */}
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">ช่วงวันเวลาที่ลา:</span>{" "}
                  <span className="font-semibold">{leaveRange}</span>
                </div>

                {/* แถว 4: เบอร์โทร | ระยะเวลาที่ลา (จัดแนวให้ดูเป็นระเบียบขึ้น) */}
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 md:items-center">
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-semibold">เบอร์โทร:</span>{" "}
                    <span className="font-semibold">{phone}</span>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-200 md:text-right">
                    <span className="font-semibold">ระยะเวลาที่ลา:</span>{" "}
                    <span className="font-semibold">{durationText}</span>
                    {normalizeMode(r) ? (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">• {normalizeMode(r)}</span>
                    ) : null}
                  </div>
                </div>

                {/* แถว 5: หมายเหตุ/เหตุผล */}
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">หมายเหตุ/เหตุผล:</span>
                  <div className="mt-1 whitespace-pre-wrap font-semibold text-gray-900 dark:text-gray-100">
                    {pickStr(r.reason, r.note, r.remark, "-")}
                  </div>
                </div>

                {/* แถว 6: ไฟล์แนบ */}
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">ไฟล์แนบ:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {atts.length ? (
                      atts.map((att: AnyAttachment, i: number) => {
                        const key = attachmentKey(att);
                        const busy = !!key && signingKey === key;
                        return (
                          <button
                            key={key || i}
                            type="button"
                            disabled={busy}
                            onClick={() => openAttachment(att)}
                            className={[
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold",
                              "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
                              "dark:border-violet-400/30 dark:bg-violet-900/20 dark:text-violet-100 dark:hover:bg-violet-900/30",
                              busy ? "opacity-70 cursor-wait" : "",
                            ].join(" ")}
                            title="เปิด/ดาวน์โหลดไฟล์แนบ"
                          >
                            <span className="truncate max-w-[220px]">{attachmentLabel(att, i)}</span>
                            <span className="text-[10px] opacity-70">{busy ? "กำลังโหลด..." : "เปิด"}</span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ไม่มีไฟล์แนบ</span>
                    )}
                  </div>
                </div>

                {/* ปุ่ม actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
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
                      <AppButton variant="outline" disabled={isBusy} onClick={() => doCancel(r)}>
                        Cancel
                      </AppButton>
                      <AppButton variant="outline" disabled={isBusy} onClick={() => doDelete(r)}>
                        Delete
                      </AppButton>
                    </>
                  )}
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
  );
}