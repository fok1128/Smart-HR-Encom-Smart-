// src/pages/FieldWorkHistoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";
import {
  deleteFieldWorkRequest,
  listenAllFieldWorkRequests,
  listenMyFieldWorkRequests,
  type FieldWorkRequestDoc,
  getUserProfileByUid,
} from "../services/fieldWorkRequests";
import { getSignedUrl } from "../services/files";

// ✅ เพิ่ม lookup สำรองด้วย email
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";

// ✅ Modal กลาง (ไฟล์แนบทั้งหมด) — คงไว้ได้
import { Modal } from "../components/ui/modal";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dateTimeText(dtLocal?: string) {
  if (!dtLocal) return "-";
  return dtLocal.replace("T", " ");
}
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
function withinRange(row: FieldWorkRequestDoc, fromISO: string, toISO: string) {
  const d = (row.startAt || "").slice(0, 10);
  if (!d) return true;
  return d >= fromISO && d <= toISO;
}

type UserMini = { fullName: string; phone: string };

type AttachModalState = {
  open: boolean;
  requestNo: string;
  attachments: Array<{ name?: string; storagePath?: string }>;
};

function normalizeAttName(name: any) {
  const s = String(name ?? "").trim();
  if (!s) return "ไฟล์แนบ";
  const looksMojibake = /Ã|Â|à¸|à¹|�/.test(s);
  return looksMojibake ? "ไฟล์แนบ" : s;
}

function pickNamePhoneFromUserDoc(d: any): UserMini {
  const fname = String(d?.fname || d?.firstName || d?.firstname || "").trim();
  const lname = String(d?.lname || d?.lastName || d?.lastname || "").trim();
  const displayName = String(d?.displayName || d?.name || "").trim();

  const fullName =
    [fname, lname].filter(Boolean).join(" ").trim() ||
    displayName ||
    String(d?.fullName || "").trim();

  const phone = String(d?.phone || d?.tel || d?.mobile || d?.phoneNumber || "").trim();

  return { fullName, phone };
}

// ✅ กัน TS ขีดแดง WebkitAppearance
const dateInputStyle: any = {
  appearance: "auto",
  WebkitAppearance: "auto",
};

export default function FieldWorkHistoryPage() {
  const { user } = useAuth() as any;
  const dialog = useDialogCenter();

  const myUid = String(user?.uid || "").trim();
  const role = String(user?.role || "").toUpperCase();

  const canSeeAll = role === "ADMIN" || role === "EXECUTIVE_MANAGER";
  const canDelete = role === "ADMIN" || role === "EXECUTIVE_MANAGER";

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [rows, setRows] = useState<FieldWorkRequestDoc[]>([]);
  const [err, setErr] = useState<string>("");

  const defaultRange = useMemo(() => {
    const t = new Date();
    const from = new Date(t);
    from.setMonth(from.getMonth() - 1);
    return { fromISO: toISODate(from), toISO: toISODate(t) };
  }, []);

  const [fromISO, setFromISO] = useState<string>(() => defaultRange.fromISO);
  const [toISO, setToISO] = useState<string>(() => defaultRange.toISO);
  const [q, setQ] = useState<string>("");

  const [userMap, setUserMap] = useState<Record<string, UserMini>>({});
  const [emailMap, setEmailMap] = useState<Record<string, UserMini>>({});

  const [attModal, setAttModal] = useState<AttachModalState>({
    open: false,
    requestNo: "",
    attachments: [],
  });

  useEffect(() => {
    if (!myUid) {
      setRows([]);
      return;
    }
    setErr("");

    const unsub =
      scope === "all" && canSeeAll
        ? listenAllFieldWorkRequests(
            (r) => setRows(r),
            (m) => setErr(m || "โหลดประวัติไม่สำเร็จ")
          )
        : listenMyFieldWorkRequests(
            myUid,
            (r) => setRows(r),
            (m) => setErr(m || "โหลดประวัติไม่สำเร็จ")
          );

    return () => unsub?.();
  }, [myUid, scope, canSeeAll]);

  // ✅ โหลดชื่อ+เบอร์จาก uid
  useEffect(() => {
    const uids = Array.from(new Set((rows || []).map((r) => String(r.uid || "").trim()).filter(Boolean)));
    const missing = uids.filter((u) => !userMap[u]);
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const pairs = await Promise.all(
        missing.map(async (uid) => {
          try {
            const p = await getUserProfileByUid(uid);
            return [uid, p] as const;
          } catch {
            return [uid, { fullName: "", phone: "" }] as const;
          }
        })
      );

      if (cancelled) return;

      setUserMap((prev) => {
        const next = { ...prev };
        for (const [uid, p] of pairs) next[uid] = p;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, userMap]);

  // ✅ fallback: users by email
  useEffect(() => {
    const emails = Array.from(
      new Set((rows || []).map((r) => String((r as any)?.email || "").trim().toLowerCase()).filter(Boolean))
    );

    const missingEmails = emails.filter((e) => !emailMap[e]);
    if (missingEmails.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        missingEmails.map(async (email) => {
          try {
            const q1 = query(collection(db, "users"), where("email", "==", email), limit(1));
            const snap = await getDocs(q1);
            if (snap.empty) return [email, { fullName: "", phone: "" }] as const;

            const docData = snap.docs[0].data();
            const picked = pickNamePhoneFromUserDoc(docData);
            return [email, picked] as const;
          } catch {
            return [email, { fullName: "", phone: "" }] as const;
          }
        })
      );

      if (cancelled) return;

      setEmailMap((prev) => {
        const next = { ...prev };
        for (const [email, p] of results) next[email] = p;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, emailMap]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (rows || [])
      .filter((r) => withinRange(r, fromISO, toISO))
      .filter((r) => {
        if (!qq) return true;

        const p = userMap[r.uid] || { fullName: "", phone: "" };
        const em = String((r as any)?.email || "").trim().toLowerCase();
        const pe = emailMap[em] || { fullName: "", phone: "" };

        const s = (r as any)?.submitter || null;
        const snapName =
          String(s?.fullName || "").trim() ||
          [String(s?.fname || "").trim(), String(s?.lname || "").trim()].filter(Boolean).join(" ").trim();
        const snapPhone = String(s?.phone || "").trim() || String((Array.isArray(s?.phones) && s.phones[0]) || "").trim();

        const hay = `${r.requestNo} ${r.place} ${r.note || ""} ${(r as any)?.email || ""} ${p.fullName} ${p.phone} ${pe.fullName} ${pe.phone} ${snapName} ${snapPhone}`.toLowerCase();

        return hay.includes(qq);
      })
      .sort((a, b) => tsToMs(b.submittedAt) - tsToMs(a.submittedAt));
  }, [rows, fromISO, toISO, q, userMap, emailMap]);

  async function openAttachment(storagePath: string) {
    try {
      const url = await getSignedUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      const m = e?.message || String(e);
      await dialog.alert(m, { title: "เปิดไฟล์ไม่สำเร็จ", variant: "danger" });
    }
  }

  async function handleDelete(id: string, requestNo?: string, who?: string) {
    if (!canDelete) {
      await dialog.alert("คุณไม่มีสิทธิ์ลบรายการนี้", { title: "ไม่อนุญาต", variant: "danger" });
      return;
    }

    const ok = await dialog.confirm(`คุณกำลังจะลบ: ${who || "-"} · ${requestNo || id}\nการลบจะไม่สามารถกู้คืนได้`, {
      title: "ยืนยันการลบ",
      confirmText: "ลบเลย",
      cancelText: "ยกเลิก",
      variant: "danger",
      size: "md",
    });

    if (!ok) return;

    try {
      await deleteFieldWorkRequest(id);
      await dialog.success("ลบรายการเรียบร้อย", { title: "ลบสำเร็จ", size: "md" });
    } catch (e: any) {
      const m = e?.message || String(e);
      await dialog.alert(m, { title: "ลบไม่สำเร็จ", variant: "danger" });
    }
  }

  function openAllFiles(requestNo: string, attachments: any[]) {
    const list = (Array.isArray(attachments) ? attachments : [])
      .map((a) => ({
        name: normalizeAttName(a?.name),
        storagePath: String(a?.storagePath || ""),
      }))
      .filter((a) => a.storagePath);

    setAttModal({ open: true, requestNo, attachments: list });
  }

  function closeAllFiles() {
    setAttModal({ open: false, requestNo: "", attachments: [] });
  }

  function resetDates() {
    setFromISO(defaultRange.fromISO);
    setToISO(defaultRange.toISO);
  }
  const isDateDefault = fromISO === defaultRange.fromISO && toISO === defaultRange.toISO;

  const colCount = canDelete ? 8 : 7;

  return (
    <>
      <PageMeta title="Field Work History | Smart HR" description="Field work history page" />
      <PageBreadcrumb pageTitle="ประวัติแจ้งปฏิบัติงานนอกสถานที่" />

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 1; display: block; cursor: pointer; }
        input[type="date"]::-webkit-inner-spin-button, input[type="date"]::-webkit-clear-button { display: none; }
        .dark input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>

      {/* ✅ Modal กลาง: ไฟล์แนบทั้งหมด */}
      <Modal isOpen={attModal.open} onClose={closeAllFiles} title="ไฟล์แนบทั้งหมด" closeOnBackdrop zIndexClassName="z-[2147483646]">
        <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">{attModal.requestNo}</div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {attModal.attachments.length === 0 ? (
              <div className="px-4 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">ไม่มีไฟล์แนบ</div>
            ) : (
              attModal.attachments.map((a, idx) => (
                <div key={`${a.storagePath}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="break-words text-sm font-extrabold text-gray-900 dark:text-gray-100">{normalizeAttName(a.name)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAttachment(a.storagePath || "")}
                    className="h-10 shrink-0 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 text-sm font-extrabold text-white hover:from-fuchsia-700 hover:to-purple-700"
                  >
                    เปิด
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={closeAllFiles}
            className="h-10 rounded-2xl border border-white/50 bg-white/70 px-5 text-sm font-extrabold text-gray-800 transition hover:bg-white dark:border-white/10 dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-gray-900/60"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </Modal>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 transition">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">ประวัติแจ้งปฏิบัติงานนอกสถานที่</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ดูย้อนหลัง + เปิดไฟล์แนบ {canDelete ? "+ (สิทธิ) ลบรายการ" : ""}</p>
          </div>

          {canSeeAll && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScope("mine")}
                className={[
                  "h-10 rounded-xl px-4 text-sm font-semibold border",
                  scope === "mine"
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-200"
                    : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                ดูของตัวเอง
              </button>
              <button
                type="button"
                onClick={() => setScope("all")}
                className={[
                  "h-10 rounded-xl px-4 text-sm font-semibold border",
                  scope === "all"
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-200"
                    : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                ดูของทุกคน
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">จากวันที่</label>
            <input
              type="date"
              value={fromISO}
              onChange={(e) => setFromISO(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              style={dateInputStyle}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">ถึงวันที่</label>
            <input
              type="date"
              value={toISO}
              onChange={(e) => setToISO(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              style={dateInputStyle}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">ค้นหา</label>
              <button
                type="button"
                onClick={resetDates}
                disabled={isDateDefault}
                className={[
                  "h-8 rounded-lg px-3 text-xs font-extrabold border transition",
                  isDateDefault
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500"
                    : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                title="ล้างวันที่ (กลับเป็นค่าเริ่มต้น: ย้อนหลัง 1 เดือน)"
              >
                ล้างวันที่
              </button>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              placeholder="ค้นหาเลขคำร้อง / สถานที่ / หมายเหตุ / ชื่อ / เบอร์"
            />
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-semibold text-left w-[12%]">วันที่ยื่น</th>
                <th className="px-4 py-3 font-semibold text-left w-[14%]">เลขคำร้อง</th>
                <th className="px-4 py-3 font-semibold text-left w-[14%]">ผู้ยื่น</th>
                <th className="px-4 py-3 font-semibold text-left w-[18%]">ช่วงเวลา</th>
                <th className="px-4 py-3 font-semibold text-left w-[10%]">สถานที่</th>
                <th className="px-4 py-3 font-semibold text-left w-[14%]">หมายเหตุ</th>
                <th className="px-4 py-3 font-semibold text-left w-[12%]">ไฟล์แนบ</th>
                {canDelete && <th className="px-4 py-3 font-semibold text-left w-[6%]">จัดการ</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-gray-500 dark:text-gray-400" colSpan={colCount}>
                    ไม่มีข้อมูล
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const submittedMs = tsToMs(r.submittedAt);
                  const submittedText = submittedMs
                    ? new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
                        new Date(submittedMs)
                      )
                    : "-";

                  const pByUid = userMap[r.uid] || { fullName: "", phone: "" };
                  const emKey = String((r as any)?.email || "").trim().toLowerCase();
                  const pByEmail = emailMap[emKey] || { fullName: "", phone: "" };

                  const s = (r as any)?.submitter || null;
                  const snapName =
                    String(s?.fullName || "").trim() ||
                    [String(s?.fname || "").trim(), String(s?.lname || "").trim()].filter(Boolean).join(" ").trim();
                  const snapPhone = String(s?.phone || "").trim() || String((Array.isArray(s?.phones) && s.phones[0]) || "").trim();

                  const fullName = snapName || pByUid.fullName || pByEmail.fullName || (r as any)?.email || r.uid || "-";
                  const phone = snapPhone || pByUid.phone || pByEmail.phone || "";
                  const atts = Array.isArray((r as any).attachments) ? (r as any).attachments : [];

                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 align-top">{submittedText}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 align-top">{r.requestNo}</td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 align-top">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{phone || "-"}</div>
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 align-top">
                        {dateTimeText(r.startAt)} → {dateTimeText(r.endAt)}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 align-top">
                        <div className="font-semibold whitespace-normal break-words">{r.place}</div>
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 align-top">
                        {r.note ? (
                          <div
                            className="whitespace-normal break-words leading-5 text-sm"
                            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}
                          >
                            {r.note}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {atts.length === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {atts.slice(0, 2).map((a: any, idx: number) => (
                              <button
                                key={`${r.id}-att-${idx}`}
                                type="button"
                                onClick={() => openAttachment(String(a.storagePath || ""))}
                                title={normalizeAttName(a.name) || `ไฟล์ ${idx + 1}`}
                                className="max-w-[190px] truncate rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                              >
                                {normalizeAttName(a.name) || `ไฟล์ ${idx + 1}`}
                              </button>
                            ))}

                            {atts.length > 2 && (
                              <button type="button" onClick={() => openAllFiles(r.requestNo, atts)} className="text-left text-[11px] font-extrabold text-brand-600 hover:text-brand-700">
                                ดูทั้งหมด ({atts.length} ไฟล์)
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {canDelete && (
                        <td className="px-4 py-3 text-left align-top">
                          <button type="button" onClick={() => handleDelete(r.id, r.requestNo, fullName)} className="text-sm font-extrabold text-red-600 hover:text-red-700">
                            ลบ
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
