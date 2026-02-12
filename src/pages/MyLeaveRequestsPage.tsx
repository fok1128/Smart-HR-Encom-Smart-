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
import { FieldWorkRequestDoc, listenMyFieldWorkRequests } from "../services/fieldWorkRequests";

type Row =
  | ({ kind: "LEAVE" } & LeaveRequestDoc)
  | ({ kind: "FIELD" } & FieldWorkRequestDoc);

function badgeClass(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (s === "REJECTED") return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200";
  if (s === "CANCELED") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
  return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200";
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

function fmtRange(startAt: any, endAt: any) {
  const s = String(startAt || "").trim();
  const e = String(endAt || "").trim();
  if (!s && !e) return "-";

  const looksDT = (x: string) => x.includes("T") && x.length >= 16;
  const fmt = (x: string) => {
    try {
      if (!x) return "-";
      const d = new Date(x);
      if (isNaN(d.getTime())) return x;
      return looksDT(x) ? d.toLocaleString("th-TH") : d.toLocaleDateString("th-TH");
    } catch {
      return x || "-";
    }
  };

  return `${fmt(s)} → ${fmt(e)}`;
}

function isDuePassed(dueIso: string | null | undefined) {
  if (!dueIso) return false;
  const due = new Date(dueIso);
  if (isNaN(due.getTime())) return false;
  return Date.now() > due.getTime();
}

function fmtDateOnly(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH");
}

export default function MyLeaveRequestsPage() {
  const { user } = useAuth();

  const [leaveRows, setLeaveRows] = useState<LeaveRequestDoc[]>([]);
  const [fieldRows, setFieldRows] = useState<FieldWorkRequestDoc[]>([]);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [loadingField, setLoadingField] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // modal แนบใบรับรอง (เฉพาะ LEAVE)
  const [openAttachId, setOpenAttachId] = useState<string | null>(null);
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string>("");
  const [attaching, setAttaching] = useState(false);
  const [attachPct, setAttachPct] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const uid = user?.uid || "";
    setErrorMsg("");

    setLoadingLeave(true);
    const unsubLeave = listenMyLeaveRequests(
      uid,
      (r) => {
        setLeaveRows(r);
        setLoadingLeave(false);
      },
      (msg) => {
        setErrorMsg(msg || "โหลดใบลาของฉันไม่สำเร็จ");
        setLeaveRows([]);
        setLoadingLeave(false);
      }
    );

    setLoadingField(true);
    const unsubField = listenMyFieldWorkRequests(
      uid,
      (r) => {
        setFieldRows(r);
        setLoadingField(false);
      },
      (msg) => {
        // ไม่ให้ทับ error เดิมถ้ามีแล้ว
        if (!errorMsg) setErrorMsg(msg || "โหลดงานนอกสถานที่ไม่สำเร็จ");
        setFieldRows([]);
        setLoadingField(false);
      }
    );

    return () => {
      unsubLeave?.();
      unsubField?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const loading = loadingLeave || loadingField;

  // ✅ helper: เฉพาะใบลา
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

    if (!user?.uid) return setAttachError("ยังไม่เข้าสู่ระบบ");
    if (!targetRow?.id) return setAttachError("ไม่พบ id ของคำร้อง");

    const MAX_FILES = 5;
    const MAX_MB = 15;
    const okTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

    if (!attachFiles.length) return setAttachError("กรุณาเลือกไฟล์ใบรับรองแพทย์");
    if (attachFiles.length > MAX_FILES) return setAttachError(`แนบไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์`);
    if (attachFiles.some((f) => f.size > MAX_MB * 1024 * 1024)) return setAttachError(`ไฟล์ต้องไม่เกิน ${MAX_MB}MB ต่อไฟล์`);
    if (attachFiles.some((f) => f.type && !okTypes.has(f.type))) return setAttachError("อนุญาตเฉพาะ PDF และรูป (JPG/PNG/WEBP)");

    setAttaching(true);
    setAttachPct(0);
    try {
      await addLeaveAttachments(targetRow.id, user.uid, attachFiles, (p) => setAttachPct(p));
      setOpenAttachId(null);
      setAttachFiles([]);
      setAttachPct(0);
      setAttachError("");
    } catch (e: any) {
      setAttachError(e?.message || String(e));
    } finally {
      setAttaching(false);
    }
  }

  const mergedRows: Row[] = useMemo(() => {
    const a = leaveRows.map((x) => ({ kind: "LEAVE" as const, ...x }));
    const b = fieldRows.map((x) => ({ kind: "FIELD" as const, ...x }));

    const all = [...a, ...b];

    all.sort((r1, r2) => {
      const t1 = (r1 as any).submittedAt?.toDate?.()?.getTime?.() ?? 0;
      const t2 = (r2 as any).submittedAt?.toDate?.()?.getTime?.() ?? 0;
      return t2 - t1;
    });

    return all;
  }, [leaveRows, fieldRows]);

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
                รวม “ใบลา” + “ปฏิบัติงานนอกสถานที่” (งานนอกสถานที่อนุมัติอัตโนมัติ)
              </p>
            </div>
          </div>

          {loading && <div className="mt-4 text-sm text-gray-600 dark:text-white/70">กำลังโหลด...</div>}

          {!loading && errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {!loading && !errorMsg && mergedRows.length === 0 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white/70">
              ยังไม่มีรายการ
            </div>
          )}
        </div>

        {!loading && !errorMsg && mergedRows.length > 0 && (
          <div className="space-y-3">
            {mergedRows.map((r) => {
              const isLeave = r.kind === "LEAVE";

              const titleLeft = isLeave
                ? `${(r as LeaveRequestDoc).category || "-"} • ${(r as LeaveRequestDoc).subType || "-"}`
                : `ปฏิบัติงานนอกสถานที่ • ${(r as FieldWorkRequestDoc).place || "-"}`;

              const reqNo = (r as any).requestNo || r.id;
              const startAt = (r as any).startAt;
              const endAt = (r as any).endAt;
              const status = (r as any).status;

              const attachments = isLeave ? (Array.isArray((r as any).attachments) ? (r as any).attachments : []) : [];
              const legacyFiles = isLeave ? (Array.isArray((r as any).files) ? (r as any).files : []) : [];
              const showDueWarn = isLeave ? needWarnDue(r as LeaveRequestDoc) : false;
              const provided = isLeave ? isProvided(r as LeaveRequestDoc) : true;

              return (
                <div key={`${r.kind}-${r.id}`} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{titleLeft}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(status)}`}>
                          {statusText(status)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <span className="font-semibold">เลขคำร้อง:</span> {reqNo}
                        </div>

                        <div className="mt-1">
                          <span className="font-semibold">ช่วงเวลา:</span>{" "}
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtRange(startAt, endAt)}</span>
                        </div>

                        <div className="mt-1">
                          <span className="font-semibold">ส่งเมื่อ:</span> {fmtDateTime((r as any).submittedAt)}
                        </div>

                        {!isLeave && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            ผู้อนุมัติ: <span className="font-semibold">SYSTEM</span> • อนุมัติอัตโนมัติ
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right actions: เฉพาะ LEAVE ที่มีไฟล์ */}
                    {isLeave && (
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

                        {canAttachLater(r as LeaveRequestDoc) && (
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
                    )}
                  </div>

                  {/* Notes: leave reason OR field note */}
                  {(isLeave ? (r as LeaveRequestDoc).reason : (r as FieldWorkRequestDoc).note) && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                      <div className="font-semibold">{isLeave ? "เหตุผล/รายละเอียด" : "รายละเอียดงาน"}</div>
                      <div className="mt-1 whitespace-pre-wrap">{isLeave ? (r as any).reason : (r as any).note}</div>
                    </div>
                  )}

                  {/* Medical cert box only for leave */}
                  {isLeave && (((r as any).requireMedicalCert || (r as any).medicalCertDueAt)) && (
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

                          {(r as any).medicalCertDueAt && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              เดดไลน์แนบ: <span className="font-semibold">{fmtDateOnly((r as any).medicalCertDueAt)}</span>
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

                  {/* Attachments list */}
                  {isLeave && (attachments.length > 0 || legacyFiles.length > 0) && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">ไฟล์แนบ</div>

                      {attachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attachments.map((a: any, idx: number) => (
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
                              {String(a?.name || "ไฟล์")} <span className="text-gray-400">#{idx + 1}</span>
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

                  {/* Attach modal */}
                  {isLeave && openAttachId === r.id && (
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
                          onClick={() => handleAttachSubmit(r as any)}
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
