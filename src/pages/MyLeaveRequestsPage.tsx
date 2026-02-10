// src/pages/MyLeaveRequestsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import {
  LeaveRequestDoc,
  listenMyLeaveRequests,
  getAttachmentKey,
  getSignedUrlForKey,
  addLeaveAttachments,
} from "../services/leaveRequests";

function badgeClass(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (s === "REJECTED") return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200";
  if (s === "CANCELED") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
  return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200"; // PENDING
}

function statusText(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "อนุมัติ";
  if (s === "REJECTED") return "ไม่อนุมัติ";
  if (s === "CANCELED") return "ยกเลิก";
  return "รอดำเนินการ";
}

function fmtDateTime(ts: any) {
  try {
    if (!ts) return "-";
    if (typeof ts === "string") {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d.toLocaleString("th-TH");
    }
    if (ts?.toDate) return ts.toDate().toLocaleString("th-TH");
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toLocaleString("th-TH");
    const d = ts instanceof Date ? ts : new Date(ts);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH");
  } catch {
    return "-";
  }
}

function fmtDateOnly(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH");
}

function isDuePassed(dueIso: string | null | undefined) {
  if (!dueIso) return false;
  const due = new Date(dueIso);
  if (isNaN(due.getTime())) return false;
  return Date.now() > due.getTime();
}

function fmtRange(startAt: any, endAt: any) {
  const s = String(startAt || "").trim();
  const e = String(endAt || "").trim();
  if (!s && !e) return "-";

  const looksDT = (x: string) => x.includes("T") && x.length >= 16;
  const fmt = (x: string) => {
    try {
      if (!x) return "-";
      // startAt / endAt ของเรามักเป็น "YYYY-MM-DD" หรือ "YYYY-MM-DDTHH:mm"
      const d = new Date(x);
      if (isNaN(d.getTime())) return x;
      return looksDT(x) ? d.toLocaleString("th-TH") : d.toLocaleDateString("th-TH");
    } catch {
      return x || "-";
    }
  };

  return `${fmt(s)} → ${fmt(e)}`;
}

export default function MyLeaveRequestsPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<LeaveRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // modal แนบใบรับรอง
  const [openAttachId, setOpenAttachId] = useState<string | null>(null);
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string>("");
  const [attaching, setAttaching] = useState(false);
  const [attachPct, setAttachPct] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const uid = user?.uid || "";
    setLoading(true);
    setErrorMsg("");

    const unsub = listenMyLeaveRequests(
      uid,
      (r) => {
        setRows(r);
        setLoading(false);
      },
      (msg) => {
        setErrorMsg(msg || "โหลดใบลาของฉันไม่สำเร็จ");
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsub?.();
  }, [user?.uid]);

  // ✅ helper: ถือว่า "แนบแล้ว" ถ้ามี attachments
  const isProvided = (r: LeaveRequestDoc) => {
    const atts = Array.isArray(r.attachments) ? r.attachments : [];
    return !!r.medicalCertProvided || atts.length > 0;
  };

  const canAttachLater = (r: LeaveRequestDoc) => {
    const status = String(r.status || "").toUpperCase();
    const isPending = status === "PENDING";
    const require = !!r.requireMedicalCert;
    const hasDue = !!r.medicalCertDueAt;
    const provided = isProvided(r);
    const duePassed = isDuePassed(r.medicalCertDueAt);

    return require && hasDue && isPending && !provided && !duePassed;
  };

  const needWarnDue = (r: LeaveRequestDoc) => {
    const require = !!r.requireMedicalCert;
    const hasDue = !!r.medicalCertDueAt;
    const provided = isProvided(r);
    if (!require || !hasDue || provided) return false;
    return isDuePassed(r.medicalCertDueAt);
  };

  async function openAttachment(att: any) {
    const key = getAttachmentKey(att);
    if (!key) throw new Error("ไฟล์นี้ไม่มี key (storagePath) เปิดไม่ได้");
    const signed = await getSignedUrlForKey(key);
    window.open(signed, "_blank", "noopener,noreferrer");
  }

  async function handleAttachSubmit(targetRow: LeaveRequestDoc) {
    setAttachError("");

    if (!user?.uid) {
      setAttachError("ยังไม่เข้าสู่ระบบ");
      return;
    }
    if (!targetRow?.id) {
      setAttachError("ไม่พบ id ของคำร้อง");
      return;
    }

    // Validate files (ให้ตรง backend)
    const MAX_FILES = 5;
    const MAX_MB = 15;
    const okTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

    if (!attachFiles.length) {
      setAttachError("กรุณาเลือกไฟล์ใบรับรองแพทย์");
      return;
    }
    if (attachFiles.length > MAX_FILES) {
      setAttachError(`แนบไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์`);
      return;
    }
    if (attachFiles.some((f) => f.size > MAX_MB * 1024 * 1024)) {
      setAttachError(`ไฟล์ต้องไม่เกิน ${MAX_MB}MB ต่อไฟล์`);
      return;
    }
    if (attachFiles.some((f) => f.type && !okTypes.has(f.type))) {
      setAttachError("อนุญาตเฉพาะ PDF และรูป (JPG/PNG/WEBP)");
      return;
    }

    setAttaching(true);
    setAttachPct(0);
    try {
      await addLeaveAttachments(targetRow.id, user.uid, attachFiles, (p) => setAttachPct(p));
      setOpenAttachId(null);
      setAttachFiles([]);
      setAttachPct(0);
      setAttachError("");
    } catch (e: any) {
      console.error("handleAttachSubmit error:", e);
      setAttachError(e?.message || String(e));
    } finally {
      setAttaching(false);
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ams = a.submittedAt?.toDate?.()?.getTime?.() ?? 0;
      const bms = b.submittedAt?.toDate?.()?.getTime?.() ?? 0;
      return bms - ams;
    });
  }, [rows]);

  return (
    <>
      <PageMeta title="My Leave Requests | Smart HR" description="My leave requests page" />
      <PageBreadcrumb pageTitle="ใบลาของฉัน" />

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">ใบลาของฉัน</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ดูสถานะคำร้อง + แนบใบรับรองแพทย์ (กรณีลาป่วย ≥ 3 วันทำการ แบบแนบภายในวันทำการที่ 3)
              </p>
            </div>
          </div>

          {loading && (
            <div className="mt-4 text-sm text-gray-600 dark:text-white/70">กำลังโหลดใบลาของฉัน...</div>
          )}

          {!loading && errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {!loading && !errorMsg && sortedRows.length === 0 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white/70">
              ยังไม่มีคำร้องลา
            </div>
          )}
        </div>

        {!loading && !errorMsg && sortedRows.length > 0 && (
          <div className="space-y-3">
            {sortedRows.map((r) => {
              const attachments = Array.isArray(r.attachments) ? r.attachments : [];
              const legacyFiles = Array.isArray(r.files) ? r.files : [];
              const showDueWarn = needWarnDue(r);
              const provided = isProvided(r);

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {r.category || "-"} • {r.subType || "-"}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(r.status)}`}>
                          {statusText(r.status)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <span className="font-semibold">เลขคำร้อง:</span> {r.requestNo || r.id}
                        </div>

                        <div className="mt-1">
                          <span className="font-semibold">ช่วงลา:</span>{" "}
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {fmtRange(r.startAt, r.endAt)}
                          </span>
                        </div>

                        <div className="mt-1">
                          <span className="font-semibold">ส่งเมื่อ:</span> {fmtDateTime(r.submittedAt)}
                        </div>

                        {typeof r.leaveUnits === "number" && r.category === "ลากิจ" && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            หน่วยลากิจที่ถูกนับ: <span className="font-semibold">{r.leaveUnits}</span> วัน
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {attachments.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await openAttachment(attachments[0]);
                            } catch (e: any) {
                              alert(e?.message || String(e));
                            }
                          }}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          เปิดไฟล์แนบ
                        </button>
                      )}

                      {canAttachLater(r) && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenAttachId(r.id);
                            setAttachFiles([]);
                            setAttachError("");
                            setAttachPct(0);
                            setTimeout(() => fileInputRef.current?.click(), 50);
                          }}
                          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                          แนบใบรับรองแพทย์
                        </button>
                      )}
                    </div>
                  </div>

                  {r.reason && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                      <div className="font-semibold">เหตุผล/รายละเอียด</div>
                      <div className="mt-1 whitespace-pre-wrap">{r.reason}</div>
                    </div>
                  )}

                  {r.isRetroactive && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                      <div className="font-semibold">ยื่นย้อนหลัง</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{r.retroReason ? r.retroReason : "—"}</div>
                    </div>
                  )}

                  {(r.requireMedicalCert || r.medicalCertDueAt) && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">ใบรับรองแพทย์</div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {provided ? (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-200">✅ แนบแล้ว</span>
                            ) : (
                              <span className="font-semibold text-amber-700 dark:text-amber-200">⚠️ ยังไม่แนบ</span>
                            )}
                          </div>

                          {r.medicalCertDueAt && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              เดดไลน์แนบ: <span className="font-semibold">{fmtDateOnly(r.medicalCertDueAt)}</span>
                            </div>
                          )}
                        </div>

                        {showDueWarn && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
                            เลยเดดไลน์แนบใบรับรองแล้ว (ให้ HR/ผู้จัดการพิจารณา)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(attachments.length > 0 || legacyFiles.length > 0) && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">ไฟล์แนบ</div>

                      {attachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attachments.map((a, idx) => (
                            <button
                              key={(getAttachmentKey(a) || "") + idx}
                              type="button"
                              onClick={async () => {
                                try {
                                  await openAttachment(a);
                                } catch (e: any) {
                                  alert(e?.message || String(e));
                                }
                              }}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                              title="เปิดไฟล์"
                            >
                              {String((a as any)?.name || "ไฟล์")} <span className="text-gray-400">#{idx + 1}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          (มีไฟล์แบบเก่า {legacyFiles.length} รายการ แต่ไม่มี key สำหรับเปิดผ่าน Supabase)
                        </div>
                      )}
                    </div>
                  )}

                  {(r.decisionNote || r.rejectReason) && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                      <div className="font-semibold">หมายเหตุผู้อนุมัติ</div>
                      <div className="mt-1 whitespace-pre-wrap">{r.decisionNote || r.rejectReason}</div>
                    </div>
                  )}

                  {openAttachId === r.id && (
                    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/40 dark:bg-teal-900/20">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                            แนบใบรับรองแพทย์ (ภายในวันทำการที่ 3)
                          </div>
                          <div className="mt-1 text-xs text-teal-800/80 dark:text-teal-100/80">
                            รองรับ PDF / รูป (JPG, PNG, WEBP) • ไฟล์ละไม่เกิน 15MB • สูงสุด 5 ไฟล์
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenAttachId(null);
                            setAttachFiles([]);
                            setAttachError("");
                            setAttachPct(0);
                          }}
                          className="rounded-xl border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50 dark:border-teal-900/40 dark:bg-gray-900 dark:text-teal-100 dark:hover:bg-gray-800"
                        >
                          ปิด
                        </button>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => setAttachFiles(Array.from(e.target.files ?? []))}
                        className="mt-3 block w-full text-sm text-teal-900 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-800 hover:file:bg-teal-50 dark:text-teal-100 dark:file:bg-gray-900 dark:file:text-teal-100 dark:hover:file:bg-gray-800"
                      />

                      {attachFiles.length > 0 && (
                        <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3 text-sm text-teal-900 dark:border-teal-900/40 dark:bg-gray-900 dark:text-teal-100">
                          <div className="font-semibold">ไฟล์ที่เลือก</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                            {attachFiles.map((f) => (
                              <li key={`${f.name}-${f.size}`}>
                                {f.name} <span className="opacity-70">({Math.ceil(f.size / 1024)} KB)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {attaching && (
                        <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3 text-sm text-teal-900 dark:border-teal-900/40 dark:bg-gray-900 dark:text-teal-100">
                          <div className="font-semibold">กำลังอัปโหลด... {attachPct}%</div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900/30">
                            <div className="h-full bg-teal-600 transition-all" style={{ width: `${attachPct}%` }} />
                          </div>
                        </div>
                      )}

                      {attachError && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
                          {attachError}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={attaching}
                          onClick={() => {
                            setOpenAttachId(null);
                            setAttachFiles([]);
                            setAttachError("");
                            setAttachPct(0);
                          }}
                          className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60 dark:border-teal-900/40 dark:bg-gray-900 dark:text-teal-100 dark:hover:bg-gray-800"
                        >
                          ยกเลิก
                        </button>

                        <button
                          type="button"
                          disabled={attaching}
                          onClick={() => handleAttachSubmit(r)}
                          className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                          {attaching ? "กำลังแนบ..." : "ยืนยันแนบใบรับรอง"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
