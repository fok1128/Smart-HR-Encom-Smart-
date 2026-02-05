require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const multer = require("multer");
const { getSupabase } = require("./supabase");

// ----------------- Express -----------------
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
      : true,
    credentials: true,
  })
);
app.use(express.json());

// ----------------- Firebase Admin Init -----------------
function readServiceAccount() {
  // 1) Render/Prod: service account เป็น JSON string ใน ENV
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  }

  // 2) Local: อ่านจากไฟล์ที่ GOOGLE_APPLICATION_CREDENTIALS ชี้อยู่
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const sa = JSON.parse(fs.readFileSync(p, "utf8"));
    if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  }

  return null;
}

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const sa = readServiceAccount();
  if (sa?.project_id && sa?.client_email && sa?.private_key) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id,
    });
    console.log("✅ Firebase Admin initialized project:", sa.project_id);
    return;
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  console.log("✅ Firebase Admin initialized (applicationDefault)");
}

initFirebaseAdmin();
const db = admin.firestore();

// ----------------- Auth Middleware -----------------
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    // ✅ DEV BYPASS (ห้ามเปิดในโปรดักชัน)
    if (!match && process.env.DEV_BYPASS_AUTH === "true") {
      const devUid = req.query.devUid || req.headers["x-dev-uid"];
      if (!devUid) {
        return res.status(401).json({
          ok: false,
          error: "DEV_BYPASS_AUTH is on. Provide ?devUid=XXX or header x-dev-uid",
        });
      }
      req.user = { uid: String(devUid), email: null, dev: true };
      return next();
    }

    if (!match) return res.status(401).json({ ok: false, error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

// ----------------- Basic Routes -----------------
app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/debug-project", (req, res) => {
  res.json({
    projectId: admin.app().options.projectId || null,
    devBypass: process.env.DEV_BYPASS_AUTH === "true",
  });
});

app.get("/test-firestore", async (req, res) => {
  try {
    const ref = db.collection("test").doc("ping");
    await ref.set({ msg: "hello", at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    const snap = await ref.get();
    res.json({ ok: true, id: ref.id, data: snap.data() });
  } catch (err) {
    console.error("/test-firestore error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ----------------- /me -----------------
app.get("/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "User not found in Firestore: create users/{uid} with role + employeeNo",
        uid,
        projectId: admin.app().options.projectId || null,
      });
    }

    const userData = userSnap.data() || {};
    const role = userData.role || "USER";
    const employeeNo = userData.employeeNo;
    if (!employeeNo) {
      return res.status(400).json({
        ok: false,
        error: "users/{uid} missing employeeNo",
        uid,
        projectId: admin.app().options.projectId || null,
      });
    }

    const empRef = db.collection("employees").doc(employeeNo);
    const empSnap = await empRef.get();
    if (!empSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: `Employee not found: employees/${employeeNo}`,
        employeeNo,
        projectId: admin.app().options.projectId || null,
      });
    }

    return res.json({
      ok: true,
      projectId: admin.app().options.projectId || null,
      uid,
      email: req.user.email || null,
      role,
      user: { id: userSnap.id, ...userData },
      employee: { id: empSnap.id, ...empSnap.data() },
    });
  } catch (err) {
    console.error("/me error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ----------------- Supabase Upload APIs -----------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB/ไฟล์
});

function safeFileName(name = "file") {
  return String(name).replace(/[^\w.\-() ]+/g, "_");
}

function isAllowedMime(mime) {
  return mime === "application/pdf" || String(mime).startsWith("image/");
}

function isBadKey(key) {
  return key.includes("..") || key.includes("\\") || key.includes("//");
}

// ✅ allowlist folder จาก client -> map เป็น prefix ที่เราคุมเอง
function mapFolderToPrefix(folderRaw) {
  const folder = String(folderRaw || "").trim().toLowerCase();

  if (folder === "leave") return "leave_attachments";
  if (folder === "announcement") return "announcement";
  if (folder === "profile") return "profile";

  return null;
}

async function getMyRole(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return String(snap.data()?.role || "").toUpperCase();
}

function isApprover(role) {
  return ["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"].includes(role);
}

function isAllowedPrefix(key) {
  return (
    key.startsWith("leave_attachments/") ||
    key.startsWith("announcement/") ||
    key.startsWith("profile/")
  );
}

/**
 * ✅ POST /files/upload
 * รองรับ:
 * - single: field "file"
 * - multi : field "files"
 *
 * Response:
 * - { ok:true, key, name, size, contentType, attachments:[...] }  (ถ้าอัปไฟล์เดียว)
 * - { ok:true, attachments:[...] }                                (ถ้าอัปหลายไฟล์)
 */
app.post(
  "/files/upload",
  requireAuth,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const uid = String(req.user?.uid || "");
      if (!uid) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

      // multer.fields -> req.files เป็น object: { file:[...], files:[...] }
      let files = [];
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files && typeof req.files === "object") {
        const f1 = Array.isArray(req.files.file) ? req.files.file : [];
        const f2 = Array.isArray(req.files.files) ? req.files.files : [];
        files = [...f1, ...f2];
      }

      if (!files.length) return res.status(400).json({ ok: false, error: "NO_FILES" });

      // ✅ allowlist folder
      const prefix = mapFolderToPrefix(req.body?.folder);
      if (!prefix) return res.status(400).json({ ok: false, error: "FOLDER_NOT_ALLOWED" });

      const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
      const supabase = getSupabase();

      const attachments = [];

      for (const f of files) {
        // ✅ จำกัดชนิดไฟล์ (pdf + image เท่านั้น)
        if (!isAllowedMime(f.mimetype)) {
          return res.status(400).json({ ok: false, error: "FILE_TYPE_NOT_ALLOWED" });
        }

        const original = safeFileName(f.originalname || "file");
        const key = `${prefix}/${uid}/${Date.now()}_${original}`;

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

        attachments.push({
          name: f.originalname,
          size: f.size,
          storagePath: key,
          contentType: f.mimetype,
        });
      }

      // ✅ ถ้าอัป 1 ไฟล์: คืน key แบบตรงๆ ด้วย (กันพังหน้าเก่า)
      if (attachments.length === 1) {
        const a = attachments[0];
        return res.json({
          ok: true,
          key: a.storagePath,
          name: a.name,
          size: a.size,
          contentType: a.contentType,
          attachments,
        });
      }

      return res.json({ ok: true, attachments });
    } catch (err) {
      console.error("/files/upload error:", err);
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }
);

// ✅ GET /files/signed-url?key=...
app.get("/files/signed-url", requireAuth, async (req, res) => {
  try {
    const key = String(req.query.key || "").trim();
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_KEY" });

    if (isBadKey(key)) {
      return res.status(400).json({ ok: false, error: "INVALID_KEY" });
    }

    // ✅ allowlist prefix กันขอของนอกระบบ
    if (!isAllowedPrefix(key)) {
      return res.status(403).json({ ok: false, error: "KEY_NOT_ALLOWED" });
    }

    const uid = String(req.user?.uid || "");
    if (!uid) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const role = await getMyRole(uid);

    // ----------------- POLICY ตาม prefix -----------------
    const isOwner = key.includes(`/${uid}/`);

    // 1) ✅ Announcement: ให้ทุกคนที่ login แล้วเปิดได้
    if (key.startsWith("announcement/")) {
      // ผ่านเลย
    }
    // 2) ✅ Leave attachments: owner หรือ approver เท่านั้น
    else if (key.startsWith("leave_attachments/")) {
      if (!isOwner && !isApprover(role)) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      }
    }
    // 3) ✅ Profile: owner เท่านั้น
    else if (key.startsWith("profile/")) {
      if (!isOwner) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      }
    }

    const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
    const supabase = getSupabase();

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 5);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({ ok: true, signedUrl: data.signedUrl });
  } catch (err) {
    console.error("/files/signed-url error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ----------------- Listen -----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log("✅ API running on :", port));
