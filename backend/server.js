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
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Accept"],
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

// ----------------- ✅ LINE Messaging API -----------------
const line = require("@line/bot-sdk");

const lineClient = process.env.LINE_CHANNEL_ACCESS_TOKEN
  ? new line.Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN })
  : null;

console.log(
  lineClient
    ? "✅ LINE client enabled"
    : "⚠️ LINE client disabled: missing LINE_CHANNEL_ACCESS_TOKEN"
);

function extractLineUserId(userDoc = {}) {
  return [
    userDoc.lineUserId,
    userDoc.line_user_id,
    userDoc.lineUid,
    userDoc.line_uid,
    userDoc.lineId,
    userDoc.line_id,
    userDoc.line?.userId,
    userDoc.line?.uid,
    userDoc.line?.lineUserId,
    userDoc.lineProfile?.userId,
  ]
    .map((v) => String(v || "").trim())
    .find(Boolean) || "";
}

function isLikelyLineUserId(v) {
  return /^U[0-9A-Fa-f]{10,}$/i.test(String(v || "").trim());
}

function normalizeLineUserId(v) {
  const id = String(v || "").trim();
  return isLikelyLineUserId(id) ? id : "";
}

function isUserActive(userDoc = {}) {
  const raw = userDoc?.active;

  if (raw === undefined || raw === null || raw === "") return true;
  if (raw === true) return true;
  if (raw === false) return false;

  const s = String(raw).trim().toLowerCase();
  return !["false", "0", "inactive", "disabled", "no"].includes(s);
}

async function getUsersByRole(roleUpper, { activeOnly = true } = {}) {
  const role = String(roleUpper || "").trim().toUpperCase();
  if (!role) return [];

  const snap = await db.collection("users").get();

  return snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
    .filter((u) => String(u.role || "").trim().toUpperCase() === role)
    .filter((u) => (activeOnly ? isUserActive(u) : true));
}

async function linePush(to, text) {
  if (!lineClient) return { ok: false, error: "NO_LINE_TOKEN" };

  const target = String(to || "").trim();
  if (!target) return { ok: false, error: "NO_TO" };

  try {
    await lineClient.pushMessage(target, {
      type: "text",
      text: String(text || ""),
    });
    return { ok: true, to: target };
  } catch (err) {
    const statusCode =
      err?.statusCode ||
      err?.status ||
      err?.originalError?.response?.status ||
      err?.response?.status ||
      null;

    const responseData =
      err?.originalError?.response?.data ||
      err?.response?.data ||
      err?.body ||
      null;

    console.error("[LINE-PUSH-ERROR]", {
      to: target,
      statusCode,
      message: err?.message || String(err),
      responseData,
    });

    return {
      ok: false,
      to: target,
      error: err?.message || String(err),
      statusCode,
      responseData,
    };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function linePushMany(toList, text) {
  if (!lineClient) return { ok: false, error: "NO_LINE_TOKEN" };

  const list = Array.from(new Set((toList || []).filter(Boolean).map((v) => String(v).trim())));
  if (!list.length) return { ok: false, error: "EMPTY_LIST", count: 0, failed: [] };

  const failed = [];

  for (const to of list) {
    const result = await linePush(to, text);
    if (!result.ok) {
      failed.push({
        to,
        error: result.error,
        statusCode: result.statusCode || null,
        responseData: result.responseData || null,
      });
    }

    // หน่วงนิดนึง ลดโอกาสชน 429
    await sleep(150);
  }

  return {
    ok: failed.length === 0,
    count: list.length,
    sentCount: list.length - failed.length,
    failed,
  };
}

async function getLineUserIdByUid(uid) {
  const id = String(uid || "").trim();
  if (!id) return "";

  const snap = await db.collection("users").doc(id).get();
  if (!snap.exists) return "";

  const u = snap.data() || {};
  return normalizeLineUserId(extractLineUserId(u));
}

async function getLineUserIdsByUids(uids = []) {
  const uniq = Array.from(new Set((uids || []).filter(Boolean).map(String)));
  const out = [];

  for (const uid of uniq) {
    const lineUserId = await getLineUserIdByUid(uid);
    if (lineUserId) out.push(lineUserId);
  }

  return out;
}

async function sendLineToUids(uids = [], text = "") {
  const toList = await getLineUserIdsByUids(uids);
  if (!toList.length) {
    return { ok: false, error: "NO_LINKED_USERS", count: 0, sentCount: 0, failed: [] };
  }
  return await linePushMany(toList, text);
}

async function sendLineToRole(roleUpper, text = "") {
  const role = String(roleUpper || "").trim().toUpperCase();
  if (!role) return { ok: false, error: "MISSING_ROLE", count: 0, sentCount: 0, failed: [] };

  const users = await getUsersByRole(role, { activeOnly: true });
  const toList = users.map((u) => normalizeLineUserId(extractLineUserId(u))).filter(Boolean);

  if (!toList.length) {
    return {
      ok: false,
      error: "NO_LINKED_ROLE_USERS",
      matchedUsers: users.length,
      count: 0,
      sentCount: 0,
      failed: [],
    };
  }

  const result = await linePushMany(toList, text);
  return {
    ...result,
    matchedUsers: users.length,
    linkedUsers: toList.length,
  };
}
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
        error: `Employee not found: employees/${employeeNo}`,
        employeeNo,
        projectId: admin.app().options.projectId || null,
      });
    }

    const empData = empSnap.data() || {};

    const userAvatar = normalizeAvatarFromDoc(userData);
    const empAvatar = normalizeAvatarFromDoc(empData);

    const avatarUrl = pickStr(empAvatar.avatarUrl, userAvatar.avatarUrl);
    const avatarPath = pickStr(empAvatar.avatarPath, userAvatar.avatarPath);

    // ✅ เพิ่ม: สถานะเชื่อม LINE
    const lineUserId = normalizeLineUserId(extractLineUserId(userData)) || null;

    return res.json({
      ok: true,
      projectId: admin.app().options.projectId || null,
      uid,
      email: req.user.email || null,
      role: roleFs,
      claimSync,

      // ✅ เพิ่มให้ frontend เช็คได้ทันที
      lineUserId: lineUserId || undefined,

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

// ----------------- ✅ LINE LINK (LIFF) -----------------
// POST /line/link  body: { lineUserId }
app.post("/line/link", requireAuth, async (req, res) => {
  try {
    const uid = String(req.user?.uid || "").trim();
    const lineUserId = String(req.body?.lineUserId || "").trim();

    if (!uid) return res.status(401).json({ ok: false, error: "MISSING_UID" });
    if (!lineUserId || !lineUserId.startsWith("U")) {
      return res.status(400).json({ ok: false, error: "INVALID_LINE_USER_ID" });
    }

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          lineUserId,
          lineLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
          line: {
            userId: lineUserId,
            linkedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );

    return res.json({ ok: true });
  } catch (err) {
    console.error("/line/link error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
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
  if (status === "CANCELED" || status === "CANCELLED") {
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

// ----------------- ✅ NOTIFICATIONS + LINE (DETAIL) -----------------
const NOTI_COL = "notifications";

// ✅ BASE URL (โดเมนเว็บของคุณ)
// (เก็บไว้ได้ เผื่ออนาคตอยากกลับไปต่อ path)
const BASE_URL = (
  process.env.APP_BASE_URL || "https://smart-hr-encom-smart-u9m4.onrender.com"
).replace(/\/+$/, "");

function buildLeaveLink() {
  return BASE_URL;
}

// ✅ แสดงเวลาแบบ dd/mm/yyyy HH:MM
function fmtDateTimeThaiDDMM(x) {
  try {
    const d = x?.toDate ? x.toDate() : x ? new Date(x) : null;
    if (!d || isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  } catch {
    return "-";
  }
}

// ✅ กันส่งซ้ำ (notifyState)
function nsGet(wf, key) {
  return wf?.notifyState?.[key] ?? null;
}
async function nsSet(ref, key) {
  const patch = {};
  patch[`notifyState.${key}`] = nowTs();
  patch.updatedAt = nowTs();
  await ref.set(patch, { merge: true });
}

function resultSkipped(reason, extra = {}) {
  return { ok: true, skipped: true, reason, ...extra };
}

function submitInAppAlreadyMarked(wf) {
  return Boolean(nsGet(wf, "submittedInAppAt") || nsGet(wf, "submittedAt"));
}

function submitHrLineAlreadyMarked(wf) {
  return Boolean(nsGet(wf, "submittedHrLineAt"));
}

function submitOwnerLineAlreadyMarked(wf) {
  return Boolean(nsGet(wf, "submittedOwnerLineAt"));
}

async function finalizeSubmitNotifyState(ref, wf, state) {
  if (state.inAppDone && !submitInAppAlreadyMarked(wf)) {
    await nsSet(ref, "submittedInAppAt");
  }
  if (state.hrLineDone && !submitHrLineAlreadyMarked(wf)) {
    await nsSet(ref, "submittedHrLineAt");
  }
  if (state.ownerLineDone && !submitOwnerLineAlreadyMarked(wf)) {
    await nsSet(ref, "submittedOwnerLineAt");
  }

  const allDone =
    (submitInAppAlreadyMarked(wf) || state.inAppDone) &&
    (submitHrLineAlreadyMarked(wf) || state.hrLineDone) &&
    (submitOwnerLineAlreadyMarked(wf) || state.ownerLineDone);

  if (allDone && !nsGet(wf, "submittedAt")) {
    await nsSet(ref, "submittedAt");
  }
}

// ✅ Template ข้อความ LINE ตามโผยล่าสุด (Emoji + เบอร์ + ลิงก์)
function buildLineLeaveMessage(type, wf) {
  const reqNo = wf.requestNo || wf.id || "-";
  const phone = wf.phone ? String(wf.phone) : "-";

  const empName = wf.__employeeName || "-";
  const empNo = wf.employeeNo || "-";

  const cat = wf.category || "-";
  const sub = wf.subType || "-";

  const submittedAt = fmtDateTimeThaiDDMM(wf.submittedAt);
  const dateRange = fmtDateRangeFromLeave(wf);
  const timeRange = fmtTimeRangeFromLeave(wf);

  const note = String(wf.reason || "").trim(); // หมายเหตุผู้ยื่น
  const actor = wf.__actorLabel || "";
  const decisionReason = String(wf.__decisionReason || "").trim();

  if (type === "SUBMITTED_TO_HR") {
    return (
      `[LEAVE] 📩 ส่งคำร้องลาใหม่\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ผู้ยื่น: ${empName} (${empNo})\n` +
      `เบอร์: ${phone}\n` +
      `ประเภท: ${cat} • ${sub}\n` +
      `ยื่น: ${submittedAt}\n` +
      `ลา: ${dateRange} ${timeRange}\n` +
      `สถานะ: ⏳ รอ HR ตรวจสอบ\n\n` +
      `ดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  if (type === "SUBMITTED_TO_OWNER") {
    return (
      `[LEAVE] 📩 ส่งคำร้องลาแล้ว\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ประเภท: ${cat} • ${sub}\n` +
      `ยื่น: ${submittedAt}\n` +
      `ลา: ${dateRange} ${timeRange}\n` +
      `สถานะ: ⏳ รอ HR ตรวจสอบ\n\n` +
      `ดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  if (type === "HR_APPROVED_TO_OWNER") {
    return (
      `[LEAVE] ✅ HR อนุมัติแล้ว\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ผู้ยื่น: ${empName} (${empNo})\n` +
      `เบอร์: ${phone}\n` +
      `ประเภท: ${cat} • ${sub}\n` +
      `ลา: ${dateRange} ${timeRange}\n` +
      `สถานะ: ⏳ รอ EXECUTIVE_MANAGER อนุมัติ\n` +
      (actor ? `ผู้ดำเนินการ: ${actor}\n` : "") +
      (note ? `หมายเหตุ: ${note}\n` : "") +
      `\nดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  if (type === "NEED_EXEC") {
    return (
      `[LEAVE] ⏳ รออนุมัติขั้นสุดท้าย\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ผู้ยื่น: ${empName} (${empNo})\n` +
      `เบอร์: ${phone}\n` +
      `ประเภท: ${cat} • ${sub}\n` +
      `ลา: ${dateRange} ${timeRange}\n\n` +
      `ดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  if (type === "REJECTED_FINAL") {
    return (
      `[LEAVE] ❌ ไม่อนุมัติ (จบคำร้อง)\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ผู้ยื่น: ${empName} (${empNo})\n` +
      `เบอร์: ${phone}\n` +
      `ประเภท: ${cat} • ${sub}\n` +
      `ลา: ${dateRange} ${timeRange}\n` +
      `เหตุผล: ${decisionReason || "-"}\n` +
      (actor ? `ผู้ดำเนินการ: ${actor}\n` : "") +
      `\nดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  if (type === "CANCELED_FINAL") {
    return (
      `[LEAVE] 🛑 ยกเลิกคำร้อง (จบคำร้อง)\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ผู้ยื่น: ${empName} (${empNo})\n` +
      `เบอร์: ${phone}\n` +
            `ประเภท: ${cat} • ${sub}\n` +
      `ลา: ${dateRange} ${timeRange}\n` +
      `เหตุผล: ${decisionReason || "-"}\n` +
      (actor ? `ผู้ดำเนินการ: ${actor}\n` : "") +
      `\nดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  if (type === "EXEC_APPROVED_FINAL") {
    return (
      `[LEAVE] 🎉 อนุมัติครบแล้ว (สมบูรณ์)\n` +
      `เลขคำร้อง: ${reqNo}\n` +
      `ผู้ยื่น: ${empName} (${empNo})\n` +
      `เบอร์: ${phone}\n` +
      `ประเภท: ${cat} • ${sub}\n` +
      `ลา: ${dateRange} ${timeRange}\n` +
      `สถานะ: ✅ APPROVED\n` +
      (actor ? `ผู้อนุมัติ: ${actor}\n` : "") +
      `\nดูในเว็บ: ${buildLeaveLink()}`
    );
  }

  return `[LEAVE] แจ้งเตือน\nเลขคำร้อง: ${reqNo}\nดูในเว็บ: ${buildLeaveLink()}`;
}

function fmtDateTimeThaiLike(x) {
  try {
    const d = x?.toDate ? x.toDate() : x ? new Date(x) : null;
    if (!d || isNaN(d.getTime())) return "-";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return "-";
  }
}

function fmtTimeRangeFromLeave(leave) {
  const mode = String(leave?.mode || "").trim();
  if (mode && mode !== "time") return "ทั้งวัน";

  const s = String(leave?.startAt || "").trim();
  const e = String(leave?.endAt || "").trim();

  const sh = s.includes("T") ? s.split("T")[1] : "";
  const eh = e.includes("T") ? e.split("T")[1] : "";
  if (!sh && !eh) return "ทั้งวัน";
  return `${sh || "-"}–${eh || "-"}`;
}

function fmtDateRangeFromLeave(leave) {
  const s = String(leave?.startAt || "").trim();
  const e = String(leave?.endAt || "").trim();
  const sd = s.includes("T") ? s.split("T")[0] : s || "-";
  const ed = e.includes("T") ? e.split("T")[0] : e || "-";
  return sd === ed ? sd : `${sd}–${ed}`;
}

async function createNotification({ toUid, toRole, type, title, message, ref, meta }) {
  const data = {
    toUid: String(toUid),
    toRole: toRole || null,
    type: String(type || "GENERIC"),
    title: String(title || "Notification"),
    message: String(message || ""),
    ref: ref || null,
    meta: meta || null,
    createdAt: nowTs(),
    readAt: null,
  };
  await db.collection(NOTI_COL).add(data);
}

async function findUsersByRole(roleUpper) {
  return await getUsersByRole(roleUpper, { activeOnly: true });
}

async function getEmployeeDocByNo(employeeNo) {
  const no = String(employeeNo || "").trim();
  if (!no) return null;
  const snap = await db.collection("employees").doc(no).get();
  return snap.exists ? { id: snap.id, ...(snap.data() || {}) } : null;
}

function fullNameFromEmp(empDoc) {
  const f = String(empDoc?.fname || "").trim();
  const l = String(empDoc?.lname || "").trim();
  return `${f} ${l}`.trim();
}

// ✅ หา employeeNo จาก uid แล้วดึง employee doc
async function getEmployeeDocByUid(uid) {
  const id = String(uid || "").trim();
  if (!id) return null;

  const us = await db.collection("users").doc(id).get();
  if (!us.exists) return null;

  const employeeNo = pickStr(us.data()?.employeeNo);
  if (!employeeNo) return null;

  return await getEmployeeDocByNo(employeeNo);
}

// ✅ ชื่อผู้ดำเนินการ (HR/EXEC/ADMIN/OWNER) เป็น fname+lname จาก employees
async function pickActorNameAsync(req) {
  try {
    const uid = req.user?.uid;
    const emp = await getEmployeeDocByUid(uid);
    const n = fullNameFromEmp(emp);
    if (n) return n;
  } catch (e) {
    console.log("pickActorNameAsync lookup failed:", e?.message || e);
  }
  return pickStr(req.user?.name, req.user?.displayName, req.user?.email, "SYSTEM");
}

function buildLineText({ stage, decision, wf, actorRole, actorName, reason }) {
  const reqNo = wf.requestNo || wf.id || "-";
  const cat = wf.category || "-";
  const sub = wf.subType || "-";
  const submitted = fmtDateTimeThaiLike(wf.submittedAt);
  const dateRange = fmtDateRangeFromLeave(wf);
  const timeRange = fmtTimeRangeFromLeave(wf);

  const note = String(wf.reason || "").trim(); // หมายเหตุพนักงาน
  const rs = String(reason || "").trim();

  const who = `${actorRole}(${actorName || "-"})`;

  if (decision === "APPROVED" && stage === "HR") {
    return `[LEAVE] HR อนุมัติแล้ว (รอผู้บริหาร)\nเลข:${reqNo}\nประเภท:${cat}•${sub}\nยื่น:${submitted}\nลา:${dateRange} เวลา:${timeRange}\nหมายเหตุ:${note || "-"}\nผู้อนุมัติ:${who}`;
  }
  if (decision === "APPROVED" && stage === "EXEC") {
    return `[LEAVE] ผู้บริหารอนุมัติแล้ว ✅ (คำร้องสมบูรณ์)\nเลข:${reqNo}\nประเภท:${cat}•${sub}\nยื่น:${submitted}\nลา:${dateRange} เวลา:${timeRange}\nหมายเหตุ:${note || "-"}\nผู้อนุมัติ:${who}`;
  }

  const dc = decision === "REJECTED" ? "ไม่อนุมัติ" : "ยกเลิก";
  return `[LEAVE] ${actorRole} ${dc} (จบคำร้อง)\nเลข:${reqNo}\nประเภท:${cat}•${sub}\nยื่น:${submitted}\nลา:${dateRange} เวลา:${timeRange}\nเหตุผล:${rs || "-"}\nผู้ดำเนินการ:${who}`;
}

/**
 * POST /leave-requests/:id/notify-submit
 * ใช้กรณีที่ client สร้าง leave_requests ตรงผ่าน Firestore (addDoc) แล้วอยากให้ backend สร้าง notification ให้ HR
 */
app.post("/leave-requests/:id/notify-submit", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const { ref, data } = await getLeaveOrThrow(id);
    const wf = deriveWorkflowFromLegacy(data);

    // เฉพาะเจ้าของคำร้องเท่านั้นที่เรียกได้
    if (String(wf.uid || "") !== String(req.user.uid || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_NOT_OWNER" });
    }

    // ต้องยังอยู่ช่วง pending HR เท่านั้น
    if (asUpper(wf.overallStatus) !== "PENDING_HR") {
      return res.status(409).json({ ok: false, error: "NOT_IN_PENDING_HR" });
    }

    const hrs = await findUsersByRole("HR");
    const empDoc = await getEmployeeDocByNo(wf.employeeNo);
    const senderName = fullNameFromEmp(empDoc) || wf.employeeName || "-";
    const wfForMsg = { ...wf, id, __employeeName: senderName };

    let notified = 0;
    let inAppResult = null;
    let hrLineResult = null;
    let ownerLineResult = null;

    let inAppDone = submitInAppAlreadyMarked(wf);
    let hrLineDone = submitHrLineAlreadyMarked(wf);
    let ownerLineDone = submitOwnerLineAlreadyMarked(wf);

    if (inAppDone) {
      inAppResult = resultSkipped("ALREADY_IN_APP_NOTIFIED", { notified: hrs.length });
      notified = hrs.length;
    } else {
      await Promise.all(
        hrs.map((u) =>
          createNotification({
            toUid: u.uid,
            toRole: "HR",
            type: "LEAVE_SUBMITTED",
            title: "มีคำร้องลาใหม่",
            message: `เลขคำร้อง ${wf.requestNo || id} รอ HR ตรวจสอบ`,
            ref: { col: LEAVE_COL, id },
            meta: { overallStatus: wf.overallStatus, employeeNo: wf.employeeNo || null },
          })
        )
      );

      notified = hrs.length;
      inAppDone = true;
      inAppResult = { ok: true, notified };
    }

    if (hrLineDone) {
      hrLineResult = resultSkipped("ALREADY_SENT_HR_LINE");
    } else {
      hrLineResult = await sendLineToRole(
        "HR",
        buildLineLeaveMessage("SUBMITTED_TO_HR", wfForMsg)
      );
      hrLineDone = hrLineResult.ok === true;
    }

    if (ownerLineDone) {
      ownerLineResult = resultSkipped("ALREADY_SENT_OWNER_LINE");
    } else {
      ownerLineResult = await sendLineToUids(
        [wf.uid],
        buildLineLeaveMessage("SUBMITTED_TO_OWNER", wfForMsg)
      );
      ownerLineDone = ownerLineResult.ok === true;
    }

    await finalizeSubmitNotifyState(ref, wf, {
      inAppDone,
      hrLineDone,
      ownerLineDone,
    });

    const fullyCompleted =
      (submitInAppAlreadyMarked(wf) || inAppDone) &&
      (submitHrLineAlreadyMarked(wf) || hrLineDone) &&
      (submitOwnerLineAlreadyMarked(wf) || ownerLineDone);

    return res.json({
      ok: true,
      id,
      notified,
      completed: fullyCompleted,
      line: {
        hr: hrLineResult,
        owner: ownerLineResult,
      },
      inApp: inAppResult,
      notifyState: {
        submittedAt: Boolean(nsGet(wf, "submittedAt") || fullyCompleted),
        submittedInAppAt: Boolean(nsGet(wf, "submittedInAppAt") || inAppDone),
        submittedHrLineAt: Boolean(nsGet(wf, "submittedHrLineAt") || hrLineDone),
        submittedOwnerLineAt: Boolean(nsGet(wf, "submittedOwnerLineAt") || ownerLineDone),
      },
    });
  } catch (err) {
    console.error("/leave-requests/:id/notify-submit error:", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: String(err?.message || err) });
  }
});

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
    const actorName = await pickActorNameAsync(req); // ✅ ชื่อจาก employees

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

      await createNotification({
        toUid: wf.uid,
        toRole: "EMPLOYEE",
        type: "LEAVE_STAGE1_APPROVED",
        title: "HR อนุมัติคำร้องแล้ว",
        message: `เลขคำร้อง ${wf.requestNo || id} HR อนุมัติแล้ว (รอผู้บริหาร)`,
        ref: { col: LEAVE_COL, id },
        meta: { overallStatus: "PENDING_MANAGER" },
      });

      const execs = await findUsersByRole("EXECUTIVE_MANAGER");
      await Promise.all(
        execs.map((u) =>
          createNotification({
            toUid: u.uid,
            toRole: "EXECUTIVE_MANAGER",
            type: "LEAVE_NEED_EXEC",
            title: "มีคำร้องรออนุมัติขั้นสุดท้าย",
            message: `เลขคำร้อง ${wf.requestNo || id} รอผู้บริหารอนุมัติ`,
            ref: { col: LEAVE_COL, id },
            meta: { overallStatus: "PENDING_MANAGER" },
          })
        )
      );

      // ✅ กันส่งซ้ำ HR_APPROVED (notifyState.hrApprovedAt)
      if (!nsGet(wf, "hrApprovedAt")) {
        const empDoc = await getEmployeeDocByNo(wf.employeeNo);
        const senderName = fullNameFromEmp(empDoc) || wf.employeeName || "-";
        const actorLabel = `HR(${actorName || "-"})`;

        const wfForMsg = { ...wf, id, __employeeName: senderName, __actorLabel: actorLabel };

        // ส่งไปพนักงาน
        await sendLineToUids([wf.uid], buildLineLeaveMessage("HR_APPROVED_TO_OWNER", wfForMsg));

        // ส่งไป EXEC ให้กดอนุมัติขั้นสุดท้าย
        await sendLineToRole("EXECUTIVE_MANAGER", buildLineLeaveMessage("NEED_EXEC", wfForMsg));

        // log ให้ HR
        await sendLineToRole(
          "HR",
          `[LEAVE] ✅ HR อนุมัติแล้ว (ส่งต่อผู้บริหาร)
เลขคำร้อง: ${wf.requestNo || id}
ผู้อนุมัติ: ${actorName || "-"}`
        );

        await nsSet(ref, "hrApprovedAt");
      }

      return res.json({ ok: true, id, patch, notifiedExec: execs.length });
    }

    // action === REJECT
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

    await createNotification({
      toUid: wf.uid,
      toRole: "EMPLOYEE",
      type: "LEAVE_FINAL",
      title: "คำร้องไม่อนุมัติ",
      message: `เลขคำร้อง ${wf.requestNo || id} ไม่อนุมัติโดย HR`,
      ref: { col: LEAVE_COL, id },
      meta: { overallStatus: "REJECTED_BY_HR", reason: comment },
    });

    // ✅ กันส่งซ้ำ HR_REJECTED (notifyState.hrRejectedAt)
    if (!nsGet(wf, "hrRejectedAt")) {
      const empDoc = await getEmployeeDocByNo(wf.employeeNo);
            const senderName = fullNameFromEmp(empDoc) || wf.employeeName || "-";
      const actorLabel = `HR(${actorName || "-"})`;

      const wfForMsg = {
        ...wf,
        id,
        __employeeName: senderName,
        __actorLabel: actorLabel,
        __decisionReason: comment,
      };

      await sendLineToUids([wf.uid], buildLineLeaveMessage("REJECTED_FINAL", wfForMsg));

      await sendLineToRole(
        "HR",
        `[LEAVE] ❌ HR ไม่อนุมัติ (จบคำร้อง)
เลขคำร้อง: ${wf.requestNo || id}
ผู้ดำเนินการ: ${actorName || "-"}
เหตุผล: ${comment || "-"}`
      );

      await nsSet(ref, "hrRejectedAt");
    }

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
    const actorName = await pickActorNameAsync(req); // ✅ ชื่อจาก employees

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

      await createNotification({
        toUid: wf.uid,
        toRole: "EMPLOYEE",
        type: "LEAVE_FINAL",
        title: "คำร้องอนุมัติแล้ว ✅",
        message: `เลขคำร้อง ${wf.requestNo || id} ผู้บริหารอนุมัติแล้ว (คำร้องสมบูรณ์)`,
        ref: { col: LEAVE_COL, id },
        meta: { overallStatus: "APPROVED" },
      });

      // ✅ กันส่งซ้ำ EXEC_APPROVED (notifyState.execApprovedAt)
      if (!nsGet(wf, "execApprovedAt")) {
        const empDoc = await getEmployeeDocByNo(wf.employeeNo);
        const senderName = fullNameFromEmp(empDoc) || wf.employeeName || "-";
        const actorLabel = `EXECUTIVE_MANAGER(${actorName || "-"})`;

        const wfForMsg = { ...wf, id, __employeeName: senderName, __actorLabel: actorLabel };

        // แจ้งพนักงาน (สมบูรณ์)
        await sendLineToUids([wf.uid], buildLineLeaveMessage("EXEC_APPROVED_FINAL", wfForMsg));

        // log ให้ EXEC
        await sendLineToRole(
          "EXECUTIVE_MANAGER",
          `[LEAVE] 🎉 อนุมัติแล้ว (สมบูรณ์)
เลขคำร้อง: ${wf.requestNo || id}
พนักงาน: ${senderName} (${wf.employeeNo || "-"})
ผู้อนุมัติ: ${actorName || "-"}`
        );

        // แจ้ง HR
        await sendLineToRole(
          "HR",
          `[LEAVE] 🎉 คำร้องสมบูรณ์แล้ว
เลขคำร้อง: ${wf.requestNo || id}
พนักงาน: ${senderName} (${wf.employeeNo || "-"})
ผลลัพธ์: APPROVED
ผู้อนุมัติ: ${actorName || "-"}`
        );

        await nsSet(ref, "execApprovedAt");
      }

      return res.json({ ok: true, id, patch });
    }

    // action === REJECT
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

    await createNotification({
      toUid: wf.uid,
      toRole: "EMPLOYEE",
      type: "LEAVE_FINAL",
      title: "คำร้องไม่อนุมัติ",
      message: `เลขคำร้อง ${wf.requestNo || id} ไม่อนุมัติโดยผู้บริหาร`,
      ref: { col: LEAVE_COL, id },
      meta: { overallStatus: "REJECTED_BY_MANAGER", reason: comment },
    });

    // ✅ กันส่งซ้ำ EXEC_REJECTED (notifyState.execRejectedAt)
    if (!nsGet(wf, "execRejectedAt")) {
      const empDoc = await getEmployeeDocByNo(wf.employeeNo);
      const senderName = fullNameFromEmp(empDoc) || wf.employeeName || "-";
      const actorLabel = `EXECUTIVE_MANAGER(${actorName || "-"})`;

      const wfForMsg = {
        ...wf,
        id,
        __employeeName: senderName,
        __actorLabel: actorLabel,
        __decisionReason: comment,
      };

      await sendLineToUids([wf.uid], buildLineLeaveMessage("REJECTED_FINAL", wfForMsg));

      await sendLineToRole(
        "EXECUTIVE_MANAGER",
        `[LEAVE] ❌ ไม่อนุมัติ (จบคำร้อง)
เลขคำร้อง: ${wf.requestNo || id}
พนักงาน: ${senderName} (${wf.employeeNo || "-"})
ผู้ดำเนินการ: ${actorName || "-"}
เหตุผล: ${comment || "-"}`
      );

      await sendLineToRole(
        "HR",
        `[LEAVE] ❌ ผู้บริหารไม่อนุมัติ (จบคำร้อง)
เลขคำร้อง: ${wf.requestNo || id}
พนักงาน: ${senderName} (${wf.employeeNo || "-"})
ผู้ดำเนินการ: ${actorName || "-"}
เหตุผล: ${comment || "-"}`
      );

      await nsSet(ref, "execRejectedAt");
    }

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
    const actorName = await pickActorNameAsync(req);

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
      managerActionBy:
        canceledByRole === "EXECUTIVE_MANAGER" ? actor : wf.managerActionBy || null,

      status: "CANCELED",
      decidedAt: nowTs(),
      decisionNote: reason || null,
      updatedAt: nowTs(),
    };

    await ref.set(patch, { merge: true });

    await createNotification({
      toUid: wf.uid,
      toRole: "EMPLOYEE",
      type: "LEAVE_FINAL",
      title: "คำร้องถูกยกเลิก",
      message: `เลขคำร้อง ${wf.requestNo || id} ถูกยกเลิกโดย ${canceledByRole}`,
      ref: { col: LEAVE_COL, id },
      meta: { overallStatus: "CANCELED", canceledByRole, reason },
    });

    const actorRole =
      canceledByRole === "EXECUTIVE_MANAGER"
        ? "EXEC"
        : canceledByRole === "HR"
        ? "HR"
        : canceledByRole === "ADMIN"
        ? "ADMIN"
        : "OWNER";

    // ✅ กันส่งซ้ำ CANCELED (notifyState.cancelledAt)
    if (!nsGet(wf, "cancelledAt")) {
      const empDoc = await getEmployeeDocByNo(wf.employeeNo);
      const senderName = fullNameFromEmp(empDoc) || wf.employeeName || "-";

      const actorLabel = `${canceledByRole}(${actorName || "-"})`;
      const wfForMsg = {
        ...wf,
        id,
        __employeeName: senderName,
        __actorLabel: actorLabel,
        __decisionReason: reason,
      };

      // ส่งถึงผู้ยื่น
      await sendLineToUids([wf.uid], buildLineLeaveMessage("CANCELED_FINAL", wfForMsg));

      // แจ้ง HR
      await sendLineToRole("HR", buildLineLeaveMessage("CANCELED_FINAL", wfForMsg));

      // ถ้าเคสเคยไปถึงขั้นผู้บริหารแล้ว ค่อยแจ้ง EXEC ด้วย (กัน spam)
      if (asUpper(wf.overallStatus) === "PENDING_MANAGER" || asUpper(wf.managerStatus) === "PENDING") {
        await sendLineToRole("EXECUTIVE_MANAGER", buildLineLeaveMessage("CANCELED_FINAL", wfForMsg));
      }

      await nsSet(ref, "cancelledAt");
    }

    // NOTE:
    // เดิมมีการเรียกใช้ตัวแปร msgCancelLog ที่ไม่ได้ประกาศไว้ ซึ่งเสี่ยงทำให้ route cancel พัง
    // ตรงนี้ไม่ต้องส่งซ้ำแล้ว เพราะด้านบนได้ส่ง CANCELED_FINAL ให้ EXEC แบบกันซ้ำไว้แล้ว

    // (optional) ถ้า owner cancel ระหว่าง pending HR/EXEC -> แจ้งคนอนุมัติให้รู้ด้วย (in-app)
    if (canceledByRole === "OWNER") {
      const hrs = await findUsersByRole("HR");
      await Promise.all(
        hrs.map((u) =>
          createNotification({
            toUid: u.uid,
            toRole: "HR",
            type: "LEAVE_FINAL",
            title: "คำร้องถูกยกเลิกโดยพนักงาน",
            message: `เลขคำร้อง ${wf.requestNo || id} ถูกยกเลิกโดยผู้ยื่น`,
            ref: { col: LEAVE_COL, id },
            meta: { overallStatus: "CANCELED", reason },
          })
        )
      );

      if (asUpper(wf.overallStatus) === "PENDING_MANAGER") {
        const execs = await findUsersByRole("EXECUTIVE_MANAGER");
        await Promise.all(
          execs.map((u) =>
            createNotification({
              toUid: u.uid,
              toRole: "EXECUTIVE_MANAGER",
              type: "LEAVE_FINAL",
              title: "คำร้องถูกยกเลิกโดยพนักงาน",
              message: `เลขคำร้อง ${wf.requestNo || id} ถูกยกเลิกโดยผู้ยื่น`,
              ref: { col: LEAVE_COL, id },
              meta: { overallStatus: "CANCELED", reason },
            })
          )
        );
      }
    }

    return res.json({ ok: true, id, patch });
  } catch (err) {
    console.error("/leave-requests/:id/cancel error:", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: String(err?.message || err) });
  }
});
// ----------------- ✅ BACKFILL LEAVE UNITS -----------------
function parseLocalDateTime(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isNonWorkingDay(d) {
  const day = d.getDay();
  return day === 0; // หยุดเฉพาะวันอาทิตย์
}

function overlapMinutes(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

// ✅ คิดเฉพาะเวลางาน 09:00–12:00 และ 13:00–18:00
// ✅ ไม่นับพักเที่ยง 12:00–13:00
function computeBusinessLeaveMinutes(startAt, endAt) {
  const start = parseLocalDateTime(startAt);
  const end = parseLocalDateTime(endAt);

  if (!start || !end) return 0;
  if (end <= start) return 0;

  let total = 0;
  let cursor = startOfDay(start);
  const last = startOfDay(end);

  while (cursor.getTime() <= last.getTime()) {
    if (!isNonWorkingDay(cursor)) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const d = cursor.getDate();

      const work1Start = new Date(y, m, d, 9, 0, 0, 0);
      const work1End = new Date(y, m, d, 12, 0, 0, 0);

      const work2Start = new Date(y, m, d, 13, 0, 0, 0);
      const work2End = new Date(y, m, d, 18, 0, 0, 0);

      total += overlapMinutes(start, end, work1Start, work1End);
      total += overlapMinutes(start, end, work2Start, work2End);
    }

    cursor = addDays(cursor, 1);
  }

  return total;
}

function roundLeaveUnits(v) {
  return Number(Number(v || 0).toFixed(6));
}

function formatLeaveHumanFromMinutes(totalMinutes) {
  const mins = Math.max(0, Math.floor(Number(totalMinutes || 0)));
  const days = Math.floor(mins / 480);
  const remAfterDays = mins % 480;
  const hours = Math.floor(remAfterDays / 60);
  const minutes = remAfterDays % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  if (!parts.length) parts.push(`0 นาที`);

  return parts.join(" ");
}

function toFiniteNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sameNumber(a, b, eps = 1e-9) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) <= eps;
}

function isRejectedOrCanceledLeave(data = {}) {
  const upperValues = [data.status, data.overallStatus, data.hrStatus, data.managerStatus].map((v) =>
    asUpper(v)
  );

  if (
    upperValues.some((v) =>
      [
        "REJECTED",
        "CANCELED",
        "CANCELLED",
        "REJECTED_BY_HR",
        "REJECTED_BY_MANAGER",
      ].includes(v)
    )
  ) {
    return true;
  }

  const rawValues = [data.status, data.overallStatus].map((v) => String(v || "").trim()).filter(Boolean);

  if (rawValues.some((v) => ["ไม่อนุมัติ", "ยกเลิก"].includes(v))) {
    return true;
  }

  return false;
}

function pushSample(samples, item, sampleLimit) {
  if (samples.length < sampleLimit) samples.push(item);
}

function addReason(reasonCounts, key) {
  reasonCounts[key] = (reasonCounts[key] || 0) + 1;
}

function evaluateBackfillDoc(snap, { onlyMissing = true } = {}) {
  const data = snap.data() || {};
  const id = snap.id;

  if (isRejectedOrCanceledLeave(data)) {
    return {
      kind: "skip",
      reason: "REJECTED_OR_CANCELED",
      sample: {
        id,
        action: "skip",
        reason: "REJECTED_OR_CANCELED",
        status: data.status || null,
        overallStatus: data.overallStatus || null,
      },
    };
  }

  const startAt = String(data.startAt || "").trim();
  const endAt = String(data.endAt || "").trim();

  if (!startAt || !endAt) {
    return {
      kind: "skip",
      reason: "MISSING_START_OR_END",
      sample: {
        id,
        action: "skip",
        reason: "MISSING_START_OR_END",
        startAt: startAt || null,
        endAt: endAt || null,
      },
    };
  }

  const oldLeaveMinutes = toFiniteNumberOrNull(data.leaveMinutes);
  const oldLeaveUnits = toFiniteNumberOrNull(data.leaveUnits);
  const oldWorkdaysCount = toFiniteNumberOrNull(data.workdaysCount);

  if (onlyMissing && oldLeaveUnits !== null) {
    return {
      kind: "skip",
      reason: "ALREADY_HAS_LEAVE_UNITS",
      sample: {
        id,
        action: "skip",
        reason: "ALREADY_HAS_LEAVE_UNITS",
        oldLeaveUnits,
      },
    };
  }

  const leaveMinutes = computeBusinessLeaveMinutes(startAt, endAt);
  const leaveUnits = roundLeaveUnits(leaveMinutes / 480);

  const patch = {
    leaveMinutes,
    leaveUnits,
    workdaysCount: leaveUnits,
    updatedAt: nowTs(),
  };

  const noChange =
    oldLeaveMinutes === leaveMinutes &&
    sameNumber(oldLeaveUnits, leaveUnits) &&
    sameNumber(oldWorkdaysCount, leaveUnits);

  if (noChange) {
    return {
      kind: "unchanged",
      reason: "NO_CHANGE",
      sample: {
        id,
        action: "skip",
        reason: "NO_CHANGE",
        startAt,
        endAt,
        leaveMinutes,
        leaveUnits,
        human: formatLeaveHumanFromMinutes(leaveMinutes),
      },
    };
  }

  return {
    kind: "ready",
    reason: "READY",
    patch,
    sample: {
      id,
      action: "preview",
      startAt,
      endAt,
      oldLeaveMinutes,
      oldLeaveUnits,
      oldWorkdaysCount,
      newLeaveMinutes: leaveMinutes,
      newLeaveUnits: leaveUnits,
      human: formatLeaveHumanFromMinutes(leaveMinutes),
    },
  };
}

/**
 * POST /admin/backfill-leave-units
 * body:
 * {
 *   apply?: boolean,        // false = dry-run
 *   pageSize?: number,      // default 200, max 400
 *   cursor?: string,        // doc id ของตัวสุดท้ายจากรอบก่อน
 *   runAllPages?: boolean,  // true = ไล่ทั้ง collection ใน request เดียว (เหมาะ local)
 *   maxDocs?: number,       // 0 = ไม่จำกัด
 *   onlyMissing?: boolean,  // default true
 *   docIds?: string[],      // ระบุ doc id เฉพาะที่อยากทำ
 *   sampleLimit?: number    // default 30
 * }
 */
app.post("/admin/backfill-leave-units", requireAuth, async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== "ADMIN") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_ADMIN_ONLY" });
    }

    const apply = req.body?.apply === true;
    const runAllPages = req.body?.runAllPages === true;
    const onlyMissing = req.body?.onlyMissing !== false;

    const pageSize = Math.max(1, Math.min(Number(req.body?.pageSize || 200), 400));
    const maxDocs = Math.max(0, Math.min(Number(req.body?.maxDocs || 0), 50000));
    const sampleLimit = Math.max(1, Math.min(Number(req.body?.sampleLimit || 30), 100));

    const inputCursor = String(req.body?.cursor || "").trim() || null;

    const docIds = Array.isArray(req.body?.docIds)
      ? Array.from(new Set(req.body.docIds.map((x) => String(x || "").trim()).filter(Boolean)))
      : [];

    const summary = {
      scanned: 0,
      ready: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      pages: 0,
    };

    const reasonCounts = {};
    const samples = [];

    async function processDocs(docs) {
      if (!docs.length) return;

      summary.pages += 1;

      let batch = apply ? db.batch() : null;
      let pendingWrites = 0;

      for (const snap of docs) {
        if (maxDocs > 0 && summary.scanned >= maxDocs) break;

        summary.scanned += 1;

        const result = evaluateBackfillDoc(snap, { onlyMissing });

        if (result.kind === "skip") {
          summary.skipped += 1;
          addReason(reasonCounts, result.reason);
          pushSample(samples, result.sample, sampleLimit);
          continue;
        }

        if (result.kind === "unchanged") {
          summary.unchanged += 1;
          addReason(reasonCounts, result.reason);
          pushSample(samples, result.sample, sampleLimit);
          continue;
        }

        summary.ready += 1;
        addReason(reasonCounts, result.reason);

        const sample = {
          ...result.sample,
          action: apply ? "updated" : "preview",
        };
        pushSample(samples, sample, sampleLimit);

        if (apply) {
          batch.set(snap.ref, result.patch, { merge: true });
          pendingWrites += 1;
          summary.updated += 1;

          if (pendingWrites >= 400) {
            await batch.commit();
            batch = db.batch();
            pendingWrites = 0;
          }
        }
      }

      if (apply && batch && pendingWrites > 0) {
        await batch.commit();
      }
    }

    if (docIds.length > 0) {
      const chunkSize = 200;

      for (let i = 0; i < docIds.length; i += chunkSize) {
        if (maxDocs > 0 && summary.scanned >= maxDocs) break;

        const chunk = docIds.slice(i, i + chunkSize);
        const snaps = await Promise.all(chunk.map((id) => db.collection(LEAVE_COL).doc(id).get()));
        const existingDocs = snaps.filter((s) => s.exists);

        if (existingDocs.length > 0) {
          await processDocs(existingDocs);
        }

        const missingCount = chunk.length - existingDocs.length;
        if (missingCount > 0) {
          summary.skipped += missingCount;
          addReason(reasonCounts, "DOC_NOT_FOUND");
        }
      }

      return res.json({
        ok: true,
        apply,
        mode: "docIds",
        runAllPages: false,
        onlyMissing,
        pageSize: null,
        maxDocs,
        cursor: null,
        nextCursor: null,
        hasMore: false,
        summary,
        reasonCounts,
        samples,
      });
    }

    let cursor = inputCursor;
    let hasMore = false;
    let nextCursor = null;

    do {
      let query = db.collection(LEAVE_COL).orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snap = await query.get();

      if (snap.empty) {
        hasMore = false;
        nextCursor = null;
        break;
      }

      await processDocs(snap.docs);

      const lastDoc = snap.docs[snap.docs.length - 1];
      cursor = lastDoc.id;

      const reachedMaxDocs = maxDocs > 0 && summary.scanned >= maxDocs;
      hasMore = snap.size === pageSize && !reachedMaxDocs;
      nextCursor = hasMore ? cursor : null;

      if (!runAllPages) {
        break;
      }
    } while (hasMore);

    return res.json({
      ok: true,
      apply,
      mode: runAllPages ? "collection_run_all" : "collection_page",
      runAllPages,
      onlyMissing,
      pageSize,
      maxDocs,
      cursor: inputCursor,
      nextCursor,
      hasMore,
      summary,
      reasonCounts,
      samples,
    });
  } catch (err) {
    console.error("/admin/backfill-leave-units error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});
// ----------------- ✅ Files Router (Supabase) -----------------
const filesRouter = require("./files.supabase.routes");
// ✅ iOS/Safari มัก cache signed-url response ทำให้เอา URL เก่าที่หมดอายุไปใช้ต่อ
app.use(
  "/files",
  (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  },
  filesRouter
);

// ----------------- Listen -----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log("✅ API running on :", port));