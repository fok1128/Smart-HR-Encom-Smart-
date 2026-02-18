require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// ----------------- Express -----------------
const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : true;

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
// app.options("*", cors(corsOptions)); ❌ ทำให้พังกับ path-to-regexp บางเวอร์ชัน
app.options(/.*/, cors(corsOptions)); // ✅ ตอบ OPTIONS ทุก path

// (เสริม) บาง proxy แปลก ๆ ชอบลืม maxAge ใส่ซ้ำให้ชัวร์
app.use((req, res, next) => {
  res.setHeader("Access-Control-Max-Age", "86400");
  next();
});

app.use(express.json());

// ----------------- Firebase Admin Init -----------------
function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  }

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

// ----------------- ✅ HELPERS -----------------
function normalizeRole(r) {
  const role = String(r || "USER").trim().toUpperCase();
  const allowed = ["USER", "ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"];
  return allowed.includes(role) ? role : "USER";
}

function pickStr(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function isHttpUrl(s) {
  return /^https?:\/\//i.test(String(s || "").trim());
}

/**
 * ✅ normalize avatar จาก doc (รองรับหลายชื่อ field)
 * - ได้ทั้ง avatarUrl (ต้องเป็น https://) และ avatarPath/storagePath (เช่น profile/xxx.jpg)
 */
function normalizeAvatarFromDoc(doc = {}) {
  const avatarUrlMaybe = pickStr(
    doc.avatarUrl,
    doc.photoURL,
    doc.photoUrl,
    doc.profilePhoto,
    doc.avatar?.url
  );

  const avatarPathMaybe = pickStr(
    doc.avatarPath,
    doc.storagePath,
    doc.avatar?.storagePath,
    doc.avatar?.path,
    doc.avatar?.key
  );

  // ถ้า avatarUrl เป็น URL จริง ใช้เป็น url
  const url = isHttpUrl(avatarUrlMaybe) ? avatarUrlMaybe : "";

  // ถ้า avatarUrl ไม่ใช่ URL (บางคนเก็บเป็น path) ให้โยนไปเป็น path
  const path = avatarPathMaybe || (!isHttpUrl(avatarUrlMaybe) ? pickStr(avatarUrlMaybe) : "");

  return {
    avatarUrl: url || undefined,
    avatarPath: path || undefined,
    storagePath: path || undefined,
    avatar: {
      url: url || undefined,
      storagePath: path || undefined,
      path: path || undefined,
    },
  };
}

// ----------------- ✅ CLAIMS HELPERS -----------------
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
    if (req.method === "OPTIONS") return res.sendStatus(204);

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
      req.user = { uid: String(devUid), email: null, dev: true, role: "ADMIN" };
      return next();
    }

    if (!match) return res.status(401).json({ ok: false, error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    const role = normalizeRole(decoded?.role);
    req.user = { ...decoded, role };
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

// ----------------- Basic Routes -----------------
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

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

// ----------------- /me (✅ FIX) -----------------
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

    const claimSync = await syncRoleClaimFromFirestore(uid);

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

    const empData = empSnap.data() || {};

    // ✅ normalize avatar จาก doc ทั้งสองฝั่ง
    const userAvatar = normalizeAvatarFromDoc(userData);
    const empAvatar = normalizeAvatarFromDoc(empData);

    // ✅ ให้ employee ชนะ ถ้ามีค่า
    const avatarUrl = pickStr(empAvatar.avatarUrl, userAvatar.avatarUrl);
    const avatarPath = pickStr(empAvatar.avatarPath, userAvatar.avatarPath);

    return res.json({
      ok: true,
      projectId: admin.app().options.projectId || null,
      uid,
      email: req.user.email || null,
      role: roleFs,
      claimSync,

      // ✅ top-level ใช้ง่ายสุดสำหรับ frontend/header
      avatarUrl: avatarUrl || undefined,
      avatarPath: avatarPath || undefined,
      storagePath: avatarPath || undefined,
      avatar: {
        url: avatarUrl || undefined,
        storagePath: avatarPath || undefined,
        path: avatarPath || undefined,
      },

      // ✅ keep original docs ด้วย แต่ใส่ normalized avatar ซ้ำให้ด้วย
      user: { id: userSnap.id, ...userData, ...userAvatar },
      employee: { id: empSnap.id, ...empData, ...empAvatar },
    });
  } catch (err) {
    console.error("/me error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * ✅ endpoint สำหรับ admin ตั้ง role ให้ user คนอื่น
 * POST /admin/set-role  body: { uid, role }
 */
app.post("/admin/set-role", requireAuth, async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) !== "ADMIN") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_ADMIN_ONLY" });
    }

    const uid = String(req.body?.uid || "").trim();
    const role = normalizeRole(req.body?.role);

    if (!uid) return res.status(400).json({ ok: false, error: "MISSING_UID" });

    await db.collection("users").doc(uid).set(
      { role, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    const claimSync = await syncRoleClaimFromFirestore(uid);
    return res.json({ ok: true, uid, role, claimSync });
  } catch (err) {
    console.error("/admin/set-role error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ----------------- ✅ Files Router (Supabase) -----------------
const filesRouter = require("./files.supabase.routes");
app.use("/files", filesRouter);

// ----------------- Listen -----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log("✅ API running on :", port));
