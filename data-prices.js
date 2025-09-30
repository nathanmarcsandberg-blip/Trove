// data-prices.js
(function(){
  const VERSION = '1.0.4';
  console.log(`[TroveData v${VERSION}] data-prices.js loaded`);

  window.addEventListener('error', (e)=>{
    console.error('[GlobalError]', e.message, e.filename, e.lineno, e.colno, e.error);
  });

  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL:  localStorage.getItem('TROVE_API_METAL')  || 'Fda0bb2a0f5f5e9de80ad2096dd8f4de'
  };
  console.log('[TroveData] API config', API);

  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';

  const fmtTag = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const p = n=>String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const sameDay = (aIso,bIso) => {
    if (!aIso || !bIso) return false;
    const a = new Date(aIso), b = new Date(bIso);
    return a.getUTCFullYear()===b.getUTCFullYear()
        && a.getUTCMonth()===b.getUTCMonth()
        && a.getUTCDate()===b.getUTCDate();
  };
  const getCache = () => { try { return JSON.parse(localStorage.getItem(LSK_CACHE)||'{}'); } catch { return {}; } };
  const setCache = (obj) => localStorage.setItem(LSK_CACHE, JSON.stringify(obj));

  if (!Array.isArray(window.ASSETS_DISPLAY)) {
    console.warn('[TroveData] ASSETS_DISPLAY missing or not an array');
    window.ASSETS_DISPLAY = [];
  }

  const rows = window.ASSETS_DISPLAY.map(a => ({
    ...a,
    price: window.ASSETS_SEED?.[a.name]?.price ?? 0,
    yield: window.ASSETS_SEED?.[a.name]?.yield ?? ''
  }));
  console.log('[TroveData] initial rows (seeded):', rows);

  (function hydrateFromCache(){
    const cache = getCache();
    console.log('[TroveData] hydrateFromCache', cache);
    rows.forEach(r=>{
      const hit = cache?.[r.name];
      if (!hit) return;
      if (typeof hit.price === 'number') r.price = hit.price;
      if (typeof hit.yield === 'string') r.yield = hit.yield;
    });
    console.log('[TroveData] rows after cache:', rows);
  })();

  // -------- Providers with logs --------
  async function fetchCrypto(map) {
    console.log('[Crypto] Start', map);
    const out = {};
    const geckoId = (s)=>({BTC:'bitcoin',ETH:'ethereum'})[s]||null;
    const ids = Object.values(map).map(geckoId).filter(Boolean);
    if (ids.length) {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
        console.log('[Crypto] CoinGecko URL:', url);
        const r = await fetch(url);
        console.log('[Crypto] CoinGecko status:', r.status);
        const j = await r.json();
        console.log('[Crypto] CoinGecko JSON:', j);
        for (const [name, sym] of Object.entries(map)) {
          const id = geckoId(sym);
          const p = j?.[id]?.usd;
          if (typeof p === 'number') out[name] = { price: p };
        }
      } catch(e) { console.error('[Crypto] CoinGecko error', e); }
    }
    for (const [name, sym] of Object.entries(map)) {
      if (out[name]) continue;
      try {
        const url = `https://api.exchange.coinbase.com/products/${sym}-USD/ticker`;
        console.log('[Crypto] Coinbase URL:', url);
        const r = await fetch(url);
        console.log('[Crypto] Coinbase status:', r.status);
        const j = await r.json();
        console.log('[Crypto] Coinbase JSON:', sym, j);
        const p = parseFloat(j.price);
        if (!isNaN(p)) out[name] = { price: p };
      } catch(e){ console.error('[Crypto] Coinbase error', e); }
    }
    console.log('[Crypto] Result:', out);
    return out;
  }

  async function fetchEquities(map) {
    console.log('[Equities] Start', map);
    const syms = Object.values(map);
    if (!syms.length) return {};
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${API.TWELVE}`;
    console.log('[Equities] URL:', url);
    const r = await fetch(url);
    console.log('[Equities] HTTP status:', r.status, r.statusText);
    if (!r.ok) { try { console.log('[Equities] body:', await r.text()); } catch{} return {}; }
    const j = await r.json();
    console.log('[Equities] JSON:', j);
    const out = {};
    const byName = (sym)=>Object.entries(map).find(([n,s])=>s===sym)?.[0] || sym;

    if (j.symbol) {
      const p = parseFloat(j.close);
      const y = j.dividend_yield != null ? String(j.dividend_yield) : '';
      const nm = byName(j.symbol);
      if (!isNaN(p)) out[nm] = { price: p, yield: y ? `${y}%` : '' };
    } else {
      for (const [sym, data] of Object.entries(j)) {
        const p = parseFloat(data.close);
        const y = data.dividend_yield != null ? String(data.dividend_yield) : '';
        const nm = byName(sym);
        if (!isNaN(p)) out[nm] = { price: p, yield: y ? `${y}%` : '' };
      }
    }
    console.log('[Equities] Parsed:', out);
    return out;
  }

  async function fetchMetals(map) {
  console.log('[Metals] Start (Twelve Data first, MetalPrice fallback)', map);

  // Map XAU → "XAU/USD", XAG → "XAG/USD"
  const tdPairs = Object.fromEntries(
    Object.entries(map).map(([name, code]) => [name, `${code}/USD`])
  );
  const pairList = [...new Set(Object.values(tdPairs))].join(',');
  const out = {};

  // ---- Primary: Twelve Data quote ----
  try {
    if (pairList) {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(pairList)}&apikey=${API.TWELVE}`;
      console.log('[Metals][TD] URL:', url);
      const r = await fetch(url);
      console.log('[Metals][TD] status:', r.status, r.statusText);
      if (r.ok) {
        const j = await r.json();
        console.log('[Metals][TD] JSON:', j);

        const byName = (pair) =>
          Object.entries(tdPairs).find(([n, p]) => p === pair)?.[0] || pair;

        if (j.symbol) {
          const p = parseFloat(j.close);
          const nm = byName(j.symbol);
          if (!isNaN(p)) out[nm] = { price: p };
        } else {
          for (const [pair, data] of Object.entries(j)) {
            const p = parseFloat(data.close);
            const nm = byName(pair);
            if (!isNaN(p)) out[nm] = { price: p };
          }
        }
      } else {
        try { console.log('[Metals][TD] body:', await r.text()); } catch {}
      }
    }
  } catch (e) {
    console.error('[Metals][TD] error', e);
  }

  // ---- Fallback: MetalPrice API (invert USD base) ----
  const missing = Object.keys(map).filter((name) => !out[name]);
  if (missing.length) {
    const codesNeeded = [...new Set(missing.map((name) => map[name]))].join(',');
    try {
      const url = `https://api.metalpriceapi.com/v1/latest?api_key=${API.METAL}&base=USD&currencies=${codesNeeded}`;
      console.log('[Metals][MP] URL:', url);
      const r = await fetch(url);
      console.log('[Metals][MP] status:', r.status, r.statusText);
      if (r.ok) {
        const j = await r.json();
        console.log('[Metals][MP] JSON:', j);
        for (const name of missing) {
          const code = map[name];
          const rate = j?.rates?.[code];
          if (!rate) { console.warn('[Metals][MP] missing rate for', code); continue; }
          const usdPerUnit = 1 / parseFloat(rate); // USD base ⇒ invert
          if (!isNaN(usdPerUnit)) out[name] = { price: usdPerUnit };
        }
      } else {
        try { console.log('[Metals][MP] body:', await r.text()); } catch {}
      }
    } catch (e) {
      console.error('[Metals][MP] error', e);
    }
  }

  console.log('[Metals] Parsed (combined):', out);
  return out;
}

  // -------- Refresh --------
  async function refreshPrices(force=false){
    const nowIso = new Date().toISOString();
    const lastIso = localStorage.getItem(LSK_UPDATED);
    console.log('[Refresh] force=', force, 'now=', nowIso, 'last=', lastIso);

    if (!force && sameDay(lastIso, nowIso)) {
      console.log('[Refresh] same calendar day → skip API calls');
      emit();
      return { skipped: true };
    }

    const mapCrypto  = Object.fromEntries(rows.filter(r=>r.source==='crypto').map(r=>[r.name, r.symbol]));
    const mapEquity  = Object.fromEntries(rows.filter(r=>r.source==='equity').map(r=>[r.name, r.symbol]));
    const mapMetal   = Object.fromEntries(rows.filter(r=>r.source==='metal').map(r=>[r.name, r.symbol]));
    console.log('[Refresh] symbol maps', {mapCrypto, mapEquity, mapMetal});

    const results = await Promise.allSettled([
      fetchCrypto(mapCrypto),
      fetchEquities(mapEquity),
      fetchMetals(mapMetal)
    ]);
    console.log('[Refresh] results', results);

    const cache = getCache();

    results.forEach((res,i)=>{
      if (res.status!=='fulfilled') { console.error('[Refresh] provider failed', i, res.reason); return; }
      for (const [name,v] of Object.entries(res.value)){
        const row = rows.find(r=>r.name===name);
        if (!row) continue;
        if (typeof v.price==='number') row.price = v.price;
        if (typeof v.yield==='string') row.yield = v.yield;
        cache[name] = { ...(cache[name]||{}), ...v, ts: nowIso };
      }
    });

    setCache(cache);
    localStorage.setItem(LSK_UPDATED, nowIso);
    emit();
    return { skipped:false };
  }

  // -------- Public API --------
  const listeners = new Set();
  function emit(){ listeners.forEach(fn=>fn()); }
  function onChange(fn){ listeners.add(fn); }

  window.TroveData = {
    getDisplayData: ()=> rows.slice(),
    getLastUpdatedTag: ()=> fmtTag(localStorage.getItem(LSK_UPDATED)),
    refreshPrices,
    onChange
  };

  console.log('[TroveData] initialized', window.TroveData);
})();
