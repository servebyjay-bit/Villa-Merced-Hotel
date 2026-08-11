// api/inquiry.js  ->  POST /api/inquiry
// ---------------------------------------------------------------------------
// Simple, free inquiry-form handler for the Contact page. No payments, no
// holds, no database — it validates the submission and emails it straight
// to the hotel using the Resend setup already wired up for booking
// notifications (see api/lib/email.js and BOOKING-SETUP.md). Resend's free
// tier (100 emails/day) covers a small hotel's inquiry volume comfortably,
// so this costs nothing to run.
//
// Flow: Website form -> this function -> email to NOTIFY_EMAIL -> hotel
// staff reply directly to the guest.
//
// SETUP: same as the booking notifications — set RESEND_API_KEY and
// NOTIFY_EMAIL in Vercel's Environment Variables. If RESEND_API_KEY isn't
// set yet, sendNotification() just logs a warning and this still returns
// success to the guest (see note below) rather than showing them an error
// for a setup step on your end.
// ---------------------------------------------------------------------------

const { sendNotification } = require('./lib/email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, checkin, checkout, guests, room, message } = req.body || {};

    if (!name || !email || !checkin || !checkout || !guests) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    if (checkout <= checkin) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date.' });
    }

    const roomLabel = { deluxe: 'Deluxe Room', twin: 'Twin Room' }[room] || 'No preference';
    const safe = (v) => String(v ?? '').replace(/[<>]/g, ''); // minimal HTML-injection guard for the email body

    const sent = await sendNotification({
      subject: `New inquiry — ${safe(name)} · ${safe(checkin)} to ${safe(checkout)}`,
      html: `
        <h2 style="margin:0 0 12px;">New website inquiry</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td><strong>${safe(name)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${safe(email)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Check-in</td><td>${safe(checkin)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Check-out</td><td>${safe(checkout)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Guests</td><td>${safe(guests)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Room preference</td><td>${roomLabel}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Message</td><td>${safe(message) || '—'}</td></tr>
        </table>
      `,
    });

    // sendNotification() never throws — if RESEND_API_KEY isn't set yet it
    // just logs a warning and returns false (see api/lib/email.js). We
    // still tell the guest their inquiry went through so a missing env var
    // on your end doesn't show them an error; check Vercel's function logs
    // if emails aren't arriving.
    if (!sent) console.warn('Inquiry received but the notification email was not sent — check RESEND_API_KEY in Vercel.');

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('api/inquiry error', err);
    return res.status(500).json({ error: 'Something went wrong sending your inquiry. Please try again or contact us directly.' });
  }
};