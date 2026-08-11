// api/webhooks/paymongo.js  ->  POST /api/webhooks/paymongo
// Point this URL at your PayMongo webhook (event: source.chargeable).
// This is the ONLY place a booking becomes permanently confirmed by online
// payment — never trust the browser redirect alone, since a guest could
// close the tab or the redirect could be spoofed. The webhook is the source
// of truth.

const { getBooking, confirmBooking } = require('../lib/kv');
const { createPaymentFromSource } = require('../lib/paymongo');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // TODO before going live: verify the PayMongo-Signature header against
    // your webhook signing secret. See:
    // https://developers.paymongo.com/docs/webhooks#signature-verification
    const event = req.body?.data?.attributes?.data;
    const eventType = req.body?.data?.attributes?.type;
    if (eventType !== 'source.chargeable' || !event) {
      return res.status(200).json({ received: true, skipped: true });
    }

    const source = event;
    const bookingId = source?.attributes?.metadata?.bookingId;
    if (!bookingId) return res.status(200).json({ received: true, skipped: 'no bookingId in metadata' });

    const booking = await getBooking(bookingId);
    if (!booking) return res.status(200).json({ received: true, skipped: 'hold already expired' });

    const payment = await createPaymentFromSource({
      sourceId: source.id,
      amountPhp: booking.downpayment,
      bookingId,
    });

    await confirmBooking(bookingId, {
      paymentMethod: booking.paymentMethod || 'online',
      paymentReference: payment.id,
      paidAmount: booking.downpayment,
    });

    return res.status(200).json({ received: true, confirmed: bookingId });
  } catch (err) {
    console.error('webhooks/paymongo error', err);
    // Still 200 so PayMongo doesn't hammer retries on an app-side bug —
    // check Vercel logs. Adjust if you'd rather see retries.
    return res.status(200).json({ received: true, error: err.message });
  }
};