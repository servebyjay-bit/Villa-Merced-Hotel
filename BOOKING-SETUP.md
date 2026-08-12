# Inquiry Setup (formerly BOOKING-SETUP.md)

The multi-step "Book Your Stay" widget (room picker, 12-hour hold, GCash/Maya/
bank/walk-in payment, PayMongo, Vercel KV) has been removed. **Vercel KV was
sunset** — the product no longer exists to provision, so that system could
never have gone live as designed. It's been replaced with a simple, free
inquiry form instead.

## What's live now

`contact.html` has one form: Name, Email, Check-in, Check-out, Guests, Room
preference, Message → **Send Inquiry**. On submit it posts to
`/api/inquiry`, which emails the details straight to the hotel via Resend
(free tier, 100 emails/day — plenty for a hotel this size).

## Setup (one-time)

1. Sign up free at [resend.com](https://resend.com) — no card required.
2. Dashboard → API Keys → Create API Key → copy it.
3. In Vercel: Project → Settings → Environment Variables, add:
   - `RESEND_API_KEY` = the key you just copied
   - `NOTIFY_EMAIL` = the inbox that should receive inquiries (currently
     defaults to `jboyrain0623@gmail.com` for testing — change this one
     value, no code edits needed, once you're ready to point it at your
     real reservations inbox)
4. No domain setup needed to start — emails send from Resend's shared
   address and deliver fine. Later, verify your own domain in Resend and
   set `RESEND_FROM` for a branded "from" address.

That's it — no database, no payment provider, no extra `npm install` step.
The `package.json` dependency on `@vercel/kv` has been removed since
nothing in the project uses it anymore.

## Files to delete from your project

These belonged to the old KV/PayMongo booking flow and are no longer used
by any page. Safe to delete:

```
api/config.js
api/lib/kv.js
api/lib/paymongo.js
api/bookings/create.js
api/bookings/status.js
api/pay/bank-transfer.js
api/pay/confirm-manual.js
api/pay/paymongo.js
api/webhooks/paymongo.js
js/booking.js
```

Keep:

```
api/inquiry.js
api/lib/email.js
```

## If you want real bookings (dates held, online payment) later

That's a bigger feature and would need a real database — the KV approach
this used to rely on doesn't exist on Vercel anymore, so it'd need to be
rebuilt on a current option (e.g. Upstash Redis via the Vercel Marketplace,
or a small Postgres database). Worth doing once the hotel has enough volume
to justify it; the free inquiry form is the right amount of system for now.
