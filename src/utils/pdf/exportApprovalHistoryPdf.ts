import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { THAI_FONT_BASE64, THAI_FONT_FILE, THAI_FONT_NAME } from "./thaiFont";

type NotifyVariant = "info" | "success" | "warning" | "danger";

type ExportMeta = {
  title?: string;
  orgLine1?: string;
  orgLine2?: string;

  exportedAt?: Date;

  // เดิม: บางทีถูกส่งมาเป็น email
  exportedBy?: string;

  // ✅ ใหม่: ส่งโปรไฟล์มาเหมือนชื่อพนักงาน
  exportedByProfile?: {
    fname?: string;
    lname?: string;
    position?: string;
  };

  filtersText?: string;
  dateRangeText?: string;

  selectedMonth?: number; // 1-12
  selectedYear?: number; // ค.ศ.
  dateFrom?: Date;
  reportMonth?: Date;

  summary?: { total: number; approved: number; rejected: number };

  logoUrl?: string;
  logoDataUrl?: string;

  signatureTitle?: string;
  signatureName?: string;

  // ✅ เพิ่ม: ให้หน้าเว็บส่ง toast มา (แทน alert)
  notify?: (message: string, opts?: { title?: string; variant?: NotifyVariant }) => void;
};

export async function exportApprovalHistoryPdf(rows: any[], meta: ExportMeta = {}) {
  if (!rows || rows.length === 0) {
    // ❌ ไม่ใช้ alert แล้ว
    meta.notify?.("ไม่มีข้อมูลให้ Export", { title: "Export PDF", variant: "warning" });
    return false;
  }

  const doc = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  // @ts-ignore
  doc.addFileToVFS(THAI_FONT_FILE, THAI_FONT_BASE64);
  // @ts-ignore
  doc.addFont(THAI_FONT_FILE, THAI_FONT_NAME, "normal");
  doc.setFont(THAI_FONT_NAME);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const title = meta.title ?? "รายงานประวัติการอนุมัติใบลา";
  const exportedAt = meta.exportedAt ?? new Date();

  // ✅ ผู้ออกรายงาน: ชื่อจริง+ตำแหน่ง (เหมือนชื่อพนักงาน)
  const exportedBy = buildExportedBy(meta);

  const filtersText = meta.filtersText ?? "-";
  const dateRangeText = meta.dateRangeText ?? "-";
  const org1 = meta.orgLine1 ?? "";
  const org2 = meta.orgLine2 ?? "";
  const summary = meta.summary;

  const sigTitle = (meta.signatureTitle ?? "รักษาการกรรมการผู้จัดการใหญ่").trim();
  const sigName = (meta.signatureName ?? "").trim();

  let logoDataUrl = meta.logoDataUrl || "";
  if (!logoDataUrl && meta.logoUrl) {
    try {
      logoDataUrl = await urlToDataUrl(meta.logoUrl);
    } catch {
      logoDataUrl = "";
    }
  }

  // =========================
  // Header
  // =========================
  let y = 46;
  const leftX = 40;
  const rightX = pageWidth - 40;

  // logo (ขวา)
  const logoH = 54;
  const logoW = 110;
  const logoX = rightX - logoW;
  const logoY = 14;

  if (logoDataUrl) {
    try {
      const imgType = detectImageTypeFromDataUrl(logoDataUrl);
      doc.addImage(logoDataUrl, imgType, logoX, logoY, logoW, logoH, undefined, "FAST");
    } catch {}
  }

  // org lines (ซ้าย)
  doc.setFontSize(14);
  if (org1) doc.text(org1, leftX, 42);
  if (org2) doc.text(org2, leftX, 60);

  // title centered
  doc.setFontSize(18);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 26;

  // divider
  doc.setDrawColor(220);
  doc.line(leftX, y, rightX, y);
  y += 22;

  // ====== แถวเดียว: ผู้ออกรายงาน (ซ้าย) + วันที่ออกรายงาน (ขวา) ======
  doc.setFontSize(14);

  const yRow = y;
  doc.text(`ผู้ออกรายงาน: ${exportedBy}`, leftX, yRow);
  doc.text(`วันที่ออกรายงาน: ${formatTHDateTime(exportedAt)}`, rightX, yRow, { align: "right" });

  // ====== ฝั่งขวา: รายงานประจำเดือน ======
  const reportMonthDate = getReportMonthDate(meta, exportedAt);
  const lineGap = 18;

  const yRight1 = yRow + lineGap;
  const yRight2 = yRight1 + lineGap;

  doc.text(`รายงานประจำเดือน`, rightX, yRight1, { align: "right" });
  doc.text(
    `เดือน${TH_MONTHS[reportMonthDate.getMonth()]} ปี ${reportMonthDate.getFullYear() + 543}`,
    rightX,
    yRight2,
    { align: "right" }
  );

  // ====== บล็อกซ้าย (ใต้ผู้ออกรายงาน) ======
  let yLeft = yRow + lineGap;

  doc.text(`ตัวกรอง: ${filtersText}`, leftX, yLeft, { maxWidth: rightX - leftX });
  yLeft += 20;

  doc.text(`ช่วงวันที่: ${dateRangeText}`, leftX, yLeft, { maxWidth: rightX - leftX });
  yLeft += 22;

  if (summary) {
    doc.text(
      `สรุป: รวม ${summary.total} รายการ • อนุมัติ ${summary.approved} • ไม่อนุมัติ ${summary.rejected}`,
      leftX,
      yLeft,
      { maxWidth: rightX - leftX }
    );
    yLeft += 22;
  }

  y = Math.max(yLeft, yRight2 + 18);

  const tableStartY = y;

  // =========================
  // Table
  // =========================
  const head = [
    [
      "ชื่อพนักงาน",
      "เลขคำร้อง",
      "ยื่นคำร้อง",
      "วันอนุมัติ/อัปเดต",
      "สถานะ",
      "เหตุผล/หมายเหตุ",
    ],
  ];

  const body = rows.map((r) => [
    safe(r.employeeName),
    safe(r.requestNo ?? r.requestId ?? r.leaveNo ?? r.id),
    safe(formatTHDateTime(anyToDate(r.submittedAt ?? r.createdAt))),
    safe(formatTHDateTime(anyToDate(r.decidedAt ?? r.approvedAt ?? r.rejectedAt ?? r.updatedAt))),
    safe(statusTH(r.status)),
    safe(r.reason ?? r.note ?? "-"),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: tableStartY,
    margin: { left: 40, right: 40, bottom: 140 },
    tableWidth: pageWidth - 84,

    styles: {
      font: THAI_FONT_NAME,
      fontSize: 12,
      cellPadding: 5,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: { font: THAI_FONT_NAME, fontStyle: "normal", fontSize: 14 },

    columnStyles: {
      0: { cellWidth: 100, overflow: "linebreak" },
      1: { cellWidth: 90, overflow: "linebreak" },
      2: { cellWidth: 80, overflow: "linebreak" },
      3: { cellWidth: 95, overflow: "linebreak" },
      4: { cellWidth: 60, overflow: "linebreak" },
      5: { cellWidth: 90, overflow: "linebreak" },
    },

    horizontalPageBreak: true,

    didDrawPage: () => {
      const p = doc.getNumberOfPages();
      doc.setFont(THAI_FONT_NAME);
      doc.setFontSize(11);
      doc.text(`หน้า ${p}`, pageWidth - 40, pageHeight - 20, { align: "right" });
    },
  });

  addSignatureBlock(doc, sigName, sigTitle);

  doc.save(`approval-history_${formatFileStamp(exportedAt)}.pdf`);

  meta.notify?.("Export PDF สำเร็จ", { title: "Export PDF", variant: "success" });
  return true;
}

// ---------------- helpers ----------------
function buildExportedBy(meta: ExportMeta) {
  const p = meta.exportedByProfile;
  const fname = (p?.fname || "").trim();
  const lname = (p?.lname || "").trim();
  const pos = (p?.position || "").trim();

  const fullName = [fname, lname].filter(Boolean).join(" ").trim();

  if (fullName && pos) return `${fullName} (${pos})`;
  if (fullName) return fullName;
  if (pos) return pos;

  const fallback = (meta.exportedBy || "-").trim();
  return fallback.length ? fallback : "-";
}

function safe(v: any) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : "-";
}

function anyToDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate();
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatTHDateTime(d: Date | null) {
  if (!d) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear() + 543;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${yyyy} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function formatFileStamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
}

function statusTH(status: string) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("APPROV") || s.includes("อนุมัติ")) return "อนุมัติ";
  if (s.includes("REJECT") || s.includes("DENY") || s.includes("ไม่อนุมัติ")) return "ไม่อนุมัติ";
  if (s.includes("PEND") || s.includes("WAIT")) return "รออนุมัติ";
  return status || "-";
}

function resolveAbsoluteUrl(url: string) {
  if (!url) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return url;
}

async function urlToDataUrl(url: string): Promise<string> {
  const abs = resolveAbsoluteUrl(url);
  const res = await fetch(abs, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch logo failed: ${res.status}`);
  const blob = await res.blob();
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function detectImageTypeFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  const s = String(dataUrl || "");
  if (s.startsWith("data:image/jpeg") || s.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

function addSignatureBlock(doc: jsPDF, name: string, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const last = doc.getNumberOfPages();
  doc.setPage(last);

  const rightX = pageWidth - 60;

  const SIZE_TITLE = 16;
  const SIZE_DOTS = 16;
  const SIZE_NAME = 16;
  const SIZE_DATE = 16;

  const yLine = pageHeight - 115;
  const dots = "..........................................";

  doc.setFont(THAI_FONT_NAME);

  doc.setFontSize(SIZE_DOTS);
  doc.setTextColor(80);
  doc.text(dots, rightX, yLine, { align: "right" });

  const lineWidth = doc.getTextWidth(dots);
  const lineLeftX = rightX - lineWidth;
  const lineCenterX = lineLeftX + lineWidth / 2;

  doc.setFontSize(SIZE_TITLE);
  doc.setTextColor(60);
  doc.text(title || "รักษาการกรรมการผู้จัดการใหญ่", lineCenterX, yLine - 40, {
    align: "center",
  });

  if (name?.trim()) {
    doc.setFontSize(SIZE_NAME);
    doc.setTextColor(60);
    doc.text(`(${name.trim()})`, lineCenterX, yLine + 25, { align: "center" });

    doc.setFontSize(SIZE_DATE);
    doc.text(`ลงวันที่${dots}`, lineCenterX, yLine + 50, { align: "center" });
  } else {
    doc.setFontSize(SIZE_DATE);
    doc.setTextColor(60);
    doc.text(`ลงวันที่${dots}`, lineCenterX, yLine + 20, { align: "center" });
  }

  doc.setTextColor(0);
}

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function getReportMonthDate(meta: ExportMeta, exportedAt: Date) {
  if (meta.selectedMonth && meta.selectedYear) {
    return new Date(meta.selectedYear, meta.selectedMonth - 1, 1);
  }
  if (meta.reportMonth instanceof Date && !isNaN(meta.reportMonth.getTime())) {
    return new Date(meta.reportMonth.getFullYear(), meta.reportMonth.getMonth(), 1);
  }
  if (meta.dateFrom instanceof Date && !isNaN(meta.dateFrom.getTime())) {
    return new Date(meta.dateFrom.getFullYear(), meta.dateFrom.getMonth(), 1);
  }

  const parsed = parseFirstDateFromDateRangeText(meta.dateRangeText || "");
  if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);

  return new Date(exportedAt.getFullYear(), exportedAt.getMonth(), 1);
}

function parseFirstDateFromDateRangeText(text: string): Date | null {
  const s = String(text || "");
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yy = Number(m[3]);

  if (yy >= 2400) yy = yy - 543;

  const d = new Date(yy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}
