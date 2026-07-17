// ===========================
// MARKETEDGE — SCRIPTS
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
}

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
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    const ethPrice = data.ethereum.usd;
    const ethChange = data.ethereum.usd_24h_change;
    const ethUp = ethChange >= 0;
    setTicker('eth', `ETH/USD  $${ethPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${ethUp ? '▲' : '▼'} ${ethUp ? '+' : ''}${ethChange.toFixed(2)}%`, ethUp);
    setDashCard('eth', 'Ethereum', `$${ethPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`, ethChange);
  } catch (err) {
    console.error('ETH price fetch failed:', err);
  }
}

async function updateBtcTicker() {
  // On pages with the live chart (homepage), that fetch already supplies BTC
  // price/change — skip this duplicate call to stay within API rate limits.
  if (document.getElementById('btc-chart')) return;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    const btcPrice = data.bitcoin.usd;
    const btcChange = data.bitcoin.usd_24h_change;
    const btcUp = btcChange >= 0;
    setTicker('btc', `BTC/USD  $${btcPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${btcUp ? '▲' : '▼'} ${btcUp ? '+' : ''}${btcChange.toFixed(2)}%`, btcUp);
    setDashCard('btc', 'Bitcoin', `$${btcPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`, btcChange);
  } catch (err) {
    console.error('BTC price fetch failed:', err);
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
  }
}

// Twelve Data API key (free tier: 800 calls/day, 8/min — plenty for a 60s refresh)
const TWELVE_DATA_API_KEY = '0f98ad83d0f8483595a32eeb13bf45fa';

async function updateIndex(symbol, tickerKey, label) {
  try {
    const res = await fetch(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`);
    const data = await res.json();
    if (data.status === 'error' || !data.close) {
      console.error(`Twelve Data error for ${symbol}:`, data.message || data);
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
  updateBtcTicker();
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

    // Feed the same real data into the ticker and dashboard card (no extra API call)
    const latestPrice = values[values.length - 1];
    const btcChangePct = ((values[values.length - 1] - values[0]) / values[0]) * 100;
    setTicker('btc', `BTC/USD  $${latestPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${btcChangePct.toFixed(2)}%`, isUp);
    setDashCard('btc', 'Bitcoin', `$${latestPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`, btcChangePct);

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
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
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

// FAQ accordion
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');

  // close all
  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });

  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

// Newsletter submit
function handleSubscribe(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const input = e.target.querySelector('input');
  btn.textContent = '✓ You\'re in!';
  btn.style.background = '#1A9B5E';
  input.value = '';
  input.disabled = true;
  btn.disabled = true;
}

// Dark/light theme toggle (preference saved in localStorage)
(function () {
  const root = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('marketedge-theme');

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
      localStorage.setItem('marketedge-theme', next);
    });
  }
})();

// Mobile hamburger (simple toggle)
const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    if (links) {
      links.classList.toggle('nav-links-open');
    }
  });
}
