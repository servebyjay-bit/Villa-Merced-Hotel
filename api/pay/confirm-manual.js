// api/pay/confirm-manual.js  ->  POST /api/pay/confirm-manual
// body: { bookingId, adminToken }
// For front-desk staff to confirm a bank-transfer or walk-in downpayment
// once it's actually been received. Protected by a shared secret so guests
// can't confirm their own bookings.
//
// SETUP: set ADMIN_TOKEN in Vercel env vars to something private. Staff
// enter it once in a simple internal page (not built here — this is the
// API only; wire a small password-protected form to it, or use a tool like
// Postman/Insomnia at the front desk for now).

const { confirmBooking } = require('../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { bookingId, adminToken } = req.body || {};
  if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }
  if (!bookingId) return res.status(400).json({ error: 'Missing bookingId.' });

  const confirmed = await confirmBooking(bookingId, { manuallyConfirmed: true });
  if (!confirmed) return res.status(404).json({ error: 'Hold not found — it may have already expired.' });

  return res.status(200).json({ booking: confirmed });
};