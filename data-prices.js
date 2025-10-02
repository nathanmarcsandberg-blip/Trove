/* data-prices.js — LIVE prices & dividends
   - Equities: Twelve Data (price + dividend_yield)
   - Crypto:   CoinGecko (price)
   Produces window.ASSET_LIST and exposes TrovePricing.refreshPrices().
*/
(function () {
  const API = {
    TWELVE: localStorage.getItem('TROVE_API_TWELVE') || '7791647f5c1e478982a3dd702c82105b'
  };
  const LSK_UPDATED = 'trove_prices_last_updated_v2';

  // Fixed catalogue (no commodities)
  const FIXED = [
    { name: 'Apple Inc.',                   class: 'dividend_paying_stock',     source: 'equity', symbol: 'AAPL' },
    { name: 'Microsoft Corporation',        class: 'dividend_paying_stock',     source: 'equity', symbol: 'MSFT' },
    { name: 'Johnson & Johnson',            class: 'dividend_paying_stock',     source: 'equity', symbol: 'JNJ' },
    { name: 'The Procter & Gamble Company', class: 'dividend_paying_stock',     source: 'equity', symbol: 'PG'   },
    { name: 'The Coca-Cola Company',        class: 'dividend_paying_stock',     source: 'equity', symbol: 'KO'   },
    { name: 'PepsiCo, Inc.',                class: 'dividend_paying_stock',     source: 'equity', symbol: 'PEP'  },
    { name: 'NVIDIA Corporation',           class: 'non_dividend_paying_stock', source: 'equity', symbol: 'NVDA' },
    { name: 'Amazon.com, Inc.',             class: 'non_dividend_paying_stock', source: 'equity', symbol: 'AMZN' },
    { name: 'Bitcoin',                      class: 'cryptocurrency',            source: 'crypto', symbol: 'BTC'  },
    { name: 'Ethereum',                     class: 'cryptocurrency',            source: 'crypto', symbol: 'ETH'  }
  ];

  // Working list the app reads from
  window.ASSET_LIST = FIXED.map(a => ({ name: a.name, class: a.class, price: 0, yield: '' }));

  function fmtTag(iso){
    if(!iso) return '—';
    const d=new Date(iso); const p=n=>String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // ---- Providers ----
  async function fetchEquities(){
    const syms = FIXED.filter(a=>a.source==='equity').map(a=>a.symbol);
    if (!syms.length) return {};
    const url = 'https://api.twelvedata.com/quote?symbol=' + encodeURIComponent(syms.join(',')) + '&apikey=' + API.TWELVE;
    const r = await fetch(url);
    if (!r.ok) return {};
    const j = await r.json();
    const out = {};
    function applyOne(sym, data) {
      const row = FIXED.find(a=>a.symbol===sym); if (!row) return;
      const p = parseFloat(data.close);
      const y = (data.dividend_yield!=null) ? String(data.dividend_yield) : '';
      if (!Number.isNaN(p)) out[row.name] = { price: p, yield: y ? y + '%' : '' };
    }
    if (j.symbol) applyOne(j.symbol, j); else for (const [sym, data] of Object.entries(j)) applyOne(sym, data);
    return out;
  }

  async function fetchCrypto(){
    const ids=[]; const idMap={};
    FIXED.filter(a=>a.source==='crypto').forEach(a=>{
      const id = a.symbol==='BTC' ? 'bitcoin' : (a.symbol==='ETH' ? 'ethereum' : null);
      if (id) { ids.push(id); idMap[id]=a.name; }
    });
    if (!ids.length) return {};
    const url='https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd';
    const r=await fetch(url);
    if(!r.ok) return {};
    const j = await r.json();
    const out = {};
    for (const [id, payload] of Object.entries(j)) {
      const name = idMap[id];
      const p = payload && payload.usd;
      if (typeof p === 'number') out[name] = { price: p };
    }
    return out;
  }

  // ---- Merge updates & notify page ----
  function applyUpdates(updates){
    if (!Array.isArray(window.ASSET_LIST)) return;
    let touched = false;
    window.ASSET_LIST = window.ASSET_LIST.map(row => {
      const v = updates[row.name]; if (!v) return row;
      touched = true;
      return Object.assign({}, row,
        (typeof v.price === 'number') ? { price: v.price } : {},
        (typeof v.yield === 'string') ? { yield: v.yield } : {}
      );
    });
    if (touched) {
      localStorage.setItem(LSK_UPDATED, new Date().toISOString());
      if (typeof window.renderAssetsList === 'function') { try { window.renderAssetsList(); } catch(e){} }
      const tagEl = document.getElementById('pricesUpdatedTag');
      if (tagEl) {
        const iso = localStorage.getItem(LSK_UPDATED);
        tagEl.textContent = 'Prices Last Updated: ' + fmtTag(iso);
      }
    }
  }

  async function refreshPrices(){
    const [eq, cr] = await Promise.all([fetchEquities(), fetchCrypto()]);
    const updates = Object.assign({}, eq || {}, cr || {});
    applyUpdates(updates);
  }

  window.TrovePricing = {
    refreshPrices,
    fmtTag
  };

  // Auto refresh on load
  document.addEventListener('DOMContentLoaded', () => { refreshPrices(); });
})();
