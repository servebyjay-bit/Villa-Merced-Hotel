// api/pay/paymongo.js  ->  POST /api/pay/paymongo
// body: { bookingId, method: 'gcash' | 'maya' }
// Returns a checkout_url to redirect the guest to. Actual confirmation
// happens later via the webhook (api/webhooks/paymongo.js) — that's what
// finally calls confirmBooking() and makes the hold permanent.

const config = require('../config');
const { getBooking } = require('../lib/kv');
const { createSource } = require('../lib/paymongo');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bookingId, method } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId.' });
    if (!['gcash', 'maya'].includes(method)) return res.status(400).json({ error: 'Unsupported payment method.' });

    const booking = await getBooking(bookingId);
    if (!booking) return res.status(404).json({ error: 'This hold has expired. Please start a new booking.' });
    if (booking.status === 'confirmed') return res.status(409).json({ error: 'This booking is already confirmed.' });

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const source = await createSource({
      type: method === 'maya' ? 'paymaya' : 'gcash',
      amountPhp: booking.downpayment ?? config.DOWNPAYMENT_PHP,
      bookingId,
      successUrl: `${origin}/contact.html?booking=success&id=${bookingId}`,
      failedUrl: `${origin}/contact.html?booking=failed&id=${bookingId}`,
    });

    return res.status(200).json({ checkoutUrl: source.attributes.redirect.checkout_url, sourceId: source.id });
  } catch (err) {
    console.error('pay/paymongo error', err);
    return res.status(500).json({ error: err.message || 'Could not start payment. Please try again.' });
  }
};