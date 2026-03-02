// src/utils/requestNo.ts
import {
  type Firestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const LOCK_COL = "request_no_locks";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function rand4(): string {
  // Prefer cryptographically-strong randomness when available (browser)
  try {
    const g: any = globalThis as any;
    if (g?.crypto?.getRandomValues) {
      const bytes = new Uint8Array(4);
      g.crypto.getRandomValues(bytes);
      let out = "";
      for (const b of bytes) out += CHARS[b % CHARS.length];
      return out;
    }
  } catch {
    // ignore
  }

  // Fallback
  let out = "";
  for (let i = 0; i < 4; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

export function leavePrefix(category?: string) {
  const c = String(category || "").trim();
  // Thai
  if (c === "ลาพักร้อน") return "FM-HR-004-";
  if (c === "ลากิจ" || c === "ลาป่วย" || c === "ลากรณีพิเศษ") return "FM-HR-003-";

  // English fallbacks (if any)
  const u = c.toUpperCase();
  if (u.includes("ANNUAL") || u.includes("VACATION")) return "FM-HR-004-";
  if (u.includes("SICK") || u.includes("PERSONAL") || u.includes("SPECIAL")) return "FM-HR-003-";

  // Default
  return "FM-HR-003-";
}

export function makeLeaveRequestNo(category?: string) {
  return `${leavePrefix(category)}${rand4()}`;
}

export function makeFieldWorkRequestNo() {
  return `FM-HR-005-${rand4()}`;
}

/**
 * Create a document with a requestNo that is guaranteed unique by locking:
 * - lock doc id == requestNo (collection: request_no_locks)
 * - transaction ensures no duplicate requestNo
 */
export async function createWithUniqueRequestNo<T extends Record<string, any>>(args: {
  db: Firestore;
  colName: string;
  data: T;
  ownerUid: string;
  makeNo: () => string;
  maxRetry?: number;
}): Promise<{ id: string; requestNo: string }> {
  const { db, colName, data, ownerUid, makeNo } = args;
  const maxRetry = args.maxRetry ?? 25;

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    const requestNo = makeNo();
    const reqRef = doc(collection(db, colName));
    const lockRef = doc(db, LOCK_COL, requestNo);

    try {
      await runTransaction(db, async (tx) => {
        // ✅ Web SDK ไม่มี tx.create -> ใช้ tx.get + tx.set
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists()) {
          throw new Error("REQNO_DUP");
        }

        tx.set(lockRef, {
          requestNo,
          colName,
          requestId: reqRef.id,
          ownerUid,
          createdAt: serverTimestamp(),
        });

        tx.set(reqRef, {
          ...data,
          requestNo,
          createdAt: serverTimestamp(),
        });
      });

      return { id: reqRef.id, requestNo };
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("REQNO_DUP")) continue; // ✅ ชน -> สุ่มใหม่
      throw e;
    }
  }

  throw new Error("REQNO_RETRY_EXCEEDED");
}