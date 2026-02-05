const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const { supabase, SUPABASE_BUCKET } = require("./supabase");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9\-_.]/g, "_");
}

function isAllowedMime(mime) {
  return mime === "application/pdf" || String(mime).startsWith("image/");
}

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) return res.status(401).json({ ok: false, error: "NO_TOKEN" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
  }
}

async function getMyRole(uid) {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  return String(snap.data()?.role || "").toUpperCase();
}
function isApprover(role) {
  return ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"].includes(role);
}

/**
 * POST /files/upload
 * form-data:
 * - file: File
 * - folder: leave | announcement | profile
 */
router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const folder = String(req.body.folder || "misc");

    if (!file) return res.status(400).json({ ok: false, error: "NO_FILE" });
    if (!isAllowedMime(file.mimetype)) {
      return res.status(400).json({ ok: false, error: "FILE_TYPE_NOT_ALLOWED" });
    }

    const max = 25 * 1024 * 1024; // 25MB
    if (file.size > max) return res.status(400).json({ ok: false, error: "FILE_TOO_LARGE" });

    const uid = req.user.uid;
    const key = `${folder}/${uid}/${Date.now()}-${safeName(file.originalname)}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(key, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({
      ok: true,
      key,
      name: file.originalname,
      size: file.size,
      contentType: file.mimetype,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "UPLOAD_FAILED" });
  }
});

/**
 * GET /files/signed-url?key=...
 * คืนลิงก์หมดอายุ เช่น 60 วิ
 */
router.get("/signed-url", requireAuth, async (req, res) => {
  try {
    const key = String(req.query.key || "");
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_KEY" });

    const uid = req.user.uid;
    const role = await getMyRole(uid);

    // owner (มี /uid/) หรือ approver
    const isOwner = key.includes(`/${uid}/`);
    if (!isOwner && !isApprover(role)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(key, 60);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({ ok: true, signedUrl: data.signedUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "SIGNED_URL_FAILED" });
  }
});

module.exports = router;
