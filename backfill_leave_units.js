#!/usr/bin/env node

/**
 * One-time backfill for leave_requests
 * - Recomputes leaveMinutes / leaveUnits / workdaysCount for old records
 * - Uses company working hours 09:00-12:00 and 13:00-18:00
 * - Excludes lunch break 12:00-13:00 completely
 * - 1 workday = 480 minutes
 *
 * Usage:
 *   node backfill_leave_units.js --serviceAccount ./serviceAccount.json --dry-run
 *   node backfill_leave_units.js --serviceAccount ./serviceAccount.json --apply
 *   node backfill_leave_units.js --serviceAccount ./serviceAccount.json --apply --docIds id1,id2,id3
 *   node backfill_leave_units.js --serviceAccount ./serviceAccount.json --apply --force
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const MINUTES_PER_WORKDAY = 8 * 60; // 480
const SLOT_1_START = 9 * 60;   // 09:00
const SLOT_1_END = 12 * 60;    // 12:00
const SLOT_2_START = 13 * 60;  // 13:00
const SLOT_2_END = 18 * 60;    // 18:00

function parseArgs(argv) {
  const out = {
    serviceAccount: '',
    dryRun: false,
    apply: false,
    force: false,
    docIds: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--apply') out.apply = true;
    else if (a === '--force') out.force = true;
    else if (a === '--serviceAccount') out.serviceAccount = argv[++i] || '';
    else if (a === '--docIds') out.docIds = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function parseLocalDateTime(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function overlapMinutes(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

function computeMinutesForDate(dateCursor, startAt, endAt) {
  if (isWeekend(dateCursor)) return 0;

  const dayStart = startOfDay(dateCursor);
  const nextDay = addDays(dayStart, 1);

  const rangeStart = Math.max(startAt.getTime(), dayStart.getTime());
  const rangeEnd = Math.min(endAt.getTime(), nextDay.getTime());
  if (rangeEnd <= rangeStart) return 0;

  const effectiveStart = new Date(rangeStart);
  const effectiveEnd = new Date(rangeEnd);

  const startMin = minutesOfDay(effectiveStart);
  const endMin = minutesOfDay(effectiveEnd);

  // If the effective end lands exactly at midnight of next day, count it as 24:00 for the current day window clipping.
  const normalizedEnd =
    effectiveEnd.getHours() === 0 && effectiveEnd.getMinutes() === 0 && effectiveEnd.getTime() === nextDay.getTime()
      ? 24 * 60
      : endMin;

  const part1 = overlapMinutes(startMin, normalizedEnd, SLOT_1_START, SLOT_1_END);
  const part2 = overlapMinutes(startMin, normalizedEnd, SLOT_2_START, SLOT_2_END);
  return part1 + part2;
}

function countCoveredWorkdays(startAt, endAt) {
  let total = 0;
  let cursor = startOfDay(startAt);
  const endDay = startOfDay(endAt);

  while (cursor.getTime() <= endDay.getTime()) {
    const minutes = computeMinutesForDate(cursor, startAt, endAt);
    if (minutes > 0) total += 1;
    cursor = addDays(cursor, 1);
  }

  return total;
}

function round4(n) {
  return Number(Number(n || 0).toFixed(4));
}

function formatMinutesHuman(totalMinutes) {
  const mins = Math.max(0, Math.round(Number(totalMinutes || 0)));
  const days = Math.floor(mins / MINUTES_PER_WORKDAY);
  const remAfterDays = mins % MINUTES_PER_WORKDAY;
  const hours = Math.floor(remAfterDays / 60);
  const minutes = remAfterDays % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  if (!parts.length) return '0 นาที';
  return parts.join(' ');
}

function recalcLeave(doc) {
  const startAt = parseLocalDateTime(doc.startAt);
  const endAt = parseLocalDateTime(doc.endAt);
  if (!startAt || !endAt) {
    return { ok: false, reason: 'INVALID_DATETIME' };
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return { ok: false, reason: 'END_BEFORE_START' };
  }

  let minutes = 0;
  let cursor = startOfDay(startAt);
  const endDay = startOfDay(endAt);
  while (cursor.getTime() <= endDay.getTime()) {
    minutes += computeMinutesForDate(cursor, startAt, endAt);
    cursor = addDays(cursor, 1);
  }

  const leaveUnits = round4(minutes / MINUTES_PER_WORKDAY);
  const coveredWorkdays = countCoveredWorkdays(startAt, endAt);

  return {
    ok: true,
    leaveMinutes: minutes,
    leaveUnits,
    // Set legacy field to same unit value so older screens that still read workdaysCount won't inflate to full days.
    workdaysCount: leaveUnits,
    coveredWorkdays,
    human: formatMinutesHuman(minutes),
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.serviceAccount) {
    console.error('Missing --serviceAccount path');
    process.exit(1);
  }

  if (!args.apply && !args.dryRun) {
    console.error('Choose one: --dry-run or --apply');
    process.exit(1);
  }

  const saPath = path.resolve(process.cwd(), args.serviceAccount);
  if (!fs.existsSync(saPath)) {
    console.error(`Service account file not found: ${saPath}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  let snap;
  if (args.docIds.length) {
    const refs = args.docIds.map((id) => db.collection('leave_requests').doc(id));
    snap = { docs: await db.getAll(...refs).then((docs) => docs.map((d) => d)) };
  } else {
    snap = await db.collection('leave_requests').get();
  }

  let scanned = 0;
  let skipped = 0;
  let changed = 0;
  let invalid = 0;

  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    scanned += 1;
    if (!docSnap.exists) {
      skipped += 1;
      continue;
    }

    const data = docSnap.data() || {};
    const mode = String(data.mode || '').trim();
    const startAt = String(data.startAt || '').trim();
    const endAt = String(data.endAt || '').trim();

    if (!startAt || !endAt) {
      skipped += 1;
      continue;
    }

    // Focus on time-based requests. If your data only uses mode=time, this covers everything relevant.
    if (mode && mode !== 'time') {
      skipped += 1;
      continue;
    }

    if (!args.force && typeof data.leaveUnits === 'number' && typeof data.leaveMinutes === 'number') {
      skipped += 1;
      continue;
    }

    const recalculated = recalcLeave(data);
    if (!recalculated.ok) {
      invalid += 1;
      console.warn(`[SKIP INVALID] ${docSnap.id} ${data.requestNo || ''} -> ${recalculated.reason}`);
      continue;
    }

    const next = {
      leaveMinutes: recalculated.leaveMinutes,
      leaveUnits: recalculated.leaveUnits,
      workdaysCount: recalculated.workdaysCount,
      calcMeta: {
        version: 1,
        source: 'one_time_backfill',
        coveredWorkdays: recalculated.coveredWorkdays,
        workSchedule: '09:00-12:00,13:00-18:00',
        minutesPerWorkday: MINUTES_PER_WORKDAY,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    };

    const prevUnits = typeof data.leaveUnits === 'number' ? data.leaveUnits : null;
    const prevDays = typeof data.workdaysCount === 'number' ? data.workdaysCount : null;

    console.log(
      `[${args.apply ? 'APPLY' : 'DRY'}] ${docSnap.id} ${data.requestNo || ''} | ` +
        `prev workdays=${prevDays} prev units=${prevUnits} -> ` +
        `minutes=${recalculated.leaveMinutes} (${recalculated.human}) units=${recalculated.leaveUnits}`
    );

    changed += 1;

    if (args.apply) {
      batch.set(docSnap.ref, next, { merge: true });
      batchCount += 1;

      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (args.apply && batchCount > 0) {
    await batch.commit();
  }

  console.log('');
  console.log('========== DONE ==========');
  console.log(`scanned : ${scanned}`);
  console.log(`changed : ${changed}`);
  console.log(`skipped : ${skipped}`);
  console.log(`invalid : ${invalid}`);
  console.log(`mode    : ${args.apply ? 'APPLY' : 'DRY-RUN'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
