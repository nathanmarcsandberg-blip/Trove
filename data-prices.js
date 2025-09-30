// data-prices.js — FORCE live update on load; equities via Twelve Data, crypto via CoinGecko
(function(){
  const API = { TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b' };
  const LSK_UPDATED = 'trove_prices_last_updated_v1';

  function fmtTag(iso){ if(!iso)return '—'; const d=new Date(iso); const p=n=>String(n).padStart(2,'0'); return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

  // Mapping from name -> meta (source, symbol) comes from FIXED_ASSETS
  const META_BY_NAME = Object.fromEntries((window.FIXED_ASSETS||[]).map(a=>[a.name, a]));

  // ---- wipe any stale prices shown initially, then ask the page to re-render
  (function wipeInitialDisplayedPrices(){
    if (!Array.isArray(window.ASSET_LIST)) return;
    let touched = false;
    window.ASSET_LIST.forEach(r => {
      if (typeof r.price === 'number' && r.price !== 0) { r.price = 0; touched = true; }
      if (typeof r.yield === 'string' && r.yield) { r.yield = ''; touched = true; }
    });
    if (touched && typeof window.renderAssets === 'function') {
      try { window.renderAssets(); } catch(e){ console.warn('[Pricing] render after wipe failed', e); }
    }
  })();

  async function fetchEquitiesByTwelve(){
    // collect symbols present on the page (from names that exist in meta)
    const names = (window.ASSET_LIST||[]).map(r=>r.name).filter(n => META_BY_NAME[n]?.source === 'equity');
    const symbols = names.map(n => META_BY_NAME[n].symbol);
    if (!symbols.length) return {};
    const url = 'https://api.twelvedata.com/quote?symbol=' + encodeURIComponent(symbols.join(',')) + '&apikey=' + API.TWELVE;
    console.log('[Equities] URL', url);
    const r = await fetch(url);
    if (!r.ok) {
      console.warn('[Equities] HTTP', r.status, r.statusText);
      return {};
    }
    const j = await r.json();
    console.log('[Equities] JSON', j);
    const out = {};
    function applyOne(sym, data){
      const name = names.find(n => META_BY_NAME[n].symbol === sym);
      if (!name) return;
      const p = parseFloat(data.close);
      const y = (data.dividend_yield != null) ? String(data.dividend_yield) : '';
      if (!Number.isNaN(p)) out[name] = Object.assign({ price: p }, y ? { yield: y + '%' } : {});
    }
    if (j.symbol) applyOne(j.symbol, j);
    else for (const [sym, data] of Object.entries(j)) applyOne(sym, data);
    return out;
  }

  async function fetchCryptoByGecko(){
    const names = (window.ASSET_LIST||[]).map(r=>r.name).filter(n => META_BY_NAME[n]?.source === 'crypto');
    const idMap = {}; const ids = [];
    names.forEach(n => {
      const sym = META_BY_NAME[n].symbol;
      const id = (sym === 'BTC') ? 'bitcoin' : (sym === 'ETH') ? 'ethereum' : null;
      if (id){ ids.push(id); idMap[id] = n; }
    });
    if (!ids.length) return {};
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd';
    console.log('[Crypto] URL', url);
    const r = await fetch(url);
    if (!r.ok) { console.warn('[Crypto] HTTP', r.status, r.statusText); return {}; }
    const j = await r.json();
    console.log('[Crypto] JSON', j);
    const out = {};
    for (const [id, payload] of Object.entries(j)){
      const name = idMap[id];
      const p = payload && payload.usd;
      if (typeof p === 'number') out[name] = { price: p };
    }
    return out;
  }

  function mergeIntoAssetList(updates){
    if (!Array.isArray(window.ASSET_LIST)) return;
    let touched = false;
    window.ASSET_LIST = window.ASSET_LIST.map(row => {
      const u = updates[row.name];
      if (!u) return row;
      touched = true;
      return Object.assign({}, row,
        (typeof u.price === 'number') ? { price: u.price } : {},
        (typeof u.yield === 'string') ? { yield: u.yield } : {}
      );
    });
    if (touched) {
      localStorage.setItem(LSK_UPDATED, new Date().toISOString());
      const tagEl = document.getElementById('pricesUpdatedTag');
      if (tagEl) tagEl.textContent = 'Prices Last Updated: ' + fmtTag(localStorage.getItem(LSK_UPDATED));
      if (typeof window.renderAssets === 'function') { try { window.renderAssets(); } catch(e){} }
    }
  }

  async function refreshPrices(){
    const [eqRes, crRes] = await Promise.all([ fetchEquitiesByTwelve(), fetchCryptoByGecko() ]);
    const updates = Object.assign({}, eqRes || {}, crRes || {});
    console.log('[Pricing] Updates', updates);
    mergeIntoAssetList(updates);
  }

  // Expose and autorun
  window.TrovePricing = { refreshPrices };
  document.addEventListener('DOMContentLoaded', () => { refreshPrices(); });

})();