// api/lib/kv.js
// ---------------------------------------------------------------------------
// Thin wrapper around Vercel KV (Upstash Redis under the hood).
//
// WHY KV AND NOT A TRADITIONAL DATABASE:
// Redis keys support a native TTL (time-to-live). We set a hold's TTL to
// HOLD_HOURS and Redis deletes it automatically the second it expires —
// that's the entire "release the room back to everyone after 12 hours"
// requirement, with no cron job, no background worker, nothing to forget
// to run. When a booking is PAID, we re-save it without a TTL (or into a
// separate permanent list) so it survives.
//
// SETUP (one-time, in the Vercel dashboard):
//   1. Project -> Storage -> Create Database -> KV
//   2. Connect it to this project — Vercel auto-adds the KV_REST_API_URL /
//      KV_REST_API_TOKEN env vars for you.
//   3. `npm install @vercel/kv` (already in package.json here).
// ---------------------------------------------------------------------------

const { kv } = require('@vercel/kv');

const HOLD_PREFIX = 'hold:';       // pending / unpaid bookings — has a TTL
const CONFIRMED_PREFIX = 'booked:'; // paid / walk-in-confirmed — no TTL
const ROOM_DATE_INDEX = (room, date) => `roomdate:${room}:${date}`;

/** Save a new pending hold with an auto-expiring TTL. */
async function saveHold(booking, ttlSeconds) {
  await kv.set(HOLD_PREFIX + booking.id, booking, { ex: ttlSeconds });
  // Also index every date in the stay so availability checks are cheap.
  for (const date of booking.dateRange) {
    await kv.set(ROOM_DATE_INDEX(booking.room, date), booking.id, { ex: ttlSeconds });
  }
}

/** Look up a booking regardless of whether it's still held or confirmed. */
async function getBooking(id) {
  const held = await kv.get(HOLD_PREFIX + id);
  if (held) return { ...held, status: held.status || 'pending_payment' };
  const confirmed = await kv.get(CONFIRMED_PREFIX + id);
  if (confirmed) return confirmed;
  return null; // expired or never existed — this IS the "released back to
               // everyone" behaviour the brief asks for.
}

/** Promote a held booking to permanently confirmed (payment succeeded). */
async function confirmBooking(id, extra = {}) {
  const booking = await getBooking(id);
  if (!booking) return null;
  const confirmed = { ...booking, ...extra, status: 'confirmed', confirmedAt: new Date().toISOString() };
  await kv.set(CONFIRMED_PREFIX + id, confirmed); // no TTL — permanent
  await kv.del(HOLD_PREFIX + id);
  return confirmed;
}

/** Is this room already held or booked for every date in dateRange? */
async function isRoomAvailable(room, dateRange) {
  for (const date of dateRange) {
    const existingId = await kv.get(ROOM_DATE_INDEX(room, date));
    if (existingId) return false;
  }
  return true;
}

module.exports = { saveHold, getBooking, confirmBooking, isRoomAvailable, HOLD_PREFIX, CONFIRMED_PREFIX };