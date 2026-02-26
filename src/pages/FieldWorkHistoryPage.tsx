import React, { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";
import AppButton from "../components/common/AppButton";
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

// ✅ Modal กลาง (ไฟล์แนบทั้งหมด)
import { Modal } from "../components/ui/modal";

// ✅ Theme กลาง
import { inputTheme } from "../components/ui/theme/inputTheme";
import { tableTheme } from "../components/ui/theme/tableTheme";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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

/**
 * ✅ ถ้าไม่เลือกวัน -> ไม่กรอง (ผ่านหมด)
 * ✅ ถ้าเลือกแค่ from -> กรองตั้งแต่ from ขึ้นไป
 * ✅ ถ้าเลือกแค่ to -> กรองถึง to
 * ✅ ถ้าเลือกครบ -> กรอง between
 */
function withinRange(row: FieldWorkRequestDoc, fromISO?: string, toISO?: string) {
  const d = (row.startAt || "").slice(0, 10);
  if (!d) return true;

  const f = String(fromISO || "").trim();
  const t = String(toISO || "").trim();

  if (!f && !t) return true;
  if (f && !t) return d >= f;
  if (!f && t) return d <= t;
  return d >= f && d <= t;
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

const dateInputStyle: any = {
  appearance: "auto",
  WebkitAppearance: "auto",
};

// ✅ select ธีมกลาง + ลูกศรสวย/คุมได้
function ThemedSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <div className="relative">
      <select
        {...rest}
        className={cn(
          inputTheme.control,
          "h-11 py-0 text-base font-semibold appearance-none pr-11",
          className
        )}
      >
        {children}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-500 dark:text-gray-300">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ✅ date input ธีมกลาง + ปุ่มเปิด date picker
function ThemedDateInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el: any = ref.current;
    // Chromium: showPicker()
    if (el?.showPicker) {
      el.showPicker();
      return;
    }
    // fallback
    ref.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputTheme.purple, "pr-12")}
        style={dateInputStyle}
        placeholder={placeholder}
      />

      {/* ปุ่มเปิด date picker */}
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "absolute inset-y-0 right-3 my-2 inline-flex items-center justify-center rounded-xl",
          "px-2 text-gray-600 hover:text-violet-700 dark:text-gray-300 dark:hover:text-violet-300",
          "focus:outline-none focus:ring-2 focus:ring-violet-400/25"
        )}
        aria-label="เลือกวันที่"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 3v2M16 3v2M4 7h16M6 11h4M6 15h4M14 11h4M14 15h4M6 19h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
          />
        </svg>
      </button>
    </div>
  );
}

export default function FieldWorkHistoryPage() {
  const { user } = useAuth() as any;
  const dialog = useDialogCenter();

  const myUid = String(user?.uid || "").trim();

// ✅ role: เผื่อ AuthContext เก็บ role คนละที่ (กัน role ว่าง)
const role = String(
  user?.role ??
    user?.profile?.role ??
    user?.claims?.role ??
    user?.customClaims?.role ??
    ""
).trim().toUpperCase();

// ✅ HR ต้องเห็น “ของทุกคน” ด้วย
const canSeeAll = role === "ADMIN" || role === "EXECUTIVE_MANAGER" || role === "HR";

// ✅ ลบ: คงเดิม (ให้เฉพาะ ADMIN/EXECUTIVE_MANAGER ลบได้)
const canDelete = role === "ADMIN" || role === "EXECUTIVE_MANAGER";

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [rows, setRows] = useState<FieldWorkRequestDoc[]>([]);
  const [err, setErr] = useState<string>("");

  // ✅ Filters
  const [fromISO, setFromISO] = useState<string>("");
  const [toISO, setToISO] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // ✅ เพิ่ม dropdown แบบรูป (เลือกดู "ทั้งหมด/มีไฟล์แนบ/ไม่มีไฟล์แนบ")
  // ถ้าคุณมี dropdown อย่างอื่นอยู่แล้ว เปลี่ยน options ตามใจได้เลย
  type AttachFilter = "ทั้งหมด" | "มีไฟล์แนบ" | "ไม่มีไฟล์แนบ";
  const [attachFilter, setAttachFilter] = useState<AttachFilter>("ทั้งหมด");

  const [userMap, setUserMap] = useState<Record<string, UserMini>>({});
  const [emailMap, setEmailMap] = useState<Record<string, UserMini>>({});

  const [attModal, setAttModal] = useState<AttachModalState>({
    open: false,
    requestNo: "",
    attachments: [],
  });

  const isDateDefault = !fromISO && !toISO;
  const isAllDefault = isDateDefault && !q.trim() && attachFilter === "ทั้งหมด";

  useEffect(() => {
  // ✅ ไม่ต้อง force เป็น all เสมอ ให้ผู้ใช้เลือกเอง
  // ถ้าอยาก default เป็น mine ตลอด ก็ไม่ต้องทำอะไร
  // ถ้าอยาก default เป็น all เฉพาะ ADMIN/EXECUTIVE_MANAGER ก็ทำแบบนี้:
  if (role === "ADMIN" || role === "EXECUTIVE_MANAGER") setScope("all");
}, [role]);

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

  // ✅ ล้างช่วงวันที่ + Confirm
  async function resetDates() {
    if (isDateDefault) {
      await dialog.alert("ยังไม่ได้เลือกช่วงวันที่ จึงไม่มีอะไรให้ล้าง", {
        title: "ไม่มีช่วงวันที่",
        variant: "info",
        size: "md",
      });
      return;
    }

    const ok = await dialog.confirm("ต้องการล้างช่วงวันที่ใช่ไหม? (กลับเป็นไม่กรองวัน)", {
      title: "ยืนยันการล้างช่วงวันที่",
      confirmText: "ล้างช่วงวันที่",
      cancelText: "ยกเลิก",
      variant: "warning",
      size: "md",
    });
    if (!ok) return;

    setFromISO("");
    setToISO("");
    await dialog.success("ล้างช่วงวันที่เรียบร้อย (กลับเป็นไม่กรองวัน)", {
      title: "ล้างวันที่สำเร็จ",
      size: "md",
    });
  }

  // ✅ ล้างทั้งหมด (วันที่ + ค้นหา + dropdown) + Confirm
  async function resetAllFilters() {
    if (isAllDefault) {
      await dialog.alert("ตอนนี้ไม่มีตัวกรองให้ล้าง", { title: "แจ้งเตือน", variant: "info", size: "md" });
      return;
    }

    const ok = await dialog.confirm("ต้องการล้างตัวกรองทั้งหมดใช่ไหม?", {
      title: "ยืนยันการล้างตัวกรอง",
      confirmText: "ล้างทั้งหมด",
      cancelText: "ยกเลิก",
      variant: "warning",
      size: "md",
    });
    if (!ok) return;

    setFromISO("");
    setToISO("");
    setQ("");
    setAttachFilter("ทั้งหมด");

    await dialog.success("ล้างตัวกรองทั้งหมดเรียบร้อย", { title: "สำเร็จ", size: "md" });
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (rows || [])
      .filter((r) => withinRange(r, fromISO, toISO))
      .filter((r) => {
        // dropdown: มี/ไม่มีไฟล์แนบ
        const atts = Array.isArray((r as any).attachments) ? (r as any).attachments : [];
        if (attachFilter === "มีไฟล์แนบ" && atts.length === 0) return false;
        if (attachFilter === "ไม่มีไฟล์แนบ" && atts.length > 0) return false;
        return true;
      })
      .filter((r) => {
        if (!qq) return true;

        const p = userMap[r.uid] || { fullName: "", phone: "" };
        const em = String((r as any)?.email || "").trim().toLowerCase();
        const pe = emailMap[em] || { fullName: "", phone: "" };

        const s = (r as any)?.submitter || null;
        const snapName =
          String(s?.fullName || "").trim() ||
          [String(s?.fname || "").trim(), String(s?.lname || "").trim()].filter(Boolean).join(" ").trim();
        const snapPhone =
          String(s?.phone || "").trim() ||
          String((Array.isArray(s?.phones) && s.phones[0]) || "").trim();

        const hay = `${r.requestNo} ${r.place} ${r.note || ""} ${(r as any)?.email || ""} ${p.fullName} ${
          p.phone
        } ${pe.fullName} ${pe.phone} ${snapName} ${snapPhone}`.toLowerCase();

        return hay.includes(qq);
      })
      .sort((a, b) => tsToMs(b.submittedAt) - tsToMs(a.submittedAt));
  }, [rows, fromISO, toISO, q, userMap, emailMap, attachFilter]);

  const colCount = canDelete ? 8 : 7;

  return (
    <>
      <PageMeta title="Field Work History | Smart HR" description="Field work history page" />
      <PageBreadcrumb pageTitle="ประวัติแจ้งปฏิบัติงานนอกสถานที่" />

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
        input[type="date"]::-webkit-inner-spin-button, input[type="date"]::-webkit-clear-button { display: none; }
      `}</style>

      {/* ✅ Modal กลาง: ไฟล์แนบทั้งหมด */}
      <Modal
        isOpen={attModal.open}
        onClose={closeAllFiles}
        title="ไฟล์แนบทั้งหมด"
        closeOnBackdrop
        zIndexClassName="z-[2147483646]"
      >
        <div className="text-sm font-semibold text-violet-700/80 dark:text-violet-200/80">{attModal.requestNo}</div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-violet-200/80 dark:border-violet-500/20">
          <div className="divide-y divide-violet-100 dark:divide-violet-500/15">
            {attModal.attachments.length === 0 ? (
              <div className="px-4 py-4 text-sm font-semibold text-violet-700/70 dark:text-violet-200/70">
                ไม่มีไฟล์แนบ
              </div>
            ) : (
              attModal.attachments.map((a, idx) => (
                <div key={`${a.storagePath}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="break-words text-sm font-extrabold text-gray-900 dark:text-gray-100">
                      {normalizeAttName(a.name)}
                    </div>
                  </div>

                  <AppButton
                    type="button"
                    onClick={() => openAttachment(a.storagePath || "")}
                    variant="outlinePill"
                    className="h-10 px-6"
                  >
                    เปิด
                  </AppButton>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <AppButton type="button" onClick={closeAllFiles} variant="outlinePill" className="h-10 px-5">
            ปิดหน้าต่าง
          </AppButton>
        </div>
      </Modal>

      
      {/* ✅ ปุ่มสลับมุมมอง (เฉพาะ EXECUTIVE_MANAGER / ADMIN): วางนอกกรอบเพื่อไม่ให้รกข้างใน */}
      {canSeeAll && (
        <div className="mb-3 flex justify-end gap-2">
          <AppButton
            type="button"
            onClick={() => setScope("mine")}
            variant="outlinePill"
            size="md"
            className={cn("h-9 px-4 text-sm", scope === "mine" ? "bg-violet-50/70 dark:bg-violet-500/15" : "")}
          >
            ดูของตัวเอง
          </AppButton>

          <AppButton
            type="button"
            onClick={() => setScope("all")}
            variant="outlinePill"
            size="md"
            className={cn("h-9 px-4 text-sm", scope === "all" ? "bg-violet-50/70 dark:bg-violet-500/15" : "")}
          >
            ดูของทุกคน
          </AppButton>
        </div>
      )}

      {/* ✅ Shell/Card: คุมธีมให้เหมือนหน้าอื่น */}
      <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:p-5 transition">

        {/* ✅ FILTER BAR (แนวเดียวกับรูป): แถวบน = ค้นหา + dropdown, แถวล่าง = date range + ปุ่ม */}
        <div className="mt-0 space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ค้นหา</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={cn("mt-2", inputTheme.purple, "h-11 text-base")}
                placeholder="ค้นหา: ชื่อ/เบอร์/อีเมล/เลขคำร้อง/สถานที่/หมายเหตุ"
              />
            </div>

            <div className="lg:col-span-4">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ตัวกรอง</label>
</div>

              <div className="mt-2">
                <ThemedSelect value={attachFilter} onChange={(e) => setAttachFilter(e.target.value as any)}>
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  <option value="มีไฟล์แนบ">มีไฟล์แนบ</option>
                  <option value="ไม่มีไฟล์แนบ">ไม่มีไฟล์แนบ</option>
                </ThemedSelect>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ช่วงวันที่: จาก</label>
              <div className="mt-2">
                <ThemedDateInput value={fromISO} onChange={setFromISO} />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-sm font-extrabold text-gray-900 dark:text-gray-100">ถึง</label>
              <div className="mt-2">
                <ThemedDateInput value={toISO} onChange={setToISO} />
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-wrap items-end justify-end gap-3">
              <AppButton type="button" onClick={resetDates} variant="outlinePill" size="md" className="h-11 px-6">
                ล้างช่วงวันที่
              </AppButton>

              <AppButton type="button" onClick={resetAllFilters} variant="outline" size="md" className="h-11 px-6">
                ล้างทั้งหมด
              </AppButton>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              แสดง {filtered.length} รายการ
            </div>
            {!myUid && (
              <div className="text-xs font-semibold text-red-600 dark:text-red-300">
                ไม่พบ uid — จะไม่แสดงข้อมูลเพื่อความปลอดภัย
              </div>
            )}
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {err}
          </div>
        )}

        {/* ✅ Table theme กลาง */}
        <div className={cn("mt-5", tableTheme.shell)}>
          <table className="w-full table-fixed text-left text-sm">
            <thead className={tableTheme.thead}>
              <tr>
                <th className="px-4 py-3 font-extrabold text-left w-[12%]">วันที่ยื่น</th>
                <th className="px-4 py-3 font-extrabold text-left w-[14%]">เลขคำร้อง</th>
                <th className="px-4 py-3 font-extrabold text-left w-[14%]">ผู้ยื่น</th>
                <th className="px-4 py-3 font-extrabold text-left w-[18%]">ช่วงเวลา</th>
                <th className="px-4 py-3 font-extrabold text-left w-[10%]">สถานที่</th>
                <th className="px-4 py-3 font-extrabold text-left w-[14%]">หมายเหตุ</th>
                <th className="px-4 py-3 font-extrabold text-left w-[12%]">ไฟล์แนบ</th>
                {canDelete && <th className="px-4 py-3 font-extrabold text-left w-[6%]">จัดการ</th>}
              </tr>
            </thead>

            <tbody className={tableTheme.tbody}>
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
                    ? new Intl.DateTimeFormat("th-TH", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(submittedMs))
                    : "-";

                  const pByUid = userMap[r.uid] || { fullName: "", phone: "" };
                  const emKey = String((r as any)?.email || "").trim().toLowerCase();
                  const pByEmail = emailMap[emKey] || { fullName: "", phone: "" };

                  const s = (r as any)?.submitter || null;
                  const snapName =
                    String(s?.fullName || "").trim() ||
                    [String(s?.fname || "").trim(), String(s?.lname || "").trim()].filter(Boolean).join(" ").trim();
                  const snapPhone =
                    String(s?.phone || "").trim() ||
                    String((Array.isArray(s?.phones) && s.phones[0]) || "").trim();

                  const fullName =
                    snapName || pByUid.fullName || pByEmail.fullName || (r as any)?.email || r.uid || "-";
                  const phone = snapPhone || pByUid.phone || pByEmail.phone || "";
                  const atts = Array.isArray((r as any).attachments) ? (r as any).attachments : [];

                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 align-top">
                        {submittedText}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 align-top">
                        {r.requestNo}
                      </td>

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
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as any,
                              overflow: "hidden",
                            }}
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
                              <AppButton
                                key={`${r.id}-att-${idx}`}
                                type="button"
                                onClick={() => openAttachment(String(a.storagePath || ""))}
                                title={normalizeAttName(a.name) || `ไฟล์ ${idx + 1}`}
                                variant="outline"
                                size="sm"
                                className="max-w-[190px] truncate rounded-full"
                              >
                                {normalizeAttName(a.name) || `ไฟล์ ${idx + 1}`}
                              </AppButton>
                            ))}

                            {atts.length > 2 && (
                              <AppButton
                                type="button"
                                onClick={() => openAllFiles(r.requestNo, atts)}
                                variant="ghost"
                                size="sm"
                                className="justify-start p-0 text-left text-[11px] font-extrabold text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
                              >
                                ดูทั้งหมด ({atts.length} ไฟล์)
                              </AppButton>
                            )}
                          </div>
                        )}
                      </td>

                      {canDelete && (
                        <td className="px-4 py-3 text-left align-top">
                          <AppButton
                            type="button"
                            onClick={() => handleDelete(r.id, r.requestNo, fullName)}
                            variant="ghost"
                            size="sm"
                            className="p-0 text-sm font-extrabold text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                          >
                            ลบ
                          </AppButton>
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