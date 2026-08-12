// Villa Merced Hotel — shared interactivity

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Mobile nav toggle ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const isOpen = item.getAttribute('data-open') === 'true';
      const group = item.closest('.faq-list');
      if (group) {
        group.querySelectorAll('.faq-item[data-open="true"]').forEach(other => {
          if (other !== item) {
            other.setAttribute('data-open', 'false');
            other.querySelector('.faq-a').style.maxHeight = null;
            other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          }
        });
      }
      item.setAttribute('data-open', (!isOpen).toString());
      btn.setAttribute('aria-expanded', (!isOpen).toString());
      panel.style.maxHeight = !isOpen ? panel.scrollHeight + 'px' : null;
    });
  });

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Floating "Book Your Stay" CTA ---------- */
  const floatingCta = document.querySelector('.floating-cta');
  if (floatingCta) {
    const revealAfter = window.innerHeight * 0.6;
    const toggleCta = () => {
      floatingCta.classList.toggle('is-visible', window.scrollY > revealAfter);
    };
    toggleCta();
    window.addEventListener('scroll', toggleCta, { passive: true });
  }

  /* ---------- Room gallery lightbox (rooms.html) ---------- */
  const galleries = document.querySelectorAll('.room-gallery');
  if (galleries.length) {
    const lightbox = document.getElementById('room-lightbox');
    const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
    let activeImages = [];
    let activeIndex = 0;

    const showImage = (i) => {
      if (!activeImages.length) return;
      activeIndex = (i + activeImages.length) % activeImages.length;
      const { src, alt } = activeImages[activeIndex];
      lightboxImg.src = src;
      lightboxImg.alt = alt;
    };
    const openLightbox = (images, startIndex) => {
      if (!lightbox) return;
      activeImages = images;
      showImage(startIndex);
      lightbox.classList.add('is-open');
    };
    const closeLightbox = () => lightbox && lightbox.classList.remove('is-open');

    galleries.forEach(gallery => {
      const triggers = Array.from(gallery.querySelectorAll('[data-lightbox-src]'));
      const images = triggers.map(t => ({ src: t.dataset.lightboxSrc, alt: t.querySelector('img')?.alt || '' }));
      triggers.forEach((trigger, i) => {
        trigger.addEventListener('click', () => openLightbox(images, i));
      });
    });

    if (lightbox) {
      lightbox.querySelector('.room-lightbox-close')?.addEventListener('click', closeLightbox);
      lightbox.querySelector('.room-lightbox-prev')?.addEventListener('click', () => showImage(activeIndex - 1));
      lightbox.querySelector('.room-lightbox-next')?.addEventListener('click', () => showImage(activeIndex + 1));
      lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
      document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showImage(activeIndex + 1);
        if (e.key === 'ArrowLeft') showImage(activeIndex - 1);
      });
    }
  }

  /* ---------- Inquiry form success: confetti + modal (contact page) ----------
     A short, brand-colored confetti burst (not a generic rainbow library)
     plus an accessible modal replace the old inline-only "thank you" text
     on a successful submission. Respects prefers-reduced-motion — motion-
     sensitive users still get the modal, just without the particle burst. */
  function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Brand palette only — terracotta, brass, coffee, ivory — so it reads
    // as a polished touch rather than a generic party effect.
    const colors = ['#A6553B', '#C17958', '#C9A66B', '#5C3A2E', '#FDFBF7'];
    const count = w < 560 ? 55 : 100;
    const particles = Array.from({ length: count }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 140,
      y: h * 0.32,
      vx: (Math.random() - 0.5) * 7,
      vy: -(Math.random() * 5 + 3.5),
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.28,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      gravity: 0.16 + Math.random() * 0.07,
      drag: 0.986,
      life: 0,
      maxLife: 85 + Math.random() * 25,
    }));

    let frame = 0;
    (function tick() {
      frame++;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      particles.forEach((p) => {
        if (p.life > p.maxLife) return;
        alive++;
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.life++;
        const fadeIn = p.life < 8 ? p.life / 8 : 1;
        const fadeOut = p.life > p.maxLife - 18 ? Math.max((p.maxLife - p.life) / 18, 0) : 1;
        ctx.save();
        ctx.globalAlpha = Math.min(fadeIn, fadeOut);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      if (alive > 0 && frame < 220) {
        requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    })();
  }

  const successModal = document.getElementById('inquiry-success-modal');
  if (successModal) {
    const closeBtn = document.getElementById('success-modal-close');
    const doneBtn = document.getElementById('success-modal-done');
    const nameSlot = successModal.querySelector('[data-success-name]');
    const detailsBox = document.getElementById('success-modal-details');
    const anotherBox = document.getElementById('success-modal-another');
    const anotherLabel = document.getElementById('success-another-label');
    const anotherBtn = document.getElementById('success-modal-another-btn');
    let lastFocused = null;

    // Room labels + which room to suggest next. If the guest already
    // named a room preference, nudge them toward the other one (a
    // natural "add a second room for the rest of the group" prompt);
    // with no preference, keep it general.
    const ROOM_LABELS = { deluxe: 'Deluxe Room', twin: 'Twin Room' };
    const OTHER_ROOM = { deluxe: 'twin', twin: 'deluxe' };

    const openSuccessModal = (data) => {
      lastFocused = document.activeElement;
      if (nameSlot) nameSlot.textContent = data?.name ? `, ${data.name.split(' ')[0]}` : '';
      if (detailsBox) {
        if (data?.checkin && data?.checkout) {
          detailsBox.innerHTML = `<strong>Check-in:</strong> ${data.checkin} &nbsp;·&nbsp; <strong>Check-out:</strong> ${data.checkout} &nbsp;·&nbsp; <strong>Guests:</strong> ${data.guests || '—'}`;
          detailsBox.classList.add('has-details');
        } else {
          detailsBox.classList.remove('has-details');
        }
      }
      if (anotherBox) {
        const suggested = OTHER_ROOM[data?.room] || '';
        anotherBox.dataset.suggestedRoom = suggested;
        if (anotherLabel) {
          anotherLabel.textContent = suggested
            ? `Also booking for others in your group? You can send a separate inquiry for our ${ROOM_LABELS[suggested]}.`
            : 'Need to reserve more than one room for your group?';
        }
        anotherBox.hidden = false;
      }
      successModal.removeAttribute('hidden');
      requestAnimationFrame(() => successModal.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      fireConfetti();
      (closeBtn || doneBtn)?.focus();
    };

    const closeSuccessModal = () => {
      successModal.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => successModal.setAttribute('hidden', ''), 200);
      (lastFocused || document.getElementById('inq-name'))?.focus();
    };

    closeBtn?.addEventListener('click', closeSuccessModal);
    doneBtn?.addEventListener('click', closeSuccessModal);
    anotherBtn?.addEventListener('click', () => {
      const suggested = anotherBox?.dataset.suggestedRoom || '';
      closeSuccessModal();
      // Give the modal's own close transition a beat before moving focus
      // back into a fresh form, so the two motions don't fight on mobile.
      setTimeout(() => {
        const roomField = document.getElementById('inq-room');
        if (roomField && suggested) roomField.value = suggested;
        document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('inq-name')?.focus();
      }, 220);
    });
    successModal.addEventListener('click', (e) => { if (e.target === successModal) closeSuccessModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && successModal.classList.contains('is-open')) closeSuccessModal();
    });

    window.__openInquirySuccessModal = openSuccessModal;
  }

  /* ---------- Inquiry form (contact page) ----------
     Free, no-payment inquiry form: posts to /api/inquiry, a small Vercel
     serverless function that emails the details to the hotel (see
     api/inquiry.js). If that request can't be reached — e.g. the site is
     open locally as a plain file, or the network hiccups — the guest is
     never left stranded with just a spinner; they get a direct phone/email
     fallback instead. */
  const form = document.getElementById('inquiry-form');
  if (form) {
    const status = document.getElementById('form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn?.querySelector('.btn-label');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => { if (!field.value.trim()) valid = false; });

      const checkin = form.querySelector('[name="checkin"]')?.value;
      const checkout = form.querySelector('[name="checkout"]')?.value;

      if (!valid) {
        status.textContent = 'Please fill in all required fields.';
        status.className = 'form-status error';
        return;
      }
      if (checkin && checkout && checkout <= checkin) {
        status.textContent = 'Check-out date must be after check-in date.';
        status.className = 'form-status error';
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        if (submitLabel) submitLabel.textContent = 'Sending…';
      }
      status.textContent = '';
      status.className = 'form-status';

      try {
        const res = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Request failed');
        }

        form.reset();
        if (typeof window.__openInquirySuccessModal === 'function') {
          window.__openInquirySuccessModal(payload);
        } else {
          status.textContent = "Thank you! Your inquiry has been sent — we'll get back to you by email or phone shortly.";
          status.className = 'form-status success';
        }
      } catch (err) {
        status.innerHTML = 'We couldn\'t send this automatically. Please reach us directly at <a class="link" href="mailto:villamerced.hotel@gmail.com">villamerced.hotel@gmail.com</a> or <a class="link" href="tel:+639469492198">(0946) 949 2198</a>.';
        status.className = 'form-status error';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          if (submitLabel) submitLabel.textContent = 'Send Inquiry';
        }
      }
    });
  }

});