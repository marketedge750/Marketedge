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
  const amp = Math.min(Math.abs(changePercent) * 3, 16);
  const base = isUp
    ? [[0, 22], [20, 20], [40, 17], [60, 14], [80, 10]]
    : [[0, 8], [20, 10], [40, 13], [60, 16], [80, 20]];
  const endY = isUp ? Math.max(2, 10 - amp) : Math.min(28, 20 + amp);
  return [...base, [100, endY]].map(p => p.join(',')).join(' ');
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
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (toggleBtn) toggleBtn.textContent = '☀️';
    } else {
      root.removeAttribute('data-theme');
      if (toggleBtn) toggleBtn.textContent = '🌙';
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
      const visible = links.style.display === 'flex';
      links.style.cssText = visible ? '' : 'display:flex;flex-direction:column;position:absolute;top:64px;left:0;right:0;background:#fff;padding:16px 24px;gap:16px;border-bottom:1px solid #E4E7ED;z-index:99';
    }
  });
}
