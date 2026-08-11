// api/lib/email.js
// ---------------------------------------------------------------------------
// Thin wrapper around Resend (https://resend.com) — sends the "someone just
// started a booking" notification email.
//
// SETUP (one-time):
//   1. Sign up free at resend.com (100 emails/day / 3,000 per month, free —
//      plenty for a hotel this size).
//   2. Dashboard -> API Keys -> Create API Key -> copy it.
//   3. In Vercel: Project -> Settings -> Environment Variables, add:
//        RESEND_API_KEY = re_xxxxxxxxxxxx
//        NOTIFY_EMAIL   = jboyrain0623@gmail.com   <- currently set to this
//                          for testing. Change this one value (no code
//                          edits needed) once you're ready to point it at
//                          your real reservations inbox.
//   4. While testing, no domain setup is required — emails send from
//      Resend's shared address (onboarding@resend.dev), which is normal
//      and delivers fine. Once you're ready to go live, verify your own
//      domain in Resend and set RESEND_FROM to something like
//      "Villa Merced Hotel <reservations@villamercedhotel.com>".
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'jboyrain0623@gmail.com';
const FROM = process.env.RESEND_FROM || 'Villa Merced Hotel <onboarding@resend.dev>';

/**
 * Sends a notification email. Never throws — a failed/misconfigured email
 * must NEVER block a booking from being saved. Returns true/false so the
 * caller can log it, but should not treat false as a request failure.
 */
async function sendNotification({ subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping notification email.');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [NOTIFY_EMAIL], subject, html }),
    });
    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendNotification failed', err);
    return false;
  }
}

module.exports = { sendNotification };