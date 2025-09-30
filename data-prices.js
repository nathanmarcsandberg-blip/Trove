// data-prices.js — FORCE MetalPrice key & log full URL
(function(){
  const API = {
    TWELVE: '7791647f5c1e478982a3dd702c82105b',
    // Force the user's full key; ignore bad localStorage overrides
    METAL: (function(){
      const FALLBACK = 'Fda0bb2a0f5f5e9de80ad2096dd8f4de';
      const k = (localStorage.getItem('TROVE_API_METAL')||'').trim();
      return (k && k.length >= 20) ? k : FALLBACK;
    })()
  };

  const LSK_CACHE='trove_prices_cache_v1', LSK_UPDATED='trove_prices_last_updated_v1';

  function fmtTag(iso){ if(!iso)return '—'; const d=new Date(iso); const p=n=>String(n).padStart(2,'0'); return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }
  function getCache(){ try{ return JSON.parse(localStorage.getItem(LSK_CACHE)||'{}') }catch{ return {} } }
  function setCache(o){ localStorage.setItem(LSK_CACHE, JSON.stringify(o)) }

  const rows = (Array.isArray(window.ASSETS_DISPLAY)?window.ASSETS_DISPLAY:[]).map(a=>({ ...a, price:0, yield:'' }));

  (function hydrate(){ const cache=getCache(); rows.forEach(r=>{ const hit=cache[r.name]; if(hit){ if(typeof hit.price==='number') r.price=hit.price; if(typeof hit.yield==='string') r.yield=hit.yield; } }); })();

  async function fetchCrypto(map){
    const out={}; const id=s=>s==='BTC'?'bitcoin':(s==='ETH'?'ethereum':null);
    const ids=Object.values(map).map(id).filter(Boolean);
    if(ids.length){ try{ const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd'); const j=await r.json(); for(const [name,sym] of Object.entries(map)){ const gid=id(sym); const p=gid&&j[gid]?j[gid].usd:undefined; if(typeof p==='number') out[name]={price:p}; } }catch(e){} }
    for(const [name,sym] of Object.entries(map)){ if(out[name]) continue; try{ const r=await fetch('https://api.exchange.coinbase.com/products/'+sym+'-USD/ticker'); const j=await r.json(); const p=parseFloat(j.price); if(!isNaN(p)) out[name]={price:p}; }catch(e){} }
    return out;
  }

  async function fetchEquities(map){
    const syms=Object.values(map); if(!syms.length)return{};
    const r=await fetch('https://api.twelvedata.com/quote?symbol='+encodeURIComponent(syms.join(','))+'&apikey='+API.TWELVE);
    if(!r.ok) return {};
    const j=await r.json(); const out={};
    const toName=sym=>{ for(const [n,s] of Object.entries(map)) if(s===sym) return n; return sym; };
    if(j.symbol){ const p=parseFloat(j.close); const y=(j.dividend_yield!=null)?String(j.dividend_yield):''; const nm=toName(j.symbol); if(!isNaN(p)) out[nm]={price:p,yield:y?y+'%':''}; }
    else { for(const [sym,data] of Object.entries(j)){ const p=parseFloat(data.close); const y=(data.dividend_yield!=null)?String(data.dividend_yield):''; const nm=toName(sym); if(!isNaN(p)) out[nm]={price:p,yield:y?y+'%':''}; } }
    return out;
  }

  async function fetchMetals(map){
    const codes = Array.from(new Set(Object.values(map))).join(',');
    if(!codes) return {};
    const url = 'https://api.metalpriceapi.com/v1/latest?api_key='+encodeURIComponent(API.METAL)+'&base=USD&currencies='+encodeURIComponent(codes);
    console.log('[Metals][MP] FULL URL', url);
    try{
      const r = await fetch(url);
      console.log('[Metals][MP] status', r.status, r.statusText);
      if(!r.ok){ try{ console.log('[Metals][MP] body', await r.text()); }catch(e){}; return {}; }
      const j = await r.json();
      console.log('[Metals][MP] JSON', j);
      const out = {};
      for(const [name, code] of Object.entries(map)){
        const rate = j && j.rates ? j.rates[code] : undefined; // XAU per USD
        if(!rate){ console.warn('[Metals][MP] missing rate for', code); continue; }
        const usdPer = 1 / parseFloat(rate);
        if(!isNaN(usdPer)) out[name] = { price: usdPer };
      }
      return out;
    }catch(e){
      console.error('[Metals][MP] fetch error', e);
      return {};
    }
  }

  async function refreshPrices(force){
    const mapCrypto={}, mapEquity={}, mapMetal={};
    rows.forEach(r=>{ if(r.source==='crypto') mapCrypto[r.name]=r.symbol; else if(r.source==='equity') mapEquity[r.name]=r.symbol; else if(r.source==='metal') mapMetal[r.name]=r.symbol; });
    const results = await Promise.allSettled([ fetchCrypto(mapCrypto), fetchEquities(mapEquity), fetchMetals(mapMetal) ]);
    const nowIso=new Date().toISOString(); const cache=getCache();
    results.forEach(res=>{ if(res.status!=='fulfilled'||!res.value) return; for(const [name,v] of Object.entries(res.value)){ const row=rows.find(x=>x.name===name); if(!row) continue; if(typeof v.price==='number') row.price=v.price; if(typeof v.yield==='string') row.yield=v.yield; cache[name] = Object.assign({}, cache[name]||{}, v, { ts: nowIso }); } });
    setCache(cache); localStorage.setItem(LSK_UPDATED, nowIso); emit(); return {skipped:false};
  }

  const listeners=new Set(); function emit(){ listeners.forEach(fn=>{ try{ fn(); }catch(e){} }) } function onChange(fn){ listeners.add(fn) }

  window.TroveData = { getDisplayData:()=>rows.slice(), getLastUpdatedTag:()=>fmtTag(localStorage.getItem(LSK_UPDATED)), refreshPrices, onChange };
})();