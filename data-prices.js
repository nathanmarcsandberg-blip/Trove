// data-prices.js
(function(){
  const LSK_CACHE   = 'trove_prices_cache_v1';
  const LSK_UPDATED = 'trove_prices_last_updated_v1';
  const LSK_LAST_OK = 'trove_prices_last_ok_v1';
  const DAY_MS = 24*60*60*1000;
  function getLastOk(){ try{return JSON.parse(localStorage.getItem(LSK_LAST_OK)||'{}')}catch{return{}} }
  function setLastOk(m){ localStorage.setItem(LSK_LAST_OK,JSON.stringify(m)) }
  function canQueryAsset(r,lastOk,nowMs){ if(!r)return false; if(!r.price||r.price===0)return true; const last=lastOk[r.name]; if(!last)return true; return (nowMs-Date.parse(last))>DAY_MS; }
  const fmtTag=(iso)=>{if(!iso)return '—';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return`${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`};
  const getCache=()=>{try{return JSON.parse(localStorage.getItem(LSK_CACHE)||'{}')}catch{return{}}}
  const setCache=(o)=>localStorage.setItem(LSK_CACHE,JSON.stringify(o))
  const rows=window.ASSETS_DISPLAY.map(a=>({...a,price:window.ASSETS_SEED?.[a.name]?.price||0,yield:window.ASSETS_SEED?.[a.name]?.yield||''}))
  function stampSuccess(name){const map=getLastOk();map[name]=new Date().toISOString();setLastOk(map)}
  async function fetchCrypto(map){console.log('crypto fetch',map);return{}}
  async function fetchEquities(map){console.log('equity fetch',map);return{}}
  async function fetchMetals(map){console.log('metals fetch',map);return{}}
  async function refreshPrices(force=false){
    const nowIso=new Date().toISOString(),nowMs=Date.now();
    const lastOk=getLastOk();
    const eligible=rows.filter(r=>canQueryAsset(r,lastOk,nowMs));
    const mapCrypto=Object.fromEntries(eligible.filter(r=>r.source==='crypto').map(r=>[r.name,r.symbol]));
    const mapEquity=Object.fromEntries(eligible.filter(r=>r.source==='equity').map(r=>[r.name,r.symbol]));
    const mapMetal=Object.fromEntries(eligible.filter(r=>r.source==='metal').map(r=>[r.name,r.symbol]));
    const results=await Promise.allSettled([fetchCrypto(mapCrypto),fetchEquities(mapEquity),fetchMetals(mapMetal)]);
    const cache=getCache();
    results.forEach(res=>{if(res.status==='fulfilled'){for(const[n,v]of Object.entries(res.value)){const row=rows.find(r=>r.name===n);if(!row)continue;if(typeof v.price==='number'&&v.price!==0){row.price=v.price;stampSuccess(n)}if(typeof v.yield==='string'){row.yield=v.yield}cache[n]={...(cache[n]||{}),...v,ts:nowIso}}});
    setCache(cache);localStorage.setItem(LSK_UPDATED,nowIso);emit();return{skipped:false}
  }
  const listeners=new Set();function emit(){listeners.forEach(fn=>fn())}function onChange(fn){listeners.add(fn)}
  window.TroveData={getDisplayData:()=>rows.slice(),getLastUpdatedTag:()=>fmtTag(localStorage.getItem(LSK_UPDATED)),refreshPrices,onChange}
})();