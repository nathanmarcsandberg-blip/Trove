// data-prices.js — Minimal drop-in. Metals via MetalPrice API ONLY. No layout changes.
(function () {
  console.log('[TroveData] data-prices.js loaded');

  // --- Provider keys (override via localStorage if you like) ---
  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL:  (function(){
      // Guard against truncated/bad overrides
      const FALLBACK = 'Fda0bb2a0f5f5e9de80ad2096dd8f4de';
      const k = (localStorage.getItem('TROVE_API_METAL')||'').trim();
      return (k && k.length >= 20) ? k : FALLBACK;
    })()
  };

  // --- Storage keys ---
  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';

  // --- Helpers ---
  function fmtTag(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const p = function(n){ return String(n).padStart(2,'0'); };
    return p(d.getDate()) + '/' + p(d.getMonth()+1) + '/' + d.getFullYear() + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function getCache(){ try{ return JSON.parse(localStorage.getItem(LSK_CACHE)||'{}'); }catch(e){ return {}; } }
  function setCache(o){ localStorage.setItem(LSK_CACHE, JSON.stringify(o)); }

  if (!Array.isArray(window.ASSETS_DISPLAY)) {
    console.error('[TroveData] ASSETS_DISPLAY missing — ensure assets-config.js loads first.');
    window.ASSETS_DISPLAY = [];
  }

  // --- Working rows read by your existing renderer ---
  const rows = window.ASSETS_DISPLAY.map(function(a){
    const seed = (window.ASSETS_SEED && window.ASSETS_SEED[a.name]) ? window.ASSETS_SEED[a.name] : { price: 0, yield: '' };
    return {
      name: a.name,
      class: a.class,
      source: a.source,
      symbol: a.symbol,
      price: (typeof seed.price === 'number') ? seed.price : 0,
      yield: (typeof seed.yield === 'string') ? seed.yield : ''
    };
  });

  // Apply cache immediately (fast paint)
  (function hydrateFromCache(){
    const cache = getCache();
    rows.forEach(function(r){
      const hit = cache[r.name];
      if (!hit) return;
      if (typeof hit.price === 'number') r.price = hit.price;
      if (typeof hit.yield === 'string') r.yield = hit.yield;
    });
  })();

  // --- Providers ---

  // Crypto: CoinGecko (no key) → Coinbase fallback
  async function fetchCrypto(map){
    const out = {};
    function geckoId(sym){ if (sym==='BTC') return 'bitcoin'; if (sym==='ETH') return 'ethereum'; return null; }
    const ids = Object.values(map).map(geckoId).filter(Boolean);
    if (ids.length){
      try{
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd');
        const j = await r.json();
        for (const [name, sym] of Object.entries(map)) {
          const id = geckoId(sym);
          const p = id && j[id] ? j[id].usd : undefined;
          if (typeof p === 'number') out[name] = { price: p };
        }
      }catch(e){}
    }
    for (const [name, sym] of Object.entries(map)) {
      if (out[name]) continue;
      try{
        const r = await fetch('https://api.exchange.coinbase.com/products/'+sym+'-USD/ticker');
        const j = await r.json();
        const p = parseFloat(j.price);
        if (!Number.isNaN(p)) out[name] = { price: p };
      }catch(e){}
    }
    return out;
  }

  // Equities (price + dividend_yield): Twelve Data
  async function fetchEquities(map){
    const syms = Object.values(map);
    if (!syms.length) return {};
    const r = await fetch('https://api.twelvedata.com/quote?symbol='+encodeURIComponent(syms.join(','))+'&apikey='+API.TWELVE);
    if (!r.ok) return {};
    const j = await r.json();
    const out = {};
    function toName(sym){ for (const [n,s] of Object.entries(map)) if (s===sym) return n; return sym; }
    if (j.symbol){
      const p = parseFloat(j.close);
      const y = (j.dividend_yield != null) ? String(j.dividend_yield) : '';
      const nm = toName(j.symbol);
      if (!Number.isNaN(p)) out[nm] = { price: p, yield: y ? (y + '%') : '' };
    } else {
      for (const [sym,data] of Object.entries(j)){
        const p = parseFloat(data.close);
        const y = (data.dividend_yield != null) ? String(data.dividend_yield) : '';
        const nm = toName(sym);
        if (!Number.isNaN(p)) out[nm] = { price: p, yield: y ? (y + '%') : '' };
      }
    }
    return out;
  }

  // Metals: MetalPrice API ONLY (exact URL form; USD base → invert to USD per unit)
  async function fetchMetals(map){
    const codes = Array.from(new Set(Object.values(map))).join(',');
    if (!codes) return {};
    const url = 'https://api.metalpriceapi.com/v1/latest?api_key=' + encodeURIComponent(API.METAL) + '&base=USD&currencies=' + encodeURIComponent(codes);
    console.log('[Metals][MP] URL', url);
    try{
      const r = await fetch(url);
      if (!r.ok){ try { console.log('[Metals][MP] body', await r.text()); } catch(e){} return {}; }
      const j = await r.json();
      const out = {};
      for (const [name, code] of Object.entries(map)) {
        const rate = j && j.rates ? j.rates[code] : undefined; // XAU per USD
        if (!rate) continue;
        const usdPerUnit = 1 / parseFloat(rate);
        if (!Number.isNaN(usdPerUnit)) out[name] = { price: usdPerUnit };
      }
      return out;
    }catch(e){
      console.error('[Metals][MP] error', e);
      return {};
    }
  }

  // --- Refresh (called by your page's button/init) ---
  async function refreshPrices(force){
    const mapCrypto = {}, mapEquity = {}, mapMetal = {};
    rows.forEach(function(r){
      if (r.source==='crypto') mapCrypto[r.name] = r.symbol;
      else if (r.source==='equity') mapEquity[r.name] = r.symbol;
      else if (r.source==='metal')  mapMetal[r.name]  = r.symbol;
    });

    const results = await Promise.allSettled([
      fetchCrypto(mapCrypto),
      fetchEquities(mapEquity),
      fetchMetals(mapMetal)
    ]);

    const nowIso = new Date().toISOString();
    const cache = getCache();

    results.forEach(function(res){
      if (res.status !== 'fulfilled' || !res.value) return;
      for (const [name, v] of Object.entries(res.value)) {
        const row = rows.find(function(x){ return x.name === name; });
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

  // --- Public API (your existing page reads these) ---
  const listeners = new Set();
  function emit(){ listeners.forEach(function(fn){ try{ fn(); } catch(e){} }); }
  function onChange(fn){ listeners.add(fn); }

  window.TroveData = {
    getDisplayData: function(){ return rows.slice(); },
    getLastUpdatedTag: function(){ return fmtTag(localStorage.getItem(LSK_UPDATED)); },
    refreshPrices: refreshPrices,
    onChange: onChange
  };
})();