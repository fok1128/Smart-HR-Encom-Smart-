// src/pages/LeaveApproveHistoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToastCenter } from "../components/common/ToastCenter";
import { useDialogCenter } from "../components/common/DialogCenter";
import { exportApprovalHistoryPdf } from "../utils/pdf/exportApprovalHistoryPdf";
import ModalShell from "../components/common/ModalShell";
import AppButton from "../components/common/AppButton";

// ✅ Theme กลาง
import { inputTheme } from "../components/ui/theme/inputTheme";

// ✅ เปิดไฟล์แนบ (signed url)
import { getSignedUrl } from "../services/files";

type LeaveRow = any;

const APPROVER_ROLES = ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"];
const DELETE_ROLES = ["ADMIN", "EXECUTIVE_MANAGER"];
const EXPORT_ROLES = ["HR", "EXECUTIVE_MANAGER", "ADMIN"]; // ADMIN ชั่วคราว

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

function fmtDate(ts: any) {
  const d =
    ts?.toDate?.() ? ts.toDate() : ts instanceof Date ? ts : ts ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function decidedAtMs(r: any) {
  return (
    tsToMs(r?.decidedAt) ||
    tsToMs(r?.approvedAt) ||
    tsToMs(r?.rejectedAt) ||
    tsToMs(r?.canceledAt) ||
    tsToMs(r?.cancelledAt) ||
    tsToMs(r?.updatedAt) ||
    tsToMs(r?.submittedAt) ||
    tsToMs(r?.createdAt) ||
    0
  );
}

// ✅ ช่วงวันที่ลา (ยึด startAt/endAt เป็นหลัก และโชว์วัน+เวลาเสมอ)
function leaveStartMs(r: any) {
  return tsToMs(r?.startAt) || tsToMs(r?.startDate) || 0;
}
function leaveEndMs(r: any) {
  return tsToMs(r?.endAt) || tsToMs(r?.endDate) || 0;
}
function fmtLeaveRange(r: any) {
  const s = leaveStartMs(r);
  const e = leaveEndMs(r);
  if (!s && !e) return "-";
  if (s && !e) return `${fmtDate(s)} (เริ่มลา)`;
  if (!s && e) return `${fmtDate(e)} (สิ้นสุดลา)`;
  return `${fmtDate(s)} ถึง ${fmtDate(e)}`;
}

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function getRowUid(r: any) {
  return pickStr(r?.uid, r?.createdByUid, r?.userUid, r?.userId);
}
function getRowEmail(r: any) {
  return pickStr(r?.createdByEmail, r?.email, r?.userEmail).toLowerCase();
}
function getRowEmployeeNameSnapshot(r: any) {
  return pickStr(r?.employeeName, r?.createdByName, r?.fullName, r?.requesterName);
}
function getRowPhoneSnapshot(r: any) {
  return pickStr(r?.phone, r?.createdByPhone, r?.tel, r?.mobile);
}

function normalizeStatus(raw: any) {
  const s = String(raw || "").trim().toUpperCase();

  if (s === "APPROVED" || s === "อนุมัติ".toUpperCase()) return "APPROVED";
  if (s === "REJECTED" || s === "ไม่อนุมัติ".toUpperCase()) return "REJECTED";
  if (s === "PENDING" || s === "รอดำเนินการ".toUpperCase()) return "PENDING";
  if (s === "CANCELED" || s === "CANCELLED" || s.includes("ยกเลิก".toUpperCase()))
    return "CANCELED";

  return s || "UNKNOWN";
}

function statusLabelTH(raw: any) {
  const s = normalizeStatus(raw);
  if (s === "APPROVED") return "อนุมัติ";
  if (s === "REJECTED") return "ไม่อนุมัติ";
  if (s === "PENDING") return "รอดำเนินการ";
  if (s === "CANCELED") return "ยกเลิก";
  return String(raw || "").trim() || "-";
}

function statusBadge(stTH: string) {
  const cls =
    stTH === "อนุมัติ"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-900/40"
      : stTH === "ไม่อนุมัติ"
      ? "text-red-700 bg-red-50 border-red-200 dark:text-red-200 dark:bg-red-500/10 dark:border-red-900/40"
      : stTH === "ยกเลิก"
      ? "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-500/10 dark:border-amber-900/40"
      : "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-200 dark:bg-gray-800/40 dark:border-gray-700";

  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold", cls)}
    >
      {stTH}
    </span>
  );
}

// datetime-local -> ms (local)
function dtToMs(dtLocal: string) {
  const s = String(dtLocal || "").trim();
  if (!s) return null;
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
}

async function batchDeleteByRefs(refs: Array<{ ref: any }>) {
  const BATCH_LIMIT = 450;
  let deleted = 0;

  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const chunk = refs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

type AccountOption = { uid: string; label: string };

function getExporterProfile(u: any) {
  const fname = pickStr(u?.fname, u?.firstName, u?.profile?.fname, u?.user?.fname, u?.employee?.fname);
  const lname = pickStr(u?.lname, u?.lastName, u?.profile?.lname, u?.user?.lname, u?.employee?.lname);
  const position = pickStr(u?.position, u?.profile?.position, u?.employee?.position, u?.jobTitle);
  return { fname, lname, position };
}

type DeleteMode = "DEL_UID" | "DEL_SELECTED" | "DEL_ONE" | null;

export default function LeaveApproveHistoryPage() {
  const { user } = useAuth();
  const { showToast } = useToastCenter();

  const dialog: any = useDialogCenter();
  const confirm: any = dialog?.confirm ?? dialog?.dialog?.confirm;
  const alert: any = dialog?.alert ?? dialog?.dialog?.alert;

  const notify = (msg: string, opts?: { title?: string; variant?: any; durationMs?: number }) => {
    if (typeof alert === "function") {
      return alert(msg, { title: opts?.title, variant: opts?.variant });
    }
    return showToast(msg, { title: opts?.title, variant: opts?.variant, durationMs: opts?.durationMs });
  };

  const role = String((user as any)?.role || "").toUpperCase();
  const canView = APPROVER_ROLES.includes(role);
  const canDelete = DELETE_ROLES.includes(role);
  const canExport = EXPORT_ROLES.includes(role);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeaveRow[]>([]);

  // Filters
  const [qText, setQText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "REJECTED" | "CANCELED">("ALL");

  // ✅ datetime-local
  const [dtFrom, setDtFrom] = useState<string>("");
  const [dtTo, setDtTo] = useState<string>("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const [accountUid, setAccountUid] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // ----- Modal states -----
  const [previewOpen, setPreviewOpen] = useState(false);

  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null);
  const [deleteOneTarget, setDeleteOneTarget] = useState<any | null>(null);
  const [confirm2Open, setConfirm2Open] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const deletePhraseOk = deletePhrase.trim().toUpperCase() === "DELETE";

  const resetDeleteFlow = () => {
    setDeleteMode(null);
    setDeleteOneTarget(null);
    setConfirm2Open(false);
    setDeletePhrase("");
  };

  // ✅ โหลด history (รวม ยกเลิก)
  useEffect(() => {
    if (!user?.uid || !canView) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const colRef = collection(db, "leave_requests");
    const qy = query(
      colRef,
      where("status", "in", [
        "อนุมัติ",
        "ไม่อนุมัติ",
        "ยกเลิก",
        "APPROVED",
        "REJECTED",
        "CANCELED",
        "CANCELLED",
      ])
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        list.sort((a: any, b: any) => decidedAtMs(b) - decidedAtMs(a));
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error("LeaveApproveHistoryPage snapshot error:", err);
        setRows([]);
        setLoading(false);
        notify("โหลดข้อมูลไม่สำเร็จ", { title: "ผิดพลาด", variant: "danger" });
      }
    );

    return () => unsub();
  }, [user?.uid, canView]);

  const accountOptionsFallback = useMemo(() => {
    const map = new Map<string, AccountOption>();
    rows.forEach((r: any) => {
      const uid = getRowUid(r);
      if (!uid) return;

      const snapName = getRowEmployeeNameSnapshot(r);
      const email = pickStr(r?.createdByEmail, r?.email);
      const label = pickStr(snapName, email, uid);

      if (!map.has(uid)) map.set(uid, { uid, label });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [rows]);

  const fullNameOf = (r: any) => {
    const snapName = getRowEmployeeNameSnapshot(r);
    if (snapName) return snapName;
    const email = getRowEmail(r);
    const uid = getRowUid(r);
    return pickStr(email, uid, "-");
  };

  const phoneOf = (r: any) => {
    const snapPhone = getRowPhoneSnapshot(r);
    return snapPhone || "-";
  };

  // attachments (รองรับทั้ง url และ storagePath)
  const attachmentsOf = (r: any) => {
    const atts = Array.isArray(r?.attachments) ? r.attachments : Array.isArray(r?.files) ? r.files : [];
    return (atts || [])
      .map((a: any) => ({
        name: pickStr(a?.name, a?.filename, a?.originalName, "ไฟล์แนบ"),
        storagePath: pickStr(a?.storagePath, a?.path),
        url: pickStr(a?.url, a?.downloadUrl),
      }))
      .filter((x: any) => x.storagePath || x.url);
  };

  async function openAttachment(att: { storagePath?: string; url?: string }) {
    try {
      if (att?.url) {
        window.open(att.url, "_blank", "noopener,noreferrer");
        return;
      }
      const p = String(att?.storagePath || "").trim();
      if (!p) throw new Error("ไม่พบ path ของไฟล์แนบ");
      const signed = await getSignedUrl(p);
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      await notify(e?.message || String(e), { title: "เปิดไฟล์ไม่สำเร็จ", variant: "danger" });
    }
  }

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    const fromMs = dtToMs(dtFrom);
    const toMs = dtToMs(dtTo);

    return (Array.isArray(rows) ? rows : [])
      .filter((r: any) => {
        // status
        const st = normalizeStatus(r?.status);
        const okStatus = statusFilter === "ALL" ? true : st === statusFilter;
        if (!okStatus) return false;

        // datetime range (ตัดสินใจ/อัปเดต)
        const t = decidedAtMs(r);
        if (fromMs !== null && t < fromMs) return false;
        if (toMs !== null && t > toMs) return false;

        // search
        if (!q) return true;

        const fullName = fullNameOf(r);
        const phone = phoneOf(r);
        const email = getRowEmail(r);
        const uid = getRowUid(r);

        const cat = pickStr(r?.category, r?.leaveType, r?.type);
        const sub = pickStr(r?.subType, r?.subtype);
        const reason = pickStr(r?.reason, r?.note, r?.detail);

        const atts = attachmentsOf(r);
        const attNames = atts.map((a: any) => a.name).join(" ");

        const leaveRange = fmtLeaveRange(r); // ✅ เพิ่มให้ค้นหาเจอ

        const hay = [
          fullName,
          phone,
          email,
          uid,
          r?.requestNo,
          cat,
          sub,
          reason,
          attNames,
          statusLabelTH(r?.status),
          leaveRange,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a: any, b: any) => decidedAtMs(b) - decidedAtMs(a));
  }, [rows, qText, statusFilter, dtFrom, dtTo]);

  // selection sync when filter changed
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filtered.map((r: any) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => visible.has(id) && next.add(id));
      return next;
    });
  }, [filtered]);

  const selectedRows = useMemo(() => {
    const idSet = selectedIds;
    return filtered.filter((r: any) => idSet.has(r.id));
  }, [filtered, selectedIds]);

  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">ไม่มีสิทธิ์เข้าหน้านี้</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            เฉพาะ HR / MANAGER / EXECUTIVE_MANAGER / ADMIN
          </div>
        </div>
      </div>
    );
  }

  const doDeleteByUid = async () => {
    if (!accountUid) return;

    setBusy(true);
    try {
      const colRef = collection(db, "leave_requests");
      const statusQ = ["อนุมัติ", "ไม่อนุมัติ", "ยกเลิก", "APPROVED", "REJECTED", "CANCELED", "CANCELLED"];

      const tryFields = ["uid", "createdByUid", "userUid", "userId"];
      const refsMap = new Map<string, any>();

      for (const f of tryFields) {
        const qy = query(colRef, where(f, "==", accountUid), where("status", "in", statusQ));
        const snap = await getDocs(qy);
        snap.docs.forEach((d) => refsMap.set(d.id, d.ref));
      }

      const refs = Array.from(refsMap.values()).map((ref) => ({ ref }));
      if (refs.length === 0) {
        notify("ไม่พบรายการประวัติของบัญชีนี้", { title: "ไม่พบข้อมูล", variant: "warning" });
        return;
      }

      const deleted = await batchDeleteByRefs(refs);

      notify(`ลบประวัติสำเร็จ ${deleted} รายการ`, { title: "สำเร็จ", variant: "success" });
      setAccountUid("");
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error(e);
      notify(e?.message || String(e), { title: "ลบไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusy(false);
      resetDeleteFlow();
    }
  };

  const doDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBusy(true);
    try {
      const refs = ids.map((id) => ({ ref: doc(db, "leave_requests", id) }));
      const deleted = await batchDeleteByRefs(refs);

      notify(`ลบรายการที่เลือกสำเร็จ ${deleted} รายการ`, { title: "สำเร็จ", variant: "success" });
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error(e);
      notify(e?.message || String(e), { title: "ลบไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusy(false);
      resetDeleteFlow();
    }
  };

  const doDeleteOne = async () => {
    const id = deleteOneTarget?.id;
    if (!id) return;

    setBusy(true);
    try {
      await deleteDoc(doc(db, "leave_requests", id));
      notify("ลบรายการนี้สำเร็จ", { title: "สำเร็จ", variant: "success" });

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e: any) {
      console.error(e);
      notify(e?.message || String(e), { title: "ลบไม่สำเร็จ", variant: "danger" });
    } finally {
      setBusy(false);
      resetDeleteFlow();
    }
  };

  const runDeleteAction = async () => {
    if (!deletePhraseOk) return;
    if (deleteMode === "DEL_UID") return doDeleteByUid();
    if (deleteMode === "DEL_SELECTED") return doDeleteSelected();
    if (deleteMode === "DEL_ONE") return doDeleteOne();
  };

  const handleExportPDF = async () => {
    const statusLabel =
      statusFilter === "ALL" ? "ทั้งหมด" : statusFilter === "APPROVED" ? "อนุมัติ" : statusFilter === "REJECTED" ? "ไม่อนุมัติ" : "ยกเลิก";

    const fromLabel = dtFrom ? dtFrom.replace("T", " ") : "-";
    const toLabel = dtTo ? dtTo.replace("T", " ") : "-";

    const exportRowsWithSnapshot = filtered.map((r: any) => ({
      ...r,
      employeeName: fullNameOf(r),
      phone: getRowPhoneSnapshot(r) || phoneOf(r),
    }));

    const approvedCount = exportRowsWithSnapshot.filter((r: any) => normalizeStatus(r.status) === "APPROVED").length;
    const rejectedCount = exportRowsWithSnapshot.filter((r: any) => normalizeStatus(r.status) === "REJECTED").length;
    const canceledCount = exportRowsWithSnapshot.filter((r: any) => normalizeStatus(r.status) === "CANCELED").length;

    try {
      const exporter = getExporterProfile(user);

      const summary: any = {
        total: exportRowsWithSnapshot.length,
        approved: approvedCount,
        rejected: rejectedCount,
        canceled: canceledCount,
      };

      await exportApprovalHistoryPdf(exportRowsWithSnapshot, {
        title: "รายงานประวัติการอนุมัติใบลา",
        orgLine1: "Smart Leave System",
        orgLine2: "ฝ่ายทรัพยากรบุคคล (HR)",

        exportedByProfile: exporter,
        exportedBy:
          `${pickStr(exporter.fname)} ${pickStr(exporter.lname)}`.trim() ||
          (user as any)?.email ||
          (user as any)?.uid ||
          "-",
        exportedAt: new Date(),

        filtersText: `ค้นหา: ${qText?.trim() || "-"} | สถานะ: ${statusLabel}`,
        dateRangeText: `อ้างอิงวันอนุมัติ/ยกเลิก/อัปเดต: ${fromLabel} ถึง ${toLabel}`,
        summary,

        logoUrl: "/company-logo2.png",
        signatureTitle: "รักษาการกรรมการผู้จัดการใหญ่",
        signatureName: "นายจิรศักดิ์ บุญนาค",

        notify: (msg: string, opts?: any) => notify(msg, { title: opts?.title, variant: opts?.variant }),
      });

      notify("Export PDF สำเร็จ", { title: "สำเร็จ", variant: "success" });
    } catch (e: any) {
      console.error(e);
      notify(e?.message || String(e), { title: "Export ไม่สำเร็จ", variant: "danger" });
    }
  };

  const deleteTitle2 =
    deleteMode === "DEL_UID"
      ? "ยืนยันครั้งที่ 2: ลบประวัติจริง"
      : deleteMode === "DEL_SELECTED"
      ? "ยืนยันครั้งที่ 2: ลบรายการที่เลือกจริง"
      : deleteMode === "DEL_ONE"
      ? "ยืนยันครั้งที่ 2: ลบรายการนี้จริง"
      : "ยืนยันครั้งที่ 2";

  // ✅ style กัน input datetime-local แสดง icon
  const dateInputStyle: any = { appearance: "auto", WebkitAppearance: "auto" };

  return (
    <div className="p-6">
      {/* ===== Header Card ===== */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">ประวัติการอนุมัติใบลา</h1>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              แสดงรายการ “อนุมัติ / ไม่อนุมัติ / ยกเลิก”
            </div>
          </div>

          {canExport && (
            <AppButton
              type="button"
              disabled={busy || loading || filtered.length === 0}
              onClick={handleExportPDF}
              variant="outlinePill"
              className="h-11 px-6 whitespace-nowrap"
            >
              Export PDF
            </AppButton>
          )}
        </div>

        {/* ===== Filters ===== */}
        <style>{`
          input[type="datetime-local"]::-webkit-calendar-picker-indicator { opacity: 1; display: block; cursor: pointer; }
          input[type="datetime-local"]::-webkit-inner-spin-button, input[type="datetime-local"]::-webkit-clear-button { display: none; }
          .dark input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }
        `}</style>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ค้นหา</label>
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="ค้นหา: ชื่อ/เบอร์/อีเมล/เลขคำร้อง/ประเภท/ไฟล์แนบ/สถานะ(ยกเลิก)/ช่วงวันที่ลา"
              className={cn("mt-2", inputTheme.purple)}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={cn("mt-2", inputTheme.purple, "font-semibold")}
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="APPROVED">อนุมัติ</option>
              <option value="REJECTED">ไม่อนุมัติ</option>
              <option value="CANCELED">ยกเลิก</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">จากวันที่</label>
            <input
              type="datetime-local"
              value={dtFrom}
              onChange={(e) => setDtFrom(e.target.value)}
              className={cn("mt-2", inputTheme.purple)}
              style={dateInputStyle}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ถึงวันที่</label>
            <input
              type="datetime-local"
              value={dtTo}
              onChange={(e) => setDtTo(e.target.value)}
              className={cn("mt-2", inputTheme.purple)}
              style={dateInputStyle}
            />
          </div>

          <div className="lg:col-span-1 flex items-end justify-end">
            <AppButton
              type="button"
              onClick={() => {
                setDtFrom("");
                setDtTo("");
                notify("ล้างช่วงวัน-เวลาเรียบร้อย", { title: "สำเร็จ", variant: "success" });
              }}
              variant="outlinePill"
              className="h-11 px-5 whitespace-nowrap"
            >
              ล้าง
            </AppButton>
          </div>
        </div>
      </div>

      {/* ===== Delete Panel (ADMIN/EXECUTIVE_MANAGER) ===== */}
      {canDelete && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
            {/* ✅ ไม่ให้ select ยืดเต็ม: จำกัดความกว้าง */}
            <div className="lg:col-span-6">
              <div className="w-full max-w-[420px]">
                <select
                  value={accountUid}
                  onChange={(e) => setAccountUid(e.target.value)}
                  className={cn(inputTheme.purple, "h-11 w-full")}
                >
                  <option value="">เลือกบัญชีเพื่อ “ลบประวัติ”</option>
                  {accountOptionsFallback.map((o) => (
                    <option key={o.uid} value={o.uid}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ✅ ปุ่มไม่ให้ยืด: w-auto + whitespace-nowrap */}
            <div className="lg:col-span-6 flex flex-wrap justify-end gap-2">
              <AppButton
                type="button"
                variant="danger"
                size="md"
                disabled={!accountUid || busy}
                className="w-auto whitespace-nowrap"
                onClick={async () => {
                  const ok =
                    typeof confirm === "function"
                      ? await confirm("คุณต้องการลบประวัติของบัญชีนี้ใช่ไหม? (ขั้นที่ 1)", {
                          title: "ยืนยันการลบ",
                          confirmText: "ไปขั้นยืนยันครั้งที่ 2",
                          cancelText: "ยกเลิก",
                          variant: "danger",
                        })
                      : window.confirm("คุณต้องการลบประวัติของบัญชีนี้ใช่ไหม? (ขั้นที่ 1)");
                  if (!ok) return;

                  setDeleteMode("DEL_UID");
                  setDeletePhrase("");
                  setConfirm2Open(true);
                }}
              >
                ลบประวัติคนนี้
              </AppButton>

              <AppButton
                type="button"
                variant="danger"
                size="md"
                disabled={selectedIds.size === 0 || busy}
                className="w-auto whitespace-nowrap"
                onClick={() => setPreviewOpen(true)}
              >
                ลบรายการที่เลือก ({selectedIds.size})
              </AppButton>
            </div>

            <div className="lg:col-span-12 mt-1 flex items-center gap-4 text-sm text-amber-900 dark:text-amber-200">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (!checked) return setSelectedIds(new Set());
                    setSelectedIds(new Set(filtered.map((r: any) => r.id)));
                  }}
                />
                เลือกทั้งหมดในหน้าที่แสดง
              </label>

              <button
                type="button"
                disabled={selectedIds.size === 0 || busy}
                onClick={() => setSelectedIds(new Set())}
                className="font-extrabold text-violet-700 hover:text-violet-800 disabled:opacity-60"
              >
                ล้างที่เลือก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== List ===== */}
      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm text-gray-500 dark:text-gray-400">ไม่พบรายการ</div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((r: any) => {
            const submittedAt = fmtDate(r.submittedAt || r.createdAt);
            const decidedAt = fmtDate(
              r.decidedAt || r.approvedAt || r.rejectedAt || r.canceledAt || r.cancelledAt || r.updatedAt
            );

            const leaveRange = fmtLeaveRange(r); // ✅ ใช้แสดงผล

            const stTH = statusLabelTH(r.status);
            const checked = selectedIds.has(r.id);

            const email = pickStr(r?.createdByEmail, r?.email);
            const phone = phoneOf(r);

            const category = pickStr(r?.category, r?.leaveType, r?.type, "-");
            const subType = pickStr(r?.subType, r?.subtype);
            const leaveTypeText = subType ? `${category} • ${subType}` : category;

            const atts = attachmentsOf(r);

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{fullNameOf(r)}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      อีเมล: {email || "-"} <span className="ml-2">• เบอร์: {phone}</span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-700 dark:text-gray-200">
                      <div>
                        เลขคำร้อง: <span className="font-semibold">{r.requestNo || "-"}</span>
                      </div>

                      <div>
                        ประเภท: <span className="font-semibold">{leaveTypeText}</span>
                      </div>

                      {/* ✅ เพิ่ม: ช่วงวันที่ลา (เริ่ม–สิ้นสุด) */}
                      <div>
                        ช่วงวันที่ลา (เริ่ม–สิ้นสุด): <span className="font-semibold">{leaveRange}</span>
                      </div>

                      <div>
                        วันที่ยื่นคำร้อง: <span className="font-semibold">{submittedAt}</span>
                      </div>

                      <div>
                        วันที่อนุมัติ/ไม่อนุมัติ/ยกเลิก/อัปเดต: <span className="font-semibold">{decidedAt}</span>
                      </div>

                      <div className="mt-1">
                        หมายเหตุ:{" "}
                        {pickStr(r?.reason, r?.note, r?.detail) ? (
                          <span className="font-semibold">{pickStr(r?.reason, r?.note, r?.detail)}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>

                      {/* ✅ ไฟล์แนบ */}
                      <div className="mt-2">
                        <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ไฟล์แนบ</div>
                        {atts.length === 0 ? (
                          <div className="mt-1 text-sm text-gray-400">-</div>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {atts.slice(0, 3).map((a: any, idx: number) => (
                              <AppButton
                                key={`${r.id}-att-${idx}`}
                                type="button"
                                onClick={() => openAttachment(a)}
                                variant="outline"
                                size="sm"
                                className="max-w-[260px] truncate rounded-full"
                                title={a.name}
                              >
                                {a.name}
                              </AppButton>
                            ))}
                            {atts.length > 3 && (
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-center">
                                +{atts.length - 3} ไฟล์
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3">{statusBadge(stTH)}</div>
                    </div>
                  </div>

                  {/* ✅ คอลัมน์ขวา: checkbox + ปุ่มลบ */}
                  <div className="flex flex-col items-end gap-2">
                    {canDelete && (
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(r.id)} />
                        เลือก
                      </label>
                    )}

                    {canDelete && (
                      <AppButton
                        type="button"
                        variant="danger"
                        size="sm"
                        className="w-auto whitespace-nowrap"
                        disabled={busy}
                        onClick={async () => {
                          setDeleteOneTarget(r);

                          const ok =
                            typeof confirm === "function"
                              ? await confirm("คุณต้องการลบรายการนี้ใช่ไหม? (ขั้นที่ 1)", {
                                  title: "ยืนยันการลบรายการ",
                                  confirmText: "ไปขั้นยืนยันครั้งที่ 2",
                                  cancelText: "ยกเลิก",
                                  variant: "danger",
                                })
                              : window.confirm("คุณต้องการลบรายการนี้ใช่ไหม? (ขั้นที่ 1)");

                          if (!ok) {
                            setDeleteOneTarget(null);
                            return;
                          }

                          setDeleteMode("DEL_ONE");
                          setDeletePhrase("");
                          setConfirm2Open(true);
                        }}
                      >
                        ลบรายการนี้
                      </AppButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Preview selected ---------- */}
      <ModalShell
        open={previewOpen}
        title={`ลบรายการที่เลือก (${selectedRows.length})`}
        description="ตรวจสอบรายการที่เลือกก่อน แล้วกด “ไปขั้นยืนยัน”"
        widthClassName="max-w-xl"
        onClose={() => setPreviewOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <AppButton type="button" onClick={() => setPreviewOpen(false)} variant="outlinePill" className="h-10 px-5">
              ปิด
            </AppButton>

            <AppButton
              type="button"
              variant="danger"
              disabled={selectedRows.length === 0 || busy}
              className="h-10 px-5 whitespace-nowrap"
              onClick={async () => {
                setPreviewOpen(false);

                const ok =
                  typeof confirm === "function"
                    ? await confirm(`คุณต้องการลบรายการที่เลือกทั้งหมด ${selectedRows.length} รายการใช่ไหม? (ขั้นที่ 1)`, {
                        title: "ยืนยันการลบรายการที่เลือก",
                        confirmText: "ไปขั้นยืนยันครั้งที่ 2",
                        cancelText: "ยกเลิก",
                        variant: "danger",
                      })
                    : window.confirm(`คุณต้องการลบรายการที่เลือกทั้งหมด ${selectedRows.length} รายการใช่ไหม? (ขั้นที่ 1)`);
                if (!ok) return;

                setDeleteMode("DEL_SELECTED");
                setDeletePhrase("");
                setConfirm2Open(true);
              }}
            >
              ไปขั้นยืนยัน
            </AppButton>
          </div>
        }
      >
        <div className="max-h-[50vh] overflow-auto rounded-2xl border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-950">
          {selectedRows.length === 0 ? (
            <div className="text-sm text-gray-500">ยังไม่ได้เลือกรายการ</div>
          ) : (
            <ul className="space-y-2">
              {selectedRows.map((r: any) => (
                <li key={r.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {r.requestNo || "-"} • {statusLabelTH(r.status)}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{fullNameOf(r)}</div>

                  {/* ✅ เพิ่ม: ช่วงวันที่ลา */}
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    ช่วงวันที่ลา: {fmtLeaveRange(r)}
                  </div>

                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    ตัดสินใจ/อัปเดต:{" "}
                    {fmtDate(r.decidedAt || r.approvedAt || r.rejectedAt || r.canceledAt || r.cancelledAt || r.updatedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ModalShell>

      {/* ---------- Confirm step2 (พิมพ์ DELETE) ---------- */}
      <ModalShell
        open={confirm2Open}
        title={deleteTitle2}
        description="การลบย้อนกลับไม่ได้แน่นอน"
        widthClassName="max-w-lg"
        closeOnBackdrop={!busy}
        onClose={() => {
          if (busy) return;
          resetDeleteFlow();
        }}
        footer={
          <div className="flex justify-end gap-2">
            <AppButton type="button" disabled={busy} onClick={() => resetDeleteFlow()} variant="outlinePill" className="h-10 px-5">
              ยกเลิก
            </AppButton>

            <AppButton
              type="button"
              variant="danger"
              disabled={busy || !deletePhraseOk}
              onClick={runDeleteAction}
              className="h-10 px-5 whitespace-nowrap"
            >
              {busy ? "กำลังลบ..." : "ลบเลย"}
            </AppButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              เพื่อยืนยัน ให้พิมพ์คำว่า <span className="text-red-600">DELETE</span>
            </div>
            <input
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="DELETE"
              className={cn("mt-3", inputTheme.purple)}
            />
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ปุ่ม “ลบเลย” จะกดได้เมื่อพิมพ์ DELETE ถูกต้อง
            </div>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
