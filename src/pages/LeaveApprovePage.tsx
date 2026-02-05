import { useEffect, useMemo, useState } from "react";
import { useLeave } from "../context/LeaveContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

function fmtDate(ts: any) {
  const d =
    ts?.toDate?.() ? ts.toDate() :
    ts instanceof Date ? ts :
    ts ? new Date(ts) : null;

  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const APPROVER_ROLES = ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"];

type AttachItem = {
  name: string;
  size: number;
  url?: string;
  storagePath?: string;
};

export default function LeaveApprovePage() {
  const { requests, loading, updateStatus, deleteRequest, deleteRequestsByUid } = useLeave();

  const { user } = useAuth();
  const role = (user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const canApprove = APPROVER_ROLES.includes(role);

  const [savingId, setSavingId] = useState<string | null>(null);

  // uid -> employee data
  const [empMap, setEmpMap] = useState<Record<string, { name: string; phone: string; employeeNo: string }>>({});

  // reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const sorted = useMemo(() => requests, [requests]);
  const busy = (key: string) => savingId === key;

  // load employees info
  useEffect(() => {
    let alive = true;

    async function load() {
      const uids = Array.from(new Set((sorted || []).map((r: any) => r.uid).filter(Boolean)));
      if (uids.length === 0) return;

      const pairs = await Promise.all(
        uids.map(async (uid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            const udata: any = userSnap.exists() ? userSnap.data() : null;
            const employeeNo = udata?.employeeNo || "";

            if (!employeeNo) return [uid, { name: "-", phone: "-", employeeNo: "" }] as const;

            const empSnap = await getDoc(doc(db, "employees", employeeNo));
            const edata: any = empSnap.exists() ? empSnap.data() : null;

            const name = edata ? `${edata.fname || ""} ${edata.lname || ""}`.trim() : "-";
            const phone = edata?.phone || "-";

            return [uid, { name: name || "-", phone, employeeNo }] as const;
          } catch {
            return [uid, { name: "-", phone: "-", employeeNo: "" }] as const;
          }
        })
      );

      if (!alive) return;
      setEmpMap(Object.fromEntries(pairs));
    }

    load();
    return () => { alive = false; };
  }, [sorted]);

  // lock scroll + ESC close
  useEffect(() => {
    const anyOpen = rejectOpen || previewOpen;
    if (!anyOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRejectOpen(false);
        setRejectId(null);
        setRejectReason("");

        setPreviewOpen(false);
        setPreviewName("");
        setPreviewUrl("");
        setPreviewLoading(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rejectOpen, previewOpen]);

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
      setSavingId(uid);
      const count = await deleteRequestsByUid(uid);
      alert(`ลบประวัติสำเร็จ ${count} รายการ`);
    } finally {
      setSavingId(null);
    }
  };

  const isImage = (url: string) => /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

  // ✅ เปิด preview: รองรับทั้ง url และ storagePath
  const openPreview = async (att: AttachItem) => {
    try {
      setPreviewLoading(true);

      let url = (att?.url || "").trim();

      // ถ้าไม่มี url แต่มี storagePath -> ไปเอา downloadURL
      if (!url && att?.storagePath) {
        const storage = getStorage();
        url = await getDownloadURL(ref(storage, att.storagePath));
      }

      if (!url) {
        alert("ไฟล์แนบรายการนี้ยังไม่มีลิงก์/พาธสำหรับดู (ต้องบันทึก url หรือ storagePath ตอนอัปโหลด)");
        return;
      }

      setPreviewName(att.name || "attachment");
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (e: any) {
      console.error(e);
      alert(`เปิดไฟล์ไม่ได้: ${e?.message || e}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) return <div className="p-6">กำลังโหลด...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">อนุมัติการลา</h1>

      {/* ✅ Empty state แบบกรอบ */}
      {sorted.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">รายการคำร้องทั้งหมด</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">0 รายการ</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 dark:bg-gray-950 dark:text-gray-300">
              <div className="col-span-3">ผู้ยื่น</div>
              <div className="col-span-3">เลขคำร้อง</div>
              <div className="col-span-3">ช่วงเวลา</div>
              <div className="col-span-3">สถานะ</div>
            </div>

            <div className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีคำร้อง
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((r: any) => {
            const rowBusy = busy(r.id) || busy(r.uid);

            const emp = empMap[r.uid];
            const empName = emp?.name || r.createdByEmail || r.uid;
            const empPhone = emp?.phone || "-";
            const reqNo = r.requestNo || "-";

            const submittedAt = fmtDate(r.createdAt);
            const decidedAt = fmtDate(r.decidedAt);

            const isDone = r.status === "อนุมัติ" || r.status === "ไม่อนุมัติ";
            const isPending = r.status === "รอดำเนินการ";

            const statusClass =
              r.status === "อนุมัติ"
                ? "text-emerald-600 dark:text-emerald-400"
                : r.status === "ไม่อนุมัติ"
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400";

            const note = (r.reason || "").trim();
            const attachments: AttachItem[] = Array.isArray(r.attachments) ? r.attachments : [];

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {empName}
                    </div>

                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      อีเมล: {r.createdByEmail ?? "-"}
                    </div>

                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                      เลขคำร้อง: <span className="font-semibold">{reqNo}</span>
                      <span className="mx-2 text-gray-300 dark:text-gray-700">|</span>
                      เบอร์โทร: <span className="font-semibold">{empPhone}</span>
                    </div>

                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                      วันที่ยื่นคำร้อง: <span className="font-semibold">{submittedAt}</span>
                    </div>

                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                      วันที่อนุมัติ/ไม่อนุมัติ: <span className="font-semibold">{decidedAt}</span>
                    </div>

                    {/* หมายเหตุ */}
                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                      หมายเหตุ:{" "}
                      {note ? (
                        <span className="font-semibold">{note}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </div>

                    {/* ไฟล์แนบ */}
                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                      ไฟล์แนบ:{" "}
                      {attachments.length === 0 ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attachments.map((a, idx) => (
                            <button
                              key={`${a.name}-${idx}`}
                              type="button"
                              disabled={previewLoading}
                              onClick={() => openPreview(a)}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                              title={(a.url || a.storagePath) ? "กดเพื่อดูไฟล์" : "ยังไม่มีลิงก์/พาธสำหรับดูไฟล์"}
                            >
                              📎 {a.name || `ไฟล์แนบ ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`mt-3 text-xs font-semibold ${statusClass}`}>
                      สถานะ: {r.status}
                      {r.status === "ไม่อนุมัติ" && r.rejectReason ? (
                        <span className="ml-2 font-normal">• เหตุผล: {r.rejectReason}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canApprove && isPending && !isDone && (
                      <>
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
                      </>
                    )}

                    {isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[99999]">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-md"
            onClick={() => {
              setRejectOpen(false);
              setRejectId(null);
              setRejectReason("");
            }}
          />

          <div className="relative z-[100000] flex min-h-screen items-center justify-center p-4">
            <div className="w-[92%] max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                เหตุผลที่ “ไม่อนุมัติ”
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                กรุณากรอกเหตุผลก่อนกดยืนยัน
              </p>

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

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-[99999]">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
            onClick={() => {
              setPreviewOpen(false);
              setPreviewName("");
              setPreviewUrl("");
            }}
          />

          <div className="relative z-[100000] flex min-h-screen items-center justify-center p-4">
            <div className="w-[96%] max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ดูไฟล์แนบ: {previewName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    * แสดงผลเพื่อดูเท่านั้น (UI ไม่มีปุ่มดาวน์โหลด)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    setPreviewName("");
                    setPreviewUrl("");
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                  ปิด ✕
                </button>
              </div>

              <div className="h-[70vh] bg-gray-50 dark:bg-gray-950">
                {!previewUrl ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    ไม่มีลิงก์ไฟล์สำหรับแสดงผล
                  </div>
                ) : isImage(previewUrl) ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <img
                      src={previewUrl}
                      alt={previewName}
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      className="max-h-full max-w-full rounded-xl border border-gray-200 object-contain dark:border-gray-800"
                    />
                  </div>
                ) : isPdf(previewUrl) ? (
                  <iframe
                    title={previewName}
                    // ซ่อน toolbar บาง browser ได้ (ไม่ชัวร์ทุกตัว)
                    src={`${previewUrl}#toolbar=0&navpanes=0`}
                    className="h-full w-full"
                    sandbox="allow-same-origin allow-scripts"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div>ไฟล์ชนิดนี้แสดงในหน้าเว็บไม่ได้</div>
                    <button
                      type="button"
                      onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                      className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-gray-900"
                    >
                      เปิดดูในแท็บใหม่
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
