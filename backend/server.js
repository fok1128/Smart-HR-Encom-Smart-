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

// ----------------- ✅ CLAIMS HELPERS -----------------
function normalizeRole(r) {
  const role = String(r || "USER").trim().toUpperCase();
  const allowed = ["USER", "ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"];
  return allowed.includes(role) ? role : "USER";
}

/**
 * ✅ Sync custom claims role ให้ตรงกับ Firestore users/{uid}.role
 * - merge claims เดิม (ไม่ทับของอื่น)
 * - ถ้า role ตรงอยู่แล้ว จะไม่ set ซ้ำ
 */
async function syncRoleClaimFromFirestore(uid) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return { ok: false, changed: false, role: "USER", error: "USER_DOC_NOT_FOUND" };
  }

  const userData = userSnap.data() || {};
  const roleFs = normalizeRole(userData.role);

  const authUser = await admin.auth().getUser(uid);
  const currentClaims = authUser.customClaims || {};
  const roleClaim = normalizeRole(currentClaims.role);

  if (roleClaim === roleFs) {
    return { ok: true, changed: false, role: roleFs };
  }

  const nextClaims = { ...currentClaims, role: roleFs };
  await admin.auth().setCustomUserClaims(uid, nextClaims);

  return { ok: true, changed: true, role: roleFs };
}

// ----------------- Auth Middleware -----------------
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    // ✅ DEV BYPASS
    if (!match && process.env.DEV_BYPASS_AUTH === "true") {
      const devUid = req.query.devUid || req.headers["x-dev-uid"];
      if (!devUid) {
        return res.status(401).json({
          ok: false,
          error: "DEV_BYPASS_AUTH is on. Provide ?devUid=XXX or header x-dev-uid",
        });
      }
      // DEV ให้เป็น ADMIN ไว้ก่อน (ช่วยเทส)
      req.user = { uid: String(devUid), email: null, dev: true, role: "ADMIN" };
      return next();
    }

    if (!match) return res.status(401).json({ ok: false, error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    // ✅ role จาก claim (ถ้ามี)
    const role = normalizeRole(decoded?.role);

    req.user = { ...decoded, role };
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

    // ✅ 1) อ่าน user doc ก่อน
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
    const roleFs = normalizeRole(userData.role || "USER");
    const employeeNo = userData.employeeNo;

    if (!employeeNo) {
      return res.status(400).json({
        ok: false,
        error: "users/{uid} missing employeeNo",
        uid,
        projectId: admin.app().options.projectId || null,
      });
    }

    // ✅ 2) Sync custom claims role ให้ตรงกับ Firestore (ทาง A)
    const claimSync = await syncRoleClaimFromFirestore(uid);

    // ✅ 3) โหลด employee
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

    // ✅ หมายเหตุ: ถ้า claim ถูกเปลี่ยน (changed=true) ฝั่ง client ต้อง getIdToken(true) หรือ logout/login
    return res.json({
      ok: true,
      projectId: admin.app().options.projectId || null,
      uid,
      email: req.user.email || null,

      // ✅ role ที่เชื่อถือได้ = จาก Firestore (และกำลัง sync ไป claim)
      role: roleFs,

      claimSync, // { ok, changed, role } ช่วย debug

      user: { id: userSnap.id, ...userData },
      employee: { id: empSnap.id, ...empSnap.data() },
    });
  } catch (err) {
    console.error("/me error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * ✅ endpoint สำหรับ admin ตั้ง role ให้ user คนอื่น
 * POST /admin/set-role  body: { uid, role }
 * ต้องเป็น ADMIN (จาก claim) เท่านั้น
 */
app.post("/admin/set-role", requireAuth, async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) !== "ADMIN") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_ADMIN_ONLY" });
    }

    const uid = String(req.body?.uid || "").trim();
    const role = normalizeRole(req.body?.role);

    if (!uid) return res.status(400).json({ ok: false, error: "MISSING_UID" });

    // 1) update Firestore
    await db.collection("users").doc(uid).set(
      { role, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // 2) sync claim
    const claimSync = await syncRoleClaimFromFirestore(uid);

    return res.json({ ok: true, uid, role, claimSync });
  } catch (err) {
    console.error("/admin/set-role error:", err);
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

app.post(
  "/files/upload",
  requireAuth,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

      let files = [];
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files && typeof req.files === "object") {
        const f1 = Array.isArray(req.files.file) ? req.files.file : [];
        const f2 = Array.isArray(req.files.files) ? req.files.files : [];
        files = [...f1, ...f2];
      }

      if (!files.length) return res.status(400).json({ ok: false, error: "NO_FILES" });

      const bucket = process.env.SUPABASE_BUCKET || "smart-hr-files";
      const supabase = getSupabase();

      const folder = String(req.body?.folder || "leave").trim() || "leave";
      const basePrefix = folder === "leave" ? "leave_attachments" : folder;

      const attachments = [];

      for (const f of files) {
        const original = safeFileName(f.originalname || "file");
        const key = `${basePrefix}/${uid}/${Date.now()}_${original}`;

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

app.get("/files/signed-url", requireAuth, async (req, res) => {
  try {
    const key = String(req.query.key || "").trim();
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_KEY" });

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
