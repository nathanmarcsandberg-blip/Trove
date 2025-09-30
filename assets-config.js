// Minimal, display-only list. Add/remove as you like.
// class ∈ {'dividend_paying_stock','non_dividend_paying_stock','cryptocurrency','commodity'}
// source: 'equity' | 'crypto' | 'metal'
window.ASSETS_DISPLAY = [
  // Dividend stocks
  { name: 'Apple Inc.',                      class: 'dividend_paying_stock',     source: 'equity', symbol: 'AAPL' },
  { name: 'Microsoft Corporation',           class: 'dividend_paying_stock',     source: 'equity', symbol: 'MSFT' },
  { name: 'Johnson & Johnson',               class: 'dividend_paying_stock',     source: 'equity', symbol: 'JNJ' },
  { name: 'The Procter & Gamble Company',    class: 'dividend_paying_stock',     source: 'equity', symbol: 'PG' },
  { name: 'The Coca-Cola Company',           class: 'dividend_paying_stock',     source: 'equity', symbol: 'KO' },
  { name: 'PepsiCo, Inc.',                   class: 'dividend_paying_stock',     source: 'equity', symbol: 'PEP' },
  // Non-dividend examples
  { name: 'NVIDIA Corporation',              class: 'non_dividend_paying_stock', source: 'equity', symbol: 'NVDA' },
  { name: 'Amazon.com, Inc.',                class: 'non_dividend_paying_stock', source: 'equity', symbol: 'AMZN' },
  // Crypto
  { name: 'Bitcoin',                         class: 'cryptocurrency',            source: 'crypto', symbol: 'BTC' },
  { name: 'Ethereum',                        class: 'cryptocurrency',            source: 'crypto', symbol: 'ETH' },
  // Metals
  { name: 'Gold',                            class: 'commodity',                  source: 'metal',  symbol: 'XAU' },
  { name: 'Silver',                          class: 'commodity',                  source: 'metal',  symbol: 'XAG' },
];

// Seed values for first paint; will be overwritten by cache/live.
window.ASSETS_SEED = Object.fromEntries(
  window.ASSETS_DISPLAY.map(a => [a.name, { price: 0, yield: '' }])
);
