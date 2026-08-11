// api/pay/walkin.js  ->  POST /api/pay/walkin
// body: { bookingId }
// "Walk-in" here means: guest wants to pay the downpayment in person at the
// front desk rather than online. We still keep the normal HOLD_HOURS clock
// running (editable in api/config.js) — the room is only truly guaranteed
// once staff collects the downpayment and confirms it, same as any other
// method. This just records the guest's stated intent and gives them clear
// instructions.

const { getBooking, saveHold } = require('../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId.' });

    const booking = await getBooking(bookingId);
    if (!booking) return res.status(404).json({ error: 'This hold has expired. Please start a new booking.' });

    const updated = { ...booking, status: 'awaiting_walkin_payment', paymentMethod: 'walkin' };
    const remainingSeconds = Math.max(60, Math.floor((new Date(booking.expiresAt) - Date.now()) / 1000));
    await saveHold(updated, remainingSeconds);

    return res.status(200).json({ booking: updated });
  } catch (err) {
    console.error('pay/walkin error', err);
    return res.status(500).json({ error: 'Could not save your reservation. Please try again.' });
  }
};