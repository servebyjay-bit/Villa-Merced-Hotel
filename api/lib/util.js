// api/lib/util.js
function dateRange(checkin, checkout) {
  const dates = [];
  let d = new Date(checkin + 'T00:00:00Z');
  const end = new Date(checkout + 'T00:00:00Z');
  while (d < end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function newBookingId() {
  return 'VM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function nights(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  return Math.max(1, Math.round(ms / 86400000));
}

module.exports = { dateRange, newBookingId, nights };