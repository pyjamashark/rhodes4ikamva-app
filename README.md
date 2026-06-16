# Rhodes4Ikamva eligibility checker

A free, mobile-first web tool that helps **IkamvaYouth** students and alumni work
out whether they can apply for a **Rhodes Scholarship** (Southern Africa, 2027
cycle) and guides them to the official application, built around the newly
**expanded "School" scholarships**.

- **Live site:** https://rhodes4ikamvayouth.org/ (hosted on Cloudflare Pages)
- **Audience:** township students on low-end Android phones / low data, so the app
  is plain static HTML/CSS/JS (no framework, no build step), works offline after
  first visit, and stores **no personal data** (everything runs in the browser).

> This is a **guidance tool**, not an official Rhodes Trust channel. Every fact is
> checked against the official 2027 *Information for Candidates*, the Rhodes/Schools
> *Joint Statement*, and the 2027 *Document Checklist*, but always confirm details on
> [rhodeshouse.ox.ac.uk](https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/).

## How it works

1. The student answers a few questions (branch, citizenship, age, degree,
   school/district, university).
2. `js/engine.js` works out which **pool(s)** they can apply to, up to two, with
   the "only one School pool" and "BLMNS only" rules enforced.
3. The results page shows their pool(s), a deadline countdown, the document
   checklist, the official apply link, and a pre-filled WhatsApp/email to a
   coordinator.

**Branch-driven streamlining:** each IkamvaYouth branch is linked to a specific
high school (from the IkamvaYouth branches page), which tells us the WCED education
district and therefore the likely School pool. So a branch learner confirms their
School pool in one tap (e.g. Nyanga and Gugulethu sit in Cape Town Metro South, which
qualifies for Bishops; Kayamandi is in the Cape Winelands, which qualifies for Paul
Roos; Joza is in Makhanda, which qualifies for St Andrew's).

**Accuracy safeguard:** the regional pool is always offered as the safe baseline; a
*School* pool is only ever promised when the student positively matches a named
school, an education district, or a partner university. When the district was
inferred from the branch, the result adds a "confirm with a coordinator" note.

## Editing the facts

All scholarship facts live in **`js/data.js`** (dates, pools, triggers, districts,
branches, documents, the disclaimer). Change a fact there and redeploy. Logic and UI
never hard-code facts. Run the logic tests after editing:

```bash
node test/engine.test.js
```

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (free)

This is a static site, host it anywhere. Two easy options:

- **GitHub Pages:** repo, Settings, Pages, Source = `main` / root. (`.nojekyll` is
  included; asset paths are relative so it works under a project subpath.)
- **Cloudflare Pages** (recommended for South African latency): Create, Pages,
  connect this repo, Framework preset **None**, build command empty, output dir `/`.

## Files

```
index.html            single page (home / check / result / about / faq)
css/styles.css        brand styles (CSS variables)
js/data.js            ALL facts + the branch to school to district map (edit here)
js/engine.js          eligibility decision logic (pure)
js/app.js             UI, question flow, countdown, contact links
onepager/             the WhatsApp share asset (HTML source + exported PNG/PDF + QR)
test/engine.test.js   persona tests for the engine
sw.js, manifest...    offline / installable PWA bits
```

## Open items before wide release

These are intentionally left as clearly-marked placeholders:

1. **Coordinator contact:** `CONTACT` at the top of `js/app.js`. It currently routes
   "get help" to the official public Rhodes queries address and **hides the WhatsApp
   button**. Set `CONTACT.email`/`CONTACT.name` to the agreed IkamvaYouth coordinator
   and add a consented public WhatsApp number (`CONTACT.whatsapp`, E.164 without `+`,
   e.g. `2774...`) to show the WhatsApp button.
2. **Brand assets and colours:** the header uses a text wordmark and the palette in
   `css/styles.css` (`:root`) is a **placeholder**. Drop in the official IkamvaYouth +
   Rhodes logos (`assets/`) and replace the hex values once confirmed.
3. **District spot-checks:** branch areas map to WCED districts in `data.js` using the
   host-school listed on the IkamvaYouth branches page. Confirmed: Nyanga (Oscar Mpetha
   High) and Gugulethu sit in Metro South (Bishops); Kayamandi in Cape Winelands (Paul
   Roos); Joza in Makhanda (St Andrew's). Spot-check Khayelitsha and Atlantis (treated
   as regional-only) if a learner there matriculated at a Metro South school.
4. **Exact application URL:** `META.officialUrl` in `data.js` points to the Rhodes
   scholarship page; swap in the precise Embark application URL once live.

## License

MIT (see `LICENSE`). Scholarship content belongs to the Rhodes Trust; this tool is an
independent outreach aid.
