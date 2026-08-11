// api/pay/bank-transfer.js  ->  POST /api/pay/bank-transfer
// body: { bookingId, referenceNumber, senderName }
// Bank transfers can't be auto-verified without a banking API integration,
// so this marks the booking "awaiting_verification" and leaves the hold's
// TTL running as-is — front desk staff should confirm manually (e.g. via
// the Vercel KV dashboard or a small admin page) once the transfer clears,
// which calls confirmBooking() the same way the PayMongo webhook does.
// If nobody confirms it, the hold still expires normally — the room isn't
// held forever on an unverified promise of payment.

const config = require('../config');
const { getBooking, saveHold } = require('../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bookingId, referenceNumber, senderName } = req.body || {};
    if (!bookingId || !referenceNumber) return res.status(400).json({ error: 'Booking ID and reference number are required.' });

    const booking = await getBooking(bookingId);
    if (!booking) return res.status(404).json({ error: 'This hold has expired. Please start a new booking.' });

    const updated = {
      ...booking,
      status: 'awaiting_verification',
      paymentMethod: 'bank_transfer',
      bankReference: referenceNumber,
      bankSenderName: senderName || '',
    };

    // Re-save with whatever time is left on the original hold.
    const remainingSeconds = Math.max(60, Math.floor((new Date(booking.expiresAt) - Date.now()) / 1000));
    await saveHold(updated, remainingSeconds);

    return res.status(200).json({ booking: updated, bank: config.BANK_DETAILS });
  } catch (err) {
    console.error('pay/bank-transfer error', err);
    return res.status(500).json({ error: 'Could not save your transfer details. Please try again.' });
  }
};