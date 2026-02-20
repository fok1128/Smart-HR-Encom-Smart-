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

  const url = isHttpUrl(avatarUrlMaybe) ? avatarUrlMaybe : "";
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
        error: `Employee not found: employees/${employeeNo}`, // ✅ fix string
        employeeNo,
        projectId: admin.app().options.projectId || null,
      });
    }

    const empData = empSnap.data() || {};

    const userAvatar = normalizeAvatarFromDoc(userData);
    const empAvatar = normalizeAvatarFromDoc(empData);

    const avatarUrl = pickStr(empAvatar.avatarUrl, userAvatar.avatarUrl);
    const avatarPath = pickStr(empAvatar.avatarPath, userAvatar.avatarPath);

    return res.json({
      ok: true,
      projectId: admin.app().options.projectId || null,
      uid,
      email: req.user.email || null,
      role: roleFs,
      claimSync,

      avatarUrl: avatarUrl || undefined,
      avatarPath: avatarPath || undefined,
      storagePath: avatarPath || undefined,
      avatar: {
        url: avatarUrl || undefined,
        storagePath: avatarPath || undefined,
        path: avatarPath || undefined,
      },

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

// ----------------- ✅ LEAVE WORKFLOW (2-stage) -----------------
const LEAVE_COL = "leave_requests";

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function asUpper(x) {
  return String(x || "").trim().toUpperCase();
}

function requireRole(req, allow) {
  const r = normalizeRole(req.user?.role);
  if (!allow.includes(r)) {
    const e = new Error("FORBIDDEN_ROLE");
    e.status = 403;
    throw e;
  }
  return r;
}

async function getLeaveOrThrow(id) {
  const ref = db.collection(LEAVE_COL).doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) {
    const e = new Error("LEAVE_NOT_FOUND");
    e.status = 404;
    throw e;
  }
  return { ref, data: snap.data() || {}, id: snap.id };
}

function deriveWorkflowFromLegacy(data) {
  const status = asUpper(data.status);
  const overall = asUpper(data.overallStatus);

  if (overall) return data;

  if (status === "APPROVED") {
    return {
      ...data,
      overallStatus: "APPROVED",
      hrStatus: data.hrStatus || "APPROVED",
      managerStatus: data.managerStatus || "APPROVED",
    };
  }
  if (status === "REJECTED") {
    return {
      ...data,
      overallStatus: "REJECTED_BY_HR",
      hrStatus: data.hrStatus || "REJECTED",
      managerStatus: data.managerStatus || "LOCKED",
    };
  }
  if (status === "CANCELED") {
    return {
      ...data,
      overallStatus: "CANCELED",
      hrStatus: data.hrStatus || "CANCELED",
      managerStatus: data.managerStatus || "LOCKED",
    };
  }
  return {
    ...data,
    overallStatus: "PENDING_HR",
    hrStatus: data.hrStatus || "PENDING",
    managerStatus: data.managerStatus || "LOCKED",
  };
}

function canOwnerEditOrCancel(leave, uid) {
  const wf = deriveWorkflowFromLegacy(leave);
  return (
    String(wf.uid || "") === String(uid || "") &&
    asUpper(wf.overallStatus) === "PENDING_HR" &&
    asUpper(wf.hrStatus) === "PENDING"
  );
}

// TODO: ผูก SMS จริงทีหลัง
async function sendSmsMaybe({ to, message }) {
  return { ok: true, to, message };
}

function pickOwnerContact(leave) {
  const phone = pickStr(leave.phone, leave.employee?.phone, leave.user?.phone);
  return phone || "";
}

/**
 * POST /leave-requests/:id/hr-action
 * body: { action: "APPROVE"|"REJECT", comment?: string }
 */
app.post("/leave-requests/:id/hr-action", requireAuth, async (req, res) => {
  try {
    const role = requireRole(req, ["ADMIN", "HR"]);
    const id = req.params.id;

    const action = asUpper(req.body?.action);
    const comment = String(req.body?.comment || "").trim();

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ ok: false, error: "INVALID_ACTION" });
    }
    if (action === "REJECT" && !comment) {
      return res.status(400).json({ ok: false, error: "REASON_REQUIRED" });
    }

    const { ref, data } = await getLeaveOrThrow(id);
    const wf = deriveWorkflowFromLegacy(data);

    const overall = asUpper(wf.overallStatus);
    if (overall === "APPROVED" || overall.startsWith("REJECTED") || overall === "CANCELED") {
      return res.status(409).json({ ok: false, error: "ALREADY_DECIDED" });
    }

    if (asUpper(wf.overallStatus) !== "PENDING_HR" || asUpper(wf.hrStatus) !== "PENDING") {
      return res.status(409).json({ ok: false, error: "NOT_IN_HR_PENDING" });
    }

    const actor = { uid: req.user.uid, email: req.user.email || null, role };

    if (action === "APPROVE") {
      const patch = {
        overallStatus: "PENDING_MANAGER",
        hrStatus: "APPROVED",
        hrComment: comment || null,
        hrActionAt: nowTs(),
        hrActionBy: actor,

        managerStatus: "PENDING",
        managerComment: null,
        managerActionAt: null,
        managerActionBy: null,

        status: "PENDING",
        updatedAt: nowTs(),
      };

      await ref.set(patch, { merge: true });

      const toEmp = pickOwnerContact(wf);
      if (toEmp)
        await sendSmsMaybe({
          to: toEmp,
          message: `คำร้อง ${wf.requestNo || id} HR อนุมัติแล้ว กำลังรอผู้บังคับบัญชา`,
        });

      return res.json({ ok: true, id, patch });
    }

    const patch = {
      overallStatus: "REJECTED_BY_HR",
      hrStatus: "REJECTED",
      hrComment: comment,
      hrActionAt: nowTs(),
      hrActionBy: actor,

      managerStatus: "LOCKED",
      managerComment: null,
      managerActionAt: null,
      managerActionBy: null,

      status: "REJECTED",
      rejectReason: comment,
      rejectedAt: nowTs(),
      rejectedBy: pickStr(req.user.email, "HR"),
      decidedAt: nowTs(),
      decisionNote: comment || null,
      updatedAt: nowTs(),
    };

    await ref.set(patch, { merge: true });

    const toEmp = pickOwnerContact(wf);
    if (toEmp)
      await sendSmsMaybe({
        to: toEmp,
        message: `คำร้อง ${wf.requestNo || id} ไม่อนุมัติโดย HR เหตุผล: ${comment}`,
      });

    return res.json({ ok: true, id, patch });
  } catch (err) {
    console.error("/leave-requests/:id/hr-action error:", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: String(err?.message || err) });
  }
});

/**
 * POST /leave-requests/:id/manager-action
 * body: { action: "APPROVE"|"REJECT", comment?: string }
 */
app.post("/leave-requests/:id/manager-action", requireAuth, async (req, res) => {
  try {
    const role = requireRole(req, ["ADMIN", "EXECUTIVE_MANAGER"]);
    const id = req.params.id;

    const action = asUpper(req.body?.action);
    const comment = String(req.body?.comment || "").trim();

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ ok: false, error: "INVALID_ACTION" });
    }
    if (action === "REJECT" && !comment) {
      return res.status(400).json({ ok: false, error: "REASON_REQUIRED" });
    }

    const { ref, data } = await getLeaveOrThrow(id);
    const wf = deriveWorkflowFromLegacy(data);

    const overall = asUpper(wf.overallStatus);
    if (overall === "APPROVED" || overall.startsWith("REJECTED") || overall === "CANCELED") {
      return res.status(409).json({ ok: false, error: "ALREADY_DECIDED" });
    }

    if (asUpper(wf.overallStatus) !== "PENDING_MANAGER" || asUpper(wf.managerStatus) !== "PENDING") {
      return res.status(409).json({ ok: false, error: "NOT_IN_MANAGER_PENDING" });
    }
    if (asUpper(wf.hrStatus) !== "APPROVED") {
      return res.status(409).json({ ok: false, error: "WAIT_HR_APPROVE_FIRST" });
    }

    const actor = { uid: req.user.uid, email: req.user.email || null, role };

    if (action === "APPROVE") {
      const patch = {
        overallStatus: "APPROVED",
        managerStatus: "APPROVED",
        managerComment: comment || null,
        managerActionAt: nowTs(),
        managerActionBy: actor,

        status: "APPROVED",
        approvedAt: nowTs(),
        approvedBy: pickStr(req.user.email, "MANAGER"),
        decidedAt: nowTs(),
        decisionNote: comment || null,
        updatedAt: nowTs(),
      };

      await ref.set(patch, { merge: true });

      const toEmp = pickOwnerContact(wf);
      if (toEmp)
        await sendSmsMaybe({
          to: toEmp,
          message: `คำร้อง ${wf.requestNo || id} อนุมัติสำเร็จแล้ว`,
        });

      return res.json({ ok: true, id, patch });
    }

    const patch = {
      overallStatus: "REJECTED_BY_MANAGER",
      managerStatus: "REJECTED",
      managerComment: comment,
      managerActionAt: nowTs(),
      managerActionBy: actor,

      status: "REJECTED",
      rejectReason: comment,
      rejectedAt: nowTs(),
      rejectedBy: pickStr(req.user.email, "MANAGER"),
      decidedAt: nowTs(),
      decisionNote: comment || null,
      updatedAt: nowTs(),
    };

    await ref.set(patch, { merge: true });

    const toEmp = pickOwnerContact(wf);
    if (toEmp)
      await sendSmsMaybe({
        to: toEmp,
        message: `คำร้อง ${wf.requestNo || id} ไม่อนุมัติโดยผู้บังคับบัญชา เหตุผล: ${comment}`,
      });

    return res.json({ ok: true, id, patch });
  } catch (err) {
    console.error("/leave-requests/:id/manager-action error:", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: String(err?.message || err) });
  }
});

/**
 * POST /leave-requests/:id/cancel
 * body: { reason: string }
 */
app.post("/leave-requests/:id/cancel", requireAuth, async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const id = req.params.id;
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ ok: false, error: "REASON_REQUIRED" });

    const { ref, data } = await getLeaveOrThrow(id);
    const wf = deriveWorkflowFromLegacy(data);

    const uid = String(req.user.uid || "");
    const isOwner = String(wf.uid || "") === uid;

    const isApproverRole = ["ADMIN", "HR", "EXECUTIVE_MANAGER"].includes(role);

    if (isOwner && !isApproverRole) {
      if (!canOwnerEditOrCancel(wf, uid)) {
        return res.status(409).json({ ok: false, error: "OWNER_CANCEL_NOT_ALLOWED_NOW" });
      }
    }

    if (!isOwner && !isApproverRole) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_CANCEL" });
    }

    const overall = asUpper(wf.overallStatus);
    if (overall === "APPROVED" || overall.startsWith("REJECTED") || overall === "CANCELED") {
      return res.status(409).json({ ok: false, error: "ALREADY_DECIDED" });
    }

    const canceledByRole = isOwner && !isApproverRole ? "OWNER" : role;
    const actor = { uid: req.user.uid, email: req.user.email || null, role: canceledByRole };

    const patch = {
      overallStatus: "CANCELED",

      canceledByRole,
      canceledBy: actor,
      canceledReason: reason,
      canceledAt: nowTs(),

      hrStatus: canceledByRole === "HR" ? "CANCELED" : wf.hrStatus || "PENDING",
      hrComment: canceledByRole === "HR" ? reason : wf.hrComment || null,
      hrActionAt: canceledByRole === "HR" ? nowTs() : wf.hrActionAt || null,
      hrActionBy: canceledByRole === "HR" ? actor : wf.hrActionBy || null,

      managerStatus: canceledByRole === "EXECUTIVE_MANAGER" ? "CANCELED" : wf.managerStatus || "LOCKED",
      managerComment: canceledByRole === "EXECUTIVE_MANAGER" ? reason : wf.managerComment || null,
      managerActionAt: canceledByRole === "EXECUTIVE_MANAGER" ? nowTs() : wf.managerActionAt || null,
      managerActionBy: canceledByRole === "EXECUTIVE_MANAGER" ? actor : wf.managerActionBy || null,

      status: "CANCELED",
      decidedAt: nowTs(),
      decisionNote: reason || null,
      updatedAt: nowTs(),
    };

    await ref.set(patch, { merge: true });

    const toEmp = pickOwnerContact(wf);
    if (toEmp)
      await sendSmsMaybe({
        to: toEmp,
        message: `คำร้อง ${wf.requestNo || id} ถูกยกเลิกโดย ${canceledByRole} เหตุผล: ${reason}`,
      });

    return res.json({ ok: true, id, patch });
  } catch (err) {
    console.error("/leave-requests/:id/cancel error:", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: String(err?.message || err) });
  }
});

// ----------------- ✅ Files Router (Supabase) -----------------
const filesRouter = require("./files.supabase.routes");
app.use("/files", filesRouter);

// ----------------- Listen -----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log("✅ API running on :", port));
