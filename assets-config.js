// assets-config.js
window.ASSETS_DISPLAY = [
  { name: 'Apple Inc.',                      class: 'dividend_paying_stock',     source: 'equity', symbol: 'AAPL' },
  { name: 'Microsoft Corporation',           class: 'dividend_paying_stock',     source: 'equity', symbol: 'MSFT' },
  { name: 'Johnson & Johnson',               class: 'dividend_paying_stock',     source: 'equity', symbol: 'JNJ' },
  { name: 'The Procter & Gamble Company',    class: 'dividend_paying_stock',     source: 'equity', symbol: 'PG' },
  { name: 'The Coca-Cola Company',           class: 'dividend_paying_stock',     source: 'equity', symbol: 'KO' },
  { name: 'PepsiCo, Inc.',                   class: 'dividend_paying_stock',     source: 'equity', symbol: 'PEP' },
  { name: 'NVIDIA Corporation',              class: 'non_dividend_paying_stock', source: 'equity', symbol: 'NVDA' },
  { name: 'Amazon.com, Inc.',                class: 'non_dividend_paying_stock', source: 'equity', symbol: 'AMZN' },
  { name: 'Bitcoin',                         class: 'cryptocurrency',            source: 'crypto', symbol: 'BTC' },
  { name: 'Ethereum',                        class: 'cryptocurrency',            source: 'crypto', symbol: 'ETH' },
  { name: 'Gold',                            class: 'commodity',                  source: 'metal',  symbol: 'XAU' },
  { name: 'Silver',                          class: 'commodity',                  source: 'metal',  symbol: 'XAG' },
];
window.ASSETS_SEED = Object.fromEntries(window.ASSETS_DISPLAY.map(a=>[a.name,{price:0,yield:''}]));
