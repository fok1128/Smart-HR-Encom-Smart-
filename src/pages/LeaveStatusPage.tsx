// src/pages/LeaveStatusPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ModalShell from "../components/common/ModalShell";
import { useDialogCenter } from "../components/common/DialogCenter";
import AppButton from "../components/common/AppButton";
import { inputTheme } from "../components/ui/theme/inputTheme";
import { tableTheme } from "../components/ui/theme/tableTheme";

import { listenMyLeaveRequests, type LeaveRequestDoc } from "../services/leaveRequests";
import { listenMyFieldWorkRequests } from "../services/fieldWorkRequests";
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
  url?: string; // เก่า
  storagePath?: string; // ✅ supabase key
  path?: string; // เก่า
};

type FieldWorkDoc = {
  id: string;
  requestNo?: string;

  uid: string;
  email?: string | null;

  startAt: string;
  endAt: string;

  place: string;
  note?: string | null;

  status?: "APPROVED" | "PENDING" | "REJECTED" | "CANCELED";
  submittedAt?: any;
  approvedAt?: any;

  // snapshot fields (ถ้ามี)
  employeeName?: string | null;
  employeeNo?: string | null;
};

type UnifiedRow =
  | (LeaveRequestDoc & {
      __kind: "LEAVE";
      __typeLabel: string;
      __status: string;
      __submittedAt: any;
      __atts: AttachItem[];
    })
  | (FieldWorkDoc & {
      __kind: "FIELD_WORK";
      __typeLabel: string;
      __status: string;
      __submittedAt: any;
      __atts: AttachItem[];
    });

function statusLabel(s: string) {
  const u = String(s || "").toUpperCase();
  if (u === "APPROVED") return "อนุมัติ";
  if (u === "REJECTED") return "ไม่อนุมัติ";
  if (u === "CANCELED") return "ยกเลิก";
  return "รอดำเนินการ";
}

function statusBadgeClass(s: string) {
  const u = String(s || "").toUpperCase();
  return u === "APPROVED"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : u === "REJECTED"
    ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    : u === "CANCELED"
    ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
    : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
}

function normTime(s: any) {
  return String(s || "").replace("T", " ");
}

export default function LeaveStatusPage() {
  const { user } = useAuth();
  const dialog = useDialogCenter();

  // raw data
  const [leaveItems, setLeaveItems] = useState<LeaveRequestDoc[]>([]);
  const [fieldItems, setFieldItems] = useState<FieldWorkDoc[]>([]);

  // filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // preview modal (ใช้ ModalShell)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubLeave = listenMyLeaveRequests(user.uid, setLeaveItems);
    const unsubField = listenMyFieldWorkRequests(user.uid, (rows: any[]) => setFieldItems(rows as any));

    return () => {
      try {
        unsubLeave?.();
      } catch {}
      try {
        unsubField?.();
      } catch {}
    };
  }, [user?.uid]);

  const unifiedRows: UnifiedRow[] = useMemo(() => {
    const leaves: UnifiedRow[] = (leaveItems || []).map((r) => {
      const atts: AttachItem[] = Array.isArray((r as any).attachments) ? ((r as any).attachments as any) : [];
      const submitted = (r as any).submittedAt || (r as any).updatedAt || null;

      return {
        ...(r as any),
        __kind: "LEAVE",
        __typeLabel: `${(r as any).category} • ${(r as any).subType}`,
        __status: String((r as any).status || "PENDING").toUpperCase(),
        __submittedAt: submitted,
        __atts: atts,
      };
    });

    const fields: UnifiedRow[] = (fieldItems || []).map((f) => {
      const st = String((f as any).status || "APPROVED").toUpperCase();
      const submitted = (f as any).submittedAt || (f as any).approvedAt || null;
      const reqNo = (f as any).requestNo || `FW-${String((f as any).id || "").slice(0, 6).toUpperCase()}`;

      return {
        ...(f as any),
        requestNo: reqNo,
        __kind: "FIELD_WORK",
        __typeLabel: `ออกปฏิบัติงานนอกสถานที่ • ${(f as any).place || "-"}`,
        __status: st,
        __submittedAt: submitted,
        __atts: [], // field work ไม่มีไฟล์แนบ
      };
    });

    const all = [...leaves, ...fields];

    all.sort((a, b) => {
      const ams = a.__submittedAt?.toDate?.()?.getTime?.() ?? 0;
      const bms = b.__submittedAt?.toDate?.()?.getTime?.() ?? 0;
      return bms - ams;
    });

    return all;
  }, [leaveItems, fieldItems]);

  // ✅ dropdown options (ไม่ให้หาย)
  const typeOptions = useMemo(() => {
    const defaults = [
      "ลากิจ",
      "ลาป่วย",
      "ลาพักร้อน",
      "ลาคลอด",
      "ลาราชการทหาร",
      "ลาเพื่อทำหมัน",
      "ลากรณีพิเศษ",
      "ออกปฏิบัติงานนอกสถานที่",
    ];

    const fromData = new Set<string>();

    unifiedRows.forEach((r) => {
      if (r.__kind === "FIELD_WORK") {
        fromData.add("ออกปฏิบัติงานนอกสถานที่");
      } else {
        const cat = String((r as any).category || "").trim();
        if (cat) fromData.add(cat);

        const sub = String((r as any).subType || "").trim();
        if (sub === "ลาเพื่อทำหมัน") fromData.add("ลาเพื่อทำหมัน");
      }
    });

    const merged = Array.from(new Set([...defaults, ...Array.from(fromData)])).filter(Boolean);

    const order = new Map<string, number>();
    defaults.forEach((x, i) => order.set(x, i));
    merged.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b, "th"));

    return ["ALL", ...merged];
  }, [unifiedRows]);

  const statusOptions = useMemo(() => {
    return ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELED"];
  }, []);

  const filteredRows = useMemo(() => {
    let out = unifiedRows;

    if (typeFilter !== "ALL") {
      out = out.filter((r) => {
        if (r.__kind === "FIELD_WORK") {
          return typeFilter === "ออกปฏิบัติงานนอกสถานที่";
        }
        const cat = String((r as any).category || "").trim();
        const sub = String((r as any).subType || "").trim();
        if (typeFilter === "ลาเพื่อทำหมัน") return sub === "ลาเพื่อทำหมัน";
        return cat === typeFilter;
      });
    }

    if (statusFilter !== "ALL") {
      out = out.filter((r) => String(r.__status || "").toUpperCase() === statusFilter);
    }

    return out;
  }, [unifiedRows, typeFilter, statusFilter]);

  const isImage = (url: string) => /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewName("");
    setPreviewUrl("");
  };

  const openPreview = async (att: AttachItem) => {
    try {
      setPreviewLoading(true);

      let url = (att?.url || "").trim();
      if (!url && att?.storagePath) {
        url = await getSignedUrl(att.storagePath);
      }

      if (!url && att?.path) {
        await dialog.alert("ไฟล์นี้เป็นข้อมูลเก่าที่เก็บแบบ Firebase path — ตอนนี้ระบบเปลี่ยนเป็น Supabase แล้ว", {
          title: "เปิดไฟล์ไม่ได้",
          variant: "warning",
        });
        return;
      }

      if (!url) {
        await dialog.alert("ไฟล์แนบรายการนี้ยังไม่มีลิงก์/พาธสำหรับดู", {
          title: "เปิดไฟล์ไม่ได้",
          variant: "warning",
        });
        return;
      }

      setPreviewName(att.name || "attachment");
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (e: any) {
      console.error(e);
      await dialog.alert(e?.message || String(e), { title: "เปิดไฟล์ไม่ได้", variant: "danger" });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ✅ Preview Modal (ใช้ ModalShell กลางระบบ) */}
      <ModalShell
        open={previewOpen}
        title={`ดูไฟล์แนบ: ${previewName || "-"}`}
        description="* แสดงผลเพื่อดูเท่านั้น"
        onClose={closePreview}
        widthClassName="max-w-5xl"
        footer={
          <div className="flex justify-end gap-2">
            {previewUrl ? (
              <AppButton
                variant="outline"
                type="button"
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              >
                เปิดในแท็บใหม่
              </AppButton>
            ) : null}

            <AppButton variant="primary" type="button" onClick={closePreview}>
              ปิด
            </AppButton>
          </div>
        }
      >
        <div className="h-[72vh] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
          {!previewUrl ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-500">
              ไม่มีลิงก์ไฟล์สำหรับแสดงผล
            </div>
          ) : isImage(previewUrl) ? (
            <div className="flex h-full items-center justify-center p-4">
              <img
                src={previewUrl}
                alt={previewName}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="max-h-full max-w-full rounded-2xl border border-gray-200 object-contain dark:border-gray-800"
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
              <div className="font-semibold">ไฟล์ชนิดนี้แสดงในหน้าเว็บไม่ได้</div>
              <AppButton
                variant="primary"
                type="button"
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              >
                เปิดดูในแท็บใหม่
              </AppButton>
            </div>
          )}
        </div>
      </ModalShell>

      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">ตรวจสอบสถานะคำร้อง</h1>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">เลขคำร้อง • ประเภท • ช่วงเวลา • สถานะ • ยื่นเมื่อ</div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-4">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">กรองตามประเภทการลา</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${inputTheme.control} mt-2`}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t === "ALL" ? "ทั้งหมด" : t}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">กรองตามสถานะการอนุมัติ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputTheme.control} mt-2`}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "ทั้งหมด" : statusLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 flex flex-wrap items-center justify-end gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              กำลังแสดง <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredRows.length}</span> /{" "}
              {unifiedRows.length} รายการ
            </div>

            <AppButton
              type="button"
              variant="outline"
              disabled={previewLoading}
              onClick={async () => {
                setTypeFilter("ALL");
                setStatusFilter("ALL");
                await dialog.alert("ล้างตัวกรองเรียบร้อย", { title: "สำเร็จ", variant: "success" });
              }}
            >
              ล้างตัวกรอง
            </AppButton>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">รายการคำร้องทั้งหมด</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{filteredRows.length} รายการ</div>
        </div>

        <div className={tableTheme.wrap}>
        <div className={tableTheme.shell}>
          <table className={tableTheme.table}>
            <thead className={tableTheme.thead}>
              <tr>
                <th className={tableTheme.th}>เลขคำร้อง</th>
                <th className={tableTheme.th}>ประเภท</th>
                <th className={tableTheme.th}>ช่วงเวลา</th>
                <th className={tableTheme.th}>สถานะ</th>
                <th className={tableTheme.th}>ยื่นเมื่อ</th>
                <th className={tableTheme.th}>ไฟล์แนบ</th>
              </tr>
            </thead>

            <tbody className={tableTheme.tbody}>
              {filteredRows.length === 0 ? (
                <tr className={tableTheme.trHover}>
                  <td className={tableTheme.td} colSpan={6}>
                    <span className="text-gray-500">ไม่พบคำร้องตามตัวกรอง</span>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const badge = statusBadgeClass(r.__status);
                  const stText = statusLabel(r.__status);

                  return (
                    <tr key={`${r.__kind}-${(r as any).id}`} className={tableTheme.trHover}>
                      <td className={tableTheme.td}>
                        <span className="font-extrabold text-gray-900">{(r as any).requestNo}</span>
                      </td>

                      <td className={tableTheme.td}>{r.__typeLabel}</td>

                      <td className={tableTheme.td}>
                        {normTime((r as any).startAt)} → {normTime((r as any).endAt)}
                      </td>

                      <td className={tableTheme.td}>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>{stText}</span>
                      </td>

                      <td className={tableTheme.td}>{fmtSubmitted(r.__submittedAt)}</td>

                      <td className={tableTheme.td}>
                        {r.__atts.length === 0 ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {r.__atts.map((a, idx) => (
                              <AppButton
                                key={`${a.name}-${idx}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={previewLoading}
                                onClick={() => openPreview(a)}
                                title={a.url || a.storagePath ? "กดเพื่อดูไฟล์" : "ยังไม่มีลิงก์/พาธ"}
                              >
                                📎 {a.name || `ไฟล์ ${idx + 1}`}
                              </AppButton>
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
      </div>

        {filteredRows.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            * หมายเหตุ/เหตุผลแสดงในปฏิทินรายละเอียดรายวันด้วย
          </div>
        )}
      </div>
    </div>
  );
}
