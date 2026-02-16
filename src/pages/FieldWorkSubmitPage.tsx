// src/pages/FieldWorkSubmitPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";
import AppButton from "../components/common/AppButton";
import {
  createFieldWorkRequestWithFiles,
  uploadFieldWorkFiles,
  type FieldWorkAttachment,
  type FieldWorkSubmitter,
} from "../services/fieldWorkRequests";

// ✅ ใช้ธีม input จริงของโปรเจกต์
import { inputTheme } from "../components/ui/theme/inputTheme";
// ✅ ถ้าไฟล์นี้อยู่คนละ path ปรับให้ตรง
import { tableTheme } from "../components/ui/theme/tableTheme";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODateTimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}
function isValidDTLocal(s: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s);
}
function formatKB(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const MAX_FILE_MB = 10;
const MAX_FILES = 10;

export default function FieldWorkSubmitPage() {
  const { user } = useAuth() as any;
  const dialog = useDialogCenter();

  const now = useMemo(() => new Date(), []);
  const [startAt, setStartAt] = useState<string>(toISODateTimeLocal(now));
  const [endAt, setEndAt] = useState<string>(toISODateTimeLocal(now));
  const [place, setPlace] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<FieldWorkAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + (f?.size || 0), 0), [files]);
  const hasPendingFiles = files.length > 0 && uploaded.length === 0;

  function validate(): string {
    if (!user?.uid) return "ยังไม่เข้าสู่ระบบ";
    if (!place.trim()) return "กรุณากรอกสถานที่/หน่วยงานที่ไปปฏิบัติงาน";
    if (!isValidDTLocal(startAt)) return "วันเวลาเริ่มต้นไม่ถูกต้อง";
    if (!isValidDTLocal(endAt)) return "วันเวลาสิ้นสุดไม่ถูกต้อง";
    const s = new Date(startAt);
    const e = new Date(endAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "ช่วงเวลาไม่ถูกต้อง";
    if (e.getTime() < s.getTime()) return "วัน/เวลาสิ้นสุดต้องไม่ก่อนวัน/เวลาเริ่มต้น";
    return "";
  }

  function isAllowedMime(m: string) {
    return m === "application/pdf" || String(m).startsWith("image/");
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    setErr("");

    const picked = Array.from(list);
    const next: File[] = [];
    const problems: string[] = [];

    for (const f of picked) {
      if (!isAllowedMime(f.type)) {
        problems.push(`ไฟล์ "${f.name}" ชนิดไม่รองรับ`);
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        problems.push(`ไฟล์ "${f.name}" ใหญ่เกิน ${MAX_FILE_MB}MB`);
        continue;
      }
      next.push(f);
    }

    setFiles((prev) => {
      const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`;
      const prevSet = new Set(prev.map(key));
      const merged = [...prev];

      for (const f of next) {
        if (merged.length >= MAX_FILES) break;
        if (!prevSet.has(key(f))) merged.push(f);
      }

      if (prev.length + next.length > MAX_FILES) {
        problems.push(`เลือกไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์`);
      }

      return merged;
    });

    setUploaded([]);

    if (problems.length) {
      dialog.alert(problems.join("\n"), { title: "ไฟล์บางรายการไม่ถูกเพิ่ม", variant: "warning" });
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setUploaded([]);
  }

  function clearFiles() {
    setFiles([]);
    setUploaded([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onUploadFiles() {
    setErr("");
    if (!files.length) {
      await dialog.alert("ยังไม่ได้เลือกไฟล์", { title: "อัปโหลดไม่สำเร็จ", variant: "danger" });
      return;
    }

    setUploading(true);
    try {
      const attachments = await uploadFieldWorkFiles(files);
      setUploaded(attachments);

      await dialog.success(`อัปโหลดไฟล์แนบแล้ว ${attachments.length} ไฟล์`, {
        title: "อัปโหลดสำเร็จ",
      });
    } catch (e: any) {
      const m = e?.message || String(e);
      setErr(m);
      await dialog.alert(m, { title: "อัปโหลดไม่สำเร็จ", variant: "danger" });
    } finally {
      setUploading(false);
    }
  }

  // ✅ สร้าง submitter snapshot จาก AuthContext.user
  function buildSubmitter(): FieldWorkSubmitter | null {
    const uid = String(user?.uid || "").trim();
    if (!uid) return null;

    const fname = String(user?.fname || "").trim();
    const lname = String(user?.lname || "").trim();
    const fullName = `${fname} ${lname}`.trim();

    const phone = String(user?.phone || "").trim() || undefined;
    const employeeNo = String(user?.employeeNo || "").trim() || undefined;
    const role = String(user?.role || "").trim() || undefined;

    return {
      uid,
      email: user?.email ?? null,
      fname: fname || undefined,
      lname: lname || undefined,
      fullName: fullName || user?.email || uid,
      phone,
      employeeNo,
      role,
    };
  }

  async function onSubmit() {
    setErr("");
    const msg = validate();
    if (msg) {
      setErr(msg);
      await dialog.alert(msg, { title: "บันทึกไม่สำเร็จ", variant: "danger" });
      return;
    }

    setSaving(true);
    try {
      const submitter = buildSubmitter();

      const result = await createFieldWorkRequestWithFiles({
        uid: user!.uid,
        email: user?.email ?? null,
        submitter,
        startAt,
        endAt,
        place: place.trim(),
        note: note.trim(),
        attachments: uploaded.length ? uploaded : undefined,
        files: !uploaded.length ? files : undefined,
      });

      await dialog.success(`เลขคำร้อง ${result.requestNo} • ไฟล์แนบ ${result.attachmentsCount ?? 0} ไฟล์`, {
        title: "บันทึกสำเร็จ",
      });

      setPlace("");
      setNote("");
      setFiles([]);
      setUploaded([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      const m = e?.message || String(e);
      setErr(m);
      await dialog.alert(m, { title: "บันทึกไม่สำเร็จ", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setErr("");
  }, [user?.uid]);

  return (
    <>
      <PageMeta title="Field Work | Smart HR" description="Field work submit page" />
      <PageBreadcrumb pageTitle="แจ้งปฏิบัติงานนอกสถานที่" />

      {/* ✅ เหลือกรอบเดียว ไม่ซ้อน */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">แจ้งปฏิบัติงานนอกสถานที่</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              บันทึกแล้ว “อนุมัติอัตโนมัติ” (ไม่ต้องให้ผู้อนุมัติกด)
            </p>
          </div>

          <AppButton
            variant="outline"
            disabled={saving || uploading || (!place && !note && !files.length)}
            onClick={async () => {
              if (saving || uploading) return;
              const ok = await dialog.confirm("ต้องการล้างฟอร์มทั้งหมดหรือไม่?", {
                title: "ยืนยันการล้างฟอร์ม",
                variant: "warning",
                confirmText: "ล้างฟอร์ม",
                cancelText: "ยกเลิก",
              });
              if (!ok) return;

              setPlace("");
              setNote("");
              setStartAt(toISODateTimeLocal(new Date()));
              setEndAt(toISODateTimeLocal(new Date()));
              clearFiles();
              setErr("");
            }}
          >
            ล้างฟอร์ม
          </AppButton>
        </div>

        {/* Form */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">สถานที่/หน่วยงาน</label>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={`${inputTheme.purple} mt-2`}
              placeholder="เช่น โรงงานสาขา A / ลูกค้า XYZ / หน่วยงานภายนอก"
            />
          </div>
          <div />

          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">วัน/เวลาเริ่มต้น</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => {
                const v = e.target.value;
                setStartAt(v);
                if (endAt && v && endAt < v) setEndAt(v);
              }}
              className={`${inputTheme.control} mt-2`}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">วัน/เวลาสิ้นสุด</label>
            <input
              type="datetime-local"
              min={startAt || undefined}
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={`${inputTheme.control} mt-2`}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">หมายเหตุ (ถ้ามี)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className={`${inputTheme.textarea} mt-2 min-h-[92px]`}
              placeholder="รายละเอียดงาน / ผู้ติดต่อ / อื่นๆ"
            />
          </div>

          {/* Attachments */}
          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">ไฟล์แนบ (PDF/รูปภาพ)</label>

            {/* ✅ เอาม่วงฟุ้งออก ใช้กรอบเทาเรียบๆ */}
            <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={(e) => onPickFiles(e.target.files)}
                  />

                  <AppButton variant="outline" disabled={saving || uploading} onClick={() => fileInputRef.current?.click()}>
                    เลือกไฟล์
                  </AppButton>

                  <AppButton
                    variant="primary"
                    disabled={!files.length || uploading || saving}
                    loading={uploading}
                    onClick={onUploadFiles}
                  >
                    อัปโหลดไฟล์
                  </AppButton>

                  <AppButton
                    variant="danger"
                    size="sm"
                    disabled={saving || uploading || !files.length}
                    onClick={async () => {
                      const ok = await dialog.confirm("ต้องการลบไฟล์ที่เลือกทั้งหมดหรือไม่?", {
                        title: "ยืนยันการลบไฟล์",
                        variant: "warning",
                        confirmText: "ลบทั้งหมด",
                        cancelText: "ยกเลิก",
                      });
                      if (!ok) return;
                      clearFiles();
                    }}
                  >
                    ลบทั้งหมด
                  </AppButton>
                </div>

                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {files.length ? (
                    <>
                      {files.length} ไฟล์ • รวม {totalBytes >= 1024 * 1024 ? formatMB(totalBytes) : formatKB(totalBytes)} •
                      จำกัด {MAX_FILES} ไฟล์/ไม่เกิน {MAX_FILE_MB}MB ต่อไฟล์
                    </>
                  ) : (
                    <>จำกัด {MAX_FILES} ไฟล์/ไม่เกิน {MAX_FILE_MB}MB ต่อไฟล์</>
                  )}
                </div>
              </div>

              <div className="mt-3">
                {uploaded.length > 0 ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-200">
                    อัปโหลดแล้ว {uploaded.length} ไฟล์ ✅
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    เลือกได้หลายไฟล์ • แนะนำกด “อัปโหลดไฟล์” ก่อนบันทึก (หรือปล่อยให้ระบบอัปโหลดตอนบันทึกได้)
                  </div>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className={tableTheme.table}>
                    <thead className={tableTheme.thead}>
                      <tr>
                        <th className={tableTheme.th}>ไฟล์</th>
                        <th className={tableTheme.th}>ขนาด</th>
                        <th className={tableTheme.th}>สถานะ</th>
                        <th className={`${tableTheme.th} text-right`}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className={tableTheme.tbody}>
                      {files.map((f, idx) => (
                        <tr key={`${f.name}-${f.size}-${f.lastModified}`}>
                          <td className={`${tableTheme.td} font-semibold text-gray-900 dark:text-gray-100`}>{f.name}</td>
                          <td className={tableTheme.td}>{formatKB(f.size)}</td>
                          <td className={tableTheme.td}>
                            {uploaded.length > 0 ? (
                              <span className="text-xs font-semibold text-green-600 dark:text-green-300">อัปโหลดแล้ว</span>
                            ) : (
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">รออัปโหลด</span>
                            )}
                          </td>
                          <td className={`${tableTheme.td} text-right`}>
                            <AppButton variant="danger" size="sm" disabled={saving || uploading} onClick={() => removeFile(idx)}>
                              ลบ
                            </AppButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {hasPendingFiles && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                  ตอนนี้ไฟล์ยัง “รออัปโหลด” อยู่ — ถ้ากดบันทึก ระบบจะอัปโหลดให้ตอนบันทึก (แนะนำกด “อัปโหลดไฟล์” ก่อน)
                </div>
              )}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {err}
          </div>
        )}

        {/* ✅ ปุ่มบันทึกกลับไปขวาล่างเหมือนเดิม */}
        <div className="mt-5 flex justify-end">
          <AppButton variant="primary" disabled={saving || uploading} loading={saving} onClick={onSubmit}>
            บันทึก (อนุมัติอัตโนมัติ)
          </AppButton>
        </div>
      </div>
    </>
  );
}
