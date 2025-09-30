// assets-config.js
// Keep this list short for MVP; add more later.
// class ∈ {'dividend_paying_stock','non_dividend_paying_stock','cryptocurrency','commodity'}
// source: 'equity' | 'crypto' | 'metal'
window.ASSETS_DISPLAY = [
  // ——— Dividend stocks (equity via Twelve Data) ———
  { name: 'Apple Inc.',                      class: 'dividend_paying_stock',     source: 'equity', symbol: 'AAPL' },
  { name: 'Microsoft Corporation',           class: 'dividend_paying_stock',     source: 'equity', symbol: 'MSFT' },
  { name: 'Johnson & Johnson',               class: 'dividend_paying_stock',     source: 'equity', symbol: 'JNJ' },
  { name: 'The Procter & Gamble Company',    class: 'dividend_paying_stock',     source: 'equity', symbol: 'PG' },
  { name: 'The Coca-Cola Company',           class: 'dividend_paying_stock',     source: 'equity', symbol: 'KO' },
  { name: 'PepsiCo, Inc.',                   class: 'dividend_paying_stock',     source: 'equity', symbol: 'PEP' },
  { name: "McDonald's Corporation",          class: 'dividend_paying_stock',     source: 'equity', symbol: 'MCD' },
  { name: 'Walmart Inc.',                    class: 'dividend_paying_stock',     source: 'equity', symbol: 'WMT' },
  { name: 'Verizon Communications Inc.',     class: 'dividend_paying_stock',     source: 'equity', symbol: 'VZ' },
  { name: 'AT&T Inc.',                       class: 'dividend_paying_stock',     source: 'equity', symbol: 'T' },
  { name: 'International Business Machines', class: 'dividend_paying_stock',     source: 'equity', symbol: 'IBM' },
  { name: 'Cisco Systems, Inc.',             class: 'dividend_paying_stock',     source: 'equity', symbol: 'CSCO' },

  // ——— Non-dividend growth examples ———
  { name: 'NVIDIA Corporation',              class: 'non_dividend_paying_stock', source: 'equity', symbol: 'NVDA' },
  { name: 'Amazon.com, Inc.',                class: 'non_dividend_paying_stock', source: 'equity', symbol: 'AMZN' },
  { name: 'Alphabet Inc. Class A',           class: 'non_dividend_paying_stock', source: 'equity', symbol: 'GOOGL' },
  { name: 'Meta Platforms, Inc.',            class: 'non_dividend_paying_stock', source: 'equity', symbol: 'META' },
  { name: 'Tesla, Inc.',                     class: 'non_dividend_paying_stock', source: 'equity', symbol: 'TSLA' },

  // ——— Crypto (CoinGecko/Coinbase) ———
  { name: 'Bitcoin',                          class: 'cryptocurrency',            source: 'crypto', symbol: 'BTC' },
  { name: 'Ethereum',                         class: 'cryptocurrency',            source: 'crypto', symbol: 'ETH' },

  // ——— Metals (MetalPrice API) ———
  { name: 'Gold',                             class: 'commodity',                  source: 'metal',  symbol: 'XAU' },
  { name: 'Silver',                           class: 'commodity',                  source: 'metal',  symbol: 'XAG' },
];

// Seed values for fast first paint (get overwritten by cache/live).
window.ASSETS_SEED = Object.fromEntries(window.ASSETS_DISPLAY.map(a=>[
  a.name, { price: 0, yield: '' }
]));
