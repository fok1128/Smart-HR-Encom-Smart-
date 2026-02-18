import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import AppButton from "../../components/common/AppButton";
import { inputTheme } from "../../components/ui/theme/inputTheme";
import { useAuth } from "../../context/AuthContext";
import {
  createAnnouncement,
  createAnnouncementWithFile,
  listenAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
  setAnnouncementPinned,
  uploadAnnouncementFile,
  getAnnouncementSignedUrl,
  Announcement,
} from "../../services/announcements";

/* ---------------- helpers ---------------- */
function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function toDateMaybe(ts: any): Date | null {
  const d = ts?.toDate?.();
  return d instanceof Date ? d : null;
}

function tsToMs(ts: any): number {
  const d = toDateMaybe(ts);
  return d ? d.getTime() : 0;
}

function formatTs(ts: any) {
  const d = toDateMaybe(ts);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ---------------- UI: Modal ---------------- */
function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  footer,
  disableClose,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  disableClose?: boolean;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={() => {
        if (!disableClose) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl bg-white p-5 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </div>
            {subtitle ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            disabled={disableClose}
            className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            ปิด
          </button>
        </div>

        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---------------- UI: Center Notice ---------------- */
function CenterNotice({
  open,
  type,
  title,
  message,
  onClose,
}: {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ring-1 ${
          type === "success"
            ? "bg-emerald-50 ring-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:ring-emerald-900/50 dark:text-emerald-100"
            : type === "error"
            ? "bg-red-50 ring-red-200 text-red-900 dark:bg-red-900/30 dark:ring-red-900/50 dark:text-red-100"
            : "bg-white ring-gray-200 text-gray-900 dark:bg-gray-900 dark:ring-gray-800 dark:text-gray-100"
        }`}
      >
        <div className="text-base font-semibold">{title}</div>
        {message ? <div className="mt-1 text-sm opacity-80">{message}</div> : null}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<Announcement[]>([]);

  // ✅ Search/Filter
  const [q, setQ] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);

  // create
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinnedNew, setPinnedNew] = useState(false);
  const [posting, setPosting] = useState(false);

  // ✅ new: file upload (Supabase)
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  // legacy: link attach (ยังให้ใช้ได้ ถ้าจะวางลิงก์)
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFileUrl, setEditFileUrl] = useState(""); // legacy link
  const [editFileName, setEditFileName] = useState(""); // show name
  const [editPinned, setEditPinned] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // ✅ new: replace file in edit
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editUploadPct, setEditUploadPct] = useState(0);

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  // ✅ View details modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Announcement | null>(null);

  // ✅ notice center
  const [notice, setNotice] = useState<{
    open: boolean;
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  }>({ open: false, type: "info", title: "" });

  function showNotice(n: Omit<typeof notice, "open">) {
    setNotice({ open: true, ...n });
    setTimeout(() => setNotice((p) => ({ ...p, open: false })), 2200);
  }

  const canPost = useMemo(() => title.trim() && body.trim(), [title, body]);

  // ✅ สำคัญ: เลื่อนเริ่ม listener หลัง render + จำกัดจำนวน (กันหนักตอน login)
  useEffect(() => {
    if (!user) return;

    let unsub: (() => void) | null = null;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      unsub = listenAnnouncements(
        setItems,
        (msg) => showNotice({ type: "error", title: "โหลดประกาศไม่สำเร็จ", message: msg }),
        { limit: 50 } // ✅ จำกัดจำนวนล่าสุด
      );
    };

    const w = window as any;
    let idleId: any = null;
    let t: any = null;

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(start, { timeout: 1200 });
    } else {
      t = setTimeout(start, 200);
    }

    return () => {
      cancelled = true;
      if (idleId && typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(idleId);
      if (t) clearTimeout(t);
      if (unsub) unsub();
    };
  }, [user?.uid]);

  // ✅ Sort pinned first, then latest
  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return tsToMs(b.createdAt) - tsToMs(a.createdAt);
    });
    return arr;
  }, [items]);

  // ✅ Filter by search + pinned toggle
  const filteredItems = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return sortedItems.filter((a) => {
      if (onlyPinned && !a.pinned) return false;
      if (!keyword) return true;
      const hay =
        `${a.title || ""} ${a.body || ""} ${a.createdBy?.email || ""} ${a.fileName || ""}`.toLowerCase();
      return hay.includes(keyword);
    });
  }, [sortedItems, q, onlyPinned]);

  async function openAttachment(a: Announcement) {
    try {
      // legacy url
      if (a.fileUrl && isValidUrl(a.fileUrl)) {
        openInNewTab(a.fileUrl);
        return;
      }

      // new supabase key
      const key = (a as any)?.fileKey as string | undefined | null;
      if (key) {
        const signed = await getAnnouncementSignedUrl(key); // ✅ ตอนนี้ได้ cache แล้ว
        openInNewTab(signed);
        return;
      }

      showNotice({ type: "info", title: "ไม่มีไฟล์แนบ" });
    } catch (e: any) {
      console.error("openAttachment error:", e);
      showNotice({
        type: "error",
        title: "เปิดไฟล์ไม่ได้",
        message: e?.message || "ลองใหม่อีกครั้ง",
      });
    }
  }

  async function onPost() {
    if (!user) {
      showNotice({ type: "error", title: "ยังไม่ได้เข้าสู่ระบบ" });
      return;
    }
    if (!title.trim() || !body.trim()) {
      showNotice({ type: "error", title: "กรอกหัวเรื่องและเนื้อหาให้ครบ" });
      return;
    }

    if (fileUrl.trim() && !isValidUrl(fileUrl.trim())) {
      showNotice({
        type: "error",
        title: "ลิงก์ไม่ถูกต้อง",
        message: "ต้องขึ้นต้นด้วย http/https",
      });
      return;
    }

    setPosting(true);
    try {
      setUploadPct(0);

      if (file) {
        await createAnnouncementWithFile(
          {
            title: title.trim(),
            body: body.trim(),
            pinned: pinnedNew,
            createdBy: { uid: user.uid, email: user.email || undefined },
          },
          file,
          (p) => setUploadPct(p)
        );
      } else {
        await createAnnouncement({
          title: title.trim(),
          body: body.trim(),
          pinned: pinnedNew,
          createdBy: { uid: user.uid, email: user.email || undefined },
          fileUrl: fileUrl.trim() || null,
          fileName: fileName.trim() || null,
        } as any);
      }

      setTitle("");
      setBody("");
      setPinnedNew(false);
      setFile(null);
      setUploadPct(0);
      setFileUrl("");
      setFileName("");

      showNotice({ type: "success", title: "โพสประกาศแล้ว ✅" });
    } catch (e: any) {
      console.error("POST ANNOUNCEMENT ERROR:", e);
      showNotice({
        type: "error",
        title: "โพสไม่สำเร็จ",
        message: e?.message || "ลองใหม่อีกครั้ง",
      });
    } finally {
      setPosting(false);
    }
  }

  function openEdit(a: Announcement) {
    if (!isAdmin) return;
    setEditId(a.id);
    setEditTitle(a.title || "");
    setEditBody(a.body || "");
    setEditFileUrl(a.fileUrl || "");
    setEditFileName(a.fileName || "");
    setEditPinned(!!a.pinned);

    setEditFile(null);
    setEditUploadPct(0);

    setEditOpen(true);
  }

  function closeEdit() {
    if (savingEdit) return;
    setEditOpen(false);
    setEditId(null);
    setEditTitle("");
    setEditBody("");
    setEditFileUrl("");
    setEditFileName("");
    setEditPinned(false);
    setEditFile(null);
    setEditUploadPct(0);
  }

  async function onSaveEdit() {
    if (!isAdmin || !editId || !user) return;

    if (!editTitle.trim() || !editBody.trim()) {
      showNotice({ type: "error", title: "กรอกหัวเรื่องและเนื้อหาให้ครบ" });
      return;
    }
    if (editFileUrl.trim() && !isValidUrl(editFileUrl.trim())) {
      showNotice({
        type: "error",
        title: "ลิงก์ไม่ถูกต้อง",
        message: "ต้องขึ้นต้นด้วย http/https",
      });
      return;
    }

    setSavingEdit(true);
    try {
      if (editFile) {
        setEditUploadPct(1);
        const up = await uploadAnnouncementFile(user.uid, editFile, (p) => setEditUploadPct(p));
        await updateAnnouncement(editId, {
          title: editTitle.trim(),
          body: editBody.trim(),
          pinned: editPinned,
          fileKey: up.key,
          fileName: up.name,
          fileUrl: null,
        } as any);
      } else {
        await updateAnnouncement(editId, {
          title: editTitle.trim(),
          body: editBody.trim(),
          pinned: editPinned,
          fileUrl: editFileUrl.trim() || null,
          fileName: editFileName.trim() || null,
        } as any);
      }

      showNotice({ type: "success", title: "แก้ไขประกาศแล้ว ✅" });
      closeEdit();
    } catch (e: any) {
      console.error("UPDATE ANNOUNCEMENT ERROR:", e);
      showNotice({
        type: "error",
        title: "แก้ไขไม่สำเร็จ",
        message: e?.message || "ลองใหม่อีกครั้ง",
      });
    } finally {
      setSavingEdit(false);
      setEditUploadPct(0);
    }
  }

  function openDelete(a: Announcement) {
    if (!isAdmin) return;
    setDeleteId(a.id);
    setDeleteTitle(a.title || "");
    setDeleteOpen(true);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteId(null);
    setDeleteTitle("");
  }

  async function onConfirmDelete() {
    if (!isAdmin || !deleteId) return;

    setDeleting(true);
    try {
      await deleteAnnouncement(deleteId);

      showNotice({ type: "success", title: "ลบประกาศแล้ว ✅" });
      closeDelete();
    } catch (e: any) {
      console.error("DELETE ANNOUNCEMENT ERROR:", e);
      showNotice({
        type: "error",
        title: "ลบไม่สำเร็จ",
        message: e?.message || "ลองใหม่อีกครั้ง",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function togglePin(a: Announcement) {
    if (!isAdmin) return;
    try {
      await setAnnouncementPinned(a.id, !a.pinned);
      showNotice({
        type: "success",
        title: !a.pinned ? "ปักหมุดแล้ว 📌" : "ยกเลิกปักหมุดแล้ว",
      });
    } catch (e: any) {
      console.error("PIN ERROR:", e);
      showNotice({ type: "error", title: "ทำรายการไม่สำเร็จ", message: e?.message });
    }
  }

  function openView(a: Announcement) {
    setViewItem(a);
    setViewOpen(true);
  }

  function closeView() {
    setViewOpen(false);
    setViewItem(null);
  }

  return (
    <>
      <PageMeta title="Smart HR - Announcements" description="Announcements feed" />

      <CenterNotice
        open={notice.open}
        type={notice.type}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice((p) => ({ ...p, open: false }))}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
          ข่าวประกาศ
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ประกาศจากผู้ดูแลระบบ (อัปเดตแบบเรียลไทม์)
        </p>
      </div>

      {/* ✅ Search/Filter bar */}
      <div className="mb-6 max-w-5xl">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-end sm:justify-between">
          {/* ซ้าย: label + input */}
          <div className="w-full sm:w-[62%]">
            <div className="text-xs font-semibold text-gray-600">ค้นหาประกาศ</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="พิมพ์คำค้น เช่น ระบบ / ปิดปรับปรุง / link / email"
              className={["mt-1", inputTheme.purple].join(" ")}
            />
          </div>

          {/* ขวา: ปุ่ม 2 อัน */}
          <div className="flex items-center justify-end gap-2 sm:self-end">
            <AppButton
              variant={onlyPinned ? "primary" : "outlinePill"}
              size="md"
              onClick={() => setOnlyPinned((v) => !v)}
            >
              {onlyPinned ? "กำลังดู: ปักหมุด" : "ดูเฉพาะปักหมุด"}
            </AppButton>

            <AppButton
              variant="outlinePill"
              size="md"
              onClick={() => {
                setQ("");
                setOnlyPinned(false);
                showNotice({ type: "info", title: "ล้างตัวกรองแล้ว" });
              }}
            >
              ล้าง
            </AppButton>
          </div>
        </div>
      </div>

      <div className="max-w-5xl space-y-6">
        {/* Create */}
        {isAdmin && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
              สร้างประกาศใหม่
            </div>

            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="หัวเรื่องประกาศ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                className="min-h-[140px] w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="เนื้อหาประกาศ"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />

              {/* pinned */}
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={pinnedNew}
                  onChange={(e) => setPinnedNew(e.target.checked)}
                />
                ปักหมุดประกาศนี้ (แสดงบนสุด)
              </label>

              {/* ✅ File upload (Supabase) */}
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/30">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      เอกสารแนบ (อัปโหลดไฟล์)
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      แนบไฟล์ PDF/รูป/เอกสาร เพื่อเก็บใน Supabase Storage ผ่าน Backend
                    </div>
                  </div>

                  {file ? (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-200 dark:ring-violet-900/40">
                      เลือกไฟล์แล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                      ยังไม่เลือกไฟล์
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <input
                    id="ann-file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {file ? `ไฟล์ที่เลือก: ${file.name}` : "ยังไม่เลือกไฟล์"}
                    </div>
                    {file ? (
                      <div className="text-xs text-gray-500">
                        ขนาดไฟล์: {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <AppButton
                      type="button"
                      variant="outlinePill"
                      size="md"
                      onClick={() => {
                        (document.getElementById("ann-file") as HTMLInputElement | null)?.click();
                      }}
                    >
                      แนบไฟล์
                    </AppButton>

                    {file ? (
                      <AppButton
                        type="button"
                        variant="outlinePill"
                        size="md"
                        onClick={() => {
                          setFile(null);
                          setUploadPct(0);
                        }}
                      >
                        ล้างไฟล์
                      </AppButton>
                    ) : null}
                  </div>
                </div>

                {posting && file ? (
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    กำลังอัปโหลด: {uploadPct}%
                  </div>
                ) : null}
              </div>

              {/* legacy link attach */}
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/30">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  แนบลิงก์ (ตัวเลือกเสริม/ข้อมูลเก่า)
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ใช้ได้ แต่แนะนำอัปโหลดไฟล์ด้านบนเพื่อมาตรฐานเดียวกัน
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input
                    className="sm:col-span-2 w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                    placeholder="ชื่อเอกสาร (ถ้ามี)"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {fileUrl.trim() && isValidUrl(fileUrl.trim()) ? (
                    <a
                      href={fileUrl.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-violet-200 dark:ring-gray-700 dark:hover:bg-gray-800"
                    >
                      ทดลองเปิดลิงก์
                    </a>
                  ) : null}

                  {(fileUrl || fileName) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFileUrl("");
                        setFileName("");
                        showNotice({ type: "info", title: "ล้างลิงก์แล้ว" });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                    >
                      ล้างลิงก์
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={onPost}
                  disabled={posting || !canPost}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {posting ? "กำลังโพส..." : "โพสประกาศ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {filteredItems.map((a) => {
            const hasAttach = !!(a.fileUrl || (a as any).fileKey);
            return (
              <div
                key={a.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {a.title}
                      </h3>
                      {a.pinned ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40">
                          📌 ปักหมุด
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {a.createdAt ? `โพสเมื่อ ${formatTs(a.createdAt)}` : ""}
                      {a.updatedAt ? ` • แก้ไขล่าสุด ${formatTs(a.updatedAt)}` : ""}
                    </div>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
                      {a.body}
                    </p>

                    {hasAttach ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openAttachment(a)}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-violet-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-violet-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                          title="คลิกเพื่อเปิดไฟล์แนบ"
                        >
                          📎 ไฟล์แนบ: {a.fileName || "เปิดไฟล์"}
                        </button>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openView(a)}
                      className="mt-3 inline-flex items-center text-xs font-semibold text-violet-700 hover:underline dark:text-violet-200"
                      title="คลิกเพื่อดูรายละเอียด"
                    >
                      คลิกเพื่ออ่านรายละเอียด →
                    </button>

                  </div>

                  {/* Admin actions */}
                  <div className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>{a.createdBy?.email || "Admin"}</div>

                    {isAdmin && (
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => togglePin(a)}
                          className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40 dark:hover:bg-amber-900/30"
                        >
                          {a.pinned ? "Unpin" : "Pin"}
                        </button>

                        <button
                          onClick={() => openEdit(a)}
                          className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDelete(a)}
                          className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-900/40 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!filteredItems.length && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-800">
              ไม่พบประกาศตามตัวกรอง
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      <Modal
        open={viewOpen}
        title={viewItem?.title || "รายละเอียดประกาศ"}
        subtitle={
          viewItem
            ? `${viewItem.pinned ? "📌 ปักหมุด • " : ""}${
                viewItem.createdAt ? `โพสเมื่อ ${formatTs(viewItem.createdAt)}` : ""
              }`
            : undefined
        }
                onClose={closeView}
          maxWidth="max-w-3xl"
        >
        {viewItem ? (
          <div className="space-y-4">
            <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
              {viewItem.body}
            </div>

            {(viewItem.fileUrl || (viewItem as any).fileKey) ? (
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200 dark:bg-gray-950/30 dark:ring-gray-800">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  เอกสารแนบ
                </div>
                <button
                  type="button"
                  onClick={() => openAttachment(viewItem)}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-violet-200 dark:ring-gray-700 dark:hover:bg-gray-800"
                >
                  เปิดไฟล์: {viewItem.fileName || "ไฟล์แนบ"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title="แก้ไขประกาศ"
        subtitle="แก้เรื่อง/เนื้อหา/ไฟล์แนบ แล้วกดบันทึก"
        onClose={closeEdit}
        disableClose={savingEdit}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeEdit}
              disabled={savingEdit}
              className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
            >
              ยกเลิก
            </button>

            <button
              onClick={onSaveEdit}
              disabled={savingEdit || !editTitle.trim() || !editBody.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
            placeholder="หัวเรื่องประกาศ"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />

          <textarea
            className="min-h-[160px] w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
            placeholder="เนื้อหาประกาศ"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={editPinned}
              onChange={(e) => setEditPinned(e.target.checked)}
            />
            ปักหมุดประกาศนี้
          </label>

          {/* replace file */}
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/30">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              อัปโหลดไฟล์ใหม่แทน (Supabase)
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="file"
                onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              {editFile ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditFile(null);
                    setEditUploadPct(0);
                    showNotice({ type: "info", title: "ล้างไฟล์ใหม่แล้ว" });
                  }}
                  className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                >
                  ล้างไฟล์
                </button>
              ) : null}
            </div>

            {savingEdit && editFile ? (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                กำลังอัปโหลด: {editUploadPct}%
              </div>
            ) : null}

            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              * ถ้าอัปโหลดไฟล์ใหม่ ระบบจะล้างลิงก์เดิม (fileUrl) ให้เอง
            </div>
          </div>

          {/* legacy link */}
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/30">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              เอกสารแนบ (ลิงก์) - ตัวเลือกเสริม
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                className="sm:col-span-2 w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="https://..."
                value={editFileUrl}
                onChange={(e) => setEditFileUrl(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-violet-400/80 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="ชื่อเอกสาร (ถ้ามี)"
                value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {editFileUrl.trim() && isValidUrl(editFileUrl.trim()) ? (
                <a
                  href={editFileUrl.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-violet-200 dark:ring-gray-700 dark:hover:bg-gray-800"
                >
                  ทดลองเปิดลิงก์
                </a>
              ) : null}

              {(editFileUrl || editFileName) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditFileUrl("");
                    setEditFileName("");
                    showNotice({ type: "info", title: "ล้างลิงก์แล้ว" });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                >
                  ล้างลิงก์
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteOpen}
        title="ยืนยันการลบประกาศ"
        subtitle="ลบแล้วกู้คืนไม่ได้"
        onClose={closeDelete}
        disableClose={deleting}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeDelete}
              disabled={deleting}
              className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
            >
              ยกเลิก
            </button>

            <button
              onClick={onConfirmDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleting ? "กำลังลบ..." : "ลบประกาศ"}
            </button>
          </div>
        }
      >
        <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-800 ring-1 ring-gray-200 dark:bg-gray-950/30 dark:text-gray-200 dark:ring-gray-800">
          คุณกำลังจะลบประกาศ:
          <div className="mt-2 font-semibold">{deleteTitle || "(ไม่มีหัวเรื่อง)"}</div>
        </div>
      </Modal>
    </>
  );
}
