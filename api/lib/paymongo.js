// api/lib/paymongo.js
// ---------------------------------------------------------------------------
// Minimal PayMongo client using built-in fetch (Node 18+ on Vercel).
// No SDK dependency needed for this — it's two small REST calls.
//
// SETUP:
//   1. Create a PayMongo account -> dashboard.paymongo.com
//   2. Copy your SECRET key (test key first: sk_test_...) into Vercel's env
//      var PAYMONGO_SECRET_KEY.
//   3. Point a webhook (dashboard -> Developers -> Webhooks) at:
//      https://yourdomain.com/api/webhooks/paymongo
//      Events to send: source.chargeable
// ---------------------------------------------------------------------------

const PAYMONGO_BASE = 'https://api.paymongo.com/v1';

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not set in environment variables.');
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

/**
 * Creates a GCash or Maya "source" the guest is redirected to in order to pay.
 * amountPhp is in whole pesos; PayMongo wants centavos (integer).
 */
async function createSource({ type, amountPhp, bookingId, successUrl, failedUrl }) {
  const body = {
    data: {
      attributes: {
        amount: Math.round(amountPhp * 100),
        redirect: { success: successUrl, failed: failedUrl },
        type, // 'gcash' | 'paymaya' (PayMongo's key for Maya)
        currency: 'PHP',
        billing: { name: undefined }, // optional, left blank
        metadata: { bookingId },
      },
    },
  };

  const resp = await fetch(`${PAYMONGO_BASE}/sources`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.errors?.[0]?.detail || 'PayMongo source creation failed.');
  return json.data; // includes id + attributes.redirect.checkout_url
}

/** Charges a now-chargeable source (called from the webhook, not the browser). */
async function createPaymentFromSource({ sourceId, amountPhp, bookingId }) {
  const body = {
    data: {
      attributes: {
        amount: Math.round(amountPhp * 100),
        currency: 'PHP',
        source: { id: sourceId, type: 'source' },
        description: `Villa Merced downpayment — booking ${bookingId}`,
      },
    },
  };
  const resp = await fetch(`${PAYMONGO_BASE}/payments`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.errors?.[0]?.detail || 'PayMongo payment charge failed.');
  return json.data;
}

module.exports = { createSource, createPaymentFromSource };