// ===========================
// MARKETEDGE — SCRIPTS
// ===========================

// ===========================
// LIVE TICKER (BTC, GOLD, EUR/USD)
// Refreshes every 60s using free public APIs (no key required)
// ===========================
let lastEurUsd = null;
let lastGold = null;

function setTicker(symbol, text, isUp) {
  document.querySelectorAll(`.ticker-item[data-symbol="${symbol}"]`).forEach(el => {
    el.textContent = text;
    el.classList.remove('up', 'down');
    el.classList.add(isUp ? 'up' : 'down');
  });
}

async function updateBtc() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    const btcPrice = data.bitcoin.usd;
    const btcChange = data.bitcoin.usd_24h_change;
    const btcUp = btcChange >= 0;
    setTicker('btc', `BTC/USD  $${btcPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${btcUp ? '▲' : '▼'} ${btcUp ? '+' : ''}${btcChange.toFixed(2)}%`, btcUp);

    const ethPrice = data.ethereum.usd;
    const ethChange = data.ethereum.usd_24h_change;
    const ethUp = ethChange >= 0;
    setTicker('eth', `ETH/USD  $${ethPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ${ethUp ? '▲' : '▼'} ${ethUp ? '+' : ''}${ethChange.toFixed(2)}%`, ethUp);
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
    if (lastGold !== null) {
      const change = ((price - lastGold) / lastGold) * 100;
      isUp = change >= 0;
      const sign = isUp ? '+' : '';
      changeText = ` ${isUp ? '▲' : '▼'} ${sign}${change.toFixed(2)}%`;
    }
    lastGold = price;
    setTicker('gold', `GOLD  $${price.toLocaleString(undefined, {maximumFractionDigits: 0})}${changeText}`, isUp);
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
    if (lastEurUsd !== null) {
      const change = ((rate - lastEurUsd) / lastEurUsd) * 100;
      isUp = change >= 0;
      const sign = isUp ? '+' : '';
      changeText = ` ${isUp ? '▲' : '▼'} ${sign}${change.toFixed(2)}%`;
    }
    lastEurUsd = rate;
    setTicker('eurusd', `EUR/USD  ${rate.toFixed(4)}${changeText}`, isUp);
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
