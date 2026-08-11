// Villa Merced Hotel — booking widget
// ---------------------------------------------------------------------------
// DEMO_MODE = true:  everything below runs against fake, in-browser data.
//                     No network calls, nothing saved. Safe to click through
//                     for review right now.
// DEMO_MODE = false: calls the real /api/* endpoints (see BOOKING-SETUP.md
//                     for what needs to be configured in Vercel first).
// ---------------------------------------------------------------------------
const DEMO_MODE = true;

// Keep these in sync with api/config.js if you change them there.
const BOOKING_CONFIG = {
  holdHours: 12,
  downpayment: 500,
  rooms: {
    deluxe: { name: 'Deluxe Room', rate: 1200 },
    twin: { name: 'Twin Room', rate: 1400 },
  },
  bank: { bankName: 'BDO Unibank', accountName: 'Villa Merced Hotel', accountNumber: '0000-0000-0000' },
};

document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('booking-widget');
  if (!widget) return; // not on contact.html

  const els = {
    steps: widget.querySelectorAll('#booking-steps li'),
    step1: document.getElementById('booking-step-1'),
    step2: document.getElementById('booking-step-2'),
    step3: document.getElementById('booking-step-3'),
    status: document.getElementById('form-status'),
    checkin: document.getElementById('checkin'),
    checkout: document.getElementById('checkout'),
    holdHoursLabel: document.getElementById('hold-hours-label'),
    holdCountdown: document.getElementById('hold-countdown'),
    downpaymentAmount: document.getElementById('downpayment-amount'),
    bookingSummary: document.getElementById('booking-summary'),
    payMethods: widget.querySelectorAll('.pay-method'),
    bankDetailsBox: document.getElementById('bank-details-box'),
    backBtn: document.getElementById('back-to-step1'),
    submitBank: document.getElementById('submit-bank'),
    submitWalkin: document.getElementById('submit-walkin'),
    submitOnline: document.getElementById('submit-online'),
    onlineMethodName: document.getElementById('online-method-name'),
    bookAnother: document.getElementById('book-another'),
    successTitle: document.getElementById('success-title'),
    successMessage: document.getElementById('success-message'),
    successRefnum: document.getElementById('success-refnum'),
  };

  let booking = null;       // the current held booking (server or fake)
  let countdownTimer = null;
  let selectedMethod = null;

  // ---- init: block past dates, prefill hold-hours label ----
  const today = new Date().toISOString().slice(0, 10);
  els.checkin.min = today;
  els.checkout.min = today;
  els.checkin.addEventListener('change', () => { els.checkout.min = els.checkin.value || today; });
  if (els.holdHoursLabel) els.holdHoursLabel.textContent = BOOKING_CONFIG.holdHours;
  if (els.downpaymentAmount) els.downpaymentAmount.textContent = BOOKING_CONFIG.downpayment;
  widget.querySelectorAll('.online-amount').forEach(el => { el.textContent = BOOKING_CONFIG.downpayment; });

  function setStatus(msg, isError) {
    els.status.textContent = msg || '';
    els.status.className = 'form-status' + (msg ? (isError ? ' error' : ' success') : '');
  }

  function goToStep(n) {
    [els.step1, els.step2, els.step3].forEach((el, i) => { el.hidden = (i + 1) !== n; });
    els.steps.forEach(li => {
      const step = Number(li.dataset.step);
      li.classList.toggle('is-active', step === n);
      li.classList.toggle('is-done', step < n);
    });
    setStatus('');
  }

  function nights(checkin, checkout) {
    const ms = new Date(checkout) - new Date(checkin);
    return Math.max(1, Math.round(ms / 86400000));
  }

  function newFakeId() {
    return 'VM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  // ---- STEP 1 submit: create the hold ----
  els.step1.addEventListener('submit', async (e) => {
    e.preventDefault();
    const room = document.getElementById('room').value;
    const checkin = els.checkin.value;
    const checkout = els.checkout.value;
    const guests = document.getElementById('guests').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!room || !checkin || !checkout || !name || !phone) {
      setStatus('Please fill in all required fields.', true);
      return;
    }
    if (checkout <= checkin) {
      setStatus('Check-out must be after check-in.', true);
      return;
    }

    const submitBtn = els.step1.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking availability…';

    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 550)); // feel like a real check
        const roomInfo = BOOKING_CONFIG.rooms[room];
        booking = {
          id: newFakeId(),
          room, roomName: roomInfo.name, rate: roomInfo.rate,
          checkin, checkout, nights: nights(checkin, checkout),
          guests, name, phone, message,
          downpayment: BOOKING_CONFIG.downpayment,
          expiresAt: new Date(Date.now() + BOOKING_CONFIG.holdHours * 3600 * 1000).toISOString(),
        };
      } else {
        const resp = await fetch('/api/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, checkin, checkout, guests, name, contact: phone, message }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Could not hold those dates.');
        booking = data.booking;
      }

      renderSummary();
      startCountdown();
      goToStep(2);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Check Availability & Hold Dates';
    }
  });

  function renderSummary() {
    els.bookingSummary.innerHTML = `
      <strong>${booking.roomName}</strong> · ${booking.nights} night${booking.nights > 1 ? 's' : ''} ·
      ${booking.checkin} → ${booking.checkout} · ${booking.guests} guest(s)<br>
      Booking ref: <strong>${booking.id}</strong>
    `;
    const bank = BOOKING_CONFIG.bank;
    els.bankDetailsBox.innerHTML = `
      <strong>${bank.bankName}</strong><br>
      Account name: ${bank.accountName}<br>
      Account number: ${bank.accountNumber}<br>
      Amount: ₱${booking.downpayment}
    `;
  }

  function startCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      const remaining = new Date(booking.expiresAt) - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        els.holdCountdown.textContent = '00:00:00';
        setStatus('Your hold has expired and these dates are available to everyone again. Please start over.', true);
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      els.holdCountdown.textContent = [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
    }, 1000);
  }

  els.backBtn.addEventListener('click', () => {
    clearInterval(countdownTimer);
    widget.querySelectorAll('.pay-subpanel').forEach(p => p.hidden = true);
    els.payMethods.forEach(b => b.classList.remove('is-selected'));
    goToStep(1);
  });

  // ---- STEP 2: choose payment method ----
  els.payMethods.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMethod = btn.dataset.method;
      els.payMethods.forEach(b => b.classList.toggle('is-selected', b === btn));
      widget.querySelectorAll('.pay-subpanel').forEach(p => p.hidden = true);
      const panelId = selectedMethod === 'gcash' || selectedMethod === 'maya' ? 'panel-online' : `panel-${selectedMethod}`;
      const panel = document.getElementById(panelId);
      if (panel) panel.hidden = false;
      if (els.onlineMethodName) els.onlineMethodName.textContent = selectedMethod === 'maya' ? 'Maya' : 'GCash';
    });
  });

  // ---- GCash / Maya ----
  els.submitOnline.addEventListener('click', async () => {
    els.submitOnline.disabled = true;
    els.submitOnline.textContent = 'Connecting…';
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 900));
        showSuccess({
          title: 'Payment received!',
          message: `Thank you for choosing Villa Merced Hotel — your ${booking.roomName} is confirmed for ${booking.checkin} to ${booking.checkout}. A confirmation has been sent to ${booking.phone}.`,
          ref: `Booking ref: ${booking.id} · Paid via ${selectedMethod === 'maya' ? 'Maya' : 'GCash'} (demo)`,
        });
      } else {
        const resp = await fetch('/api/pay/paymongo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id, method: selectedMethod }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Could not start payment.');
        window.location.href = data.checkoutUrl; // guest completes payment on PayMongo, redirected back
      }
    } catch (err) {
      setStatus(err.message, true);
      els.submitOnline.disabled = false;
      els.submitOnline.textContent = 'Continue to Payment';
    }
  });

  // ---- Bank transfer ----
  els.submitBank.addEventListener('click', async () => {
    const ref = document.getElementById('bank-ref').value.trim();
    const sender = document.getElementById('bank-sender').value.trim();
    if (!ref) { setStatus('Please enter your transfer reference number.', true); return; }

    els.submitBank.disabled = true;
    els.submitBank.textContent = 'Submitting…';
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 600));
      } else {
        const resp = await fetch('/api/pay/bank-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id, referenceNumber: ref, senderName: sender }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Could not save your transfer details.');
      }
      showSuccess({
        title: 'Reference received!',
        message: `Thank you for choosing Villa Merced Hotel. We're verifying your transfer — your ${booking.roomName} stays held until ${new Date(booking.expiresAt).toLocaleString()}. We'll confirm by phone or email once it clears.`,
        ref: `Booking ref: ${booking.id} · Transfer ref: ${ref}`,
      });
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      els.submitBank.disabled = false;
      els.submitBank.textContent = "I've Sent the Transfer";
    }
  });

  // ---- Walk-in ----
  els.submitWalkin.addEventListener('click', async () => {
    els.submitWalkin.disabled = true;
    els.submitWalkin.textContent = 'Confirming…';
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 500));
      } else {
        const resp = await fetch('/api/pay/walkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Could not save your reservation.');
      }
      showSuccess({
        title: 'Reservation noted!',
        message: `Thank you for choosing Villa Merced Hotel. Please settle your ₱${booking.downpayment} downpayment at the front desk before ${new Date(booking.expiresAt).toLocaleString()} to keep your ${booking.roomName}.`,
        ref: `Booking ref: ${booking.id}`,
      });
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      els.submitWalkin.disabled = false;
      els.submitWalkin.textContent = 'Confirm Walk-in Reservation';
    }
  });

  function showSuccess({ title, message, ref }) {
    clearInterval(countdownTimer);
    els.successTitle.textContent = title;
    els.successMessage.textContent = message;
    els.successRefnum.textContent = ref;
    goToStep(3);
    fireConfetti();
  }

  els.bookAnother.addEventListener('click', () => {
    els.step1.reset();
    widget.querySelectorAll('.pay-subpanel').forEach(p => p.hidden = true);
    els.payMethods.forEach(b => b.classList.remove('is-selected'));
    booking = null;
    selectedMethod = null;
    goToStep(1);
  });

  // Detect a return trip from a real PayMongo redirect (?booking=success&id=...)
  if (!DEMO_MODE) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('booking') === 'success' && params.get('id')) {
      fetch(`/api/bookings/status?id=${encodeURIComponent(params.get('id'))}`)
        .then(r => r.json())
        .then(({ booking: b }) => {
          if (b && b.status === 'confirmed') {
            showSuccess({
              title: 'Payment received!',
              message: `Thank you for choosing Villa Merced Hotel — your ${b.roomName} is confirmed for ${b.checkin} to ${b.checkout}.`,
              ref: `Booking ref: ${b.id}`,
            });
          }
        }).catch(() => {});
    }
  }

  // ---------------------------------------------------------------------
  // Minimal one-shot confetti pop — no external library, ~1.6s and done.
  // ---------------------------------------------------------------------
  function fireConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(DPR, DPR);
    };
    resize();

    const colors = ['#A6553B', '#C9A66B', '#F3EEE3', '#5C3A2E', '#C17958'];
    const pieces = Array.from({ length: 90 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 9 - 4,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      gravity: 0.28,
    }));

    const start = performance.now();
    const duration = 1600;

    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }
});