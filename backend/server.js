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

 // ----------------- ✅ NOTIFICATIONS + SMS (DETAIL) -----------------
 const NOTI_COL = "notifications";

 function fmtDateThaiLike(x) {
   try {
     const d = x?.toDate ? x.toDate() : (x ? new Date(x) : null);
     if (!d || isNaN(d.getTime())) return "-";
     const yyyy = d.getFullYear();
     const mm = String(d.getMonth() + 1).padStart(2, "0");
     const dd = String(d.getDate()).padStart(2, "0");
     return `${yyyy}-${mm}-${dd}`;
   } catch {
     return "-";
   }
 }

 function fmtDateTimeThaiLike(x) {
   try {
     const d = x?.toDate ? x.toDate() : (x ? new Date(x) : null);
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
   // ของคุณมี mode: "allDay" | "time"
   const mode = String(leave?.mode || "").trim();
   if (mode && mode !== "time") return "ทั้งวัน";

   const s = String(leave?.startAt || "").trim();
   const e = String(leave?.endAt || "").trim();

   // รูปแบบตัวอย่าง: 2026-02-20T11:45
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

 function pickActorName(req) {
   const f = String(req.user?.fname || "").trim();
   const l = String(req.user?.lname || "").trim();
   const full = `${f} ${l}`.trim();
   return full || pickStr(req.user?.name, req.user?.displayName, req.user?.email, "SYSTEM");
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
   const role = String(roleUpper || "").trim().toUpperCase();
   if (!role) return [];
   const snap = await db.collection("users").where("role", "==", role).get();
   return snap.docs
     .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
     .filter((u) => {
       // ใน DB ของคุณ active เป็น "true" (string) — รองรับทั้ง boolean ด้วย
       const a = u.active;
       return a === true || String(a || "").toLowerCase() === "true";
     });
 }

 async function getEmployeeDocByNo(employeeNo) {
   const no = String(employeeNo || "").trim();
   if (!no) return null;
   const snap = await db.collection("employees").doc(no).get();
   return snap.exists ? { id: snap.id, ...(snap.data() || {}) } : null;
 }

 function pickOwnerPhoneFromData(wf, empDoc) {
   // ลำดับ: leave_requests.phone -> employees.phone -> employees.phones[0]
   const p1 = pickStr(wf.phone);
   const p2 = pickStr(empDoc?.phone);
   const p3 = Array.isArray(empDoc?.phones) ? pickStr(empDoc.phones[0]) : "";
   return p1 || p2 || p3 || "";
 }

 function buildSmsText({ stage, decision, wf, actorRole, actorName, reason }) {
   // wf = leave doc หลัง normalize/derive
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

async function pickOwnerContact(wf) {
  // ใช้ employeeNo จาก leave_requests เพื่อดึง employees/{employeeNo}
  const empNo = wf.employeeNo || (wf.user && wf.user.employeeNo);
  const empDoc = await getEmployeeDocByNo(empNo);
  return pickOwnerPhoneFromData(wf, empDoc);
}

 // ----------------- ✅ PHONE + SMS HELPERS -----------------
function normalizeThaiPhone(p) {
  const s = String(p || "").replace(/[^0-9+]/g, "");
  if (!s) return "";
  if (s.startsWith("+66")) return s;
  if (s.startsWith("0") && s.length >= 9) return "+66" + s.slice(1);
  if (s.startsWith("66")) return "+66" + s.slice(2);
  return s;
}

async function getEmployeeNoByUid(uid) {
  const id = String(uid || "").trim();
  if (!id) return "";
  const us = await db.collection("users").doc(id).get();
  if (!us.exists) return "";
  return String(us.data()?.employeeNo || "").trim();
}

async function getPhoneByEmployeeNo(employeeNo) {
  const no = String(employeeNo || "").trim();
  if (!no) return "";
  const empDoc = await getEmployeeDocByNo(no);
  if (!empDoc) return "";
  const p = pickStr(empDoc.phone, Array.isArray(empDoc.phones) ? empDoc.phones[0] : "");
  return normalizeThaiPhone(p);
}

async function getPhoneByUid(uid) {
  const empNo = await getEmployeeNoByUid(uid);
  return await getPhoneByEmployeeNo(empNo);
}

// TODO: ผูก SMS provider จริงทีหลัง (ตอนนี้ log เพื่อทดสอบ flow)
// TODO: ผูก SMS provider จริงทีหลัง (ตอนนี้แค่ log เพื่อทดสอบ flow)
async function sendSmsMaybe({ to, message }) {
  const phone = normalizeThaiPhone(to);
  if (!phone || !message) return { ok: false, to: phone || to, message };
  console.log("[SMS] to:", phone, "\n" + message);
  return { ok: true, to: phone, message };
}

// ✅ ส่ง SMS ไปตาม role (ดึงเบอร์จาก users -> employees)
async function getPhonesByRole(role) {
  const R = asUpper(role);
  const out = new Set();

  // 1) users ที่ role ตรงกัน
  const usersSnap = await db.collection("users").where("role", "==", R).get();

  for (const doc of usersSnap.docs) {
    const u = doc.data() || {};

    // เผื่อบางโปรเจกต์มี phone ใน users เลย
    const direct = pickStr(u.phone, ...(Array.isArray(u.phones) ? u.phones : []));
    if (direct) out.add(direct);

    // 2) ไปดึง employees/{employeeNo} เพื่อเอา phone
    const employeeNo = pickStr(u.employeeNo, u.employee_id, u.empNo);
    if (!employeeNo) continue;

    const empSnap = await db.collection("employees").doc(String(employeeNo)).get();
    if (!empSnap.exists) continue;

    const emp = empSnap.data() || {};
    const empPhone = pickStr(emp.phone, ...(Array.isArray(emp.phones) ? emp.phones : []));
    if (empPhone) out.add(empPhone);
  }

  return Array.from(out);
}

async function sendSmsToRole(role, message) {
  const phones = await getPhonesByRole(role);
  const results = [];

  for (const p of phones) {
    results.push(await sendSmsMaybe({ to: p, message }));
  }

  return { ok: true, role: asUpper(role), count: phones.length, results };
}
  const API_KEY = process.env.THAIBULK_API_KEY || "";
  const API_SECRET = process.env.THAIBULK_API_SECRET || "";
  const SENDER = process.env.THAIBULK_SENDER || ""; // แนะนำให้ตั้งใน Render

  // ถ้ายังไม่ตั้งค่า key ให้ log เฉยๆ กันพัง
  if (!API_KEY || !API_SECRET) {
    console.log("[SMS-LOG-ONLY] to:", msisdn, "\n" + message);
    return { ok: true, mode: "LOG_ONLY" };
  }

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

  const body = new URLSearchParams({
    msisdn,
    message,
    ...(SENDER ? { sender: SENDER } : {}),
    force: "standard",
  }).toString();

  try {
    const res = await fetch("https://api-v2.thaibulksms.com/sms", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[SMS-ERROR]", msisdn, res.status, data);
      return { ok: false, status: res.status, data };
    }

    console.log("[SMS-SENT]", msisdn, data);
    return { ok: true, data };
  } catch (err) {
    console.error("[SMS-ERROR]", msisdn, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }

/**
 * POST /leave-requests/:id/notify-submit
 * ใช้กรณีที่ client สร้าง leave_requests ตรงผ่าน Firestore (addDoc) แล้วอยากให้ backend สร้าง notification ให้ HR
 * body: {}
 */
app.post("/leave-requests/:id/notify-submit", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const { data } = await getLeaveOrThrow(id);
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

    
// ✅ SMS: แจ้ง HR ทุกคน + แจ้งเจ้าของคำร้อง (รวมถึงกรณีเจ้าของเป็น HR/EXEC ด้วย)
const smsToHr = `[LEAVE] มีคำร้องลาใหม่\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})\nประเภท:${wf.category || "-"}•${wf.subType || "-"}\nลา:${fmtDateRangeFromLeave(wf)} เวลา:${fmtTimeRangeFromLeave(wf)}\nเข้าไปตรวจสอบในระบบ`;
await sendSmsToRole("HR", smsToHr);

const smsToOwner = `[LEAVE] ส่งคำร้องลาแล้ว\nเลข:${wf.requestNo || id}\nประเภท:${wf.category || "-"}•${wf.subType || "-"}\nลา:${fmtDateRangeFromLeave(wf)} เวลา:${fmtTimeRangeFromLeave(wf)}\nสถานะ: รอ HR ตรวจสอบ`;
await sendSmsToUids([wf.uid], smsToOwner);
return res.json({ ok: true, id, notified: hrs.length });
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

      // ✅ In-app: แจ้งเจ้าของคำร้องว่า HR อนุมัติแล้ว (ยังไม่สมบูรณ์)
      await createNotification({
        toUid: wf.uid,
        toRole: "EMPLOYEE",
        type: "LEAVE_STAGE1_APPROVED",
        title: "HR อนุมัติคำร้องแล้ว",
        message: `เลขคำร้อง ${wf.requestNo || id} HR อนุมัติแล้ว (รอผู้บริหาร)`,
        ref: { col: LEAVE_COL, id },
        meta: { overallStatus: "PENDING_MANAGER" },
      });

      // ✅ In-app: แจ้ง EXEC ทุกคนว่ามีคำร้องรออนุมัติขั้นสุดท้าย
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

      // ✅ SMS (รายละเอียดครบ)
      const toEmp = await pickOwnerContact(wf);
      if (toEmp) {
        const sms = buildSmsText({
          stage: "HR",
          decision: "APPROVED",
          wf: { ...wf, id },
          actorRole: "HR",
          actorName: pickActorName(req),
          reason: comment || null,
        });
        await sendSmsMaybe({ to: toEmp, message: sms });
      }

      
// ✅ SMS: แจ้ง EXEC ทุกคนว่ามีงานรออนุมัติขั้นสุดท้าย
const smsToExec = `[LEAVE] รออนุมัติขั้นสุดท้าย\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})\nประเภท:${wf.category || "-"}•${wf.subType || "-"}\nลา:${fmtDateRangeFromLeave(wf)} เวลา:${fmtTimeRangeFromLeave(wf)}\nโปรดอนุมัติในระบบ`;
await sendSmsToRole("EXECUTIVE_MANAGER", smsToExec);

// ✅ SMS: log ให้ HR ทุกคน (กันตกหล่น)
const smsHrLog = `[LEAVE] HR อนุมัติแล้ว (ส่งต่อผู้บริหาร)\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})`;
await sendSmsToRole("HR", smsHrLog);
return res.json({ ok: true, id, patch, notifiedExec: execs.length });
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

    // ✅ In-app: แจ้งเจ้าของคำร้องว่า HR ไม่อนุมัติ (จบคำร้อง)
    await createNotification({
      toUid: wf.uid,
      toRole: "EMPLOYEE",
      type: "LEAVE_FINAL",
      title: "คำร้องไม่อนุมัติ",
      message: `เลขคำร้อง ${wf.requestNo || id} ไม่อนุมัติโดย HR`,
      ref: { col: LEAVE_COL, id },
      meta: { overallStatus: "REJECTED_BY_HR", reason: comment },
    });

    // ✅ SMS (รายละเอียดครบ)
    const toEmp = await pickOwnerContact(wf);
    if (toEmp) {
      const sms = buildSmsText({
        stage: "HR",
        decision: "REJECTED",
        wf: { ...wf, id },
        actorRole: "HR",
        actorName: pickActorName(req),
        reason: comment,
      });
      await sendSmsMaybe({ to: toEmp, message: sms });
    }

    
// ✅ SMS: log ให้ HR ทุกคนว่าได้ตัดสินใจแล้ว (REJECT)
const smsHrLog = `[LEAVE] HR ไม่อนุมัติ (จบคำร้อง)\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})\nเหตุผล:${comment || "-"}`;
await sendSmsToRole("HR", smsHrLog);
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

      // ✅ In-app: แจ้งเจ้าของคำร้องว่า EXEC อนุมัติแล้ว (สมบูรณ์)
      await createNotification({
        toUid: wf.uid,
        toRole: "EMPLOYEE",
        type: "LEAVE_FINAL",
        title: "คำร้องอนุมัติแล้ว ✅",
        message: `เลขคำร้อง ${wf.requestNo || id} ผู้บริหารอนุมัติแล้ว (คำร้องสมบูรณ์)`,
        ref: { col: LEAVE_COL, id },
        meta: { overallStatus: "APPROVED" },
      });

      // ✅ SMS (รายละเอียดครบ)
      const toEmp = await pickOwnerContact(wf);
      if (toEmp) {
        const sms = buildSmsText({
          stage: "EXEC",
          decision: "APPROVED",
          wf: { ...wf, id },
          actorRole: "EXEC",
          actorName: pickActorName(req),
          reason: comment || null,
        });
        await sendSmsMaybe({ to: toEmp, message: sms });
      }

      
// ✅ SMS: log ให้ EXEC ทุกคนว่าได้อนุมัติแล้ว (ทีมเห็นตรงกัน)
const smsExecLog = `[LEAVE] ผู้บริหารอนุมัติแล้ว ✅\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})`;
await sendSmsToRole("EXECUTIVE_MANAGER", smsExecLog);

// ✅ SMS: log ให้ HR ทุกคนว่าเคสปิดแล้ว (APPROVED)
const smsHrFinal = `[LEAVE] คำร้องสมบูรณ์แล้ว ✅\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})\nผลลัพธ์: APPROVED`;
await sendSmsToRole("HR", smsHrFinal);
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

    // ✅ In-app: แจ้งเจ้าของคำร้องว่า EXEC ไม่อนุมัติ (จบคำร้อง)
    await createNotification({
      toUid: wf.uid,
      toRole: "EMPLOYEE",
      type: "LEAVE_FINAL",
      title: "คำร้องไม่อนุมัติ",
      message: `เลขคำร้อง ${wf.requestNo || id} ไม่อนุมัติโดยผู้บริหาร`,
      ref: { col: LEAVE_COL, id },
      meta: { overallStatus: "REJECTED_BY_MANAGER", reason: comment },
    });

    // ✅ SMS (รายละเอียดครบ)
    const toEmp = await pickOwnerContact(wf);
    if (toEmp) {
      const sms = buildSmsText({
        stage: "EXEC",
        decision: "REJECTED",
        wf: { ...wf, id },
        actorRole: "EXEC",
        actorName: pickActorName(req),
        reason: comment,
      });
      await sendSmsMaybe({ to: toEmp, message: sms });
    }

    
// ✅ SMS: log ให้ EXEC ทุกคนว่าได้ตัดสินใจแล้ว (REJECT)
const smsExecLog = `[LEAVE] ผู้บริหารไม่อนุมัติ (จบคำร้อง)\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})\nเหตุผล:${comment || "-"}`;
await sendSmsToRole("EXECUTIVE_MANAGER", smsExecLog);

// ✅ SMS: log ให้ HR ทุกคนว่าเคสปิดแล้ว (REJECTED_BY_MANAGER)
const smsHrFinal = `[LEAVE] คำร้องถูกปฏิเสธโดยผู้บริหาร\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})`;
await sendSmsToRole("HR", smsHrFinal);
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

    
// ✅ In-app: แจ้งเจ้าของคำร้องว่ามีการยกเลิก (จบคำร้อง)
await createNotification({
  toUid: wf.uid,
  toRole: "EMPLOYEE",
  type: "LEAVE_FINAL",
  title: "คำร้องถูกยกเลิก",
  message: `เลขคำร้อง ${wf.requestNo || id} ถูกยกเลิกโดย ${canceledByRole}`,
  ref: { col: LEAVE_COL, id },
  meta: { overallStatus: "CANCELED", canceledByRole, reason },
});

// ✅ SMS (รายละเอียดครบ)
const toEmp = await pickOwnerContact(wf);
if (toEmp) {
  // map role -> template stage/actorRole
  const actorRole =
    canceledByRole === "EXECUTIVE_MANAGER" ? "EXEC" :
    canceledByRole === "HR" ? "HR" :
    canceledByRole === "ADMIN" ? "ADMIN" : "OWNER";

  const sms = buildSmsText({
    stage: actorRole === "EXEC" ? "EXEC" : "HR",
    decision: "CANCELLED",
    wf: { ...wf, id },
    actorRole,
    actorName: pickActorName(req),
    reason,
  });
  await sendSmsMaybe({ to: toEmp, message: sms });
// ✅ SMS: แจ้งทีมอนุมัติทุกครั้งที่มีการยกเลิก
const smsCancelLog = `[LEAVE] ยกเลิกคำร้อง (CANCELED)\nเลข:${wf.requestNo || id}\nพนักงาน:${wf.employeeName || "-"} (${wf.employeeNo || "-"})\nผู้ยกเลิก:${canceledByRole}\nเหตุผล:${reason || "-"}`;
await sendSmsToRole("HR", smsCancelLog);

// ถ้าเคสเคยไปถึงขั้นผู้บริหารแล้ว ค่อยแจ้ง EXEC ด้วย (กัน spam เคสที่ยังไม่ถึง)
if (asUpper(wf.overallStatus) === "PENDING_MANAGER" || asUpper(wf.managerStatus) === "PENDING") {
  await sendSmsToRole("EXECUTIVE_MANAGER", smsCancelLog);
}

}

// (optional) ถ้า owner cancel ระหว่าง pending HR/EXEC -> แจ้งคนอนุมัติให้รู้ด้วย
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

// ----------------- ✅ Files Router (Supabase) -----------------
const filesRouter = require("./files.supabase.routes");
app.use("/files", filesRouter);

// ----------------- Listen -----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log("✅ API running on :", port));
