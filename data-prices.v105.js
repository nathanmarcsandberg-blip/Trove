// data-prices.js v105 — prices/yields with MetalPrice API for metals
(function () {
  // ----- Keys (override via localStorage in browser if needed) -----
  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL:  localStorage.getItem('TROVE_API_METAL')  || 'Fda0bb2a0f5f5e9de80ad2096dd8f4de'
  };

  // ----- localStorage keys -----
  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';

  // ----- helpers -----
  function fmtTag(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function getCache() { try { return JSON.parse(localStorage.getItem(LSK_CACHE) || '{}'); } catch (e) { return {}; } }
  function setCache(o) { localStorage.setItem(LSK_CACHE, JSON.stringify(o)); }

  // ----- bootstrap rows -----
  if (!Array.isArray(window.ASSETS_DISPLAY)) {
    console.error('[TroveData] ASSETS_DISPLAY missing — ensure assets-config.js loads first.');
    window.ASSETS_DISPLAY = [];
  }

  const rows = window.ASSETS_DISPLAY.map(function (a) {
    const seed = (window.ASSETS_SEED && window.ASSETS_SEED[a.name]) ? window.ASSETS_SEED[a.name] : { price: 0, yield: '' };
    return {
      name: a.name,
      class: a.class,
      source: a.source,
      symbol: a.symbol,
      price: typeof seed.price === 'number' ? seed.price : 0,
      yield: typeof seed.yield === 'string' ? seed.yield : ''
    };
  });

  // Hydrate from cache
  (function hydrateFromCache () {
    const cache = getCache();
    rows.forEach(function (r) {
      const hit = cache[r.name];
      if (!hit) return;
      if (typeof hit.price === 'number') r.price = hit.price;
      if (typeof hit.yield === 'string') r.yield = hit.yield;
    });
  })();

  // ----- Providers -----

  // Crypto: CoinGecko (no key) → Coinbase fallback
  async function fetchCrypto(map) {
    console.log('[Crypto] Start', map);
    const out = {};
    function geckoId(sym) {
      if (sym === 'BTC') return 'bitcoin';
      if (sym === 'ETH') return 'ethereum';
      return null;
    }
    const ids = Object.values(map).map(geckoId).filter(function (x) { return !!x; });
    if (ids.length > 0) {
      try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd';
        console.log('[Crypto] CoinGecko URL', url);
        const r = await fetch(url);
        const j = await r.json();
        console.log('[Crypto] CoinGecko JSON', j);
        for (const [name, sym] of Object.entries(map)) {
          const id = geckoId(sym);
          const p = id && j[id] ? j[id].usd : undefined;
          if (typeof p === 'number') out[name] = { price: p };
        }
      } catch (e) {
        console.error('[Crypto] CoinGecko error', e);
      }
    }
    // Coinbase fallback
    for (const [name, sym] of Object.entries(map)) {
      if (out[name]) continue;
      try {
        const url = 'https://api.exchange.coinbase.com/products/' + sym + '-USD/ticker';
        console.log('[Crypto] Coinbase URL', url);
        const r = await fetch(url);
        const j = await r.json();
        console.log('[Crypto] Coinbase JSON', j);
        const p = parseFloat(j.price);
        if (!Number.isNaN(p)) out[name] = { price: p };
      } catch (e) {
        console.error('[Crypto] Coinbase error', e);
      }
    }
    console.log('[Crypto] Parsed', out);
    return out;
  }

  // Equities: Twelve Data (supports dividend_yield)
  async function fetchEquities(map) {
    console.log('[Equities] Start', map);
    const syms = Object.values(map);
    if (syms.length === 0) return {};
    const url = 'https://api.twelvedata.com/quote?symbol=' + encodeURIComponent(syms.join(',')) + '&apikey=' + API.TWELVE;
    console.log('[Equities] URL', url);
    const r = await fetch(url);
    if (!r.ok) {
      let body = '';
      try { body = await r.text(); } catch (e) {}
      console.warn('[Equities] HTTP', r.status, r.statusText, body);
      return {};
    }
    const j = await r.json();
    console.log('[Equities] JSON', j);
    const out = {};
    function toName(sym) {
      for (const [n, s] of Object.entries(map)) if (s === sym) return n;
      return sym;
    }
    if (j.symbol) {
      const p = parseFloat(j.close);
      const y = (j.dividend_yield != null) ? String(j.dividend_yield) : '';
      const nm = toName(j.symbol);
      if (!Number.isNaN(p)) out[nm] = { price: p, yield: y ? (y + '%') : '' };
    } else {
      for (const [sym, data] of Object.entries(j)) {
        const p = parseFloat(data.close);
        const y = (data.dividend_yield != null) ? String(data.dividend_yield) : '';
        const nm = toName(sym);
        if (!Number.isNaN(p)) out[nm] = { price: p, yield: y ? (y + '%') : '' };
      }
    }
    console.log('[Equities] Parsed', out);
    return out;
  }

  // Metals: MetalPrice API ONLY (USD base -> invert to USD per unit)
  async function fetchMetals(map) {
    console.log('[Metals] Start [MetalPrice API]', map);
    const codes = Array.from(new Set(Object.values(map))).join(',');
    if (!codes) return {};
    const url = 'https://api.metalpriceapi.com/v1/latest?api_key=' + API.METAL + '&base=USD&currencies=' + codes;
    console.log('[Metals][MP] URL', url);
    try {
      const r = await fetch(url);
      console.log('[Metals][MP] status', r.status, r.statusText);
      if (!r.ok) {
        let body = '';
        try { body = await r.text(); } catch (e) {}
        console.warn('[Metals][MP] body', body);
        return {};
      }
      const j = await r.json();
      console.log('[Metals][MP] JSON', j);
      const out = {};
      for (const [name, code] of Object.entries(map)) {
        const rate = j && j.rates ? j.rates[code] : undefined; // XAU per USD
        if (!rate) { console.warn('[Metals][MP] missing rate for', code); continue; }
        const usdPerUnit = 1 / parseFloat(rate);
        if (!Number.isNaN(usdPerUnit)) out[name] = { price: usdPerUnit };
      }
      console.log('[Metals] Parsed', out);
      return out;
    } catch (e) {
      console.error('[Metals][MP] error', e);
      return {};
    }
  }

  // ----- refresh (whole set, once per call) -----
  async function refreshPrices(force) {
    console.log('[Refresh] force=', !!force);
    // Build symbol maps by source
    const mapCrypto = {};
    const mapEquity = {};
    const mapMetal  = {};
    rows.forEach(function (r) {
      if (r.source === 'crypto') mapCrypto[r.name] = r.symbol;
      else if (r.source === 'equity') mapEquity[r.name] = r.symbol;
      else if (r.source === 'metal') mapMetal[r.name] = r.symbol;
    });

    const results = await Promise.allSettled([
      fetchCrypto(mapCrypto),
      fetchEquities(mapEquity),
      fetchMetals(mapMetal)
    ]);

    const nowIso = new Date().toISOString();
    const cache = getCache();

    results.forEach(function (res, idx) {
      if (res.status !== 'fulfilled' || !res.value) return;
      for (const [name, v] of Object.entries(res.value)) {
        const row = rows.find(function (x) { return x.name === name; });
        if (!row) continue;
        if (typeof v.price === 'number') row.price = v.price;
        if (typeof v.yield === 'string') row.yield = v.yield;
        cache[name] = Object.assign({}, cache[name] || {}, v, { ts: nowIso });
      }
    });

    setCache(cache);
    localStorage.setItem(LSK_UPDATED, nowIso);
    emit();
    return { skipped: false };
  }

  // ----- public API -----
  const listeners = new Set();
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.add(fn); }

  window.TroveData = {
    getDisplayData: function () { return rows.slice(); },
    getLastUpdatedTag: function () { return fmtTag(localStorage.getItem(LSK_UPDATED)); },
    refreshPrices: refreshPrices,
    onChange: onChange
  };

  console.log('[TroveData] ready', window.TroveData);
})();