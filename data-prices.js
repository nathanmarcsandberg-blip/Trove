// data-prices.js — fetch prices/yields once per day, with per-ticker 24h cooldown
(function () {
  // ----- Keys (override via localStorage in browser for safety) -----
  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL:  localStorage.getItem('TROVE_API_METAL')  || 'Fda0bb2a0f5f5e9de80ad2096dd8f4de'
  };

  // ----- localStorage keys -----
  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';
  const LSK_LAST_OK = 'trove_prices_last_ok_v1';     // per-ticker last successful fetch time

  const DAY_MS = 24 * 60 * 60 * 1000;

  // ----- helpers -----
  const fmtTag = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const getCache   = () => { try { return JSON.parse(localStorage.getItem(LSK_CACHE) || '{}'); } catch { return {}; } };
  const setCache   = (o) => localStorage.setItem(LSK_CACHE, JSON.stringify(o));
  const getLastOk  = () => { try { return JSON.parse(localStorage.getItem(LSK_LAST_OK) || '{}'); } catch { return {}; } };
  const setLastOk  = (m) => localStorage.setItem(LSK_LAST_OK, JSON.stringify(m));
  const stampOK    = (name, iso) => { const m = getLastOk(); m[name] = iso; setLastOk(m); };
  const canQuery   = (row, nowMs) => {
    // If price is 0 ⇒ we haven't succeeded yet ⇒ always eligible
    if (!row.price || row.price === 0) return true;
    // Otherwise only if >24h since last successful fetch
    const last = getLastOk()[row.name];
    if (!last) return true;
    return (nowMs - Date.parse(last)) > DAY_MS;
  };

  if (!Array.isArray(window.ASSETS_DISPLAY)) {
    console.error('[TroveData] ASSETS_DISPLAY missing — make sure assets-config.js loads before this file.');
    window.ASSETS_DISPLAY = [];
  }

  // ----- working rows the UI reads -----
  const rows = window.ASSETS_DISPLAY.map(a => ({
    ...a,
    price: window.ASSETS_SEED?.[a.name]?.price ?? 0,
    yield: window.ASSETS_SEED?.[a.name]?.yield ?? ''
  }));

  // hydrate from cache immediately
  (function hydrateFromCache () {
    const cache = getCache();
    rows.forEach(r => {
      const hit = cache[r.name];
      if (!hit) return;
      if (typeof hit.price === 'number') r.price = hit.price;
      if (typeof hit.yield === 'string') r.yield = hit.yield;
    });
  })();

  // ----- Providers -----

  // Crypto: CoinGecko (no key) → Coinbase fallback
  async function fetchCrypto (map) {
    console.log('[Crypto] Start', map);
    const out = {};
    const geckoId = (s) => ({ BTC: 'bitcoin', ETH: 'ethereum' }[s] || null);
    const ids = Object.values(map).map(geckoId).filter(Boolean);

    // CoinGecko
    if (ids.length) {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
        console.log('[Crypto] CoinGecko URL', url);
        const r = await fetch(url);
        const j = await r.json();
        console.log('[Crypto] CoinGecko JSON', j);
        for (const [name, sym] of Object.entries(map)) {
          const p = j?.[geckoId(sym)]?.usd;
          if (typeof p === 'number') out[name] = { price: p };
        }
      } catch (e) { console.error('[Crypto] CoinGecko error', e); }
    }

    // Coinbase fallback per remaining symbol
    for (const [name, sym] of Object.entries(map)) {
      if (out[name]) continue;
      try {
        const url = `https://api.exchange.coinbase.com/products/${sym}-USD/ticker`;
        console.log('[Crypto] Coinbase URL', url);
        const r = await fetch(url);
        const j = await r.json();
        console.log('[Crypto] Coinbase JSON', j);
        const p = parseFloat(j.price);
        if (!isNaN(p)) out[name] = { price: p };
      } catch (e) { console.error('[Crypto] Coinbase error', e); }
    }
    console.log('[Crypto] Parsed', out);
    return out;
  }

  // Equities (with dividend_yield): Twelve Data
  async function fetchEquities (map) {
    console.log('[Equities] Start', map);
    const syms = Object.values(map);
    if (!syms.length) return {};
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${API.TWELVE}`;
    console.log('[Equities] URL', url);
    const r = await fetch(url);
    if (!r.ok) {
      console.error('[Equities] HTTP', r.status, r.statusText, await r.text().catch(()=>'')); 
      return {};
    }
    const j = await r.json();
    console.log('[Equities] JSON', j);

    const out = {};
    const toName = (sym) => Object.entries(map).find(([n, s]) => s === sym)?.[0] || sym;

    if (j.symbol) {
      const p = parseFloat(j.close);
      const y = j.dividend_yield != null ? String(j.dividend_yield) : '';
      const nm = toName(j.symbol);
      if (!isNaN(p)) out[nm] = { price: p, yield: y ? `${y}%` : '' };
    } else {
      for (const [sym, data] of Object.entries(j)) {
        const p = parseFloat(data.close);
        const y = data.dividend_yield != null ? String(data.dividend_yield) : '';
        const nm = toName(sym);
        if (!isNaN(p)) out[nm] = { price: p, yield: y ? `${y}%` : '' };
      }
    }
    console.log('[Equities] Parsed', out);
    return out;
  }

  // Metals: Twelve Data first (XAU/USD etc.), MetalPrice fallback (invert)
  async function fetchMetals (map) {
    console.log('[Metals] Start', map);
    const pairsByName = Object.fromEntries(Object.entries(map).map(([n, code]) => [n, `${code}/USD`]));
    const pairList = [...new Set(Object.values(pairsByName))].join(',');
    const out = {};

    // Primary: Twelve Data
    if (pairList) {
      try {
        const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(pairList)}&apikey=${API.TWELVE}`;
        console.log('[Metals][TD] URL', url);
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          console.log('[Metals][TD] JSON', j);
          const byName = (pair) => Object.entries(pairsByName).find(([, p]) => p === pair)?.[0] || pair;
          if (j.symbol) {
            const p = parseFloat(j.close); const nm = byName(j.symbol);
            if (!isNaN(p)) out[nm] = { price: p };
          } else {
            for (const [pair, data] of Object.entries(j)) {
              const p = parseFloat(data.close); const nm = byName(pair);
              if (!isNaN(p)) out[nm] = { price: p };
            }
          }
        } else {
          console.warn('[Metals][TD] HTTP', r.status, r.statusText);
        }
      } catch (e) { console.error('[Metals][TD] error', e); }
    }

    // Fallback: MetalPrice
    const missing = Object.keys(map).filter((nm) => !out[nm]);
    if (missing.length) {
      const codesNeeded = [...new Set(missing.map(nm => map[nm]))].join(',');
      try {
        const url = `https://api.metalpriceapi.com/v1/latest?api_key=${API.METAL}&base=USD&currencies=${codesNeeded}`;
        console.log('[Metals][MP] URL', url);
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          console.log('[Metals][MP] JSON', j);
          for (const nm of missing) {
            const code = map[nm];
            const rate = j?.rates?.[code]; // USD base ⇒ XAU per USD
            if (!rate) { console.warn('[Metals][MP] Missing rate for', code); continue; }
            const usdPerUnit = 1 / parseFloat(rate); // invert to USD per XAU
            if (!isNaN(usdPerUnit)) out[nm] = { price: usdPerUnit };
          }
        } else {
          console.warn('[Metals][MP] HTTP', r.status, r.statusText, await r.text().catch(()=>'')); 
        }
      } catch (e) { console.error('[Metals][MP] error', e); }
    }

    console.log('[Metals] Parsed', out);
    return out;
  }

  // ----- refresh (per-ticker cooldown) -----
  async function refreshPrices (force = false) {
    const nowIso = new Date().toISOString();
    const nowMs  = Date.now();

    // Only query tickers that are eligible (force does NOT bypass per-ticker cooldown)
    const eligible = rows.filter(r => canQuery(r, nowMs));
    const mapCrypto = Object.fromEntries(eligible.filter(r => r.source === 'crypto').map(r => [r.name, r.symbol]));
    const mapEquity = Object.fromEntries(eligible.filter(r => r.source === 'equity').map(r => [r.name, r.symbol]));
    const mapMetal  = Object.fromEntries(eligible.filter(r => r.source === 'metal').map(r  => [r.name, r.symbol]));
    console.log('[Refresh] Eligible tickers', eligible.map(r => r.name));

    if (!eligible.length) {
      // Nothing to do—still emit so the “Last Updated” tag stays current
      localStorage.setItem(LSK_UPDATED, nowIso);
      emit();
      return { skipped: true };
    }

    const results = await Promise.allSettled([
      fetchCrypto(mapCrypto),
      fetchEquities(mapEquity),
      fetchMetals(mapMetal)
    ]);

    const cache = getCache();

    for (const res of results) {
      if (res.status !== 'fulfilled' || !res.value) continue;
      for (const [name, v] of Object.entries(res.value)) {
        const row = rows.find(r => r.name === name);
        if (!row) continue;
        if (typeof v.price === 'number' && v.price !== 0) {
          row.price = v.price;
          stampOK(name, nowIso);
        }
        if (typeof v.yield === 'string') row.yield = v.yield;
        cache[name] = { ...(cache[name] || {}), ...v, ts: nowIso };
      }
    }

    setCache(cache);
    localStorage.setItem(LSK_UPDATED, nowIso);
    emit();
    return { skipped: false };
  }

  // ----- public API -----
  const listeners = new Set();
  function emit () { listeners.forEach(fn => fn()); }
  function onChange (fn) { listeners.add(fn); }

  window.TroveData = {
    getDisplayData: () => rows.slice(),
    getLastUpdatedTag: () => fmtTag(localStorage.getItem(LSK_UPDATED)),
    refreshPrices,
    onChange
  };
})();
