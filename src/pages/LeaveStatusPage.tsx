import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listenMyLeaveRequests, type LeaveRequestDoc } from "../services/leaveRequests";
import { getSignedUrl } from "../services/files";

function fmtSubmitted(ts: any) {
  const d: Date | null = ts?.toDate?.() ?? null;
  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AttachItem = {
  name: string;
  size: number;
  url?: string;          // เก่า
  storagePath?: string;  // ✅ supabase key
  path?: string;         // เก่า
};

export default function LeaveStatusPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestDoc[]>([]);

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenMyLeaveRequests(user.uid, setItems);
    return () => unsub();
  }, [user?.uid]);

  const rows = useMemo(() => items ?? [], [items]);

  const isImage = (url: string) => /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

  const openPreview = async (att: AttachItem) => {
    try {
      setPreviewLoading(true);

      let url = (att?.url || "").trim();
      if (!url && att?.storagePath) {
        url = await getSignedUrl(att.storagePath);
      }

      if (!url && att?.path) {
        alert("ไฟล์นี้เป็นข้อมูลเก่าที่เก็บแบบ Firebase path — ตอนนี้ระบบเปลี่ยนเป็น Supabase แล้ว");
        return;
      }

      if (!url) {
        alert("ไฟล์แนบรายการนี้ยังไม่มีลิงก์/พาธสำหรับดู");
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

  // ESC close
  useEffect(() => {
    if (!previewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewOpen(false);
        setPreviewName("");
        setPreviewUrl("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">ตรวจสอบสถานะคำร้อง</h1>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          เลขคำร้อง • ประเภท • ช่วงเวลา • สถานะ • ยื่นเมื่อ
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">รายการคำร้องทั้งหมด</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{rows.length} รายการ</div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2 font-semibold">เลขคำร้อง</th>
                <th className="px-3 py-2 font-semibold">ประเภท</th>
                <th className="px-3 py-2 font-semibold">ช่วงเวลา</th>
                <th className="px-3 py-2 font-semibold">สถานะ</th>
                <th className="px-3 py-2 font-semibold">ยื่นเมื่อ</th>
                <th className="px-3 py-2 font-semibold">ไฟล์แนบ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={6}>
                    ยังไม่มีคำร้อง
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const atts: AttachItem[] = Array.isArray((r as any).attachments) ? ((r as any).attachments as any) : [];
                  const status = String(r.status || "");

                  const badge =
                    status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : status === "REJECTED"
                      ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : status === "CANCELED"
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

                  return (
                    <tr key={r.id} className="bg-white dark:bg-gray-900">
                      <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{r.requestNo}</td>

                      <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                        {r.category} • {r.subType}
                      </td>

                      <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                        {String(r.startAt).replace("T", " ")} → {String(r.endAt).replace("T", " ")}
                      </td>

                      <td className="px-3 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
                          {r.status}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{fmtSubmitted(r.submittedAt)}</td>

                      <td className="px-3 py-3">
                        {atts.length === 0 ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {atts.map((a, idx) => (
                              <button
                                key={`${a.name}-${idx}`}
                                type="button"
                                disabled={previewLoading}
                                onClick={() => openPreview(a)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                                title={(a.url || a.storagePath) ? "กดเพื่อดูไฟล์" : "ยังไม่มีลิงก์/พาธ"}
                              >
                                📎 {a.name || `ไฟล์ ${idx + 1}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            * หมายเหตุ/เหตุผลแสดงในปฏิทินรายละเอียดรายวันด้วย
          </div>
        )}
      </div>

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
                    * แสดงผลเพื่อดูเท่านั้น
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
