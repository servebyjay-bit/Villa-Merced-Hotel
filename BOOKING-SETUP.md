# Booking System Setup

The booking widget on `contact.html` works two ways:

- **Demo mode (default, on right now):** everything — the room picker, the
  12-hour countdown, GCash/Maya/bank/walk-in choices, the success screen and
  confetti — runs entirely in the browser with fake data. Nothing is saved,
  no payment happens. This is so you can click through and review the whole
  experience today, before touching Vercel or PayMongo.
- **Live mode:** the same UI, talking to the real `/api/*` endpoints in this
  folder, backed by Vercel KV (so the 12-hour hold really expires and
  releases the room) and PayMongo (for real GCash/Maya charges).

## Turning on live mode

1. **Deploy this project to Vercel** (same as before — it's still a static
   site, the `api/` folder is auto-detected as serverless functions).

2. **Add Vercel KV**
   - Vercel dashboard → your project → **Storage** → **Create Database** → **KV**.
   - Connect it to this project. Vercel will automatically add the
     `KV_REST_API_URL` / `KV_REST_API_TOKEN` environment variables — you
     don't need to type these in yourself.

3. **Add a PayMongo account**
   - Sign up at dashboard.paymongo.com.
   - Copy your **secret key** (start with the test key, `sk_test_...`, until
     you're ready to go live with `sk_live_...`).
   - In Vercel: Project → Settings → Environment Variables → add
     `PAYMONGO_SECRET_KEY`.
   - In PayMongo: Developers → Webhooks → add endpoint
     `https://yourdomain.com/api/webhooks/paymongo`, subscribed to the
     `source.chargeable` event.

4. **Set your bank details** (for the bank-transfer option) as env vars:
   `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`.

5. **Set up booking notifications (email)**
   - Sign up free at [resend.com](https://resend.com) — 100 emails/day, no
     card required.
   - Dashboard → API Keys → Create API Key → copy it.
   - In Vercel: Project → Settings → Environment Variables, add:
     - `RESEND_API_KEY` = the key you just copied
     - `NOTIFY_EMAIL` = **currently set to `jboyrain0623@gmail.com` for
       testing.** Change just this one value (no code edits needed) once
       you're ready to point it at your real reservations inbox.
   - No domain setup needed to start — emails send from Resend's shared
     address and deliver fine. Later, verify your own domain in Resend and
     set `RESEND_FROM` for a branded "from" address.
   - **What it currently covers:** you get an email the moment someone
     starts a booking (a HOLD is created) — guest name, contact, room,
     dates, downpayment due, and the booking ID. You do **not** yet get a
     second email when payment is actually confirmed — that would need the
     same `sendNotification()` call added to `api/pay/confirm-manual.js`,
     `api/pay/walkin.js`, and `api/webhooks/paymongo.js`.
   - Phone/SMS notifications are intentionally not set up yet — that needs
     a paid SMS provider account (e.g. Semaphore for PH numbers). Ask for
     this whenever you're ready to add it.

6. **Set an admin token** for front-desk staff to manually confirm bank
   transfers / walk-in payments: env var `ADMIN_TOKEN` (any private string
   you choose). Staff call `POST /api/pay/confirm-manual` with
   `{ bookingId, adminToken }` once money is actually in hand — a tool like
   Postman works fine for this until a proper staff page is built.

7. **(Optional) Change the hold duration** — it's editable in one place,
   `api/config.js`, or via the `HOLD_HOURS` env var. Default is 12.

8. **Flip demo mode off** in `js/booking.js` — change:
   ```js
   const DEMO_MODE = true;
   ```
   to
   ```js
   const DEMO_MODE = false;
   ```

That's it — the frontend code doesn't change, it just starts calling the
real endpoints instead of simulating them.

## Why Vercel KV instead of a normal database?

Redis (what KV runs on) supports keys that delete themselves after a set
time (a TTL). Setting a hold's TTL to `HOLD_HOURS` _is_ the "release the
room after 12 hours if unpaid" rule — no cron job, no background task, and
nothing can be left in a stuck "held forever" state by a server error.
