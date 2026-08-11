# Villa Merced Hotel — Website Rebuild

A 9-page static site (plain HTML/CSS/JS, no build step) rebuilt from the
Canva site audit. Ready to deploy to Vercel as-is.

## Structure

```
index.html        Home
history.html       Our History
rooms.html         Rooms + Shared Spaces
nearby.html        Restaurants & Activities Nearby
reviews.html       Client Reviews
faq.html           Stay Details + Booking Policies
restaurant.html    Kusina Merced (sub-brand — oxblood/tan, Fraunces menu font)
laundry.html       Lavanderia de Merced (sub-brand — sky blue)
contact.html       Contact info, map, on-site inquiry form

css/
  tokens.css       Colors, fonts, spacing — edit here to retheme the whole site
  base.css         Reset, header/nav, footer, buttons, the arch-window motif
  components.css   Hero, room cards, review cards, FAQ accordion, contact form
  kusina.css       Restaurant sub-brand only
  lavanderia.css   Laundry sub-brand only

js/main.js         Mobile nav toggle, FAQ accordion, scroll reveal, form validation
build.py, icons.py Python generator used to build the HTML — only needed if
                   you want to regenerate pages programmatically. Safe to
                   ignore/delete for deployment; the .html files are final.
```

## Deploying to Vercel

1. Push this folder to a GitHub repo (or drag-and-drop the folder into the
   Vercel dashboard).
2. In Vercel: **New Project → Import** → framework preset **"Other"**
   (it's plain static HTML, no build command needed).
3. Deploy. `vercel.json` is already set up for clean headers.

## Before this goes live — things to plug in

- **Real photography.** Every image slot is currently a warm brand-pattern
  placeholder (the ✦ mark), not a broken image — intentional so the site
  looks finished for client review. Swap them for real photos by replacing
  the `.photo-panel` background in each spot with `background-image: url(...)`.
  Priority shots: hero (entrance/patio), Deluxe & Twin rooms, Garden/Lobby/Al
  Fresco, reception desk for the Contact page.
- **Google Maps embed** on the Contact page uses a generic query string —
  swap in the real embed URL from the Villa Merced Google Business listing
  for pixel-accurate pin placement.
- **Facebook/Instagram links** are placeholder `#` hrefs — drop in the real
  profile URLs (search, footer, and Contact page).
- **Inquiry form** currently shows a success message on submit but doesn't
  send anywhere yet. Wire it to Formspree, a Vercel serverless function, or
  an email API (Resend, SendGrid) before relying on it for real bookings.
- Fonts (Parisienne, Cormorant Garamond, Poppins, Fraunces) load from Google
  Fonts via `base.css` — no licensing cost, matches the original Canva site's
  look closely.

## Design notes

- Signature motif: the arched capiz window from the hotel's real facade
  (mentioned in the audit) recurs as an image frame, the ESTD badge, and
  card shapes — ties the whole system back to the actual building.
- Kusina Merced and Lavanderia de Merced keep their own palettes and type on
  purpose (per your call) so they read as distinct in-house brands, while
  still sharing the same header/footer/nav shell as the hotel.