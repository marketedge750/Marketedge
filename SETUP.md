# Fintorra — setup checklist after deploying to GitHub Pages

Two things need to be set up once for the site to be fully live. Nothing
else here requires action — the rest deploys automatically.

## 1. Live S&P 500 / NASDAQ quotes

These come from a GitHub Actions workflow that runs every 15 minutes and
writes `data/quotes.json`, since GitHub Pages can't run a server to hide
an API key the way the site's other live prices (BTC, ETH, Gold, EUR/USD)
work without one.

- Get a free key at https://twelvedata.com
- In this repo: **Settings → Secrets and variables → Actions → New
  repository secret**, name it `TWELVE_DATA_API_KEY`, paste the key.
- The workflow (`.github/workflows/update-quotes.yml`) will pick it up on
  its next scheduled run — or trigger it manually from the **Actions**
  tab → "Update market quotes" → **Run workflow**.
- Until this is set up, the S&P 500 / NASDAQ cards will show the
  placeholder numbers in `data/quotes.json` with a stale-data warning (⚠)
  — that's expected, not a bug.

## 2. Newsletter signup form

GitHub Pages has no server to receive form submissions, so the site
posts to [Formspree](https://formspree.io) instead (a free hosted form
backend built for exactly this).

- Create a free account at https://formspree.io and a new form.
- Copy its form ID (the short code in the endpoint URL).
- In `script.js`, find `const FORMSPREE_FORM_ID = 'YOUR_FORM_ID';` near
  `handleSubscribe` and replace `YOUR_FORM_ID` with it.
- Until this is done, the newsletter form will show an error on submit —
  no emails are being captured anywhere yet.

## Why not Netlify Functions?

An earlier version of this fix used a Netlify Function to hide the
Twelve Data key server-side. That only works if the site is actually
hosted on Netlify — it silently does nothing on GitHub Pages, which is
why the S&P 500/NASDAQ cards showed a stale-data warning after the first
deploy here. The GitHub Actions + static JSON approach above is the
GitHub Pages-compatible equivalent: same goal (key never reaches the
browser), different mechanism.
