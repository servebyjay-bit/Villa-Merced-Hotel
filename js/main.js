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
      const originalLabel = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
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

        status.textContent = "Thank you! Your inquiry has been sent — we'll get back to you by email or phone shortly.";
        status.className = 'form-status success';
        form.reset();
      } catch (err) {
        status.innerHTML = 'We couldn\'t send this automatically. Please reach us directly at <a class="link" href="mailto:villamerced.hotel@gmail.com">villamerced.hotel@gmail.com</a> or <a class="link" href="tel:+639469492198">(0946) 949 2198</a>.';
        status.className = 'form-status error';
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      }
    });
  }

});