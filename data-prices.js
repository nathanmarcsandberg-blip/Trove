// data-prices.js — prices via Twelve Data (equities) & CoinGecko (crypto)
(function(){
  const API = { TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b' };
  const LSK_UPDATED = 'trove_prices_last_updated_v1';
  function fmtTag(iso){ if(!iso)return '—'; const d=new Date(iso); const p=n=>String(n).padStart(2,'0'); return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
  function bySource(s){ return (window.FIXED_ASSETS||[]).filter(a=>a.source===s); }

  async function fetchEquities(){
    const syms = bySource('equity').map(a=>a.symbol); if(!syms.length) return;
    const r = await fetch('https://api.twelvedata.com/quote?symbol='+encodeURIComponent(syms.join(','))+'&apikey='+API.TWELVE);
    if(!r.ok) return; const j = await r.json();
    const setOne=(sym,data)=>{ const row=(window.FIXED_ASSETS||[]).find(a=>a.symbol===sym); if(!row) return; const name=row.name; const price=parseFloat(data.close); const dy=(data.dividend_yield!=null)?String(data.dividend_yield):''; if(!isNaN(price)) window.ASSET_PRICES[name]=price; if(dy) window.ASSET_DIVIDENDS[name]=dy+'%'; };
    if(j.symbol) setOne(j.symbol,j); else for(const [sym,data] of Object.entries(j)) setOne(sym,data);
  }

  async function fetchCrypto(){
    const idMap={}; const ids=[];
    (window.FIXED_ASSETS||[]).filter(a=>a.source==='crypto').forEach(a=>{ const id=(a.symbol==='BTC')?'bitcoin':(a.symbol==='ETH'?'ethereum':null); if(id){ ids.push(id); idMap[id]=a.name; } });
    if(!ids.length) return;
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd');
    if(!r.ok) return; const j = await r.json();
    for(const [id,payload] of Object.entries(j)){ const name=idMap[id]; const p=payload&&payload.usd; if(typeof p==='number') window.ASSET_PRICES[name]=p; }
  }

  function apply(){
    if(!Array.isArray(window.ASSET_LIST)) return;
    window.ASSET_LIST = window.ASSET_LIST.map(row => ({
      ...row,
      price: (window.ASSET_PRICES[row.name]!=null)?window.ASSET_PRICES[row.name]:row.price,
      yield: (window.ASSET_DIVIDENDS[row.name]!=null)?window.ASSET_DIVIDENDS[row.name]:row.yield
    }));
    localStorage.setItem(LSK_UPDATED, new Date().toISOString());
    if(typeof window.renderAssets==='function'){ try{ window.renderAssets(); }catch(e){} }
    const tag = document.getElementById('pricesUpdatedTag'); if(tag){ tag.textContent='Prices Last Updated: '+fmtTag(localStorage.getItem(LSK_UPDATED)); }
  }

  async function refresh(){ await Promise.allSettled([fetchEquities(), fetchCrypto()]); apply(); }

  window.TrovePricing = { refresh };
  document.addEventListener('DOMContentLoaded', () => { refresh(); });
})();