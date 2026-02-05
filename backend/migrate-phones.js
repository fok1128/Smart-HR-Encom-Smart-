/**
 * backend/migrate-phones.js
 * เปลี่ยน employees: phone (string) -> phones (array)
 *
 * Rules:
 * - ถ้า phones ยังไม่มี และมี phone -> phones=[phone]
 * - ถ้า phones เป็น string/object แปลกๆ -> แปลงให้เป็น array
 * - ถ้า phones เป็น array ว่าง แต่มี phone -> เติม phone เข้าไป
 * - ลบค่าว่าง + ลบซ้ำ
 * - ตั้ง phone = phones[0] เพื่อ compatibility
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ----------------- Firebase Admin Init (copy style from server.js) -----------------
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

    if (typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }

    const required = ["project_id", "client_email", "private_key"];
    const missing = required.filter((k) => !sa[k]);
    if (missing.length) {
      throw new Error(`❌ FIREBASE_SERVICE_ACCOUNT missing fields: ${missing.join(", ")}`);
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

  // 2) Local: ถ้ามี GOOGLE_APPLICATION_CREDENTIALS
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
      throw new Error(`❌ Credential file missing fields: ${missing.join(", ")}`);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id,
    });

    console.log("✅ Firebase Admin initialized (GOOGLE_APPLICATION_CREDENTIALS) project:", sa.project_id);
    return;
  }

  // 3) Local fallback: ใช้ serviceAccountKey.json ในโฟลเดอร์ backend (ถ้ามี)
  const localSAPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(localSAPath)) {
    const sa = JSON.parse(fs.readFileSync(localSAPath, "utf8"));
    if (typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id,
    });
    console.log("✅ Firebase Admin initialized (serviceAccountKey.json) project:", sa.project_id);
    return;
  }

  // 4) applicationDefault
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log("✅ Firebase Admin initialized (applicationDefault)");
}

function normalizePhones(phones, phone) {
  let arr = [];

  if (Array.isArray(phones)) {
    arr = phones.map((x) => String(x).trim()).filter(Boolean);
  } else if (phones != null) {
    // phones มีค่าแต่ไม่ใช่ array เช่น string เดียว
    arr = [String(phones).trim()].filter(Boolean);
  }

  const p = typeof phone === "string" ? phone.trim() : "";
  if (arr.length === 0 && p) arr = [p];

  // ลบซ้ำ
  arr = Array.from(new Set(arr));
  return arr;
}

async function main() {
  initFirebaseAdmin();
  const db = admin.firestore();

  const snap = await db.collection("employees").get();
  console.log("employees docs:", snap.size);

  const BATCH_LIMIT = 400;
  let batch = db.batch();
  let ops = 0;
  let updated = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const phones = data.phones;
    const phone = data.phone;

    const newPhones = normalizePhones(phones, phone);

    // ต้องอัปเดตเมื่อ:
    // - phones ไม่ใช่ array
    // - phones array แต่ค่าต่าง
    // - ไม่มี phones แต่มี phone
    const currentPhones = Array.isArray(phones)
      ? phones.map((x) => String(x).trim()).filter(Boolean)
      : null;

    const needUpdate =
      !Array.isArray(phones) ||
      (Array.isArray(phones) && (currentPhones || []).join("|") !== newPhones.join("|")) ||
      (!phones && typeof phone === "string" && phone.trim());

    if (!needUpdate) continue;

    batch.update(docSnap.ref, {
      phones: newPhones,
      // ✅ เก็บ phone เป็นตัวแรกไว้เผื่อหน้าเก่ายังใช้ phone
      phone: newPhones[0] || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    ops++;
    updated++;

    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      console.log("Committed batch:", ops);
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
    console.log("Committed final batch:", ops);
  }

  console.log("Updated docs:", updated);
  console.log("Done ✅");
}

main().catch((e) => {
  console.error("❌ migrate failed:", e);
  process.exit(1);
});
