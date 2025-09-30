// data-prices.js — once/day fetch with per-ticker 24h cooldown
(function(){
  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL:  localStorage.getItem('TROVE_API_METAL')  || 'Fda0bb2a0f5f5e9de80ad2096dd8f4de'
  };
  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';
  const LSK_LAST_OK = 'trove_prices_last_ok_v1';
  const DAY_MS = 24*60*60*1000;

  const fmtTag = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso); const p = n => String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const getCache=()=>{ try{ return JSON.parse(localStorage.getItem(LSK_CACHE)||'{}') }catch{ return {} } };
  const setCache=(o)=> localStorage.setItem(LSK_CACHE, JSON.stringify(o));
  const getLastOk=()=>{ try{ return JSON.parse(localStorage.getItem(LSK_LAST_OK)||'{}') }catch{ return {} } };
  const setLastOk=(m)=> localStorage.setItem(LSK_LAST_OK, JSON.stringify(m));
  const stampOK=(name,iso)=>{ const m=getLastOk(); m[name]=iso; setLastOk(m); };
  const canQuery=(row, nowMs)=>{
    if (!row.price || row.price===0) return true;
    const last = getLastOk()[row.name]; if (!last) return true;
    return (nowMs - Date.parse(last)) > DAY_MS;
  };

  if (!Array.isArray(window.ASSETS_DISPLAY)) window.ASSETS_DISPLAY = [];

  const rows = window.ASSETS_DISPLAY.map(a => ({
    ...a,
    price: window.ASSETS_SEED?.[a.name]?.price ?? 0,
    yield: window.ASSETS_SEED?.[a.name]?.yield ?? ''
  }));

  // hydrate from cache
  (function(){
    const cache = getCache();
    rows.forEach(r => {
      const hit = cache[r.name];
      if (hit) {
        if (typeof hit.price === 'number') r.price = hit.price;
        if (typeof hit.yield === 'string') r.yield = hit.yield;
      }
    });
  })();

  // ---- Providers ----
  async function fetchCrypto(map){
    const out = {}; const id = s => ({BTC:'bitcoin',ETH:'ethereum'})[s]||null;
    const ids = Object.values(map).map(id).filter(Boolean);
    if (ids.length){
      try{ const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
           const j = await r.json(); for (const [name,sym] of Object.entries(map)){ const p = j?.[id(sym)]?.usd; if (typeof p==='number') out[name]={price:p}; } }
      catch(e){}
    }
    for (const [name,sym] of Object.entries(map)){
      if (out[name]) continue;
      try{ const r = await fetch(`https://api.exchange.coinbase.com/products/${sym}-USD/ticker`);
           const j = await r.json(); const p = parseFloat(j.price); if (!isNaN(p)) out[name]={price:p}; }
      catch(e){}
    }
    return out;
  }

  async function fetchEquities(map){
    const syms = Object.values(map); if (!syms.length) return {};
    const r = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${API.TWELVE}`);
    if (!r.ok) return {};
    const j = await r.json(); const out = {};
    const toName = (sym)=> Object.entries(map).find(([n,s])=>s===sym)?.[0] || sym;
    if (j.symbol){
      const p = parseFloat(j.close); const y = j.dividend_yield!=null?String(j.dividend_yield):'';
      const nm = toName(j.symbol); if (!isNaN(p)) out[nm] = { price:p, yield:y?`${y}%`:'' };
    } else {
      for (const [sym,data] of Object.entries(j)){
        const p = parseFloat(data.close); const y = data.dividend_yield!=null?String(data.dividend_yield):'';
        const nm = toName(sym); if (!isNaN(p)) out[nm] = { price:p, yield:y?`${y}%`:'' };
      }
    }
    return out;
  }

  async function fetchMetals(map){
    // Twelve Data first (XAU/USD, XAG/USD), MetalPrice fallback
    const pairsByName = Object.fromEntries(Object.entries(map).map(([n,code])=>[n, `${code}/USD`]));
    const list = [...new Set(Object.values(pairsByName))].join(',');
    const out = {};
    if (list){
      try{
        const r = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(list)}&apikey=${API.TWELVE}`);
        if (r.ok){
          const j = await r.json();
          const byName = (pair)=> Object.entries(pairsByName).find(([,p])=>p===pair)?.[0] || pair;
          if (j.symbol){
            const p = parseFloat(j.close); const nm = byName(j.symbol); if (!isNaN(p)) out[nm]={price:p};
          } else {
            for (const [pair,data] of Object.entries(j)){
              const p = parseFloat(data.close); const nm = byName(pair); if (!isNaN(p)) out[nm]={price:p};
            }
          }
        }
      }catch(e){}
    }
    const missing = Object.keys(map).filter(nm => !out[nm]);
    if (missing.length){
      const codes = [...new Set(missing.map(nm => map[nm]))].join(',');
      try{
        const r = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${API.METAL}&base=USD&currencies=${codes}`);
        if (r.ok){
          const j = await r.json();
          for (const nm of missing){
            const code = map[nm]; const rate = j?.rates?.[code];
            if (!rate) continue;
            const usdPer = 1/parseFloat(rate);
            if (!isNaN(usdPer)) out[nm] = { price: usdPer };
          }
        }
      }catch(e){}
    }
    return out;
  }

  // ---- refresh (per-ticker 24h cooldown) ----
  async function refreshPrices(force=false){
    const nowIso = new Date().toISOString();
    const nowMs  = Date.now();
    const eligible = rows.filter(r => canQuery(r, nowMs));
    const mapCrypto = Object.fromEntries(eligible.filter(r=>r.source==='crypto').map(r=>[r.name,r.symbol]));
    const mapEquity = Object.fromEntries(eligible.filter(r=>r.source==='equity').map(r=>[r.name,r.symbol]));
    const mapMetal  = Object.fromEntries(eligible.filter(r=>r.source==='metal').map(r=>[r.name,r.symbol]));

    if (!eligible.length){
      localStorage.setItem(LSK_UPDATED, nowIso); emit(); return {skipped:true};
    }

    const results = await Promise.allSettled([
      fetchCrypto(mapCrypto), fetchEquities(mapEquity), fetchMetals(mapMetal)
    ]);

    const cache = getCache();
    for (const res of results){
      if (res.status!=='fulfilled' || !res.value) continue;
      for (const [name,v] of Object.entries(res.value)){
        const row = rows.find(r=>r.name===name); if (!row) continue;
        if (typeof v.price==='number' && v.price!==0){ row.price = v.price; stampOK(name, nowIso); }
        if (typeof v.yield==='string'){ row.yield = v.yield; }
        cache[name] = { ...(cache[name]||{}), ...v, ts: nowIso };
      }
    }
    setCache(cache); localStorage.setItem(LSK_UPDATED, nowIso); emit();
    return {skipped:false};
  }

  // ---- public API ----
  const listeners = new Set();
  function emit(){ listeners.forEach(fn => fn()); }
  function onChange(fn){ listeners.add(fn); }

  window.TroveData = {
    getDisplayData: ()=> rows.slice(),
    getLastUpdatedTag: ()=> fmtTag(localStorage.getItem(LSK_UPDATED)),
    refreshPrices,
    onChange
  };
})();
