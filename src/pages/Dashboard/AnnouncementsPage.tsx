import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import {
  createAnnouncement,
  listenAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
  setAnnouncementPinned,
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
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [pinnedNew, setPinnedNew] = useState(false); // ✅ NEW
  const [posting, setPosting] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editFileName, setEditFileName] = useState("");
  const [editPinned, setEditPinned] = useState(false); // ✅ NEW
  const [savingEdit, setSavingEdit] = useState(false);

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

  useEffect(() => {
    const unsub = listenAnnouncements(setItems);
    return () => unsub();
  }, []);

  // ✅ Sort pinned first, then latest (client-side, no index)
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
        `${a.title || ""} ${a.body || ""} ${a.createdBy?.email || ""}`.toLowerCase();
      return hay.includes(keyword);
    });
  }, [sortedItems, q, onlyPinned]);

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
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        fileUrl: fileUrl.trim() || null,
        fileName: fileName.trim() || null,
        pinned: pinnedNew, // ✅ NEW
        createdBy: { uid: user.uid, email: user.email || undefined },
      });

      setTitle("");
      setBody("");
      setFileUrl("");
      setFileName("");
      setPinnedNew(false);

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
  }

  async function onSaveEdit() {
    if (!isAdmin || !editId) return;

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
      await updateAnnouncement(editId, {
        title: editTitle.trim(),
        body: editBody.trim(),
        fileUrl: editFileUrl.trim() || null,
        fileName: editFileName.trim() || null,
        pinned: editPinned,
      });

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
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              ค้นหาประกาศ
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="พิมพ์คำค้น เช่น ระบบ / ปิดปรับปรุง / link / email"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyPinned((v) => !v)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ${
                onlyPinned
                  ? "bg-cyan-600 text-white ring-cyan-600"
                  : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              {onlyPinned ? "กำลังดู: ปักหมุด" : "ดูเฉพาะปักหมุด"}
            </button>

            <button
              onClick={() => {
                setQ("");
                setOnlyPinned(false);
                showNotice({ type: "info", title: "ล้างตัวกรองแล้ว" });
              }}
              className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
            >
              ล้าง
            </button>
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
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="หัวเรื่องประกาศ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                className="min-h-[140px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
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

              {/* Link attach (pretty) */}
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/30">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      เอกสารแนบ (ลิงก์)
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      วางลิงก์ Google Drive / OneDrive / PDF URL ได้ (ไม่จำเป็น)
                    </div>
                  </div>

                  {fileUrl.trim() ? (
                    <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-200 dark:ring-cyan-900/40">
                      มีลิงก์แนบแล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                      ยังไม่แนบ
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input
                    className="sm:col-span-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-cyan-200 dark:ring-gray-700 dark:hover:bg-gray-800"
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
                  className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {posting ? "กำลังโพส..." : "โพสประกาศ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {filteredItems.map((a) => (
        <div
            key={a.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {/* ✅ จากเดิมเป็น <button> ครอบทั้งหมด -> เปลี่ยนเป็น <div> */}
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
               {a.fileUrl ? (
                <div className="mt-3">
                    {isValidUrl(a.fileUrl) ? (
                    <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-cyan-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                        title="คลิกเพื่อเปิดลิงก์"
                    >
                        แนบลิงก์: {a.fileName || "ลิงก์ดาวน์โหลด"}
                    </a>
                    ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-900/40">
                        ลิงก์ไม่ถูกต้อง
                    </span>
                    )}
                </div>
                ) : null}


                {/* ✅ คลิกได้เฉพาะตรงนี้ (ปากกาสีเขียว) */}
                <button
                type="button"
                onClick={() => openView(a)}
                className="mt-3 inline-flex items-center text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-200"
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
        ))}


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

            {viewItem.fileUrl ? (
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200 dark:bg-gray-950/30 dark:ring-gray-800">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  เอกสารแนบ
                </div>
                <a
                  href={viewItem.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-cyan-200 dark:ring-gray-700 dark:hover:bg-gray-800"
                >
                  เปิดลิงก์: {viewItem.fileName || viewItem.fileUrl}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title="แก้ไขประกาศ"
        subtitle="แก้เรื่อง/เนื้อหา/ลิงก์เอกสาร แล้วกดบันทึก"
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
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
            placeholder="หัวเรื่องประกาศ"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />

          <textarea
            className="min-h-[160px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
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

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/30">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              เอกสารแนบ (ลิงก์)
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                className="sm:col-span-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="https://..."
                value={editFileUrl}
                onChange={(e) => setEditFileUrl(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-cyan-200 dark:ring-gray-700 dark:hover:bg-gray-800"
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
