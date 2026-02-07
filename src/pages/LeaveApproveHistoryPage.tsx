// LeaveApproveHistoryPage.tsx
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
import { exportApprovalHistoryPdf } from "../utils/pdf/exportApprovalHistoryPdf";

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

function showStatus(raw: any) {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "APPROVED" || s === "อนุมัติ".toUpperCase()) return "อนุมัติ";
  if (s === "REJECTED" || s === "ไม่อนุมัติ".toUpperCase()) return "ไม่อนุมัติ";
  if (s === "PENDING" || s === "รอดำเนินการ".toUpperCase()) return "รอดำเนินการ";
  return String(raw || "").trim() || "-";
}

function statusTH(status: any) {
  const s = String(status ?? "").trim().toUpperCase();
  if (s.includes("APPROV") || s.includes("อนุมัติ".toUpperCase())) return "อนุมัติ";
  if (s.includes("REJECT") || s.includes("DENY") || s.includes("ไม่อนุมัติ".toUpperCase()))
    return "ไม่อนุมัติ";
  if (s.includes("PEND") || s.includes("WAIT") || s.includes("รอดำเนินการ".toUpperCase()))
    return "รอดำเนินการ";
  return String(status ?? "").trim() || "-";
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function startOfDayMs(yyyyMmDd: string) {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfDayMs(yyyyMmDd: string) {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function decidedAtMs(r: any) {
  return (
    tsToMs(r?.decidedAt) ||
    tsToMs(r?.approvedAt) ||
    tsToMs(r?.rejectedAt) ||
    tsToMs(r?.updatedAt) ||
    tsToMs(r?.submittedAt) ||
    tsToMs(r?.createdAt) ||
    0
  );
}

// ✅ ครอบคลุมหลายชื่อ field เก่า/ใหม่
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
function getRowEmployeeNo(r: any) {
  return pickStr(
    r?.employeeNo,
    r?.empNo,
    r?.employee_id,
    r?.employeeId,
    r?.createdByEmployeeNo,
    r?.userEmployeeNo
  );
}
function getRowEmployeeNameSnapshot(r: any) {
  return pickStr(r?.employeeName, r?.createdByName, r?.fullName, r?.requesterName);
}
function getRowPhoneSnapshot(r: any) {
  return pickStr(r?.phone, r?.createdByPhone, r?.tel, r?.mobile);
}

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
};

function ConfirmModal({
  open,
  title,
  description,
  confirmText = "ยืนยัน",
  danger,
  disabled,
  onClose,
  onConfirm,
  children,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-[100000] flex min-h-screen items-center justify-center p-4">
        <div className="w-[96%] max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          {description ? (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</div>
          ) : null}

          {children ? <div className="mt-4">{children}</div> : null}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={onConfirm}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60",
                danger ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

// ✅ ดึงข้อมูล "ผู้ออกรายงาน" ให้แน่น: fname/lname/position top-level ก่อน
function getExporterProfile(u: any) {
  const fname = pickStr(u?.fname, u?.firstName, u?.profile?.fname, u?.user?.fname, u?.employee?.fname);
  const lname = pickStr(u?.lname, u?.lastName, u?.profile?.lname, u?.user?.lname, u?.employee?.lname);
  const position = pickStr(u?.position, u?.profile?.position, u?.employee?.position, u?.jobTitle);
  return { fname, lname, position };
}

export default function LeaveApproveHistoryPage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();

  const canView = APPROVER_ROLES.includes(role);
  const canDelete = DELETE_ROLES.includes(role);
  const canExport = EXPORT_ROLES.includes(role);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeaveRow[]>([]);

  const [qText, setQText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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

  const [m1Open, setM1Open] = useState(false);
  const [m2Open, setM2Open] = useState(false);
  const [modalMode, setModalMode] = useState<"DEL_UID" | "DEL_SELECTED" | "DEL_ONE" | null>(null);
  const [selectedPreviewOpen, setSelectedPreviewOpen] = useState(false);
  const [deleteOneTarget, setDeleteOneTarget] = useState<any | null>(null);

  const [deletePhrase, setDeletePhrase] = useState("");
  const deletePhraseOk = deletePhrase.trim().toUpperCase() === "DELETE";

  // ✅ employees map: employeeNo -> {name, phone}
  // หมายเหตุ: history ห้ามอ่าน users ของคนอื่น -> ใช้ employees หรือ snapshot เท่านั้น
  const [empMap, setEmpMap] = useState<Record<string, { name: string; phone: string }>>({});
  const [empLoading, setEmpLoading] = useState(false);

  // ✅ โหลด employees ทั้งหมดครั้งเดียว (สำหรับ approver)
  // ถ้า collection ใหญ่จริง ค่อย optimize ภายหลังเป็น "โหลดเฉพาะ empNo ที่ต้องใช้"
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!canView) {
        setEmpMap({});
        return;
      }

      setEmpLoading(true);
      try {
        const empSnap = await getDocs(collection(db, "employees"));
        const out: Record<string, { name: string; phone: string }> = {};

        empSnap.docs.forEach((d) => {
          const e: any = d.data();

          // ✅ key: เอา doc.id เป็นหลัก (employees/{EMPxxx}) + fallback field ใน doc
          const no = pickStr(d.id, e?.employeeNo, e?.empNo, e?.employee_id, e?.employeeId);
          if (!no) return;

          const fname = pickStr(e?.fname, e?.firstName, e?.first_name);
          const lname = pickStr(e?.lname, e?.lastName, e?.last_name);
          const name = `${fname} ${lname}`.trim();

          const phone = pickStr(e?.phone, e?.tel, e?.mobile, e?.phones?.[0]);

          out[no] = { name: name || "-", phone: phone || "-" };
        });

        if (!alive) return;
        setEmpMap(out);
      } catch (e) {
        console.error("LeaveApproveHistoryPage load employees error:", e);
        if (alive) setEmpMap({});
      } finally {
        if (alive) setEmpLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [canView]);

  // ✅ 2) โหลด history
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
      where("status", "in", ["อนุมัติ", "ไม่อนุมัติ", "APPROVED", "REJECTED"])
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
      }
    );

    return () => unsub();
  }, [user?.uid, canView]);

  // ✅ options สำหรับลบประวัติ “คนนี้”
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

  // ✅ ชื่อ: snapshot -> employees -> fallback (empNo/email/uid)
  const fullNameOf = (r: any) => {
    const snapName = getRowEmployeeNameSnapshot(r);
    if (snapName) return snapName;

    const empNo = getRowEmployeeNo(r);
    const byEmp = empNo ? pickStr(empMap?.[empNo]?.name) : "";
    if (byEmp) return byEmp;

    const email = getRowEmail(r);
    const uid = getRowUid(r);
    return pickStr(empNo, email, uid, "-");
  };

  // ✅ เบอร์: snapshot -> employees -> "-"
  const phoneOf = (r: any) => {
    const snapPhone = getRowPhoneSnapshot(r);
    if (snapPhone) return snapPhone;

    const empNo = getRowEmployeeNo(r);
    const byEmp = empNo ? pickStr(empMap?.[empNo]?.phone) : "";
    return byEmp || "-";
  };

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();

    return (Array.isArray(rows) ? rows : []).filter((r: any) => {
      const st = showStatus(r?.status);
      const okStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "APPROVED"
          ? st === "อนุมัติ"
          : st === "ไม่อนุมัติ";

      if (!okStatus) return false;
      if (!q) return true;

      const uid = getRowUid(r);
      const email = getRowEmail(r);
      const empNo = getRowEmployeeNo(r);

      const fullName = fullNameOf(r);
      const phone = phoneOf(r);

      const hay = [
        fullName,
        phone,
        empNo,
        email,
        r?.requestNo,
        uid,
        r?.category,
        r?.subType,
        r?.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, qText, statusFilter, empMap]);

  const exportRows = useMemo(() => {
    const fromMs = startOfDayMs(dateFrom);
    const toMs = endOfDayMs(dateTo);

    return (filtered ?? []).filter((r: any) => {
      const t = decidedAtMs(r);
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  }, [filtered, dateFrom, dateTo]);

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
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            ไม่มีสิทธิ์เข้าหน้านี้
          </div>
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
      const statusQ = ["อนุมัติ", "ไม่อนุมัติ", "APPROVED", "REJECTED"];

      const tryFields = ["uid", "createdByUid", "userUid", "userId"];
      const refsMap = new Map<string, any>();

      for (const f of tryFields) {
        const qy = query(colRef, where(f, "==", accountUid), where("status", "in", statusQ));
        const snap = await getDocs(qy);
        snap.docs.forEach((d) => refsMap.set(d.id, d.ref));
      }

      const refs = Array.from(refsMap.values()).map((ref) => ({ ref }));
      if (refs.length === 0) {
        alert("ไม่พบรายการประวัติของบัญชีนี้");
        return;
      }

      const deleted = await batchDeleteByRefs(refs);

      alert(`ลบประวัติสำเร็จ ${deleted} รายการ`);
      setAccountUid("");
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error(e);
      alert(`ลบไม่สำเร็จ: ${e?.message || e}`);
    } finally {
      setBusy(false);
      setM1Open(false);
      setM2Open(false);
      setModalMode(null);
      setDeleteOneTarget(null);
    }
  };

  const doDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBusy(true);
    try {
      const refs = ids.map((id) => ({ ref: doc(db, "leave_requests", id) }));
      const deleted = await batchDeleteByRefs(refs);

      alert(`ลบรายการที่เลือกสำเร็จ ${deleted} รายการ`);
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error(e);
      alert(`ลบไม่สำเร็จ: ${e?.message || e}`);
    } finally {
      setBusy(false);
      setM1Open(false);
      setM2Open(false);
      setModalMode(null);
      setDeleteOneTarget(null);
    }
  };

  const doDeleteOne = async () => {
    const id = deleteOneTarget?.id;
    if (!id) return;

    setBusy(true);
    try {
      await deleteDoc(doc(db, "leave_requests", id));
      alert("ลบรายการนี้สำเร็จ");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e: any) {
      console.error(e);
      alert(`ลบไม่สำเร็จ: ${e?.message || e}`);
    } finally {
      setBusy(false);
      setM1Open(false);
      setM2Open(false);
      setModalMode(null);
      setDeleteOneTarget(null);
    }
  };

  const handleExportPDF = async () => {
    const statusLabel =
      statusFilter === "ALL" ? "ทั้งหมด" : statusFilter === "APPROVED" ? "อนุมัติ" : "ไม่อนุมัติ";

    const fromLabel = dateFrom ? dateFrom : "-";
    const toLabel = dateTo ? dateTo : "-";

    // ✅ ใส่ employeeName/phone ให้ PDF ใช้แบบชัวร์ (ไม่ต้องไปอ่าน users)
    const exportRowsWithSnapshot = exportRows.map((r: any) => ({
      ...r,
      employeeName: fullNameOf(r),
      phone: getRowPhoneSnapshot(r) || phoneOf(r),
    }));

    const approvedCount = exportRowsWithSnapshot.filter((r: any) => statusTH(r.status) === "อนุมัติ").length;
    const rejectedCount = exportRowsWithSnapshot.filter((r: any) => statusTH(r.status) === "ไม่อนุมัติ").length;

    const exporter = getExporterProfile(user);

    await exportApprovalHistoryPdf(exportRowsWithSnapshot, {
      title: "รายงานประวัติการอนุมัติใบลา",
      orgLine1: "Smart Leave System",
      orgLine2: "ฝ่ายทรัพยากรบุคคล (HR)",

      exportedByProfile: exporter,
      exportedBy: `${pickStr(exporter.fname)} ${pickStr(exporter.lname)}`.trim() || user?.email || user?.uid || "-",
      exportedAt: new Date(),

      filtersText: `ค้นหา: ${qText?.trim() || "-"} | สถานะ: ${statusLabel}`,
      dateRangeText: `อ้างอิงวันอนุมัติ/อัปเดต: ${fromLabel} ถึง ${toLabel}`,
      summary: {
        total: exportRowsWithSnapshot.length,
        approved: approvedCount,
        rejected: rejectedCount,
      },

      logoUrl: "/company-logo2.png",
      signatureTitle: "รักษาการกรรมการผู้จัดการใหญ่",
      signatureName: "นายจิรศักดิ์ บุญนาค",
    });
  };

  const statusBadge = (st: string) => {
    const cls =
      st === "อนุมัติ"
        ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-900/40"
        : st === "ไม่อนุมัติ"
        ? "text-red-700 bg-red-50 border-red-200 dark:text-red-200 dark:bg-red-500/10 dark:border-red-900/40"
        : "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-200 dark:bg-gray-800/40 dark:border-gray-700";

    return (
      <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold", cls)}>
        {st}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            ประวัติการอนุมัติใบลา
          </h1>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            แสดงเฉพาะรายการ “อนุมัติ/ไม่อนุมัติ”
            {empLoading ? " • กำลังโหลดรายชื่อพนักงาน..." : ""}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="ค้นหา: ชื่อ/เบอร์/อีเมล/เลขคำร้อง/รหัสพนักงาน"
            className="h-10 w-[360px] rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="APPROVED">อนุมัติ</option>
            <option value="REJECTED">ไม่อนุมัติ</option>
          </select>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">ช่วงวันที่:</div>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
            <span className="text-sm text-gray-500">ถึง</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />

            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              ล้างช่วงวันที่
            </button>

            {canExport && (
              <button
                type="button"
                disabled={busy || loading || exportRows.length === 0}
                onClick={handleExportPDF}
                className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {canDelete && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={accountUid}
              onChange={(e) => setAccountUid(e.target.value)}
              className="h-10 min-w-[360px] rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold outline-none dark:border-amber-900/40 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">เลือกบัญชีเพื่อ “ลบประวัติ”</option>
              {accountOptionsFallback.map((o) => (
                <option key={o.uid} value={o.uid}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!accountUid || busy}
              onClick={() => {
                setModalMode("DEL_UID");
                setM1Open(true);
                setDeletePhrase("");
              }}
              className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              ลบประวัติคนนี้
            </button>

            <button
              type="button"
              disabled={selectedIds.size === 0 || busy}
              onClick={() => setSelectedPreviewOpen(true)}
              className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-200 dark:hover:bg-red-500/10"
            >
              ลบรายการที่เลือก ({selectedIds.size})
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
            <label className="flex items-center gap-2">
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
              className="rounded-lg px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:text-amber-200 dark:hover:bg-amber-500/10"
            >
              ล้างที่เลือก
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">ไม่พบรายการ</div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((r: any) => {
            const submittedAt = fmtDate(r.submittedAt || r.createdAt);
            const decidedAt = fmtDate(r.decidedAt || r.approvedAt || r.rejectedAt);
            const st = showStatus(r.status);
            const checked = selectedIds.has(r.id);

            const email = pickStr(r?.createdByEmail, r?.email);
            const empNo = getRowEmployeeNo(r);
            const phone = phoneOf(r);

            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {fullNameOf(r)}
                    </div>

                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      อีเมล: {email || "-"}
                      <span className="ml-2">• เบอร์: {phone}</span>
                      {empNo ? <span className="ml-2">• รหัสพนักงาน: {empNo}</span> : null}
                    </div>

                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                      เลขคำร้อง: <span className="font-semibold">{r.requestNo || "-"}</span>
                    </div>

                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                      วันที่ยื่นคำร้อง: <span className="font-semibold">{submittedAt}</span>
                    </div>

                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                      วันที่อนุมัติ/ไม่อนุมัติ: <span className="font-semibold">{decidedAt}</span>
                    </div>

                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                      หมายเหตุ:{" "}
                      {r.reason ? (
                        <span className="font-semibold">{r.reason}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      {statusBadge(st)}

                      {canDelete && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setDeleteOneTarget(r);
                            setModalMode("DEL_ONE");
                            setDeletePhrase("");
                            setM1Open(true);
                          }}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          ลบรายการนี้
                        </button>
                      )}
                    </div>
                  </div>

                  {canDelete && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      <input type="checkbox" checked={checked} onChange={() => toggleSelect(r.id)} />
                      เลือก
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* preview selected */}
      <ConfirmModal
        open={selectedPreviewOpen}
        title={`ลบรายการที่เลือก (${selectedRows.length})`}
        description="ตรวจสอบรายการที่เลือกก่อน แล้วกด “ไปขั้นยืนยัน”"
        confirmText="ไปขั้นยืนยัน"
        danger
        disabled={selectedRows.length === 0}
        onClose={() => setSelectedPreviewOpen(false)}
        onConfirm={() => {
          setSelectedPreviewOpen(false);
          setModalMode("DEL_SELECTED");
          setDeletePhrase("");
          setM1Open(true);
        }}
      >
        <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-950">
          {selectedRows.length === 0 ? (
            <div className="text-sm text-gray-500">ยังไม่ได้เลือกรายการ</div>
          ) : (
            <ul className="space-y-2">
              {selectedRows.map((r: any) => (
                <li key={r.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {r.requestNo || "-"} • {showStatus(r.status)}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{fullNameOf(r)}</div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    ตัดสินใจ: {fmtDate(r.decidedAt || r.approvedAt || r.rejectedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ConfirmModal>

      {/* confirm step1 */}
      <ConfirmModal
        open={m1Open}
        title={"ยืนยันการลบ?"}
        description="นี่คือการยืนยันครั้งที่ 1 (ยังไม่ลบจริง)"
        confirmText="ไปยืนยันครั้งที่ 2"
        danger
        disabled={busy}
        onClose={() => {
          setM1Open(false);
          setModalMode(null);
          setDeleteOneTarget(null);
          setDeletePhrase("");
        }}
        onConfirm={() => {
          setM1Open(false);
          setM2Open(true);
        }}
      />

      {/* confirm step2 */}
      <ConfirmModal
        open={m2Open}
        title={
          modalMode === "DEL_UID"
            ? "ยืนยันครั้งที่ 2: ลบประวัติจริง"
            : modalMode === "DEL_SELECTED"
            ? "ยืนยันครั้งที่ 2: ลบรายการที่เลือกจริง"
            : modalMode === "DEL_ONE"
            ? "ยืนยันครั้งที่ 2: ลบรายการนี้จริง"
            : "ยืนยันครั้งที่ 2"
        }
        description="การลบย้อนกลับไม่ได้แน่นอน"
        confirmText={busy ? "กำลังลบ..." : "ลบเลย"}
        danger
        disabled={busy || !deletePhraseOk}
        onClose={() => {
          if (busy) return;
          setM2Open(false);
          setModalMode(null);
          setDeleteOneTarget(null);
          setDeletePhrase("");
        }}
        onConfirm={() => {
          if (!deletePhraseOk) return;
          if (modalMode === "DEL_UID") return doDeleteByUid();
          if (modalMode === "DEL_SELECTED") return doDeleteSelected();
          if (modalMode === "DEL_ONE") return doDeleteOne();
        }}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              เพื่อยืนยัน ให้พิมพ์คำว่า <span className="text-red-600">DELETE</span>
            </div>
            <input
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="DELETE"
              className="mt-3 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ปุ่ม “ลบเลย” จะกดได้เมื่อพิมพ์ DELETE ถูกต้อง
            </div>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
