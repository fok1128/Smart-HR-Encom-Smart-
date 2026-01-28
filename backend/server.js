require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

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
function initFirebaseAdmin() {
  if (admin.apps.length) return;

  // 1) Render/Prod: service account เป็น JSON string ใน ENV
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let sa;
    try {
      sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON");
      throw e;
    }

    // รองรับทั้งแบบ \n (escaped) และแบบ newline จริง
    if (typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }

    // เช็ค field สำคัญ กันงง
    const required = ["project_id", "client_email", "private_key"];
    const missing = required.filter((k) => !sa[k]);
    if (missing.length) {
      throw new Error(
        `❌ FIREBASE_SERVICE_ACCOUNT missing fields: ${missing.join(", ")}`
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id,
    });

    console.log("✅ Firebase Admin initialized (ENV) project:", sa.project_id);
    return;
  }

  // 2) Local: อ่านจากไฟล์ที่ GOOGLE_APPLICATION_CREDENTIALS ชี้อยู่
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    let sa;
    try {
      sa = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      console.error("❌ Cannot read GOOGLE_APPLICATION_CREDENTIALS file:", p);
      throw e;
    }

    if (typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }

    const required = ["project_id", "client_email", "private_key"];
    const missing = required.filter((k) => !sa[k]);
    if (missing.length) {
      throw new Error(
        `❌ Credential file missing fields: ${missing.join(", ")}`
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id,
    });

    console.log(
      "✅ Firebase Admin initialized (GOOGLE_APPLICATION_CREDENTIALS) project:",
      sa.project_id
    );
    return;
  }

  // 3) fallback (กันพัง แต่ปกติไม่ควรใช้บน Render)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log("✅ Firebase Admin initialized (applicationDefault)");
}

initFirebaseAdmin();
const db = admin.firestore();

// ----------------- Routes -----------------
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
    await ref.set(
      { msg: "hello", at: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    const snap = await ref.get();
    res.json({ ok: true, id: ref.id, data: snap.data() });
  } catch (err) {
    console.error("/test-firestore error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ✅ DEV: ให้ backend สร้าง/อัปเดต users/{uid}
app.post("/dev/seed-user", async (req, res) => {
  try {
    if (process.env.DEV_BYPASS_AUTH !== "true") {
      return res.status(404).json({ ok: false });
    }

    const { uid, employeeNo, role, departmentId, active } = req.body || {};
    if (!uid || !employeeNo) {
      return res
        .status(400)
        .json({ ok: false, error: "uid and employeeNo are required" });
    }

    await db.collection("users").doc(String(uid)).set(
      {
        active: active ?? true,
        employeeNo: String(employeeNo),
        role: role || "USER",
        departmentId: departmentId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      ok: true,
      projectId: admin.app().options.projectId || null,
      uid,
      employeeNo,
    });
  } catch (err) {
    console.error("/dev/seed-user error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

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
      req.user = { uid: String(devUid), email: null, dev: true };
      return next();
    }

    if (!match) return res.status(401).json({ ok: false, error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

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

// ----------------- Listen -----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log("✅ API running on :", port));
