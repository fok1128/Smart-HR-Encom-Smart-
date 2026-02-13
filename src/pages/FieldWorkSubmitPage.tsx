// src/pages/FieldWorkSubmitPage.tsx
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { useDialogCenter } from "../components/common/DialogCenter";
import {
  createFieldWorkRequestWithFiles,
  uploadFieldWorkFiles,
  type FieldWorkAttachment,
  type FieldWorkSubmitter,
} from "../services/fieldWorkRequests";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODateTimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function isValidDTLocal(s: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s);
}
function formatKB(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

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

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);

    setFiles((prev) => {
      const key = (f: File) => `${f.name}_${f.size}`;
      const prevSet = new Set(prev.map(key));
      const next = [...prev];
      for (const f of picked) {
        if (!prevSet.has(key(f))) next.push(f);
      }
      return next;
    });

    setUploaded([]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setUploaded([]);
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
        submitter, // snapshot ผู้ยื่น
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
    } catch (e: any) {
      const m = e?.message || String(e);
      setErr(m);
      await dialog.alert(m, { title: "บันทึกไม่สำเร็จ", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  const hasPendingFiles = files.length > 0 && uploaded.length === 0;

  // ✅ กันเคส user หลุด: เคลียร์ error ทุกครั้งที่ login เปลี่ยน
  useEffect(() => {
    setErr("");
  }, [user?.uid]);

  return (
    <>
      <PageMeta title="Field Work | Smart HR" description="Field work submit page" />
      <PageBreadcrumb pageTitle="แจ้งปฏิบัติงานนอกสถานที่" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">แจ้งปฏิบัติงานนอกสถานที่</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">บันทึกแล้ว “อนุมัติอัตโนมัติ” (ไม่ต้องให้ผู้อนุมัติกด)</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">สถานที่/หน่วยงาน</label>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              placeholder="เช่น โรงงานสาขา A / ลูกค้า XYZ / หน่วยงานภายนอก"
            />
          </div>
          <div />

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">วัน/เวลาเริ่มต้น</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => {
                const v = e.target.value;
                setStartAt(v);
                if (endAt && v && endAt < v) setEndAt(v);
              }}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">วัน/เวลาสิ้นสุด</label>
            <input
              type="datetime-local"
              min={startAt || undefined}
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">หมายเหตุ (ถ้ามี)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              placeholder="รายละเอียดงาน / ผู้ติดต่อ / อื่นๆ"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">ไฟล์แนบ (PDF/รูปภาพ)</label>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
                เลือกไฟล์
                <input type="file" className="hidden" multiple accept="application/pdf,image/*" onChange={(e) => onPickFiles(e.target.files)} />
              </label>

              <button
                type="button"
                disabled={!files.length || uploading}
                onClick={onUploadFiles}
                className="h-11 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-900/40 dark:bg-brand-900/10 dark:text-brand-200 dark:hover:bg-brand-900/20"
              >
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}
              </button>

              {uploaded.length > 0 ? (
                <span className="text-xs font-semibold text-green-600 dark:text-green-300">อัปโหลดแล้ว {uploaded.length} ไฟล์ ✅</span>
              ) : (
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">เลือกได้หลายไฟล์ • แนะนำกด “อัปโหลดไฟล์” ก่อนบันทึก</span>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                    <tr>
                      <th className="px-3 py-2 font-semibold">ไฟล์</th>
                      <th className="px-3 py-2 font-semibold">ขนาด</th>
                      <th className="px-3 py-2 font-semibold">สถานะ</th>
                      <th className="px-3 py-2 font-semibold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {files.map((f, idx) => (
                      <tr key={`${f.name}-${idx}`}>
                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">{f.name}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{formatKB(f.size)}</td>
                        <td className="px-3 py-2">
                          {uploaded.length > 0 ? (
                            <span className="text-xs font-semibold text-green-600 dark:text-green-300">อัปโหลดแล้ว</span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">รออัปโหลด</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200 dark:hover:bg-red-900/20"
                          >
                            ลบ
                          </button>
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

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {err}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={saving || uploading}
            onClick={onSubmit}
            className="h-11 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก (อนุมัติอัตโนมัติ)"}
          </button>
        </div>
      </div>
    </>
  );
}
