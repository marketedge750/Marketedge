// ===========================
// FINTORRA — SCRIPTS
// ===========================

// ===========================
// LIVE TICKER (BTC, GOLD, EUR/USD)
// Refreshes every 60s using free public APIs (no key required)
// ===========================
let lastEurUsd = null;
let lastGold = null;
const movers = {};

function setTicker(symbol, text, isUp) {
  document.querySelectorAll(`.ticker-item[data-symbol="${symbol}"]`).forEach(el => {
    el.textContent = text;
    el.classList.remove('up', 'down');
    el.classList.add(isUp ? 'up' : 'down');
  });
  markFresh(symbol);
}

// ===========================
// STALE-DATA TRACKING
// A visitor should never silently see minutes/hours-old prices with no
// indication anything is wrong. We track the last successful update per
// symbol and flag the UI once data hasn't refreshed for 2+ cycles (>=150s).
// ===========================
const lastUpdated = {};
const STALE_AFTER_MS = 150000; // 2.5 refresh cycles at 60s

function markFresh(symbol) {
  lastUpdated[symbol] = Date.now();
  document.querySelectorAll(`[data-symbol="${symbol}"]`).forEach(el => {
    el.classList.remove('is-stale');
    el.removeAttribute('title');
  });
}

function markStale(symbol, label) {
  document.querySelectorAll(`[data-symbol="${symbol}"]`).forEach(el => {
    el.classList.add('is-stale');
    el.setAttribute('title', `${label || symbol}: live update failed — showing last known price.`);
  });
}

function checkStaleness() {
  const now = Date.now();
  Object.keys(lastUpdated).forEach(symbol => {
    if (now - lastUpdated[symbol] > STALE_AFTER_MS) {
      markStale(symbol);
    }
  });
}
setInterval(checkStaleness, 30000);

function sparklinePoints(changePercent) {
  const isUp = changePercent >= 0;
  const totalPoints = 24;
  const width = 100;
  const midY = 15;
  const amp = Math.min(Math.abs(changePercent) * 2.2, 11);
  const trend = isUp ? -amp : amp; // SVG y grows downward, so "up" means decreasing y
  const startOffset = isUp ? 5 : -5;

  // Deterministic pseudo-random noise seeded from the change value,
  // so the shape stays stable between re-renders of the same data point.
  let seed = Math.abs(Math.round(changePercent * 1000)) || 7;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const pts = [];
  for (let i = 0; i <= totalPoints; i++) {
    const progress = i / totalPoints;
    const x = width * progress;
    const target = midY + startOffset + trend * progress;
    const noise = (rand() - 0.5) * 5.5;
    let y = target + noise;
    y = Math.max(2, Math.min(28, y));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function updateTopMover() {
  const entries = Object.entries(movers);
  if (!entries.length) return;
  let top = entries[0];
  for (const e of entries) {
    if (Math.abs(e[1].change) > Math.abs(top[1].change)) top = e;
  }
  const el = document.getElementById('top-mover-value');
  if (el) {
    const info = top[1];
    const isUp = info.change >= 0;
    el.textContent = `${info.label}  ${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${info.change.toFixed(2)}%`;
    el.style.color = isUp ? 'var(--green)' : 'var(--red)';
  }
}

function setDashCard(symbol, label, priceText, changePercent) {
  const card = document.querySelector(`.dash-card[data-symbol="${symbol}"]`);
  if (!card) return;
  const isUp = changePercent >= 0;
  const priceEl = card.querySelector('[data-price]');
  const changeEl = card.querySelector('[data-change]');
  const sparkEl = card.querySelector('[data-spark]');
  if (priceEl) priceEl.textContent = priceText;
  if (changeEl) {
    changeEl.textContent = `${isUp ? '+' : ''}${changePercent.toFixed(2)}%`;
    changeEl.classList.remove('up', 'down');
    changeEl.classList.add(isUp ? 'up' : 'down');
  }
  if (sparkEl) {
    sparkEl.setAttribute('points', sparklinePoints(changePercent));
    sparkEl.classList.remove('up', 'down');
    sparkEl.classList.add(isUp ? 'up' : 'down');
  }
  movers[symbol] = { label, change: changePercent };
  updateTopMover();
}

async function updateBtc() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    const btcPrice = data.bitcoin.usd;
    const btcChange = data.bitcoin.usd_24h_change;
    const btcUp = btcChange >= 0;
    setTicker('btc', `BTC/USD  $${btcPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${btcUp ? '▲' : '▼'} ${btcUp ? '+' : ''}${btcChange.toFixed(2)}%`, btcUp);
    setDashCard('btc', 'Bitcoin', `$${btcPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`, btcChange);

    const ethPrice = data.ethereum.usd;
    const ethChange = data.ethereum.usd_24h_change;
    const ethUp = ethChange >= 0;
    setTicker('eth', `ETH/USD  $${ethPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${ethUp ? '▲' : '▼'} ${ethUp ? '+' : ''}${ethChange.toFixed(2)}%`, ethUp);
    setDashCard('eth', 'Ethereum', `$${ethPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`, ethChange);
  } catch (err) {
    console.error('BTC/ETH price fetch failed:', err);
    markStale('btc', 'Bitcoin');
    markStale('eth', 'Ethereum');
  }
}

async function updateGold() {
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU');
    const data = await res.json();
    const price = data.price;
    let isUp = true;
    let changeText = '';
    let change = 0;
    if (lastGold !== null) {
      change = ((price - lastGold) / lastGold) * 100;
      isUp = change >= 0;
      const sign = isUp ? '+' : '';
      changeText = ` ${isUp ? '▲' : '▼'} ${sign}${change.toFixed(2)}%`;
    }
    lastGold = price;
    setTicker('gold', `GOLD  $${price.toLocaleString(undefined, {maximumFractionDigits: 0})}${changeText}`, isUp);
    setDashCard('gold', 'Gold', `$${price.toLocaleString(undefined, {maximumFractionDigits: 0})}`, change);
  } catch (err) {
    console.error('Gold price fetch failed:', err);
    markStale('gold', 'Gold');
  }
}

async function updateEurUsd() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
    const data = await res.json();
    const rate = data.rates.USD;
    let isUp = true;
    let changeText = '';
    let change = 0;
    if (lastEurUsd !== null) {
      change = ((rate - lastEurUsd) / lastEurUsd) * 100;
      isUp = change >= 0;
      const sign = isUp ? '+' : '';
      changeText = ` ${isUp ? '▲' : '▼'} ${sign}${change.toFixed(2)}%`;
    }
    lastEurUsd = rate;
    setTicker('eurusd', `EUR/USD  ${rate.toFixed(4)}${changeText}`, isUp);
    setDashCard('eurusd', 'EUR/USD', rate.toFixed(4), change);
  } catch (err) {
    console.error('EUR/USD fetch failed:', err);
    markStale('eurusd', 'EUR/USD');
  }
}

// ===========================
// S&P 500 / NASDAQ — via a Netlify Function proxy, NOT a direct client call.
// The Twelve Data API key lives server-side only (Netlify env var
// TWELVE_DATA_API_KEY), never shipped to the browser. See
// netlify/functions/quote.js. This also means the free-tier quota (800
// calls/day) is shared efficiently across all visitors from one server-side
// cache instead of being burned per-visitor and scrapable from view-source.
// ===========================
async function updateIndex(symbol, tickerKey, label) {
  try {
    const res = await fetch(`/.netlify/functions/quote?symbol=${symbol}`);
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const data = await res.json();
    if (data.error || !data.close) {
      console.error(`Quote proxy error for ${symbol}:`, data.error || data);
      markStale(tickerKey, label);
      return;
    }
    const price = parseFloat(data.close);
    const change = parseFloat(data.percent_change);
    const isUp = change >= 0;
    const arrow = isUp ? '▲' : '▼';
    const sign = isUp ? '+' : '';
    setTicker(tickerKey, `${label}  ${price.toLocaleString(undefined, {maximumFractionDigits: 0})} ${arrow} ${sign}${change.toFixed(2)}%`, isUp);
    setDashCard(tickerKey, label, price.toLocaleString(undefined, {maximumFractionDigits: 0}), change);
  } catch (err) {
    console.error(`${label} fetch failed:`, err);
    markStale(tickerKey, label);
  }
}

function updateSp500() {
  updateIndex('SPX', 'sp500', 'S&P 500');
}

function updateNasdaq() {
  updateIndex('IXIC', 'nasdaq', 'NASDAQ');
}

function refreshTicker() {
  updateBtc();
  updateGold();
  updateEurUsd();
  updateSp500();
  updateNasdaq();
  // Note: 10Y Treasury yield was removed from the ticker — Twelve Data's
  // free tier doesn't cover bond yields, only equities/indices/forex/crypto.
}

if (document.querySelector('.market-strip')) {
  refreshTicker();
  setInterval(refreshTicker, 60000); // refresh every 60 seconds
}

// ===========================
// LIVE BTC CHART (real 24h history from CoinGecko, via Chart.js)
// ===========================
let btcChartInstance = null;

async function updateBtcChart() {
  const canvas = document.getElementById('btc-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1');
    const data = await res.json();
    const prices = data.prices; // [[timestamp, price], ...]
    const labels = prices.map(p => new Date(p[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const values = prices.map(p => p[1]);

    const priceBadge = document.getElementById('chart-price');
    if (priceBadge) {
      const latest = values[values.length - 1];
      priceBadge.textContent = `$${latest.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    const isUp = values[values.length - 1] >= values[0];
    const lineColor = isUp ? '#1A9B5E' : '#C0392B';

    if (btcChartInstance) {
      btcChartInstance.data.labels = labels;
      btcChartInstance.data.datasets[0].data = values;
      btcChartInstance.data.datasets[0].borderColor = lineColor;
      btcChartInstance.update('none');
      return;
    }

    btcChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
          fill: true,
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, 'rgba(15,163,177,0.15)');
            gradient.addColorStop(1, 'rgba(15,163,177,0)');
            return gradient;
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 6, color: '#7A8394', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#7A8394', font: { size: 10 }, callback: v => '$' + v.toLocaleString() }, grid: { color: 'rgba(122,131,148,0.12)' } },
        },
      },
    });
  } catch (err) {
    console.error('BTC chart fetch failed:', err);
  }
}

if (document.getElementById('btc-chart')) {
  updateBtcChart();
  setInterval(updateBtcChart, 60000);
}

// FAQ accordion — event-delegated (no inline onclick=""), and announces
// open/closed state to screen readers via aria-expanded.
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');

    document.querySelectorAll('.faq-q').forEach(q => {
      q.classList.remove('open');
      q.setAttribute('aria-expanded', 'false');
      q.nextElementSibling.classList.remove('open');
    });

    if (!isOpen) {
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      answer.classList.add('open');
    }
  });
});

// Newsletter submit
// TODO: netlify/functions/subscribe.js is a stub — wire it to your real ESP
// (Mailchimp, ConvertKit, Buttondown, etc.) using their API + an env-var
// API key, the same pattern as netlify/functions/quote.js. Until that's
// done this will fail quietly server-side and the emails are NOT captured
// anywhere — do not treat this as production-ready.
async function handleSubscribe(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button');
  const input = form.querySelector('input');
  const email = input.value;
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Subscribing…';
  try {
    const res = await fetch('/.netlify/functions/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(`Subscribe endpoint returned ${res.status}`);
    btn.textContent = '✓ You\'re in!';
    btn.style.background = '#1A9B5E';
    input.value = '';
    input.disabled = true;
  } catch (err) {
    console.error('Newsletter subscribe failed:', err);
    btn.disabled = false;
    btn.textContent = originalLabel;
    const note = form.querySelector('.subscribe-error') || document.createElement('p');
    note.className = 'subscribe-error';
    note.textContent = 'Something went wrong — please try again in a moment.';
    if (!form.querySelector('.subscribe-error')) form.appendChild(note);
  }
}

// Dark/light theme toggle (preference saved in localStorage)
(function () {
  const root = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('fintorra-theme') || (systemPrefersDark ? 'dark' : 'light');

  function applyTheme(theme) {
    const sunSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    const moonSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (toggleBtn) toggleBtn.innerHTML = sunSVG;
    } else {
      root.removeAttribute('data-theme');
      if (toggleBtn) toggleBtn.innerHTML = moonSVG;
    }
  }

  applyTheme(saved === 'dark' ? 'dark' : 'light');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('fintorra-theme', next);
    });
  }
})();

// Mobile hamburger (simple toggle)
const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    if (links) {
      const visible = links.style.display === 'flex';
      links.style.cssText = visible ? '' : 'display:flex;flex-direction:column;position:absolute;top:64px;left:0;right:0;background:#fff;padding:16px 24px;gap:16px;border-bottom:1px solid #E4E7ED;z-index:99';
    }
  });
}
