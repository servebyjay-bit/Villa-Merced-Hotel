// api/bookings/status.js  ->  GET /api/bookings/status?id=VM-XXXX
// Frontend polls this to drive the countdown / detect payment confirmation
// or expiry (a 404 here means the hold expired and the room is free again).

const { getBooking } = require('../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing booking id.' });

  const booking = await getBooking(id);
  if (!booking) {
    return res.status(404).json({ error: 'This hold has expired and the room has been released.' });
  }
  return res.status(200).json({ booking });
};