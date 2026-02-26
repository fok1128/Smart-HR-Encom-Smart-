// src/pages/MyLeaveRequestsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";
import AppButton from "../components/common/AppButton";
import { inputTheme } from "../components/ui/theme/inputTheme";
import {
  LeaveRequestDoc,
  listenMyLeaveRequests,
  getAttachmentKey,
  getSignedUrlForKey,
  addLeaveAttachments,
  cancelMyPendingLeaveRequest, // ✅ NEW
} from "../services/leaveRequests";
import LeaveSubmitPage from "./LeaveSubmitPage";

function badgeClass(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED")
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200";
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

function pickStr(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}


function actorName(x: any) {
  if (!x) return "";
  if (typeof x === "string") return x.trim();

  if (typeof x === "object") {
    const full = [x.fname, x.lname].filter(Boolean).join(" ").trim();
    return (
      full ||
      String(x.displayName || "").trim() ||
      String(x.name || "").trim() ||
      String(x.email || "").trim() ||
      String(x.uid || "").trim() ||
      ""
    );
  }

  return String(x).trim();
}

function pickActor(...vals: any[]) {
  for (const v of vals) {
    const n = actorName(v);
    if (n) return n;
  }
  return "";
}


function getUserNote(r: any) {
  const v =
    r?.note ??
    r?.reason ??
    r?.remark ??
    r?.remarks ??
    r?.comment ??
    r?.message ??
    r?.detail ??
    r?.description ??
    r?.userNote ??
    r?.employeeNote ??
    "";
  const s = String(v ?? "").trim();
  return s;
}

function attachmentLabel(a: any, idx: number) {
  if (!a) return `ไฟล์ #${idx + 1}`;
  if (typeof a === "string") {
    const last = a.split("/").pop() || a;
    return last;
  }
  const name =
    a.originalName ??
    a.fileName ??
    a.filename ??
    a.name ??
    a.displayName ??
    a.path?.split?.("/")?.pop?.() ??
    a.storagePath?.split?.("/")?.pop?.() ??
    a.key?.split?.("/")?.pop?.();
  return String(name || `ไฟล์ #${idx + 1}`);
}


// ----------------- ✅ Decision reasons (HR / EXECUTIVE_MANAGER) -----------------
type DecisionReason = {
  role: string;
  action: string;
  reason: string;
  decidedAt?: any;
};

function normalizeAction(raw: any) {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "APPROVED" || s === "APPROVE") return "APPROVED";
  if (s === "REJECTED" || s === "REJECT" || s === "DENIED") return "REJECTED";
  if (s === "CANCELED" || s === "CANCELLED" || s === "CANCEL") return "CANCELED";
  if (s === "PENDING") return "PENDING";
  return s;
}

function actionLabelTH(raw: any) {
  const a = normalizeAction(raw);
  if (a === "APPROVED") return "อนุมัติ";
  if (a === "REJECTED") return "ไม่อนุมัติ";
  if (a === "CANCELED") return "ยกเลิก";
  if (a === "PENDING") return "รอดำเนินการ";
  return String(raw || "").trim() || "-";
}

function roleLabelTH(raw: any) {
  const r = String(raw || "").trim().toUpperCase();
  if (r === "EXECUTIVE_MANAGER" || r === "EXECUTIVE" || r === "EM") return "EXECUTIVE_MANAGER";
  if (r === "MANAGER") return "MANAGER";
  if (r === "HR") return "HR";
  if (r === "ADMIN") return "ADMIN";
  return r || "-";
}

function pickReasonFromObj(x: any) {
  return pickStr(
    x?.reason,
    x?.note,
    x?.comment,
    x?.remarks,
    x?.detail,
    x?.message,
    x?.rejectReason,
    x?.cancelReason,
    x?.canceledReason,
    x?.cancelledReason
  );
}

function getDecisionReasons(r: any): DecisionReason[] {
  const out: DecisionReason[] = [];

  // A) array history (best)
  const arrays = [r?.decisionHistory, r?.approvalHistory, r?.approvals, r?.decisions, r?.history];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      const reason = pickReasonFromObj(it);
      if (!reason) continue;

      const role = roleLabelTH(it?.role || it?.byRole || it?.approverRole);
      const action = normalizeAction(it?.action || it?.status || it?.decision || it?.result);
      out.push({ role, action, reason, decidedAt: it?.decidedAt || it?.at || it?.timestamp });
    }
  }

  // B) common nested objects
  const hrObj = r?.hrDecision || r?.hrApproval || r?.hr || r?.HR;
  const emObj =
    r?.executiveDecision ||
    r?.executiveManagerDecision ||
    r?.execDecision ||
    r?.emDecision ||
    r?.executive_managerDecision ||
    r?.EXECUTIVE_MANAGER;

  const hrReason = pickReasonFromObj(hrObj);
  if (hrReason) {
    out.push({
      role: "HR",
      action: normalizeAction(hrObj?.action || hrObj?.status || hrObj?.decision || r?.hrStatus),
      reason: hrReason,
      decidedAt: hrObj?.decidedAt || hrObj?.at,
    });
  }

  const emReason = pickReasonFromObj(emObj);
  if (emReason) {
    out.push({
      role: "EXECUTIVE_MANAGER",
      action: normalizeAction(emObj?.action || emObj?.status || emObj?.decision || r?.emStatus),
      reason: emReason,
      decidedAt: emObj?.decidedAt || emObj?.at,
    });
  }

  // C) fallback single fields (avoid showing employee reason: r.reason)
  const fallback = pickStr(r?.rejectReason, r?.rejectedReason, r?.cancelReason, r?.canceledReason, r?.cancelledReason);
  if (fallback) {
    out.push({ role: "APPROVER", action: normalizeAction(r?.status), reason: fallback, decidedAt: r?.decidedAt });
  }

  // de-dup
  const uniq = new Map<string, DecisionReason>();
  for (const x of out) {
    const k = `${x.role}__${x.action}__${x.reason}`;
    if (!uniq.has(k)) uniq.set(k, x);
  }
  return Array.from(uniq.values());
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


// ----------------- ✅ Workflow bars (HR / EXECUTIVE_MANAGER) -----------------
type StageKey = "HR" | "EXECUTIVE_MANAGER";

type StageInfo = {
  role: StageKey;
  status: string; // APPROVED/REJECTED/CANCELED/PENDING/BLOCKED/-
  by: string;
  at: any;
  reason: string;
  blocked?: boolean; // ยังไม่ถึงขั้น
};


function isRejectOrCancel(st: any) {
  const s = normalizeAction(st);
  return s === "REJECTED" || s === "CANCELED";
}

function stageBadgeClass(st: string) {
  const s = normalizeAction(st);
  if (s === "BLOCKED")
    // ✅ เห็นว่า 'ยังไม่ถึงขั้น' แต่ไม่ให้แดงทั้งแถบจนล้นตา
    return "bg-gray-50 text-red-700 border border-gray-200 dark:bg-gray-800/40 dark:text-red-200 dark:border-gray-700";
  return badgeClass(s);
}

function stageStatusText(st: string) {
  const s = normalizeAction(st);
  if (s === "BLOCKED") return "ยังไม่ถึงขั้น";
  return statusText(s);
}

function getStageReason(r: any, role: StageKey) {
  // direct fields (new workflow)
  const direct =
    role === "HR"
      ? pickStr(r?.hrComment, r?.hrReason, r?.hrNote)
      : pickStr(r?.managerComment, r?.emComment, r?.executiveComment, r?.managerReason);

  if (direct) return direct;

  // legacy single fields
  const legacy = pickStr(r?.rejectReason, r?.decisionNote, r?.canceledReason, r?.cancelReason);
  if (legacy && role === "HR") return legacy;

  // try history arrays
  const all = getDecisionReasons(r);
  const want = roleLabelTH(role);
  const hit = all.find((x) => roleLabelTH(x.role) === want);
  return hit?.reason ? String(hit.reason) : "";
}

function getStageInfo(r: any, role: StageKey): StageInfo {
  if (role === "HR") {
    const status = normalizeAction(pickStr(r?.hrStatus, r?.hrDecision?.status, r?.hrDecision?.action, r?.hrApproval?.status));
    return {
      role,
      status: status || "PENDING",
      by: pickActor(r?.hrActionBy, r?.hrBy, r?.hrActor, r?.hrApprovedBy, r?.hrRejectedBy, r?.approvedBy, r?.rejectedBy),
      at: r?.hrActionAt || r?.hrDecidedAt || r?.hrApprovedAt || r?.hrRejectedAt || r?.decidedAt || r?.approvedAt || r?.rejectedAt,
      reason: getStageReason(r, role),
    };
  }

  const status = normalizeAction(
    pickStr(
      r?.managerStatus,
      r?.emStatus,
      r?.executiveManagerStatus,
      r?.executiveStatus,
      r?.executiveDecision?.status,
      r?.emDecision?.status
    )
  );

  return {
    role,
    status: status || "PENDING",
    by: pickActor(
      r?.managerActionBy,
      r?.emActionBy,
      r?.executiveActionBy,
      r?.executiveManagerActionBy,
      r?.managerBy,
      r?.emBy
    ),
    at: r?.managerActionAt || r?.emActionAt || r?.executiveActionAt || r?.managerDecidedAt,
    reason: getStageReason(r, role),
  };
}

function openStageReasonDialog(dialog: any, stage: StageInfo) {
  const title = `เหตุผล/หมายเหตุ (${stage.role})`;

  const d: any = dialog as any;
  if (typeof d?.openModal === "function") {
    d.openModal({
      title,
      size: "md",
      content: (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                {stage.role}: {actionLabelTH(stage.status)}
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stage.at ? fmtDateTime(stage.at) : ""}</div>
            </div>

            {stage.by && (
              <div className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                โดย: <span className="font-extrabold">{stage.by}</span>
              </div>
            )}

            <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
              {stage.reason || "-"}
            </div>
          </div>
        </div>
      ),
    });
    return;
  }

  window.alert(`${title}

${stage.role}: ${actionLabelTH(stage.status)}
โดย: ${stage.by || "-"}
${stage.reason || "-"}`);
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

function toMillis(x: any): number | null {
  try {
    if (!x) return null;

    if (typeof x === "string") {
      const d = new Date(x);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    if (x?.toDate) {
      const d = x.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : null;
    }
    if (typeof x?.seconds === "number") {
      const d = new Date(x.seconds * 1000);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    if (x instanceof Date) return isNaN(x.getTime()) ? null : x.getTime();

    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

function clsInput(extra?: string) {
  const base =
    (inputTheme as any)?.input ||
    (inputTheme as any)?.base ||
    "h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none dark:bg-gray-900";

  const purple =
    "border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-200/60 " +
    "dark:border-violet-500/40 dark:focus:border-violet-400 dark:focus:ring-violet-500/20";

  return [base, purple, extra].filter(Boolean).join(" ");
}
function clsSelect(extra?: string) {
  const base =
    (inputTheme as any)?.select ||
    (inputTheme as any)?.input ||
    (inputTheme as any)?.base ||
    "h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none dark:bg-gray-900";

  const purple =
    "border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-200/60 " +
    "dark:border-violet-500/40 dark:focus:border-violet-400 dark:focus:ring-violet-500/20";

  return [base, purple, extra].filter(Boolean).join(" ");
}

const LEAVE_CATEGORIES = ["ลากิจ", "ลาป่วย", "ลาพักร้อน", "ลากรณีพิเศษ"] as const;

const SUBTYPE_MAP: Record<(typeof LEAVE_CATEGORIES)[number], string[]> = {
  ลากิจ: ["ลากิจปกติ", "ลากิจฉุกเฉิน"],
  ลาป่วย: ["ป่วยระหว่างวัน", "ลาป่วยทั่วไป", "ลาหมอนัด", "ลาแบบมีใบรับรองแพทย์"],
  ลาพักร้อน: ["ลาพักร้อน"],
  ลากรณีพิเศษ: ["ลาคลอด", "ลารับราชการทหาร", "ลาเพื่อทำหมัน", "อื่นๆ"],
};

export default function MyLeaveRequestsPage() {
  const { user } = useAuth();
  const dialog = useDialogCenter();
  function openEditModal(editId: string) {
      dialog.openModal({
        title: "แก้ไขคำร้องการลา",
        size: "xl",
        closeOnBackdrop: false,
        closeOnEsc: true,
        content: (
          <div className="max-h-[78vh] overflow-auto px-1">
            <LeaveSubmitPage
              embedded
              editId={editId}
              onDone={() => dialog.closeModal()}
              onCancel={() => dialog.closeModal()}
            />
          </div>
        ),
      });
    }
  const dlgAlert = (title: string, message: string) => {
    const d: any = dialog as any;
    const t = String(title ?? "");
    const m = String(message ?? "");
    try {
      if (typeof d?.alert === "function") {
        try {
          d.alert(t, m);
          return;
        } catch {
          d.alert(`${t}\n${m}`);
          return;
        }
      }
    } catch {}
    window.alert(`${t}\n${m}`);
  };
  const dlgSuccess = (title: string, message: string) => {
    const d: any = dialog as any;
    const t = String(title ?? "");
    const m = String(message ?? "");
    try {
      if (typeof d?.success === "function") {
        try {
          d.success(t, m);
          return;
        } catch {
          d.success(`${t}\n${m}`);
          return;
        }
      }
    } catch {}
    window.alert(`✅ ${t}\n${m}`);
  };

  const dlgConfirm = async (title: string, message: string) => {
    const d: any = dialog as any;
    const t = String(title ?? "");
    const m = String(message ?? "");

    try {
      if (typeof d?.confirm === "function") {
        try {
          const r = await d.confirm(t, m);
          if (typeof r === "boolean") return r;
          if (r && typeof r === "object") return !!(r.ok ?? r.confirmed ?? r.value ?? r.result);
          return !!r;
        } catch {}

        try {
          const r = await d.confirm(`${t}\n${m}`);
          if (typeof r === "boolean") return r;
          if (r && typeof r === "object") return !!(r.ok ?? r.confirmed ?? r.value ?? r.result);
          return !!r;
        } catch {}
      }
    } catch {}

    return window.confirm(`${t}\n${m}`);
  };

  const [rows, setRows] = useState<LeaveRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [fromDT, setFromDT] = useState<string>("");
  const [toDT, setToDT] = useState<string>("");
  const [category, setCategory] = useState<string>("ALL");
  const [subType, setSubType] = useState<string>("ALL");

  const [openAttachId, setOpenAttachId] = useState<string | null>(null);
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string>("");
  const [attaching, setAttaching] = useState(false);
  const [attachPct, setAttachPct] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const uid = user?.uid || "";
    setErrorMsg("");
    setLoading(true);

    const unsub = listenMyLeaveRequests(
      uid,
      (r) => {
        setRows(r || []);
        setLoading(false);
      },
      (msg) => {
        const m = msg || "โหลดใบลาของฉันไม่สำเร็จ";
        setErrorMsg(m);
        setRows([]);
        setLoading(false);
        dlgAlert("เกิดข้อผิดพลาด", m);
      }
    );

    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const isProvided = (r: LeaveRequestDoc) => {
    const atts = Array.isArray((r as any).attachments) ? (r as any).attachments : [];
    return !!(r as any).medicalCertProvided || atts.length > 0;
  };

  const canAttachLater = (r: LeaveRequestDoc) => {
    const status = String((r as any).status || "").toUpperCase();
    const isPending = status === "PENDING";
    const require = !!(r as any).requireMedicalCert;
    const hasDue = !!(r as any).medicalCertDueAt;
    const provided = isProvided(r);
    const duePassed = isDuePassed((r as any).medicalCertDueAt);
    return require && hasDue && isPending && !provided && !duePassed;
  };

  const needWarnDue = (r: LeaveRequestDoc) => {
    const require = !!(r as any).requireMedicalCert;
    const hasDue = !!(r as any).medicalCertDueAt;
    const provided = isProvided(r);
    if (!require || !hasDue || provided) return false;
    return isDuePassed((r as any).medicalCertDueAt);
  };

  // ✅ NEW: แก้ไข/ยกเลิกได้ เฉพาะตอนยังรอ HR (PENDING_HR) หรือของเก่าที่ยังไม่มี overallStatus
  const canEditOrCancel = (r: any) => {
    const status = String(r?.status || "").toUpperCase();
    const overall = String(r?.overallStatus || "").toUpperCase();
    const okOverall = !overall || overall === "PENDING_HR";
    return status === "PENDING" && okOverall;
  };

  async function openAttachment(att: any) {
    const key = getAttachmentKey(att);
    if (!key) throw new Error("ไฟล์นี้ไม่มี key (storagePath) เปิดไม่ได้");
    const signed = await getSignedUrlForKey(key);
    window.open(signed, "_blank", "noopener,noreferrer");
  }

  async function handleAttachSubmit(targetRow: LeaveRequestDoc) {
    const fail = (msg: string) => {
      setAttachError(msg);
      dlgAlert("แนบไฟล์ไม่สำเร็จ", msg);
    };

    setAttachError("");

    if (!user?.uid) return fail("ยังไม่เข้าสู่ระบบ");
    if (!(targetRow as any)?.id) return fail("ไม่พบ id ของคำร้อง");

    const MAX_FILES = 5;
    const MAX_MB = 15;
    const okTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

    if (!attachFiles.length) return fail("กรุณาเลือกไฟล์ใบรับรองแพทย์");
    if (attachFiles.length > MAX_FILES) return fail(`แนบไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์`);
    if (attachFiles.some((f) => f.size > MAX_MB * 1024 * 1024)) return fail(`ไฟล์ต้องไม่เกิน ${MAX_MB}MB ต่อไฟล์`);
    if (attachFiles.some((f) => f.type && !okTypes.has(f.type))) return fail("อนุญาตเฉพาะ PDF และรูป (JPG/PNG/WEBP)");

    setAttaching(true);
    setAttachPct(0);

    try {
      await addLeaveAttachments((targetRow as any).id, user.uid, attachFiles, (p) => setAttachPct(p));
      setOpenAttachId(null);
      setAttachFiles([]);
      setAttachPct(0);
      setAttachError("");
      dlgSuccess("สำเร็จ", "อัปโหลดไฟล์เรียบร้อย");
    } catch (e: any) {
      const m = e?.message || String(e);
      setAttachError(m);
      dlgAlert("แนบไฟล์ไม่สำเร็จ", m);
    } finally {
      setAttaching(false);
    }
  }

  const sortedRows = useMemo(() => {
    const all = [...rows];
    all.sort((a, b) => {
      const t1 = toMillis((a as any).submittedAt) ?? 0;
      const t2 = toMillis((b as any).submittedAt) ?? 0;
      return t2 - t1;
    });
    return all;
  }, [rows]);

  const categoryOptions = useMemo(() => [...LEAVE_CATEGORIES], []);
  const subTypeOptions = useMemo(() => {
    if (category === "ALL") return [];
    if (!LEAVE_CATEGORIES.includes(category as any)) return [];
    return SUBTYPE_MAP[category as (typeof LEAVE_CATEGORIES)[number]] || [];
  }, [category]);

  const filteredRows = useMemo(() => {
    const fromMs = fromDT ? new Date(fromDT).getTime() : null;
    const toMs = toDT ? new Date(toDT).getTime() : null;

    const safeFrom = fromMs != null && !isNaN(fromMs) ? fromMs : null;
    const safeTo = toMs != null && !isNaN(toMs) ? toMs : null;

    return sortedRows.filter((r) => {
      const c = String((r as any).category || "").trim();
      const st = String((r as any).subType || "").trim();

      if (category !== "ALL" && c !== category) return false;
      if (subType !== "ALL" && st !== subType) return false;

      if (safeFrom == null && safeTo == null) return true;

      const sMs = toMillis((r as any).startAt);
      const eMs = toMillis((r as any).endAt);
      const subMs = toMillis((r as any).submittedAt);

      const rangeStart = sMs ?? subMs ?? null;
      const rangeEnd = eMs ?? rangeStart;

      if (rangeStart == null) return false;

      const aStart = rangeStart;
      const aEnd = rangeEnd ?? rangeStart;

      const bStart = safeFrom ?? Number.NEGATIVE_INFINITY;
      const bEnd = safeTo ?? Number.POSITIVE_INFINITY;

      return aStart <= bEnd && aEnd >= bStart;
    });
  }, [sortedRows, fromDT, toDT, category, subType]);

  const totalCount = sortedRows.length;
  const shownCount = filteredRows.length;

  useEffect(() => {
    if (subType === "ALL") return;
    if (category === "ALL") {
      setSubType("ALL");
      return;
    }
    if (!subTypeOptions.includes(subType)) setSubType("ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subTypeOptions.join("|")]);

  const clearFilters = async () => {
    const ok = await dlgConfirm("ล้างตัวกรอง", "ต้องการล้างค่าตัวกรองทั้งหมดใช่ไหม?");
    if (!ok) return;

    setFromDT("");
    setToDT("");
    setCategory("ALL");
    setSubType("ALL");

    dlgSuccess("ล้างตัวกรองแล้ว", "รีเซ็ตค่าตัวกรองเรียบร้อย");
  };

  // ✅ NEW: ยกเลิกคำร้อง (owner)
  const cancelRequest = async (r: any) => {
    if (!user?.uid) return dlgAlert("ทำรายการไม่ได้", "ยังไม่เข้าสู่ระบบ");
    if (!canEditOrCancel(r)) {
      return dlgAlert("ยกเลิกไม่ได้", "คำร้องนี้ HR อาจดำเนินการแล้ว");
    }

    const ok = await dlgConfirm("ยกเลิกคำร้อง", "ต้องการยกเลิกคำร้องนี้ใช่ไหม?");
    if (!ok) return;

    const reason = await (dialog as any).prompt?.("กรุณากรอกเหตุผลในการยกเลิก", {
      title: "เหตุผลยกเลิก",
      confirmText: "ยืนยันยกเลิก",
      cancelText: "ยกเลิก",
      variant: "warning",
      required: true,
      minLen: 1,
      maxLen: 300,
      placeholder: "เช่น เปลี่ยนแผน / กรอกข้อมูลผิด ...",
      label: "เหตุผล",
      size: "md",
    });

    if (reason === null) return;
    const rs = String(reason || "").trim();
    if (!rs) return;

    try {
      const name = `${(user as any)?.fname || ""} ${(user as any)?.lname || ""}`.trim() || null;
      await cancelMyPendingLeaveRequest(
        r.id,
        {
          uid: user.uid,
          email: user.email ?? null,
          role: String((user as any)?.role || "USER"),
          name,
        },
        rs
      );
      dlgSuccess("ยกเลิกสำเร็จ", "คำร้องถูกยกเลิกแล้ว");
    } catch (e: any) {
      dlgAlert("ยกเลิกไม่สำเร็จ", e?.message || String(e));
    }
  };

  return (
    <>
      <PageMeta title="My Leave Requests | Smart HR" description="My leave requests page" />
      <PageBreadcrumb pageTitle="ใบลาของฉัน" />

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          {loading && <div className="text-sm text-gray-600 dark:text-white/70">กำลังโหลด...</div>}

          {!loading && errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {!loading && !errorMsg && totalCount === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white/70">
              ยังไม่มีรายการ
            </div>
          )}

          {!loading && !errorMsg && totalCount > 0 && (
            <div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">จากวันที่</label>
                  <input
                    type="datetime-local"
                    value={fromDT}
                    onChange={(e) => setFromDT(e.target.value)}
                    className={clsInput()}
                  />
                </div>

                <div className="xl:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">ถึงวันที่</label>
                  <input
                    type="datetime-local"
                    value={toDT}
                    onChange={(e) => setToDT(e.target.value)}
                    className={clsInput()}
                  />
                </div>

                <div className="xl:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">ประเภทการลา</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubType("ALL");
                    }}
                    className={clsSelect()}
                  >
                    <option value="ALL">ทั้งหมด</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">ประเภทย่อย</label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className={clsSelect()}
                    disabled={category === "ALL" || subTypeOptions.length === 0}
                  >
                    <option value="ALL">ทั้งหมด</option>
                    {subTypeOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-12 mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    กำลังแสดง <span className="font-semibold text-gray-900 dark:text-gray-100">{shownCount}</span>{" "}
                    รายการ จากทั้งหมด <span className="font-semibold text-gray-900 dark:text-gray-100">{totalCount}</span>{" "}
                    รายการ
                  </div>

                  <AppButton variant="outline" onClick={clearFilters}>
                    ล้างตัวกรอง
                  </AppButton>
                </div>

                {shownCount === 0 && (
                  <div className="xl:col-span-12">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white/70">
                      ไม่พบรายการที่ตรงกับตัวกรอง
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!loading && !errorMsg && shownCount > 0 && (
          <div className="space-y-3">
            {filteredRows.map((r: any) => {
              const titleLeft = `${r.category || "-"} • ${r.subType || "-"}`;
              const reqNo = r.requestNo || r.id;
              const startAt = r.startAt;
              const endAt = r.endAt;
              const status = r.status;
              const attachments = Array.isArray(r.attachments) ? r.attachments : [];
              const legacyFiles = Array.isArray(r.files) ? r.files : [];
              const allFiles = [...attachments, ...legacyFiles];
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
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {fmtRange(startAt, endAt)}
                          </span>
                        </div>

                        <div className="mt-1">
                          <span className="font-semibold">ส่งเมื่อ:</span> {fmtDateTime(r.submittedAt)}
                        </div>
                      
                      {/* ✅ Workflow bar: HR / EXECUTIVE_MANAGER */}
                      {(() => {
                        const hr = getStageInfo(r, "HR");
                        const hrFinal = isRejectOrCancel(hr.status);
                        const emRaw = getStageInfo(r, "EXECUTIVE_MANAGER");
                        const em: StageInfo = hrFinal
                          ? { ...emRaw, status: "BLOCKED", blocked: true, by: "", at: null, reason: "" }
                          : emRaw;

                        const Row = ({ s }: { s: StageInfo }) => {
                          const hasReason = !!String(s.reason || "").trim();
                          const showReasonBtn = !s.blocked && hasReason;

                          return (
                            <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-xs font-extrabold text-gray-900 dark:text-gray-100">{s.role}</div>

                                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${stageBadgeClass(s.status)}`}>
                                    {stageStatusText(s.status)}
                                  </span>

                                  {s.blocked ? (
                                    <span className="text-xs font-semibold text-red-700 dark:text-red-200">
                                      คำร้องสิ้นสุดที่ขั้น HR
                                    </span>
                                  ) : null}
                                </div>

                                {!s.blocked && (s.by || s.at) && (
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                    {s.by ? (
                                      <>
                                        โดย: <span className="font-semibold text-gray-900 dark:text-gray-100">{s.by}</span>
                                      </>
                                    ) : null}
                                    {s.by && s.at ? <span className="mx-2 text-gray-400">•</span> : null}
                                    {s.at ? <span>{fmtDateTime(s.at)}</span> : null}
                                  </div>
                                )}
                              </div>

                              {showReasonBtn && (
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-full px-3 text-xs font-extrabold"
                                  onClick={() => openStageReasonDialog(dialog, s)}
                                >
                                  ดูเหตุผล
                                </AppButton>
                              )}
                            </div>
                          );
                        };

                        return (
                          <div className="mt-3 space-y-2">
                            <Row s={hr} />
                            <Row s={em} />
                          </div>
                        );
                      })()}

</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {attachments.length > 0 && (
                        <AppButton
                          variant="outline"
                          onClick={async () => {
                            try {
                              await openAttachment(attachments[0]);
                            } catch (e: any) {
                              dlgAlert("เปิดไฟล์ไม่สำเร็จ", e?.message || String(e));
                            }
                          }}
                        >
                          เปิดไฟล์แนบ
                        </AppButton>
                      )}

                      {/* ✅ NEW: ปุ่มแก้ไข/ยกเลิก (owner) */}
                      {canEditOrCancel(r) && (
                        <>
                          <AppButton variant="outline" onClick={() => openEditModal(r.id)}>
                          แก้ไขคำร้อง
                          </AppButton>

                          <AppButton variant="danger" onClick={() => cancelRequest(r)}>
                            ยกเลิกคำร้อง
                          </AppButton>
                        </>
                      )}

                      {canAttachLater(r) && (
                        <AppButton
                          variant="primary"
                          onClick={() => {
                            setOpenAttachId(r.id);
                            setAttachFiles([]);
                            setAttachError("");
                            setAttachPct(0);
                            setTimeout(() => fileInputRef.current?.click(), 50);
                            dlgAlert("แนบใบรับรองแพทย์", "เลือกไฟล์แล้วกด “ยืนยันแนบใบรับรอง”");
                          }}
                        >
                          แนบใบรับรองแพทย์
                        </AppButton>
                      )}
                    </div>
                  </div>

                                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">หมายเหตุ/เหตุผล</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                      {getUserNote(r) || "–"}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">ไฟล์แนบ</div>

                    {allFiles.length === 0 ? (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">–</div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {allFiles.map((a: any, idx: number) => {
                          const key = getAttachmentKey(a);
                          const label = attachmentLabel(a, idx);

                          // ✅ ถ้าไม่มี key (ไฟล์แบบเก่า/ข้อมูลไม่ครบ) ให้แสดงเป็นชิปเฉยๆ กดไม่ได้
                          if (!key) {
                            return (
                              <span
                                key={`nofile-${idx}`}
                                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
                                title="ไฟล์นี้ไม่มี key (storagePath) จึงเปิดไม่ได้"
                              >
                                {label}
                              </span>
                            );
                          }

                          return (
                            <AppButton
                              key={`${key}-${idx}`}
                              variant="outlinePill"
                              onClick={async () => {
                                try {
                                  await openAttachment(a);
                                } catch (e: any) {
                                  dlgAlert("เปิดไฟล์ไม่สำเร็จ", e?.message || String(e));
                                }
                              }}
                              title="เปิดไฟล์"
                            >
                              {label}
                            </AppButton>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {(r.requireMedicalCert || r.medicalCertDueAt) ? (
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

                          {r.medicalCertDueAt ? (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              เดดไลน์แนบ: <span className="font-semibold">{fmtDateOnly(r.medicalCertDueAt)}</span>
                            </div>
                          ) : null}

                          {showDueWarn ? (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
                              เลยกำหนดแนบใบรับรองแพทย์แล้ว
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

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

                        <AppButton
                          variant="outline"
                          onClick={() => {
                            setOpenAttachId(null);
                            setAttachFiles([]);
                            setAttachError("");
                            setAttachPct(0);
                          }}
                        >
                          ปิด
                        </AppButton>
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
                        <AppButton
                          variant="outline"
                          disabled={attaching}
                          onClick={() => {
                            setOpenAttachId(null);
                            setAttachFiles([]);
                            setAttachError("");
                            setAttachPct(0);
                          }}
                        >
                          ยกเลิก
                        </AppButton>

                        <AppButton variant="primary" disabled={attaching} onClick={() => handleAttachSubmit(r)}>
                          {attaching ? "กำลังแนบ..." : "ยืนยันแนบใบรับรอง"}
                        </AppButton>
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
