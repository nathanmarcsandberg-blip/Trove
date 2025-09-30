
// ================== Trove MVP: Daily Price/Dividend Cache (stand-alone) ==================
(function(){
  const LSK_CACHE = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';

  const API_KEYS = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b',
    METAL: localStorage.getItem('TROVE_API_METAL') || 'Fda0bb2a0f5f5e9de80ad2096dd8f4de'
  };

  const MAP_EQUITY = {
    'Apple Inc.': 'AAPL','Microsoft Corporation': 'MSFT','Johnson & Johnson': 'JNJ',
    'The Procter & Gamble Company': 'PG','The Coca-Cola Company': 'KO','PepsiCo, Inc.': 'PEP',
    "McDonald's Corporation": 'MCD','Walmart Inc.': 'WMT','Verizon Communications Inc.': 'VZ',
    'AT&T Inc.': 'T','International Business Machines Corporation': 'IBM','Cisco Systems, Inc.': 'CSCO',
    'Exxon Mobil Corporation': 'XOM','Chevron Corporation': 'CVX'
  };
  const MAP_CRYPTO = { 'Bitcoin': 'BTC', 'Ethereum': 'ETH' };

  function fmtDateTag(d){
    const p=(n)=>String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function sameCalendarDay(aISO,bISO){
    if(!aISO||!bISO) return false;
    const a=new Date(aISO), b=new Date(bISO);
    return a.getUTCFullYear()===b.getUTCFullYear() && a.getUTCMonth()===b.getUTCMonth() && a.getUTCDate()===b.getUTCDate();
  }
  const getCache=()=>{ try{return JSON.parse(localStorage.getItem(LSK_CACHE)||'{}')}catch{return{}} };
  const setCache=(o)=>localStorage.setItem(LSK_CACHE, JSON.stringify(o));

  function applyCacheToAssets(){
    const cache=getCache(); if(!cache.prices) return;
    if(Array.isArray(globalThis.ASSET_LIST)){
      globalThis.ASSET_LIST.forEach(a=>{
        const hit=cache.prices[a.name];
        if(hit&&typeof hit.price==='number') a.price=hit.price;
        if(typeof hit?.yield==='string') a.yield=hit.yield;
      });
    }
    if(typeof renderAssetsList==='function') renderAssetsList();
  }

  function setUpdatedTag(iso){
    const el=document.getElementById('pricesUpdatedTag');
    if(el) el.textContent=`Prices Last Updated: ${iso?fmtDateTag(new Date(iso)):'—'}`;
  }

  async function fetchCryptoUpdates(){
    const map={BTC:'bitcoin',ETH:'ethereum'};
    const out={};
    try{
      const ids=Object.values(MAP_CRYPTO).map(s=>map[s]||'').filter(Boolean).join(',');
      if(ids){
        const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        if(r.ok){
          const j=await r.json();
          for(const [name,sym] of Object.entries(MAP_CRYPTO)){
            const p=j?.[map[sym]]?.usd;
            if(typeof p==='number') out[name]={price:p};
          }
        }
      }
    }catch(e){ console.warn('CoinGecko failed',e); }
    for(const [name,sym] of Object.entries(MAP_CRYPTO)){
      if(out[name]) continue;
      try{
        const r=await fetch(`https://api.exchange.coinbase.com/products/${sym}-USD/ticker`);
        if(!r.ok) continue;
        const j=await r.json(); const p=parseFloat(j.price);
        if(!isNaN(p)) out[name]={price:p};
      }catch{}
    }
    return out;
  }

  async function fetchEquityUpdates(){
    const syms=Object.values(MAP_EQUITY); if(!syms.length) return {};
    const r=await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${API_KEYS.TWELVE}`);
    if(!r.ok) throw new Error('TwelveData fetch failed');
    const j=await r.json(); const out={};
    if(j && !j.status && !j.code){
      if(j.symbol){
        const p=parseFloat(j.close); const y=j.dividend_yield!=null?String(j.dividend_yield):'';
        const nm=Object.keys(MAP_EQUITY).find(n=>MAP_EQUITY[n]===j.symbol)||j.symbol;
        if(!isNaN(p)) out[nm]={price:p,yield:y?`${y}%`:''};
      }else{
        for(const [sym,data] of Object.entries(j)){
          const p=parseFloat(data.close); const y=data.dividend_yield!=null?String(data.dividend_yield):'';
          const nm=Object.keys(MAP_EQUITY).find(n=>MAP_EQUITY[n]===sym)||sym;
          if(!isNaN(p)) out[nm]={price:p,yield:y?`${y}%`:''};
        }
      }
    }
    return out;
  }

  async function fetchMetalUpdates(){
    const r=await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${API_KEYS.METAL}&base=USD&currencies=XAU,XAG`);
    if(!r.ok) throw new Error('MetalPrice fetch failed');
    const j=await r.json(); const out={};
    const xauPerUsd=j?.rates?.XAU, xagPerUsd=j?.rates?.XAG;
    if(xauPerUsd){
      const usdPerXau=1/parseFloat(xauPerUsd);
      if(Array.isArray(globalThis.ASSET_LIST)){
        globalThis.ASSET_LIST.filter(a=>/gold/i.test(a.name)).forEach(a=>out[a.name]={price:usdPerXau});
      }
    }
    if(xagPerUsd){
      const usdPerXag=1/parseFloat(xagPerUsd);
      if(Array.isArray(globalThis.ASSET_LIST)){
        globalThis.ASSET_LIST.filter(a=>/silver/i.test(a.name)).forEach(a=>out[a.name]={price:usdPerXag});
      }
    }
    return out;
  }

  async function updateAllRates(force=false){
    const nowISO=new Date().toISOString();
    const lastISO=localStorage.getItem(LSK_UPDATED);
    if(!force && sameCalendarDay(lastISO, nowISO)){
      applyCacheToAssets(); setUpdatedTag(lastISO); return {skipped:true};
    }
    const cache=getCache(); cache.prices=cache.prices||{};
    const results=await Promise.allSettled([fetchCryptoUpdates(), fetchEquityUpdates(), fetchMetalUpdates()]);
    for(const r of results){
      if(r.status==='fulfilled' && r.value){
        for(const [nm,v] of Object.entries(r.value)){
          cache.prices[nm]={...(cache.prices[nm]||{}), ...v, ts:nowISO};
        }
      }
    }
    if(Array.isArray(globalThis.ASSET_LIST)){
      for(const a of globalThis.ASSET_LIST){
        const hit=cache.prices[a.name];
        if(hit?.price!=null) a.price=hit.price;
        if(hit?.yield!=null) a.yield=hit.yield;
      }
    }
    setCache(cache);
    localStorage.setItem(LSK_UPDATED, nowISO);
    setUpdatedTag(nowISO);
    if(typeof renderAssetsList==='function') renderAssetsList();
    return {skipped:false};
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const tag=document.getElementById('pricesUpdatedTag');
    if(!tag) return;
    applyCacheToAssets();
    const lastISO=localStorage.getItem(LSK_UPDATED);
    setUpdatedTag(lastISO);
    const btn=document.getElementById('updateRatesBtn');
    if(btn){
      btn.addEventListener('click', async ()=>{
        btn.disabled=true; const prev=btn.textContent; btn.textContent='Updating...';
        try{ await updateAllRates(true); }catch(e){ console.error(e); alert('Update failed — see console.'); }
        finally{ btn.disabled=false; btn.textContent=prev; }
      });
    }
    updateAllRates(false).catch(console.warn);
  });
})();
