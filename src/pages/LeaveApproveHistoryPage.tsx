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

type LeaveRow = any;

const APPROVER_ROLES = ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"];
const DELETE_ROLES = ["ADMIN", "EXECUTIVE_MANAGER"];

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
    ts?.toDate?.() ? ts.toDate() :
    ts instanceof Date ? ts :
    ts ? new Date(ts) : null;

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
  if (s === "APPROVED") return "อนุมัติ";
  if (s === "REJECTED") return "ไม่อนุมัติ";
  if (s === "PENDING") return "รอดำเนินการ";
  return String(raw || "").trim() || "-";
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-[100000] flex min-h-screen items-center justify-center p-4">
        <div className="w-[96%] max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </div>
          {description ? (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {description}
            </div>
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

async function batchDeleteByDocs(refs: Array<{ ref: any }>) {
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

export default function LeaveApproveHistoryPage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();

  const canView = APPROVER_ROLES.includes(role);
  const canDelete = DELETE_ROLES.includes(role);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeaveRow[]>([]);

  // filters/search
  const [qText, setQText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");

  // selection (delete selected)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // delete tools state
  const [accountUid, setAccountUid] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // modals
  const [m1Open, setM1Open] = useState(false); // first confirm
  const [m2Open, setM2Open] = useState(false); // second confirm
  const [modalMode, setModalMode] = useState<"DEL_UID" | "DEL_SELECTED" | "DEL_ONE" | null>(null);
  const [selectedPreviewOpen, setSelectedPreviewOpen] = useState(false);

  // delete one target
  const [deleteOneTarget, setDeleteOneTarget] = useState<any | null>(null);

  // typed confirm (step 2)
  const [deletePhrase, setDeletePhrase] = useState("");
  const deletePhraseOk = deletePhrase.trim().toUpperCase() === "DELETE";

  // ✅ ชื่อจริง (uid -> fullName)
  const [nameByUid, setNameByUid] = useState<Record<string, string>>({});

  // dropdown options (ชื่อจริง)
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // load history docs (approved/rejected)
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
        list.sort((a: any, b: any) => {
          const at =
            tsToMs(a.decidedAt) ||
            tsToMs(a.approvedAt) ||
            tsToMs(a.rejectedAt) ||
            tsToMs(a.updatedAt) ||
            tsToMs(a.submittedAt) ||
            tsToMs(a.createdAt);

          const bt =
            tsToMs(b.decidedAt) ||
            tsToMs(b.approvedAt) ||
            tsToMs(b.rejectedAt) ||
            tsToMs(b.updatedAt) ||
            tsToMs(b.submittedAt) ||
            tsToMs(b.createdAt);

          return bt - at;
        });

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

  // ✅ load users/employees => nameByUid + dropdown options เป็น fname lname
  useEffect(() => {
    if (!canView) {
      setAccountOptions([]);
      setNameByUid({});
      return;
    }

    const loadAccounts = async () => {
      setAccountsLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const users = usersSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));

        // employees (optional)
        let employees: any[] = [];
        try {
          const empSnap = await getDocs(collection(db, "employees"));
          employees = empSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch {}

        const empByNo = new Map<string, any>();
        employees.forEach((e) => e?.employeeNo && empByNo.set(String(e.employeeNo), e));

        const uidToName: Record<string, string> = {};
        const opts: AccountOption[] = [];

        users.forEach((u: any) => {
          const uid = String(u?.uid || "").trim();
          if (!uid) return;

          const emp = u?.employeeNo ? empByNo.get(String(u.employeeNo)) : null;

          const fname = String(u?.fname || emp?.fname || "").trim();
          const lname = String(u?.lname || emp?.lname || "").trim();
          const fullName = `${fname} ${lname}`.trim();

          // ✅ map ชื่อจริงไว้ใช้โชว์ใน card (ถ้าไม่มีชื่อ ใช้ email เป็น fallback)
          uidToName[uid] = fullName || String(u?.email || "").trim() || uid;

          // ✅ dropdown: เน้น fname lname (ถ้าไม่มีชื่อจริงให้ fallback เป็น email)
          opts.push({
            uid,
            label: fullName || String(u?.email || "").trim() || uid,
          });
        });

        opts.sort((a, b) => a.label.localeCompare(b.label, "th"));

        setNameByUid(uidToName);
        setAccountOptions(opts);
      } finally {
        setAccountsLoading(false);
      }
    };

    loadAccounts();
  }, [canView]);

  // fallback account options from rows (ถ้าโหลด users ไม่ทัน)
  const accountOptionsFallback = useMemo(() => {
    const map = new Map<string, AccountOption>();
    const nmap: Record<string, string> = {};

    rows.forEach((r: any) => {
      const uid = String(r?.uid || "").trim();
      if (!uid) return;

      const email = String(r?.createdByEmail || r?.email || "").trim();
      if (!map.has(uid)) map.set(uid, { uid, label: email || uid });

      if (!nmap[uid]) nmap[uid] = email || uid;
    });

    if (Object.keys(nmap).length) {
      setNameByUid((prev) => ({ ...nmap, ...prev }));
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const finalAccountOptions = accountOptions.length > 0 ? accountOptions : accountOptionsFallback;

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter((r: any) => {
      const sUp = String(r?.status || "").trim().toUpperCase();

      const okStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "APPROVED"
          ? sUp === "APPROVED" || sUp === "อนุมัติ".toUpperCase()
          : sUp === "REJECTED" || sUp === "ไม่อนุมัติ".toUpperCase();

      if (!okStatus) return false;
      if (!q) return true;

      const hay = [
        nameByUid[String(r?.uid || "").trim()],
        r?.createdByEmail,
        r?.email,
        r?.requestNo,
        r?.uid,
        r?.category,
        r?.subType,
        r?.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, qText, statusFilter, nameByUid]);

  // keep selections only for visible rows
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filtered.map((r: any) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
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

  const resetConfirmState = () => setDeletePhrase("");

  // ===== delete actions =====
  const askDeleteByUid = () => {
    if (!accountUid) return;
    setModalMode("DEL_UID");
    resetConfirmState();
    setM1Open(true);
  };

  const askDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setSelectedPreviewOpen(true);
  };

  const confirmFromPreview = () => {
    setSelectedPreviewOpen(false);
    setModalMode("DEL_SELECTED");
    resetConfirmState();
    setM1Open(true);
  };

  const askDeleteOne = (row: any) => {
    if (!row?.id) return;
    setDeleteOneTarget(row);
    setModalMode("DEL_ONE");
    resetConfirmState();
    setM1Open(true);
  };

  const doDeleteByUid = async () => {
    if (!accountUid) return;

    setBusy(true);
    try {
      const colRef = collection(db, "leave_requests");

      const qy = query(
        colRef,
        where("uid", "==", accountUid),
        where("status", "in", ["อนุมัติ", "ไม่อนุมัติ", "APPROVED", "REJECTED"])
      );

      const snap = await getDocs(qy);
      if (snap.empty) {
        alert("ไม่พบรายการประวัติของบัญชีนี้");
        return;
      }

      const refs = snap.docs.map((d) => ({ ref: d.ref }));
      const deleted = await batchDeleteByDocs(refs);

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
      const deleted = await batchDeleteByDocs(refs);

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

  const handleConfirm2 = () => {
    if (!deletePhraseOk) return;
    if (modalMode === "DEL_UID") return doDeleteByUid();
    if (modalMode === "DEL_SELECTED") return doDeleteSelected();
    if (modalMode === "DEL_ONE") return doDeleteOne();
  };

  // ✅ Badge ใหญ่ขึ้นนิด
  const statusBadge = (st: string) => {
    const cls =
      st === "อนุมัติ"
        ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-900/40"
        : st === "ไม่อนุมัติ"
        ? "text-red-700 bg-red-50 border-red-200 dark:text-red-200 dark:bg-red-500/10 dark:border-red-900/40"
        : "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-200 dark:bg-gray-800/40 dark:border-gray-700";

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
          cls
        )}
      >
        {st}
      </span>
    );
  };

  const modalTitle1 =
    modalMode === "DEL_UID"
      ? "ยืนยันการลบประวัติของบัญชีนี้?"
      : modalMode === "DEL_SELECTED"
      ? "ยืนยันการลบรายการที่เลือก?"
      : modalMode === "DEL_ONE"
      ? "ยืนยันการลบรายการนี้?"
      : "ยืนยัน";

  const modalTitle2 =
    modalMode === "DEL_UID"
      ? "ยืนยันครั้งที่ 2: ลบประวัติจริง"
      : modalMode === "DEL_SELECTED"
      ? "ยืนยันครั้งที่ 2: ลบรายการที่เลือกจริง"
      : modalMode === "DEL_ONE"
      ? "ยืนยันครั้งที่ 2: ลบรายการนี้จริง"
      : "ยืนยันครั้งที่ 2";

  // ✅ helper ชื่อจริง (ซ่อนเมลบนการ์ด)
  const displayNameOf = (r: any) => {
    const uid = String(r?.uid || "").trim();
    return nameByUid[uid] || "ไม่ระบุชื่อ";
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="ค้นหา: ชื่อ/อีเมล/เลขคำร้อง"
            className="h-10 w-[320px] rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
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
        </div>
      </div>

      {/* ✅ Delete tools */}
      {canDelete && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          {/* ✅ เอาหัว/คำอธิบายที่วงแดงออกแล้ว */}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={accountUid}
              onChange={(e) => setAccountUid(e.target.value)}
              className="h-10 min-w-[360px] rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold outline-none dark:border-amber-900/40 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">
                {accountsLoading ? "กำลังโหลดรายชื่อ..." : "เลือกบัญชีเพื่อ “ลบประวัติ”"}
              </option>
              {finalAccountOptions.map((o) => (
                <option key={o.uid} value={o.uid}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!accountUid || busy}
              onClick={askDeleteByUid}
              className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              title="ลบประวัติอนุมัติ/ไม่อนุมัติของบัญชีนี้ทั้งหมด"
            >
              ลบประวัติคนนี้
            </button>

            <button
              type="button"
              disabled={selectedIds.size === 0 || busy}
              onClick={askDeleteSelected}
              className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-200 dark:hover:bg-red-500/10"
              title="ลบรายการที่เลือก"
            >
              ลบรายการที่เลือก ({selectedIds.size})
            </button>

            {/* ✅ เอาข้อความวงแดงด้านขวาออกแล้ว */}
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

      {/* list */}
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

            const fullName = displayNameOf(r);

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* ✅ แสดงชื่อจริง */}
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {fullName}
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

                    {/* ✅ badge + ปุ่มลบ อยู่ระดับเดียวกัน */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {statusBadge(st)}

                      {canDelete && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => askDeleteOne(r)}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          ลบรายการนี้
                        </button>
                      )}
                    </div>
                  </div>

                  {/* checkbox (top-right) */}
                  {canDelete && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(r.id)}
                      />
                      เลือก
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview selected modal */}
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
          resetConfirmState();
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
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {displayNameOf(r)}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    ตัดสินใจ: {fmtDate(r.decidedAt || r.approvedAt || r.rejectedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ConfirmModal>

      {/* Confirm modal step 1 */}
      <ConfirmModal
        open={m1Open}
        title={modalTitle1}
        description="นี่คือการยืนยันครั้งที่ 1 (ยังไม่ลบจริง)"
        confirmText="ไปยืนยันครั้งที่ 2"
        danger
        disabled={busy}
        onClose={() => {
          setM1Open(false);
          setModalMode(null);
          setDeleteOneTarget(null);
          resetConfirmState();
        }}
        onConfirm={() => {
          setM1Open(false);
          setM2Open(true);
        }}
      />

      {/* Confirm modal step 2 (typed DELETE) */}
      <ConfirmModal
        open={m2Open}
        title={modalTitle2}
        description="การลบย้อนกลับไม่ได้แน่นอน"
        confirmText={busy ? "กำลังลบ..." : "ลบเลย"}
        danger
        disabled={busy || !deletePhraseOk}
        onClose={() => {
          if (busy) return;
          setM2Open(false);
          setModalMode(null);
          setDeleteOneTarget(null);
          resetConfirmState();
        }}
        onConfirm={handleConfirm2}
      >
        <div className="space-y-3">
          {modalMode === "DEL_UID" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-200">
              จะลบประวัติ “อนุมัติ/ไม่อนุมัติ” ของบัญชีที่เลือกทั้งหมด
            </div>
          ) : modalMode === "DEL_SELECTED" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-200">
              จะลบรายการที่เลือกทั้งหมด: {selectedIds.size} รายการ
            </div>
          ) : modalMode === "DEL_ONE" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-200">
              จะลบ “รายการเดียว” นี้ (เลขคำร้อง: {deleteOneTarget?.requestNo || "-"})
            </div>
          ) : null}

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
