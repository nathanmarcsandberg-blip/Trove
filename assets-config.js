// assets-config.js — FIXED_ASSETS (no commodities)
window.FIXED_ASSETS = [
  { name: 'Apple Inc.',                      source: 'equity', class: 'dividend_paying_stock',     symbol: 'AAPL' },
  { name: 'Microsoft Corporation',           source: 'equity', class: 'dividend_paying_stock',     symbol: 'MSFT' },
  { name: 'Johnson & Johnson',               source: 'equity', class: 'dividend_paying_stock',     symbol: 'JNJ' },
  { name: 'The Procter & Gamble Company',    source: 'equity', class: 'dividend_paying_stock',     symbol: 'PG'   },
  { name: 'The Coca-Cola Company',           source: 'equity', class: 'dividend_paying_stock',     symbol: 'KO'   },
  { name: 'PepsiCo, Inc.',                   source: 'equity', class: 'dividend_paying_stock',     symbol: 'PEP'  },
  { name: 'NVIDIA Corporation',              source: 'equity', class: 'non_dividend_paying_stock', symbol: 'NVDA' },
  { name: 'Amazon.com, Inc.',                source: 'equity', class: 'non_dividend_paying_stock', symbol: 'AMZN' },
  { name: 'Bitcoin',                         source: 'crypto', class: 'cryptocurrency',            symbol: 'BTC'  },
  { name: 'Ethereum',                        source: 'crypto', class: 'cryptocurrency',            symbol: 'ETH'  }
];
window.ASSET_LIST = (window.ASSET_LIST && Array.isArray(window.ASSET_LIST)) ? window.ASSET_LIST :
  window.FIXED_ASSETS.map(a => ({ name: a.name, class: a.class, price: 0, yield: '' }));
window.ASSET_PRICES = {}; window.ASSET_DIVIDENDS = {};
