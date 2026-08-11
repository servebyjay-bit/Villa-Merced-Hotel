// api/bookings/create.js  ->  POST /api/bookings/create
// ---------------------------------------------------------------------------
// Creates a HELD booking. This is step 1 of the flow: the guest picks a room
// and dates, we lock that room+date combo for HOLD_HOURS. If no payment
// step confirms it before the hold expires, Redis quietly deletes it and the
// dates become bookable by anyone again — no manual cleanup needed.
// ---------------------------------------------------------------------------

const config = require('../config');
const { saveHold, isRoomAvailable } = require('../lib/kv');
const { dateRange, newBookingId, nights } = require('../lib/util');
const { sendNotification } = require('../lib/email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { room, checkin, checkout, guests, name, contact, message } = req.body || {};

    if (!room || !config.ROOMS[room]) return res.status(400).json({ error: 'Please select a valid room type.' });
    if (!checkin || !checkout) return res.status(400).json({ error: 'Please select check-in and check-out dates.' });
    if (!name || !contact) return res.status(400).json({ error: 'Name and contact details are required.' });

    const today = new Date().toISOString().slice(0, 10);
    if (checkin < today) return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
    if (checkout <= checkin) return res.status(400).json({ error: 'Check-out must be after check-in.' });

    const range = dateRange(checkin, checkout);
    const available = await isRoomAvailable(room, range);
    if (!available) {
      return res.status(409).json({
        error: 'Sorry, that room is currently held or booked for one of those dates. Please pick another date or room — held rooms are released automatically if the guest holding them doesn\'t pay in time.',
      });
    }

    const roomInfo = config.ROOMS[room];
    const stayNights = nights(checkin, checkout);
    const booking = {
      id: newBookingId(),
      room, roomName: roomInfo.name, rate: roomInfo.rate,
      checkin, checkout, nights: stayNights, dateRange: range,
      guests: Number(guests) || 2,
      name, contact, message: message || '',
      status: 'pending_payment',
      downpayment: config.computeDownpayment({ nights: stayNights, rate: roomInfo.rate }),
      createdAt: new Date().toISOString(),
      holdHours: config.HOLD_HOURS,
    };
    booking.expiresAt = new Date(Date.now() + config.HOLD_HOURS * 3600 * 1000).toISOString();

    await saveHold(booking, config.HOLD_HOURS * 3600);

    // Notify you immediately when someone starts a booking — this is a
    // HOLD, not a confirmed/paid reservation yet. Failure here (e.g. no
    // RESEND_API_KEY set) never blocks the booking itself; see
    // api/lib/email.js.
    await sendNotification({
      subject: `New booking hold — ${booking.name} · ${booking.roomName}`,
      html: `
        <h2 style="margin:0 0 12px;">New booking hold created</h2>
        <p style="margin:0 0 16px;color:#a6553b;font-weight:600;">This is a HOLD only — not yet paid. It auto-releases in ${booking.holdHours} hours if the guest doesn't complete payment.</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Guest</td><td><strong>${booking.name}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Contact</td><td>${booking.contact}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Room</td><td>${booking.roomName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Check-in</td><td>${booking.checkin}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Check-out</td><td>${booking.checkout}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Nights</td><td>${booking.nights}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Guests</td><td>${booking.guests}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Downpayment due</td><td>₱${booking.downpayment}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Message</td><td>${booking.message || '—'}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Booking ID</td><td><code>${booking.id}</code></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Hold expires</td><td>${booking.expiresAt}</td></tr>
        </table>
      `,
    });

    return res.status(201).json({ booking });
  } catch (err) {
    console.error('bookings/create error', err);
    return res.status(500).json({ error: 'Something went wrong creating your booking. Please try again.' });
  }
};