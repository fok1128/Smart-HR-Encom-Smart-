import { useEffect, useMemo, useState } from "react";
import { useLeave } from "../context/LeaveContext";

export default function LeaveApprovePage() {
  const {
    requests,
    loading,
    updateStatus,
    //updateRequest: _updateRequest, // ✅ กันแดง (ยังไม่ใช้)
    deleteRequest,
    deleteRequestsByUid,
  } = useLeave();

  const [savingId, setSavingId] = useState<string | null>(null);

  // ✅ Modal ไม่อนุมัติ
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const sorted = useMemo(() => requests, [requests]);
  const busy = (key: string) => savingId === key;

  // ✅ ล็อคสกรอล + กด ESC ปิด modal
  useEffect(() => {
    if (!rejectOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRejectOpen(false);
        setRejectId(null);
        setRejectReason("");
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rejectOpen]);

  const onApprove = async (id: string) => {
    try {
      setSavingId(id);
      await updateStatus(id, "อนุมัติ");
    } finally {
      setSavingId(null);
    }
  };

  const onRejectClick = (id: string) => {
    setRejectId(id);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    const reason = rejectReason.trim();
    if (!reason) return;

    try {
      setSavingId(rejectId);
      await updateStatus(rejectId, "ไม่อนุมัติ", reason);
      setRejectOpen(false);
      setRejectId(null);
      setRejectReason("");
    } finally {
      setSavingId(null);
    }
  };

  const onDeleteOne = async (id: string) => {
    const ok = confirm("ลบคำร้องนี้ใช่ไหม?\n(การกระทำนี้ย้อนกลับไม่ได้)");
    if (!ok) return;

    try {
      setSavingId(id);
      await deleteRequest(id);
    } finally {
      setSavingId(null);
    }
  };

  const onDeleteHistoryByUser = async (uid: string, email?: string) => {
    const ok = confirm(`ลบประวัติการลาทั้งหมดของ ${email ?? uid} ใช่ไหม?\n(การกระทำนี้ย้อนกลับไม่ได้)`);
    if (!ok) return;

    try {
      setSavingId(uid); // ใช้ uid เป็น busy key
      const count = await deleteRequestsByUid(uid);
      alert(`ลบประวัติสำเร็จ ${count} รายการ`);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="p-6">กำลังโหลด...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">อนุมัติการลา</h1>

      <div className="mt-4 space-y-3">
        {sorted.map((r) => {
          const rowBusy = busy(r.id) || busy(r.uid);

          return (
            <div
              key={r.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {r.createdByEmail ?? r.uid}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    สถานะ: {r.status}
                    {r.status === "ไม่อนุมัติ" && r.rejectReason ? (
                      <span className="ml-2 text-red-600 dark:text-red-400">• เหตุผล: {r.rejectReason}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={rowBusy}
                    onClick={() => onApprove(r.id)}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    อนุมัติ
                  </button>

                  <button
                    disabled={rowBusy}
                    onClick={() => onRejectClick(r.id)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    ไม่อนุมัติ
                  </button>

                  <button
                    disabled={rowBusy}
                    onClick={() => onDeleteOne(r.id)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    ลบคำร้องนี้
                  </button>

                  <button
                    disabled={rowBusy}
                    onClick={() => onDeleteHistoryByUser(r.uid, r.createdByEmail)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    ลบประวัติคนนี้
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ Modal เหตุผลไม่อนุมัติ */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[99999]">
          {/* overlay: เบลอฉากหลังทั้งหน้า รวมถึง header */}
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-md"
            onClick={() => {
              setRejectOpen(false);
              setRejectId(null);
              setRejectReason("");
            }}
          />

          {/* modal card */}
          <div className="relative z-[100000] flex min-h-screen items-center justify-center p-4">
            <div className="w-[92%] max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">เหตุผลที่ “ไม่อนุมัติ”</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">กรุณากรอกเหตุผลก่อนกดยืนยัน</p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                placeholder="พิมพ์เหตุผลที่ไม่อนุมัติ..."
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectOpen(false);
                    setRejectId(null);
                    setRejectReason("");
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  disabled={!rejectReason.trim() || !rejectId}
                  onClick={confirmReject}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  ยืนยันไม่อนุมัติ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
