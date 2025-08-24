/*
 * Trove – Client‑side proof‑of‑concept authentication and sign‑up flow.
 *
 * This script manages:
 *  - Persisting new users created via the multi‑step signup form.
 *  - Signing users in using the login page and switching the nav button to
 *    reflect the session state.
 *  - Confirmation on logout.
 *  - Optional fallback to a read‑only CSV file in the repo (users.csv)
 *    for demonstration logins.
 *
 * WARNING: This implementation stores passwords in localStorage and
 * optionally exposes them via a CSV file. It is only suitable for demo
 * purposes on a static site. Do not use this in production.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Local persistence helpers ----------
  const getUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('troveUsers')) || {};
    } catch {
      return {};
    }
  };
  const saveUsers = (users) => {
    localStorage.setItem('troveUsers', JSON.stringify(users));
  };
  const getCurrent = () => localStorage.getItem('currentUser');
  const setCurrent = (email) => localStorage.setItem('currentUser', email);
  const clearCurrent = () => localStorage.removeItem('currentUser');

  // ---------- Header login/logout button ----------
  const loginBtn = document.querySelector('.login-btn');
  if (loginBtn) {
    const current = getCurrent();
    if (current) {
      // Show log out
      loginBtn.textContent = 'log out';
      loginBtn.href = '#';
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
          clearCurrent();
          // After logout return to home page
          window.location.href = 'index.html';
        }
      });
    } else {
      // Show log in
      loginBtn.textContent = 'log in';
      // if the link is not explicitly set, assign login.html
      if (!loginBtn.getAttribute('href') || loginBtn.getAttribute('href') === '#') {
        loginBtn.setAttribute('href', 'login.html');
      }
    }
  }

  // ---------- Update hero call‑to‑action based on session ----------
  (function updateHeroCta() {
    const heroBtn = document.querySelector('.hero .primary-btn');
    if (heroBtn) {
      const current = getCurrent();
      if (current) {
        heroBtn.textContent = 'my portfolio';
        heroBtn.setAttribute('href', 'positions.html');
      } else {
        heroBtn.textContent = 'Join';
        heroBtn.setAttribute('href', 'signup.html');
      }
    }
  })();

  // ---------- Dataset of available assets ----------
  const ASSET_LIST = [
    { name: 'Apple Inc.', class: 'dividend_paying_stock', yield: '0.46%', price: 227.76 },
    { name: 'Microsoft Corporation', class: 'dividend_paying_stock', yield: '0.65%', price: 507.23 },
    { name: 'Johnson & Johnson', class: 'dividend_paying_stock', yield: '2.90%', price: 179.29 },
    { name: 'The Procter & Gamble Company', class: 'dividend_paying_stock', yield: '2.66%', price: 158.67 },
    { name: 'The Coca-Cola Company', class: 'dividend_paying_stock', yield: '2.91%', price: 70.13 },
    { name: 'PepsiCo, Inc.', class: 'dividend_paying_stock', yield: '3.80%', price: 149.64 },
    { name: "McDonald's Corporation", class: 'dividend_paying_stock', yield: '2.25%', price: 314.07 },
    { name: 'Walmart Inc.', class: 'dividend_paying_stock', yield: '0.97%', price: 96.83 },
    { name: 'Verizon Communications Inc.', class: 'dividend_paying_stock', yield: '6.10%', price: 44.44 },
    { name: 'AT&T Inc.', class: 'dividend_paying_stock', yield: '3.86%', price: 28.77 },
    { name: 'International Business Machines Corporation', class: 'dividend_paying_stock', yield: '2.78%', price: 242.09 },
    { name: 'Cisco Systems, Inc.', class: 'dividend_paying_stock', yield: '2.44%', price: 67.32 },
    { name: 'Intel Corporation', class: 'non_dividend_paying_stock', yield: '', price: 24.8 },
    { name: 'Exxon Mobil Corporation', class: 'dividend_paying_stock', yield: '3.56%', price: 111.28 },
    { name: 'Chevron Corporation', class: 'dividend_paying_stock', yield: '4.32%', price: 158.18 },
    { name: 'Pfizer Inc.', class: 'dividend_paying_stock', yield: '6.65%', price: 25.88 },
    { name: 'Merck & Co., Inc.', class: 'dividend_paying_stock', yield: '3.71%', price: 87.37 },
    { name: 'AbbVie Inc.', class: 'dividend_paying_stock', yield: '3.11%', price: 210.6 },
    { name: 'Eli Lilly and Company', class: 'dividend_paying_stock', yield: '0.84%', price: 711.68 },
    { name: 'The Home Depot, Inc.', class: 'dividend_paying_stock', yield: '2.23%', price: 412.79 },
    { name: "Lowe's Companies, Inc.", class: 'dividend_paying_stock', yield: '1.82%', price: 263.73 },
    { name: 'Starbucks Corporation', class: 'dividend_paying_stock', yield: '2.76%', price: 88.38 },
    { name: 'NIKE, Inc.', class: 'dividend_paying_stock', yield: '2.04%', price: 78.38 },
    { name: 'The Walt Disney Company', class: 'dividend_paying_stock', yield: '0.84%', price: 118.86 },
    { name: 'Oracle Corporation', class: 'dividend_paying_stock', yield: '0.85%', price: 236.37 },
    { name: 'Amazon.com, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 228.84 },
    { name: 'Tesla, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 340.01 },
    { name: 'Alphabet Inc.', class: 'dividend_paying_stock', yield: '0.41%', price: 206.72 },
    { name: 'Meta Platforms, Inc.', class: 'dividend_paying_stock', yield: '0.28%', price: 754.79 },
    { name: 'Netflix, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 1204.65 },
    { name: 'Uber Technologies, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 96.79 },
    { name: 'Shopify Inc.', class: 'non_dividend_paying_stock', yield: '', price: 142.11 },
    { name: 'Block, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 67.26 },
    { name: 'Zoom Communications Inc.', class: 'non_dividend_paying_stock', yield: '', price: 82.47 },
    { name: 'Snowflake Inc.', class: 'non_dividend_paying_stock', yield: '', price: 196.81 },
    { name: 'Palantir Technologies Inc.', class: 'non_dividend_paying_stock', yield: '', price: 158.74 },
    { name: 'Roku, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 94.22 },
    { name: 'Twilio Inc.', class: 'non_dividend_paying_stock', yield: '', price: 106.38 },
    { name: 'Unity Software Inc.', class: 'non_dividend_paying_stock', yield: '', price: 39.16 },
    { name: 'Rivian Automotive, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 13.1 },
    { name: 'Lucid Group, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 2.03 },
    { name: 'Robinhood Markets, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 109.32 },
    { name: 'Coinbase Global, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 319.85 },
    { name: 'Beyond Meat, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 2.45 },
    { name: 'Peloton Interactive, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 7.91 },
    { name: 'DocuSign, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 74.81 },
    { name: 'Etsy, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 62.66 },
    { name: 'Pinterest, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 35.61 },
    { name: 'Snap Inc.', class: 'non_dividend_paying_stock', yield: '', price: 7.2 },
    { name: 'DoorDash, Inc.', class: 'non_dividend_paying_stock', yield: '', price: 247.32 },
    { name: 'Gold Dec 25', class: 'commodity', yield: '', price: 3418.5 },
    { name: 'Silver Sep 25', class: 'commodity', yield: '', price: 39.054 },
    { name: 'Crude Oil Oct 25', class: 'commodity', yield: '', price: 63.66 },
    { name: 'Brent Crude Oil Last Day Financ', class: 'commodity', yield: '', price: 66.77 },
    { name: 'Natural Gas Oct 25', class: 'commodity', yield: '', price: 2.8 },
    { name: 'Copper Sep 25', class: 'commodity', yield: '', price: 4.459 },
    { name: 'Chicago SRW Wheat Futures,Dec-2', class: 'commodity', yield: '', price: 527.25 },
    { name: 'Corn Futures,Dec-2025', class: 'commodity', yield: '', price: 411.5 },
    { name: 'Soybean Futures,Nov-2025', class: 'commodity', yield: '', price: 1058.5 },
    { name: 'Coffee Dec 25', class: 'commodity', yield: '', price: 378.0 },
    { name: 'Bitcoin', class: 'cryptocurrency', yield: '', price: 114595.19 },
    { name: 'Ethereum', class: 'cryptocurrency', yield: '', price: 4948.64 },
    { name: 'BNB', class: 'cryptocurrency', yield: '', price: 879.08 },
    { name: 'XRP', class: 'cryptocurrency', yield: '', price: 3.11 },
    { name: 'Cardano', class: 'cryptocurrency', yield: '', price: 0.96 },
    { name: 'Solana', class: 'cryptocurrency', yield: '', price: 204.95827851 },
    { name: 'Polkadot', class: 'cryptocurrency', yield: '', price: 4.2495 },
    { name: 'Dogecoin', class: 'cryptocurrency', yield: '', price: 0.24 },
    { name: 'Avalanche', class: 'cryptocurrency', yield: '', price: 25.11306609 },
    { name: 'Chainlink', class: 'cryptocurrency', yield: '', price: 25.69452541 }
  ];

  // ---------- Utilities for portfolio management ----------
  function getCurrentUser() {
    const users = getUsers();
    const current = getCurrent();
    if (current && users[current]) {
      const u = users[current];
      // ensure default balance and portfolio for new or CSV users
      if (typeof u.balance !== 'number') u.balance = 100000;
      if (!u.portfolio) u.portfolio = {};
      return u;
    }
    return null;
  }

  function saveCurrentUser(user) {
    const users = getUsers();
    users[user.email] = user;
    saveUsers(users);
  }

  // ---------- Build the assets table if the page contains #assetsTable ----------
  function renderAssetsTable() {
    const container = document.getElementById('assetsTable');
    if (!container) return;
    const user = getCurrentUser();
    // Build table structure
    let html = '<table class="assets-table" style="width:100%; border-collapse: collapse;">';
    html += '<thead><tr><th style="text-align:left; padding:0.5rem 0.75rem;">Asset</th><th style="text-align:left; padding:0.5rem 0.75rem;">Class</th><th style="text-align:right; padding:0.5rem 0.75rem;">Yield</th><th style="text-align:right; padding:0.5rem 0.75rem;">Price (USD)</th><th style="text-align:center; padding:0.5rem 0.75rem;">Action</th></tr></thead>';
    html += '<tbody>';
    ASSET_LIST.forEach((asset) => {
      const key = asset.name;
      const userHoldings = user?.portfolio?.[key] || null;
      const canStake = asset.class === 'dividend_paying_stock';
      html += '<tr style="border-top: 1px solid #eee;">';
      html += `<td style="padding:0.5rem 0.75rem;">${asset.name}</td>`;
      // replace underscores with spaces and capitalise first letter of each word
      const friendlyClass = asset.class.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      html += `<td style="padding:0.5rem 0.75rem;">${friendlyClass}</td>`;
      html += `<td style="padding:0.5rem 0.75rem; text-align:right;">${asset.yield || '—'}</td>`;
      html += `<td style="padding:0.5rem 0.75rem; text-align:right;">$${asset.price.toFixed(2)}</td>`;
      html += '<td style="padding:0.5rem 0.75rem; text-align:center;">';
      if (!user) {
        html += '<span style="color: #888; font-size:0.85rem;">Log in to trade</span>';
      } else {
        if (!userHoldings || userHoldings.quantity === 0) {
          html += `<button class="asset-action" data-action="buy" data-name="${key}" data-price="${asset.price}">Buy</button>`;
        } else {
          html += `<button class="asset-action" data-action="sell" data-name="${key}" data-price="${asset.price}">Sell</button>`;
          if (canStake) {
            if (userHoldings.staked) {
              html += `<button class="asset-action" data-action="unstake" data-name="${key}">Unstake</button>`;
            } else {
              html += `<button class="asset-action" data-action="stake" data-name="${key}">Stake</button>`;
            }
          }
          // Always allow additional purchase
          html += `<button class="asset-action" data-action="buy" data-name="${key}" data-price="${asset.price}">Buy More</button>`;
        }
      }
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // ---------- Build the positions page if positions container present ----------
  function renderPositions() {
    const container = document.getElementById('positionsContainer');
    if (!container) return;
    const user = getCurrentUser();
    const balanceEl = document.getElementById('balanceDisplay');
    if (!user) {
      if (balanceEl) balanceEl.textContent = '';
      container.innerHTML = '<p style="text-align:center;">Please log in to view your portfolio.</p>';
      return;
    }
    if (balanceEl) {
      balanceEl.textContent = `Available balance: $${user.balance.toFixed(2)}`;
    }
    const portfolio = user.portfolio || {};
    const keys = Object.keys(portfolio).filter((k) => portfolio[k].quantity > 0);
    if (keys.length === 0) {
      container.innerHTML = '<p style="text-align:center;">You don\'t have any positions yet. Visit the <a href="assets.html">Assets</a> page to start investing.</p>';
      return;
    }
    let html = '';
    keys.forEach((name) => {
      const holding = portfolio[name];
      const assetInfo = ASSET_LIST.find((a) => a.name === name);
      const purchaseDate = new Date(holding.purchaseDate);
      const now = new Date();
      const daysHeld = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
      const maturity = 60;
      const progress = Math.min(1, daysHeld / maturity);
      const daysRemaining = Math.max(0, maturity - daysHeld);
      // Simulate a 24h return between -3% and +3%
      const returnPerc = (Math.random() * 6 - 3).toFixed(2);
      const returnColor = returnPerc >= 0 ? '#009900' : '#cc0000';
      html += `<div class="position-card" style="border:1px solid #ddd; border-radius:8px; padding:1.5rem; margin-bottom:2rem; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
          <h3 style="margin:0 0 0.5rem 0; font-size:1.4rem;">${name}</h3>
          <div style="font-size:1.1rem; color:${returnColor};">${returnPerc}% <span style="font-size:0.85rem; color:#666;">(24h)</span></div>
        </div>
        <p style="margin:0.5rem 0; font-size:0.9rem;">Quantity: ${holding.quantity}</p>
        <p style="margin:0.5rem 0; font-size:0.9rem;">Days held: ${daysHeld} / ${maturity} (<span>${daysRemaining} days until rewards unlock</span>)</p>
        <div style="height:8px; background:#eee; border-radius:4px; overflow:hidden; margin:0.5rem 0 1rem;">
          <div style="width:${(progress * 100).toFixed(0)}%; height:100%; background:${progress >= 1 ? '#009900' : '#003366'};"></div>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="position-action" data-action="sell" data-name="${name}" data-price="${assetInfo?.price || 0}">Sell</button>
          ${assetInfo && assetInfo.class === 'dividend_paying_stock' ? (holding.staked ? `<button class="position-action" data-action="unstake" data-name="${name}">Unstake</button>` : `<button class="position-action" data-action="stake" data-name="${name}">Stake</button>`) : ''}
          <button class="position-action" data-action="buy" data-name="${name}" data-price="${assetInfo?.price || 0}">Buy More</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
  }

  // ---------- Event delegation for assets table actions ----------
  document.body.addEventListener('click', (e) => {
    const assetBtn = e.target.closest('.asset-action');
    if (assetBtn) {
      const action = assetBtn.getAttribute('data-action');
      const name = assetBtn.getAttribute('data-name');
      const price = parseFloat(assetBtn.getAttribute('data-price')); 
      if (!name) return;
      const user = getCurrentUser();
      if (!user) {
        alert('Please log in to perform this action.');
        return;
      }
      switch (action) {
        case 'buy': {
          const quantityStr = prompt(`How many shares/units of ${name} would you like to buy?`);
          const quantity = parseFloat(quantityStr);
          if (!quantity || quantity <= 0) return;
          const cost = price * quantity;
          if (user.balance < cost) {
            alert('Insufficient balance.');
            return;
          }
          user.balance -= cost;
          if (!user.portfolio) user.portfolio = {};
          if (!user.portfolio[name]) {
            user.portfolio[name] = { quantity: 0, staked: false, purchaseDate: Date.now() };
          }
          user.portfolio[name].quantity += quantity;
          user.portfolio[name].purchaseDate = Date.now();
          saveCurrentUser(user);
          alert(`Successfully purchased ${quantity} of ${name}.`);
          renderAssetsTable();
          renderPositions();
          break;
        }
        case 'sell': {
          const holding = user.portfolio && user.portfolio[name];
          if (!holding || holding.quantity <= 0) {
            alert('You do not own any of this asset.');
            return;
          }
          const quantityStr = prompt(`You own ${holding.quantity} of ${name}. How many would you like to sell?`);
          const quantity = parseFloat(quantityStr);
          if (!quantity || quantity <= 0) return;
          if (quantity > holding.quantity) {
            alert('You do not own that many units.');
            return;
          }
          const revenue = price * quantity;
          user.balance += revenue;
          holding.quantity -= quantity;
          if (holding.quantity === 0) {
            delete user.portfolio[name];
          }
          saveCurrentUser(user);
          alert(`Sold ${quantity} of ${name} for $${revenue.toFixed(2)}.`);
          renderAssetsTable();
          renderPositions();
          break;
        }
        case 'stake': {
          const holding = user.portfolio && user.portfolio[name];
          if (!holding || holding.quantity <= 0) {
            alert('You do not own any of this asset.');
            return;
          }
          holding.staked = true;
          saveCurrentUser(user);
          renderAssetsTable();
          renderPositions();
          break;
        }
        case 'unstake': {
          const holding = user.portfolio && user.portfolio[name];
          if (holding) {
            holding.staked = false;
            saveCurrentUser(user);
            renderAssetsTable();
            renderPositions();
          }
          break;
        }
        default:
          break;
      }
    }
    // event delegation for positions actions
    const posBtn = e.target.closest('.position-action');
    if (posBtn) {
      const action = posBtn.getAttribute('data-action');
      const name = posBtn.getAttribute('data-name');
      const price = parseFloat(posBtn.getAttribute('data-price'));
      if (!name) return;
      const user = getCurrentUser();
      if (!user) {
        alert('Please log in.');
        return;
      }
      // mimic the same actions as assets table
      switch (action) {
        case 'buy': {
          const quantityStr = prompt(`How many of ${name} would you like to buy?`);
          const quantity = parseFloat(quantityStr);
          if (!quantity || quantity <= 0) return;
          const cost = price * quantity;
          if (user.balance < cost) {
            alert('Insufficient balance.');
            return;
          }
          user.balance -= cost;
          if (!user.portfolio) user.portfolio = {};
          if (!user.portfolio[name]) {
            user.portfolio[name] = { quantity: 0, staked: false, purchaseDate: Date.now() };
          }
          user.portfolio[name].quantity += quantity;
          user.portfolio[name].purchaseDate = Date.now();
          saveCurrentUser(user);
          renderAssetsTable();
          renderPositions();
          break;
        }
        case 'sell': {
          const holding = user.portfolio && user.portfolio[name];
          if (!holding || holding.quantity <= 0) {
            alert('You do not own any of this asset.');
            return;
          }
          const quantityStr = prompt(`You own ${holding.quantity} of ${name}. How many would you like to sell?`);
          const quantity = parseFloat(quantityStr);
          if (!quantity || quantity <= 0) return;
          if (quantity > holding.quantity) {
            alert('You do not own that many units.');
            return;
          }
          const revenue = price * quantity;
          user.balance += revenue;
          holding.quantity -= quantity;
          if (holding.quantity === 0) {
            delete user.portfolio[name];
          }
          saveCurrentUser(user);
          renderAssetsTable();
          renderPositions();
          break;
        }
        case 'stake': {
          const holding = user.portfolio && user.portfolio[name];
          if (!holding || holding.quantity <= 0) return;
          holding.staked = true;
          saveCurrentUser(user);
          renderAssetsTable();
          renderPositions();
          break;
        }
        case 'unstake': {
          const holding = user.portfolio && user.portfolio[name];
          if (!holding) return;
          holding.staked = false;
          saveCurrentUser(user);
          renderAssetsTable();
          renderPositions();
          break;
        }
      }
    }
  });

  // ---------- Render assets table or positions page if present ----------
  renderAssetsTable();
  renderPositions();

  // ---------- Sign‑up logic (multi‑step form) ----------
  const signupWrapper = document.querySelector('.signup-wrapper');
  if (signupWrapper) {
    const steps = Array.from(signupWrapper.querySelectorAll('.step'));
    let currentStep = steps.findIndex((s) => s.classList.contains('active'));
    if (currentStep < 0) currentStep = 0;
    const formData = {};

    const showStep = (i) => {
      steps.forEach((step, idx) => step.classList.toggle('active', idx === i));
    };
    showStep(currentStep);

    signupWrapper.addEventListener('click', (e) => {
      // Next button logic
      if (e.target.matches('.next-btn')) {
        const active = steps[currentStep];
        // capture all inputs/selects in current step
        const inputs = active.querySelectorAll('input, select');
        inputs.forEach((input) => {
          const key = input.id || input.name || input.placeholder;
          if (input.type === 'checkbox') {
            formData[key] = input.checked;
          } else {
            formData[key] = input.value;
          }
        });
        if (currentStep < steps.length - 1) {
          currentStep += 1;
          showStep(currentStep);
        } else {
          // Final step – register user
          const email = (formData.email || formData.Email || '').trim().toLowerCase();
          const password = (formData.password || formData['Create password'] || formData['create password'] || '').toString();
          if (!email || !password) {
            alert('Please provide a valid email and password to sign up.');
            return;
          }
          // Merge into existing users
          const users = getUsers();
          users[email] = {
            email,
            password,
            firstName: formData.firstName || formData['First name'] || '',
            surname: formData.surname || formData['Surname'] || '',
            dob: formData.dob || '',
            phone: formData.phone || '',
            country: formData.country || '',
            address: formData.address || '',
            currency: formData.currency || '',
            theme: formData.theme || '',
            twofa: !!formData.twofa,
            pet: formData.pet || '',
            // initialise fake currency and empty portfolio
            balance: 100000,
            portfolio: {}
          };
          saveUsers(users);
          setCurrent(email);
          // Show success message
          signupWrapper.innerHTML = `
            <h2>Welcome to Trove!</h2>
            <p>Thanks for signing up, ${formData.firstName || 'friend'}.</p>
            <p>Your account has been created on this device.</p>
            <div style="margin-top: 1rem;">
              <a href="index.html" class="primary-btn">Return home</a>
              <a href="positions.html" class="secondary-btn" style="margin-left: 0.5rem;">Go to positions</a>
            </div>
          `;
        }
      }
      // Back button logic
      if (e.target.matches('.back-btn')) {
          if (currentStep > 0) {
            currentStep -= 1;
            showStep(currentStep);
          }
      }
      // Pet card selection
      const petCard = e.target.closest('.pet-card');
      if (petCard) {
        signupWrapper.querySelectorAll('.pet-card').forEach((c) => c.classList.remove('selected'));
        petCard.classList.add('selected');
        formData.pet = petCard.dataset.pet;
      }
    });
  }

  // ---------- Login page handling ----------
  const loginForm =
    document.getElementById('loginForm') ||
    document.querySelector('form#loginForm');
  if (loginForm) {
    const emailEl = document.getElementById('loginEmail') || loginForm.querySelector('input[type="email"]');
    const passEl = document.getElementById('loginPassword') || loginForm.querySelector('input[type="password"]');
    const errorEl = document.getElementById('loginError') || loginForm.querySelector('.error-message');

    // Optional: load CSV fallback – parse users.csv into object keyed by email
    async function fetchCsvUsers() {
      try {
        const res = await fetch('users.csv', { cache: 'no-store' });
        if (!res.ok) return {};
        const text = await res.text();
        const lines = text.trim().split(/\r?\n/);
        const header = lines.shift()?.split(',').map((h) => h.trim().toLowerCase()) || [];
        const idx = {
          email: header.indexOf('email'),
          password: header.indexOf('password'),
          firstname: header.indexOf('firstname'),
          surname: header.indexOf('surname')
        };
        const out = {};
        for (const line of lines) {
          const cols = line.split(',');
          const email = (cols[idx.email] || '').trim().toLowerCase();
          if (!email) continue;
          out[email] = {
            email,
            password: (cols[idx.password] || '').trim(),
            firstName: cols[idx.firstname] || '',
            surname: cols[idx.surname] || ''
          };
        }
        return out;
      } catch {
        return {};
      }
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (emailEl?.value || '').trim().toLowerCase();
      const password = passEl?.value || '';
      if (!email || !password) {
        if (errorEl) {
          errorEl.textContent = 'Please enter your email and password.';
          errorEl.style.display = 'block';
        }
        return;
      }
      const users = getUsers();
      let user = users[email];
      // fallback to CSV if not found locally
      if (!user) {
        const csvUsers = await fetchCsvUsers();
        user = csvUsers[email];
      }
      if (!user || user.password !== password) {
        if (errorEl) {
          errorEl.textContent = 'Invalid email or password.';
          errorEl.style.display = 'block';
        } else {
          alert('Invalid email or password.');
        }
        return;
      }
      // success
      // ensure default balance and portfolio if missing
      if (typeof user.balance !== 'number') user.balance = 100000;
      if (!user.portfolio) user.portfolio = {};
      // persist user if loaded from CSV
      const users = getUsers();
      users[email] = user;
      saveUsers(users);
      setCurrent(email);
      // redirect to home page
      window.location.href = 'index.html';
    });
  }
});