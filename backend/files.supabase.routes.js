// backend/files.supabase.routes.js
const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const { getSupabase } = require("./supabase");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB/ไฟล์
});

// ✅ เก็บ key ให้ปลอดภัย (ทำเป็น ASCII) แต่ “ชื่อแสดงผล” ให้เป็น UTF-8 จริง
function safeName(name = "file") {
  // เก็บวงเล็บ/จุด/ขีด/ช่องว่างได้
  return String(name).replace(/[^a-zA-Z0-9\-_.() ]/g, "_");
}

// ✅ แก้ชื่อไฟล์ไทยเพี้ยนจาก multer (มักมาเป็น latin1)
function toUtf8Filename(name = "") {
  try {
    return Buffer.from(String(name), "latin1").toString("utf8");
  } catch {
    return String(name || "");
  }
}

function isAllowedMime(mime) {
  return mime === "application/pdf" || String(mime).startsWith("image/");
}

function isBadKey(key) {
  return key.includes("..") || key.includes("\\") || key.includes("//");
}

// ----------------- Auth -----------------
function normalizeRole(r) {
  const role = String(r || "USER").trim().toUpperCase();
  const allowed = ["USER", "ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"];
  return allowed.includes(role) ? role : "USER";
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!match && process.env.DEV_BYPASS_AUTH === "true") {
      const devUid = req.query.devUid || req.headers["x-dev-uid"];
      if (!devUid) {
        return res.status(401).json({
          ok: false,
          error: "DEV_BYPASS_AUTH is on. Provide ?devUid=XXX or header x-dev-uid",
        });
      }
      req.user = { uid: String(devUid), email: null, dev: true, role: "ADMIN" };
      return next();
    }

    if (!match) return res.status(401).json({ ok: false, error: "Missing Bearer token" });

    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = { uid: decoded.uid, email: decoded.email || null, role: normalizeRole(decoded?.role) };
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
  }
}

async function getMyRole(uid) {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  return normalizeRole(snap.data()?.role || "USER");
}

function isApprover(role) {
  return ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"].includes(String(role || "").toUpperCase());
}

// ----------------- Folder -> Prefix -----------------
const ALLOWED_PREFIXES = new Set([
  "leave_attachments",
  "announcement",
  "profile",
  "field_work_requests",
  "misc",
]);

const FOLDER_ALIASES = {
  leave: "leave_attachments",
  leave_request: "leave_attachments",
  leave_requests: "leave_attachments",
  "leave-requests": "leave_attachments",
  leave_attachments: "leave_attachments",

  announcement: "announcement",
  announcements: "announcement",

  profile: "profile",
  user: "profile",
  users: "profile",
  avatar: "profile",

  fieldwork: "field_work_requests",
  field_work: "field_work_requests",
  "field-work": "field_work_requests",
  field_work_request: "field_work_requests",
  field_work_requests: "field_work_requests",
  fieldwork_request: "field_work_requests",
  fieldwork_requests: "field_work_requests",
  "field-work-requests": "field_work_requests",

  misc: "misc",
};

function normalizeFolderToPrefix(input) {
  const raw = String(input || "").trim();
  if (!raw) return "misc";

  if (raw.includes("..") || raw.includes("\\") || raw.includes("//") || raw.includes("/")) {
    return null;
  }

  const lower = raw.toLowerCase();
  const mapped = FOLDER_ALIASES[lower] || lower;

  return ALLOWED_PREFIXES.has(mapped) ? mapped : null;
}

function isAllowedPrefixKey(key) {
  return (
    key.startsWith("leave_attachments/") ||
    key.startsWith("announcement/") ||
    key.startsWith("profile/") ||
    key.startsWith("field_work_requests/") ||
    key.startsWith("misc/")
  );
}

// ----------------- helpers (delete) -----------------
function toStr(x) {
  return typeof x === "string" ? x : "";
}

function readAttachments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return Object.values(raw);
  return [];
}

function attachmentStoragePath(att) {
  if (!att) return "";
  return (
    toStr(att.storagePath) ||
    toStr(att.key) ||
    toStr(att.path) ||
    toStr(att.storage_path) ||
    ""
  );
}

function normalizeKey(inputKey) {
  let k = toStr(inputKey).trim();
  if (!k) return "";

  // ถ้าเผลอส่งมาเป็น "<bucket>/<key>"
  const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
  if (k.startsWith(bucket + "/")) k = k.slice(bucket.length + 1);

  // ตัด / นำหน้า
  k = k.replace(/^\/+/, "");
  return k;
}

// ----------------- Upload -----------------
/**
 * POST /files/upload
 * form-data:
 * - file / files
 * - folder
 */
router.post(
  "/upload",
  requireAuth,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const uid = String(req.user?.uid || "");
      if (!uid) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

      const prefix = normalizeFolderToPrefix(req.body?.folder);

      // ✅ จำกัดสิทธิ์การอัปโหลดไฟล์ประกาศ: ADMIN / HR เท่านั้น
      const role = await getMyRole(uid);
      if (prefix === "announcement" && !["ADMIN", "HR"].includes(role)) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN_ROLE" });
      }
      if (!prefix) return res.status(400).json({ ok: false, error: "FOLDER_NOT_ALLOWED" });

      const pickedSingle = req.files?.file?.[0] ? [req.files.file[0]] : [];
      const pickedMulti = Array.isArray(req.files?.files) ? req.files.files : [];
      const files = [...pickedSingle, ...pickedMulti];

      if (!files.length) return res.status(400).json({ ok: false, error: "NO_FILES" });

      const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
      const supabase = getSupabase();

      const out = [];

      for (const f of files) {
        if (!isAllowedMime(f.mimetype)) {
          return res.status(400).json({ ok: false, error: "FILE_TYPE_NOT_ALLOWED" });
        }

        const originalUtf8 = toUtf8Filename(f.originalname || "file");
        const safeOriginal = safeName(originalUtf8 || "file");
        const key = `${prefix}/${uid}/${Date.now()}_${safeOriginal}`;

        if (isBadKey(key)) {
          return res.status(400).json({ ok: false, error: "INVALID_KEY" });
        }

        const { error: upErr } = await supabase.storage.from(bucket).upload(key, f.buffer, {
          contentType: f.mimetype || "application/octet-stream",
          upsert: false,
        });

        if (upErr) {
          return res.status(500).json({ ok: false, error: `UPLOAD_FAILED: ${upErr.message}` });
        }

        out.push({
          name: originalUtf8,
          size: f.size,
          storagePath: key,
          contentType: f.mimetype,
        });
      }

      if (out.length === 1 && pickedSingle.length === 1 && pickedMulti.length === 0) {
        const a = out[0];
        return res.json({
          ok: true,
          key: a.storagePath,
          name: a.name,
          size: a.size,
          contentType: a.contentType,
          attachments: out,
        });
      }

      return res.json({ ok: true, attachments: out });
    } catch (e) {
      console.error("/files/upload error:", e);
      return res.status(500).json({ ok: false, error: e?.message || "UPLOAD_FAILED" });
    }
  }
);

/**
 * GET /files/signed-url?key=...
 */
router.get("/signed-url", requireAuth, async (req, res) => {
  try {
    const key = String(req.query.key || "").trim();
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_KEY" });

    if (isBadKey(key)) {
      return res.status(400).json({ ok: false, error: "INVALID_KEY" });
    }

    if (!isAllowedPrefixKey(key)) {
      return res.status(403).json({ ok: false, error: "KEY_NOT_ALLOWED" });
    }

    const uid = String(req.user?.uid || "");
    if (!uid) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const role = await getMyRole(uid);
    const isOwner = key.includes(`/${uid}/`);

    if (key.startsWith("announcement/")) {
      // ทุกคนที่ login เปิดได้
    } else if (key.startsWith("leave_attachments/")) {
      if (!isOwner && !isApprover(role)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    } else if (key.startsWith("field_work_requests/")) {
      if (!isOwner && !isApprover(role)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    } else if (key.startsWith("profile/")) {
      if (!isOwner) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    } else if (key.startsWith("misc/")) {
      if (!isOwner && !isApprover(role)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
    const supabase = getSupabase();

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 5);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({ ok: true, signedUrl: data.signedUrl });
  } catch (e) {
    console.error("/files/signed-url error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "SIGNED_URL_FAILED" });
  }
});

/**
 * POST /files/delete
 * body: { requestId, key | storagePath }
 *
 * ✅ ใช้สำหรับ “ลบไฟล์แนบในหน้าแก้ไขคำร้อง”
 * - owner-check: ต้องเป็นเจ้าของ leave_requests/{requestId}.uid เท่านั้น
 * - key-check: key ต้องอยู่ใน attachments จริง
 * - ลบใน Supabase แล้วอัปเดต attachments ใน Firestore
 */
router.post("/delete", requireAuth, async (req, res) => {
  try {
    const uid = String(req.user?.uid || "");
    if (!uid) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const requestId = String(req.body?.requestId || "").trim();
    const keyInput = req.body?.key ?? req.body?.storagePath ?? req.body?.path;
    const key = normalizeKey(keyInput);

    if (!requestId || !key) {
      return res.status(400).json({
        ok: false,
        error: "BAD_REQUEST",
        message: "requestId and key/storagePath are required",
      });
    }

    if (isBadKey(key)) return res.status(400).json({ ok: false, error: "INVALID_KEY" });

    // ✅ จำกัดให้ลบได้เฉพาะไฟล์แนบใบลา
    if (!key.startsWith("leave_attachments/")) {
      return res.status(403).json({ ok: false, error: "KEY_NOT_ALLOWED" });
    }

    const db = admin.firestore();
    const ref = db.collection("leave_requests").doc(requestId);
    const snap = await ref.get();

    if (!snap.exists) return res.status(404).json({ ok: false, error: "LEAVE_NOT_FOUND" });

    const doc = snap.data() || {};
    const ownerUid = String(doc.uid || "");

    if (!ownerUid || ownerUid !== uid) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_ONLY" });
    }

    const attachments = readAttachments(doc.attachments);
    const idx = attachments.findIndex((a) => normalizeKey(attachmentStoragePath(a)) === key);

    if (idx < 0) {
      return res.status(400).json({
        ok: false,
        error: "KEY_NOT_IN_DOC",
        message: "Key not found in leave request attachments",
      });
    }

    const target = attachments[idx];

    const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
    const supabase = getSupabase();

    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) {
      return res.status(500).json({
        ok: false,
        error: "SUPABASE_DELETE_FAILED",
        message: error.message || String(error),
      });
    }

    const remaining = attachments.filter((_, i) => i !== idx);

    await ref.update({
      attachments: remaining,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      ok: true,
      deleted: {
        key,
        name: target?.name || target?.filename || null,
        size: target?.size || null,
      },
      remaining,
      remainingCount: remaining.length,
    });
  } catch (e) {
    console.error("/files/delete error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "DELETE_FAILED" });
  }
});

module.exports = router;