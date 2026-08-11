// api/config.js
// ---------------------------------------------------------------------------
// Single source of truth for booking rules. Edit values here (or override via
// Vercel Environment Variables of the same name) — nothing else in the
// booking system needs to change.
// ---------------------------------------------------------------------------

module.exports = {
  // How long an unpaid booking stays "held" before the room is released back
  // to the public. This is the editable number from the brief.
  // Override in Vercel: Settings -> Environment Variables -> HOLD_HOURS
  HOLD_HOURS: Number(process.env.HOLD_HOURS || 12),

  // Downpayment. Flat amount for now — swap to a % of stay total later by
  // changing computeDownpayment() below. NOT FINAL, per the brief — update
  // freely.
  DOWNPAYMENT_PHP: Number(process.env.DOWNPAYMENT_PHP || 500),

  computeDownpayment(/* booking */) {
    // Currently flat-rate. Example of a future % based version:
    //   return Math.round(booking.nights * booking.rate * 0.2);
    return module.exports.DOWNPAYMENT_PHP;
  },

  ROOMS: {
    deluxe: { name: 'Deluxe Room', rate: 1200 },
    twin:   { name: 'Twin Room',   rate: 1400 },
  },

  PAYMENT_METHODS: ['gcash', 'maya', 'bank_transfer', 'walkin'],

  BANK_DETAILS: {
    bankName: process.env.BANK_NAME || 'BDO Unibank',
    accountName: process.env.BANK_ACCOUNT_NAME || 'Villa Merced Hotel',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0000-0000-0000',
  },
};