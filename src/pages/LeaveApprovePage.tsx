import { useMemo, useState } from "react";
import { useLeave, type LeaveRequest, type LeaveStatus } from "../context/LeaveContext";

const statusLabel: Record<LeaveStatus, string> = {
  รอดำเนินการ: "รอดำเนินการ",
  อนุมัติ: "อนุมัติ",
  ไม่อนุมัติ: "ไม่อนุมัติ",
};

const statusBadge: Record<LeaveStatus, string> = {
  รอดำเนินการ: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  อนุมัติ: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ไม่อนุมัติ: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function dateText(s: string) {
  // "YYYY-MM-DD" หรือ "YYYY-MM-DDTHH:mm"
  return String(s).replace("T", " ");
}

export default function LeaveApprovePage() {
  const { requests, loading, updateStatus, updateRequest, deleteRequest } = useLeave();

  const [q, setQ] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return (requests ?? [])
      .filter((r) => (onlyPending ? r.status === "รอดำเนินการ" : true))
      .filter((r) => {
        if (!keyword) return true;
        return (
          r.requestNo.toLowerCase().includes(keyword) ||
          (r.createdByEmail ?? "").toLowerCase().includes(keyword) ||
          r.category.toLowerCase().includes(keyword) ||
          r.subType.toLowerCase().includes(keyword) ||
          (r.reason ?? "").toLowerCase().includes(keyword)
        );
      });
  }, [requests, q, onlyPending]);

  const onApprove = async (id: string) => {
    try {
      setSavingId(id);
      await updateStatus(id, "อนุมัติ");
    } finally {
      setSavingId(null);
    }
  };

  const onReject = async (id: string) => {
    try {
      setSavingId(id);
      await updateStatus(id, "ไม่อนุมัติ");
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (id: string) => {
    const ok = confirm("ลบคำร้องนี้ใช่ไหม?");
    if (!ok) return;
    try {
      setSavingId(id);
      await deleteRequest(id);
    } finally {
      setSavingId(null);
    }
  };

  // (optional) ตัวอย่าง edit แบบเร็ว: แก้ reason
  const onQuickEditReason = async (r: LeaveRequest) => {
    const next = prompt("แก้ไขเหตุผล (reason):", r.reason ?? "");
    if (next == null) return;
    try {
      setSavingId(r.id);
      await updateRequest(r.id, { reason: next });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">อนุมัติใบลา (Admin)</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            จัดการคำร้องลาทั้งหมด • อนุมัติ/ไม่อนุมัติ/แก้ไข/ลบ
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-brand-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              placeholder='ค้นหา: เลขคำร้อง / email / ประเภท / เหตุผล'
            />

            <button
              type="button"
              onClick={() => setQ("")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              ล้าง
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            แสดงเฉพาะ “รอดำเนินการ”
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            รายการคำร้อง ({rows.length})
          </div>
          {loading && <div className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด...</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-semibold">เลขคำร้อง</th>
                <th className="px-4 py-3 font-semibold">ผู้ยื่น</th>
                <th className="px-4 py-3 font-semibold">ประเภท</th>
                <th className="px-4 py-3 font-semibold">ช่วงเวลา</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
                <th className="px-4 py-3 font-semibold">การจัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={6}>
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const busy = savingId === r.id;
                  return (
                    <tr key={r.id} className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{r.requestNo}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{r.createdByEmail ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {r.category} • {r.subType}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {dateText(r.startAt)} → {dateText(r.endAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[r.status]}`}>
                          {statusLabel[r.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={busy}
                            onClick={() => onApprove(r.id)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                          >
                            อนุมัติ
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => onReject(r.id)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                          >
                            ไม่อนุมัติ
                          </button>

                          <button
                            disabled={busy}
                            onClick={() => onQuickEditReason(r)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                          >
                            แก้ reason
                          </button>

                          <button
                            disabled={busy}
                            onClick={() => onDelete(r.id)}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            ลบ
                          </button>

                          {busy && <span className="text-xs text-gray-500 dark:text-gray-400">กำลังบันทึก...</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
