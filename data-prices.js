// data-prices.js
(function(){
  // ---- Config: provider keys (set via localStorage in prod) ----
  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL:  localStorage.getItem('TROVE_API_METAL')  || 'Fda0bb2a0f5f5e9de80ad2096dd8f4de'
    // FX key not needed right now
  };

  // ---- Storage keys ----
  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';

  // ---- Small helpers ----
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

  // ---- Working array (what UI reads) ----
  // shape: [{ name, class, source, symbol, price, yield }]
  const rows = window.ASSETS_DISPLAY.map(a => ({
    ...a,
    price: window.ASSETS_SEED[a.name]?.price ?? 0,
    yield: window.ASSETS_SEED[a.name]?.yield ?? ''
  }));

  // apply cache immediately (fast paint)
  (function hydrateFromCache(){
    const cache = getCache();
    rows.forEach(r=>{
      const hit = cache?.[r.name];
      if (!hit) return;
      if (typeof hit.price === 'number') r.price = hit.price;
      if (typeof hit.yield === 'string') r.yield = hit.yield;
    });
  })();

  // ---- Providers (CORS-safe) ----

  // Crypto: CoinGecko (no key) → Coinbase fallback
  async function fetchCrypto(map) {
    const out = {};
    // 1) CoinGecko
    const geckoId = (s)=>({BTC:'bitcoin',ETH:'ethereum'})[s]||null;
    const ids = Object.values(map).map(geckoId).filter(Boolean);
    if (ids.length) {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
        if (r.ok) {
          const j = await r.json();
          for (const [name, sym] of Object.entries(map)) {
            const id = geckoId(sym);
            const p = j?.[id]?.usd;
            if (typeof p === 'number') out[name] = { price: p };
          }
        }
      } catch(e) { console.warn('CoinGecko failed', e); }
    }
    // 2) Coinbase fallback
    for (const [name, sym] of Object.entries(map)) {
      if (out[name]) continue;
      try {
        const r = await fetch(`https://api.exchange.coinbase.com/products/${sym}-USD/ticker`);
        if (!r.ok) continue;
        const j = await r.json();
        const p = parseFloat(j.price);
        if (!isNaN(p)) out[name] = { price: p };
      } catch(e){}
    }
    return out;
  }

  // Equities & dividend yield: Twelve Data /quote (multi-symbol)
  async function fetchEquities(map) {
    const syms = Object.values(map);
    if (!syms.length) return {};
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${API.TWELVE}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Twelve Data failed');
    const j = await r.json();
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
    return out;
  }

  // Metals: MetalPrice API (USD base → invert)
  async function fetchMetals(map) {
    const codes = [...new Set(Object.values(map))].join(',');
    if (!codes) return {};
    const r = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${API.METAL}&base=USD&currencies=${codes}`);
    if (!r.ok) throw new Error('MetalPrice failed');
    const j = await r.json();
    const out = {};
    for (const [name, code] of Object.entries(map)) {
      const rate = j?.rates?.[code]; // USD base ⇒ XAU per USD
      if (!rate) continue;
      const usdPerUnit = 1/parseFloat(rate);
      if (!isNaN(usdPerUnit)) out[name] = { price: usdPerUnit };
    }
    return out;
  }

  // ---- Refresh (once per day unless forced) ----
  async function refreshPrices(force=false){
    const nowIso = new Date().toISOString();
    const lastIso = localStorage.getItem(LSK_UPDATED);
    if (!force && sameDay(lastIso, nowIso)) {
      emit(); // ensure UI tag updated
      return { skipped: true };
    }

    // build symbol maps by source
    const mapCrypto  = Object.fromEntries(rows.filter(r=>r.source==='crypto').map(r=>[r.name, r.symbol]));
    const mapEquity  = Object.fromEntries(rows.filter(r=>r.source==='equity').map(r=>[r.name, r.symbol]));
    const mapMetal   = Object.fromEntries(rows.filter(r=>r.source==='metal').map(r=>[r.name, r.symbol]));

    // fetch in parallel, tolerate failures
    const results = await Promise.allSettled([
      fetchCrypto(mapCrypto),
      fetchEquities(mapEquity),
      fetchMetals(mapMetal)
    ]);

    const cache = getCache();

    for (const res of results) {
      if (res.status !== 'fulfilled' || !res.value) continue;
      for (const [name, v] of Object.entries(res.value)) {
        // update working row
        const row = rows.find(r=>r.name===name);
        if (!row) continue;
        if (typeof v.price === 'number') row.price = v.price;
        if (typeof v.yield === 'string') row.yield = v.yield;

        // update cache
        cache[name] = { ...(cache[name]||{}), ...v, ts: nowIso };
      }
    }

    // persist + tag + notify
    setCache(cache);
    localStorage.setItem(LSK_UPDATED, nowIso);
    emit();
    return { skipped: false };
  }

  // ---- Public API for the UI ----
  const listeners = new Set();
  function emit(){ listeners.forEach(fn=>fn()); }
  function onChange(fn){ listeners.add(fn); }

  window.TroveData = {
    getDisplayData: ()=> rows.slice(),         // shallow copy for safety
    getLastUpdatedTag: ()=> fmtTag(localStorage.getItem(LSK_UPDATED)),
    refreshPrices,
    onChange
  };
})();
