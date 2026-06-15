# Rhodes4Ikamva — eligibility checker

A free, mobile-first web tool that helps **IkamvaYouth** students and alumni work
out whether they can apply for a **Rhodes Scholarship** (Southern Africa, 2027
cycle) and guides them to the official application — built around the newly
**expanded "School" scholarships**.

- **Live site:** _(added after first deploy)_
- **Audience:** township students on low-end Android phones / low data → the app
  is plain static HTML/CSS/JS (no framework, no build step), works offline after
  first visit, and stores **no personal data** (everything runs in the browser).

> ⚠️ This is a **guidance tool**, not an official Rhodes Trust channel. Every
> fact is checked against the official 2027 *Information for Candidates*, the
> Rhodes/Schools *Joint Statement*, and the 2027 *Document Checklist*, but always
> confirm details on [rhodeshouse.ox.ac.uk](https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/).

## How it works

1. The student answers a few questions (citizenship, age, degree, school/district,
   university).
2. `js/engine.js` works out which **pool(s)** they can apply to — up to two, with
   the "only one School pool" / "BLMNS only" rules enforced.
3. The results page shows their pool(s), a deadline countdown, the document
   checklist, the official apply link, and a pre-filled WhatsApp/email to a
   coordinator.

**Accuracy safeguard:** the regional pool is always offered as the safe baseline;
a *School* pool is only ever promised when the student positively matches a named
school, an education district, or a partner university — never inferred from their
IkamvaYouth branch alone.

## Editing the facts

All scholarship facts live in **`js/data.js`** (dates, pools, triggers, districts,
documents, the disclaimer). Change a fact there and redeploy — logic and UI never
hard-code facts. Run the logic tests after editing:

```bash
node test/engine.test.js
```

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (free)

This is a static site — host it anywhere. Two easy options:

- **GitHub Pages:** repo → Settings → Pages → Source = `main` / root. (`.nojekyll`
  is included; asset paths are relative so it works under a project subpath.)
- **Cloudflare Pages** (recommended for South African latency): Create → Pages →
  connect this repo → Framework preset **None**, build command empty, output dir `/`.

## Files

```
index.html            single page (home / check / result / about / faq)
css/styles.css        brand styles (CSS variables)
js/data.js            ALL facts + the branch→district map (edit here)
js/engine.js          eligibility decision logic (pure)
js/app.js             UI, question flow, countdown, contact links
onepager/             the WhatsApp share asset (HTML source + exported PNG/PDF)
test/engine.test.js   persona tests for the engine
sw.js, manifest…      offline / installable PWA bits
```

## ⚠️ Open items before wide release

These are intentionally left as clearly-marked placeholders:

1. **Coordinator contact** — `CONTACT` at the top of `js/app.js`. It currently
   routes "get help" to the official public Rhodes queries address and **hides the
   WhatsApp button**. Set `CONTACT.email`/`CONTACT.name` to the agreed IkamvaYouth
   coordinator and add a consented public WhatsApp number (`CONTACT.whatsapp`,
   E.164 without `+`, e.g. `2774…`) to show the WhatsApp button.
2. **Brand assets & colours** — the header uses a text wordmark and the palette in
   `css/styles.css` (`:root`) is a **placeholder**. Drop in the official
   IkamvaYouth + Rhodes logos (`assets/`) and replace the hex values once confirmed.
3. **District confirmations** — for the "Nyanga / Masi → Bishops" route, confirm
   which specific high schools / district make those branches Bishops-eligible
   (Nyanga is WCED Metro *Central*, not Metro *South*). See `BRANCHES` notes.
4. **Exact application URL** — `META.embarkUrl`/`officialUrl` in `data.js` points to
   the Rhodes scholarship page; swap in the precise Embark application URL once live.

## License

MIT (see `LICENSE`). Scholarship content © the Rhodes Trust; this tool is an
independent outreach aid.
