/*
 * Trove – Client-side proof-of-concept authentication and sign-up flow.
 * (Patched to read LIVE assets from window.ASSET_LIST populated by data-prices.js)
 *
 * WARNING: Demo-only implementation. Not for production use.
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

  // ---------- Update hero call-to-action based on session ----------
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

  // ---------- LIVE ASSET helpers (replaces hard-coded ASSET_LIST) ----------
  function liveAssets() {
    return Array.isArray(window.ASSET_LIST) ? window.ASSET_LIST : [];
  }
  function liveAssetByName(name) {
    return liveAssets().find((a) => a.name === name);
  }
  function livePrice(name, fallback = 0) {
    const a = liveAssetByName(name);
    const p = a ? Number(a.price) : NaN;
    return Number.isFinite(p) ? p : fallback;
  }

  // ---------- Portfolio sticky bar update ----------
  function updatePortfolioBar() {
    const bar = document.getElementById('portfolioBar');
    if (!bar) return;
    const user = getCurrentUser();
    if (!user) {
      bar.style.display = 'none';
      // remove bottom padding if bar hidden
      document.body.style.paddingBottom = '';
      return;
    }
    // compute total portfolio value (current prices)
    let portfolioValue = 0;
    if (Array.isArray(user.positions)) {
      user.positions.forEach((pos) => {
        const price = livePrice(pos.name, pos.purchasePrice);
        portfolioValue += pos.quantity * price;
      });
    }
    // available balance from user record
    const available = typeof user.balance === 'number' ? user.balance : 0;
    // compute account value as available balance plus portfolio value
    const accountValue = available + portfolioValue;
    const portfolioStr = portfolioValue.toFixed(2);
    const availableStr = available.toFixed(2);
    const accountStr = accountValue.toFixed(2);
    // simulate 24h return between -3% and +3%
    const return24h = (Math.random() * 6 - 3).toFixed(2);
    // last month yield as 1% of portfolio value (placeholder)
    const lastMonthYield = (portfolioValue * 0.01).toFixed(2);
    const returnColor = return24h >= 0 ? '#009900' : '#cc0000';
    bar.innerHTML = `
      <div class="portfolio-section">
        <a href="positions.html" class="portfolio-link">my portfolio</a>
      </div>
      <div class="portfolio-section">
        <div style="font-weight:600;">24hrs</div>
        <div style="color:${returnColor}; font-size:1.4rem; font-weight:600;">${return24h}%</div>
      </div>
      <div class="portfolio-section">
        <div style="font-weight:600;">account value</div>
        <div class="portfolio-value">$${accountStr}</div>
        <div style="font-size:0.8rem; color:var(--color-grey)">avail $${availableStr} + port $${portfolioStr}</div>
      </div>
      <div class="portfolio-section">
        <div style="font-weight:600;">last month's yield</div>
        <div style="font-size:1.4rem; font-weight:600;">+$${lastMonthYield}</div>
      </div>
    `;
    bar.style.display = 'flex';
    // add padding to body so content doesn't hide behind bar
    document.body.style.paddingBottom = '80px';
  }

  // ---------- Account page rendering and actions ----------
  function renderAccount() {
    const valueEl = document.getElementById('accountValue');
    if (!valueEl) return; // not on account page
    const user = getCurrentUser();
    const chartContainer = document.getElementById('accountChart');
    const dividendsEl = document.getElementById('dividendsEarned');
    const extraEl = document.getElementById('extraDividends');
    const treasuryEl = document.getElementById('treasuryYields');
    const totalEl = document.getElementById('totalReturns');
    if (!user) {
      // user not logged in, show message
      if (chartContainer) chartContainer.textContent = 'Please log in to view account details.';
      if (valueEl) valueEl.textContent = '$0.00';
      if (dividendsEl) dividendsEl.textContent = '$0.00';
      if (extraEl) extraEl.textContent = '$0.00';
      if (treasuryEl) treasuryEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      return;
    }
    // compute total current portfolio value
    let totalValue = 0;
    if (Array.isArray(user.positions)) {
      user.positions.forEach((pos) => {
        const price = livePrice(pos.name, pos.purchasePrice);
        totalValue += pos.quantity * price;
      });
    }
    valueEl.textContent = `$${totalValue.toFixed(2)}`;
    // compute placeholder returns: dividends (0.8%), extra (0.3%), treasury (0.5%)
    const dividends = totalValue * 0.008;
    const extra = totalValue * 0.003;
    const treasury = totalValue * 0.005;
    const total = dividends + extra + treasury;
    if (dividendsEl) dividendsEl.textContent = `$${dividends.toFixed(2)}`;
    if (extraEl) extraEl.textContent = `$${extra.toFixed(2)}`;
    if (treasuryEl) treasuryEl.textContent = `$${treasury.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    // generate simple random line chart
    if (chartContainer) {
      const width = chartContainer.clientWidth || 300;
      const height = chartContainer.clientHeight || 150;
      const points = [];
      const numPoints = 6;
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: (i / (numPoints - 1)) * width,
          y: height - Math.random() * height * 0.8 - height * 0.1
        });
      }
      let path = '';
      points.forEach((p, idx) => {
        path += (idx === 0 ? 'M' : 'L') + p.x + ' ' + p.y + ' ';
      });
      chartContainer.innerHTML = `<svg width="100%" height="160" viewBox="0 0 ${width} 160" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="${getComputedStyle(document.documentElement).getPropertyValue('--color-primary') || '#7a27b5'}" stroke-width="2" /></svg>`;
    }
  }

  // Attach event handlers for deposit and cash out on account page
  function initAccountActions() {
    const depositBtn = document.querySelector('.deposit-btn');
    const cashoutBtn = document.querySelector('.cashout-btn');
    const profilePicture = document.getElementById('profilePicture');
    if (depositBtn) {
      depositBtn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) {
          alert('Please log in.');
          return;
        }
        const amountStr = prompt('Enter amount to deposit:');
        const amount = parseFloat(amountStr);
        if (!amount || amount <= 0) return;
        user.balance += amount;
        saveCurrentUser(user);
        alert(`Deposited $${amount.toFixed(2)}.`);
        renderAccount();
        updatePortfolioBar();
      });
    }
    if (cashoutBtn) {
      cashoutBtn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) {
          alert('Please log in.');
          return;
        }
        const amountStr = prompt(`You have $${user.balance.toFixed(2)} available. Enter amount to cash out:`);
        const amount = parseFloat(amountStr);
        if (!amount || amount <= 0) return;
        if (amount > user.balance) {
          alert('Amount exceeds available balance.');
          return;
        }
        user.balance -= amount;
        saveCurrentUser(user);
        alert(`Cashed out $${amount.toFixed(2)}.`);
        renderAccount();
        updatePortfolioBar();
      });
    }
    // Placeholder: clicking edit picture triggers file upload (not implemented)
    if (profilePicture) {
      // profilePicture currently just a circle; actual upload handling would require input elements
    }
  }

  // ---------- State for assets search and filtering ----------
  let currentSearchQuery = '';
  let selectedCategory = 'all';

  // ---------- Render the assets list in card format (LIVE list) ----------
  function renderAssetsList() {
    const container = document.getElementById('assetsList');
    if (!container) return;
    const user = getCurrentUser();
    // Lower-case search term for case-insensitive filtering
    const searchLower = currentSearchQuery.trim().toLowerCase();
    let filtered = liveAssets().filter((asset) => asset.name.toLowerCase().includes(searchLower));
    // Apply category filter (skip when "all")
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter((asset) => asset.class === selectedCategory);
    }
    let html = '';
    filtered.forEach((asset) => {
      const holdings = user?.positions?.filter((p) => p.name === asset.name) || [];
      const hasHoldings = holdings.length > 0;
      const price = Number(asset.price) || 0;
      const priceStr = price ? `$${price.toFixed(2)}` : '—';
      let meta = priceStr;
      if (asset.yield) meta += ` - <span class="yield-percent">${asset.yield}</span>`;
      html += `<div class="asset-card">
        <div class="asset-logo">logo</div>
        <button class="asset-action asset-sell-btn ${hasHoldings ? '' : 'disabled'}" data-action="sell" data-name="${asset.name}" data-price="${price}">sell</button>
        <div class="asset-info">
          <span class="asset-name">${asset.name}</span>
          <span class="asset-meta">${meta}</span>
        </div>
        <button class="asset-action asset-buy-btn" data-action="buy" data-name="${asset.name}" data-price="${price}">${hasHoldings ? 'buy more' : 'buy'}</button>
      </div>`;
    });
    container.innerHTML = html;
    updatePortfolioBar();
  }

  // ---------- Utilities for portfolio management ----------
  function getCurrentUser() {
    const users = getUsers();
    const current = getCurrent();
    if (current && users[current]) {
      const u = users[current];
      // ensure default balance and portfolio for new or CSV users
      if (typeof u.balance !== 'number') u.balance = 100000;
      // Ensure positions array exists (replace legacy portfolio)
      if (!Array.isArray(u.positions)) {
        // migrate legacy portfolio object if present
        if (u.portfolio && typeof u.portfolio === 'object') {
          u.positions = Object.keys(u.portfolio).map((k) => {
            const v = u.portfolio[k];
            return {
              id: Date.now() + Math.random(),
              name: k,
              quantity: v.quantity || 0,
              purchasePrice: livePrice(k, 0),
              purchaseDate: v.purchaseDate || Date.now()
            };
          });
          delete u.portfolio;
        } else {
          u.positions = [];
        }
      }
      return u;
    }
    return null;
  }

  function saveCurrentUser(user) {
    const users = getUsers();
    users[user.email] = user;
    saveUsers(users);
  }

  // ---------- Build the positions page if positions container present ----------
  function renderPositions() {
    const container = document.getElementById('positionsContainer');
    if (!container) return;
    const user = getCurrentUser();
    const balanceEl = document.getElementById('balanceDisplay');
    if (!user) {
      if (balanceEl) balanceEl.textContent = '';
      container.innerHTML = '<p style="text-align:center;">You don\'t have any positions yet. Visit the <a href="assets.html">Assets</a> page to start investing.</p>';
      return;
    }
    if (balanceEl) {
      balanceEl.textContent = `Available balance: $${user.balance.toFixed(2)}`;
    }
    // Use positions array instead of legacy portfolio
    const positions = Array.isArray(user.positions) ? user.positions.filter((p) => p.quantity > 0) : [];
    if (positions.length === 0) {
      container.innerHTML = '<p style="text-align:center;">You don\'t have any positions yet. Visit the <a href="assets.html">Assets</a> page to start investing.</p>';
      return;
    }
    let html = '';
    positions.forEach((pos) => {
      const name = pos.name;
      const quantity = pos.quantity;
      const price = pos.purchasePrice;
      const total = price * quantity;
      // Simulate 24h return randomly between -3 and +3 percent
      const returnPerc = (Math.random() * 6 - 3).toFixed(2);
      const returnColor = returnPerc >= 0 ? '#009900' : '#cc0000';
      // Progress calculation based on 2 minute maturity
      const now = Date.now();
      const maturityMs = 2 * 60 * 1000;
      const elapsed = now - pos.purchaseDate;
      const progress = Math.min(1, elapsed / maturityMs);
      const remainingMs = Math.max(0, maturityMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const midClass = progress >= 1 ? 'complete' : 'current';
      const endClass = progress >= 1 ? 'complete' : '';
      // Format remaining time as seconds or matured message
      const timeLabel = progress >= 1 ? 'Rewards unlocked' : `${remainingSec} sec until rewards unlock`;
      html += `<div class="position-card">
        <div class="card-main">
          <div class="card-left">
            <div>Price: $${price.toFixed(2)}</div>
            <div>Units: ${quantity}</div>
            <div>Total: $${total.toFixed(2)}</div>
          </div>
          <div class="card-right">
            <div class="card-top">
              <h3 class="asset-name">${name}</h3>
              <div class="return-24h" style="color:${returnColor};">${returnPerc}% <span style="font-size:0.85rem; color:#666;">(24h)</span></div>
            </div>
            <div class="progress-row">
              <div class="progress-circle start"></div>
              <div class="progress-bar" style="--progress-width:${(progress * 100).toFixed(0)}%"></div>
              <div class="progress-circle ${midClass}"></div>
              <div class="progress-circle ${endClass}"></div>
              <span style="font-size:0.8rem; margin-left:0.5rem; color:#666;">${timeLabel}</span>
            </div>
          </div>
        </div>
        <div class="position-actions">
          <button class="position-action sell" data-action="sell" data-name="${name}" data-price="${price}" data-id="${pos.id}">Sell</button>
          <button class="position-action buy-more" data-action="buy" data-name="${name}" data-price="${livePrice(name, price)}">Buy More</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    // update bottom bar when rendering positions
    updatePortfolioBar();
  }

  // ---------- Event delegation for assets table & positions actions ----------
  document.body.addEventListener('click', (e) => {
    const assetBtn = e.target.closest('.asset-action');
    if (assetBtn) {
      // If the sell button is disabled, notify and exit
      if (assetBtn.classList.contains('disabled')) {
        alert("You don't own this asset.");
        return;
      }
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
          if (!Array.isArray(user.positions)) user.positions = [];
          user.positions.push({
            id: Date.now() + Math.random(),
            name,
            quantity,
            purchasePrice: price,
            purchaseDate: Date.now()
          });
          saveCurrentUser(user);
          alert(`Successfully purchased ${quantity} of ${name}.`);
          renderAssetsList();
          renderPositions();
          break;
        }
        case 'sell': {
          // Sell across all positions of this asset
          const positions = (user.positions || []).filter((p) => p.name === name);
          if (!positions.length) {
            alert('You do not own any of this asset.');
            return;
          }
          const totalQty = positions.reduce((sum, p) => sum + p.quantity, 0);
          const quantityStr = prompt(`You own ${totalQty} of ${name}. How many would you like to sell?`);
          const sellQty = parseFloat(quantityStr);
          if (!sellQty || sellQty <= 0) return;
          if (sellQty > totalQty) {
            alert('You do not own that many units.');
            return;
          }
          let remaining = sellQty;
          let revenue = 0;
          // iterate through positions (FIFO) and reduce quantities
          for (const pos of user.positions) {
            if (pos.name !== name || remaining <= 0) continue;
            const qtyToSell = Math.min(pos.quantity, remaining);
            revenue += qtyToSell * pos.purchasePrice;
            pos.quantity -= qtyToSell;
            remaining -= qtyToSell;
          }
          // remove positions with zero quantity
          user.positions = user.positions.filter((p) => p.quantity > 0);
          user.balance += revenue;
          saveCurrentUser(user);
          alert(`Sold ${sellQty} of ${name} for $${revenue.toFixed(2)}.`);
          renderAssetsList();
          renderPositions();
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
      switch (action) {
        case 'buy': {
          // Buy more of this asset (creates new position)
          const quantityStr = prompt(`How many of ${name} would you like to buy?`);
          const quantity = parseFloat(quantityStr);
          if (!quantity || quantity <= 0) return;
          const cost = price * quantity;
          if (user.balance < cost) {
            alert('Insufficient balance.');
            return;
          }
          user.balance -= cost;
          if (!Array.isArray(user.positions)) user.positions = [];
          user.positions.push({
            id: Date.now() + Math.random(),
            name,
            quantity,
            purchasePrice: price,
            purchaseDate: Date.now()
          });
          saveCurrentUser(user);
          // Re-render the assets list and positions after a buy action
          renderAssetsList();
          renderPositions();
          break;
        }
        case 'sell': {
          // Sell from a specific position if id is provided
          const posId = posBtn.getAttribute('data-id');
          if (posId) {
            const position = (user.positions || []).find((p) => String(p.id) === String(posId));
            if (!position) {
              alert('Position not found.');
              return;
            }
            const quantityStr = prompt(`You own ${position.quantity} of this position in ${position.name}. How many would you like to sell?`);
            const sellQty = parseFloat(quantityStr);
            if (!sellQty || sellQty <= 0) return;
            if (sellQty > position.quantity) {
              alert('You do not own that many units in this position.');
              return;
            }
            const revenue = sellQty * position.purchasePrice;
            user.balance += revenue;
            position.quantity -= sellQty;
            if (position.quantity === 0) {
              user.positions = user.positions.filter((p) => String(p.id) !== String(posId));
            }
            saveCurrentUser(user);
            renderAssetsList();
            renderPositions();
            break;
          }
          // if no id, fallback to aggregated sale across positions
          const positions = (user.positions || []).filter((p) => p.name === name);
          if (!positions.length) {
            alert('You do not own any of this asset.');
            return;
          }
          const totalQty = positions.reduce((sum, p) => sum + p.quantity, 0);
          const quantityStr = prompt(`You own ${totalQty} of ${name}. How many would you like to sell?`);
          const sellQty = parseFloat(quantityStr);
          if (!sellQty || sellQty <= 0) return;
          if (sellQty > totalQty) {
            alert('You do not own that many units.');
            return;
          }
          let remaining = sellQty;
          let revenue = 0;
          for (const pos of user.positions) {
            if (pos.name !== name || remaining <= 0) continue;
            const qtyToSell = Math.min(pos.quantity, remaining);
            revenue += qtyToSell * pos.purchasePrice;
            pos.quantity -= qtyToSell;
            remaining -= qtyToSell;
          }
          user.positions = user.positions.filter((p) => p.quantity > 0);
          user.balance += revenue;
          saveCurrentUser(user);
          renderAssetsList();
          renderPositions();
          break;
        }
        default:
          break;
      }
    }
  });

  // ---------- Render assets & positions on load ----------
  renderAssetsList();
  renderPositions();

  // Attach search and category filter handlers on the assets page
  const searchEl = document.getElementById('assetSearch');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      currentSearchQuery = searchEl.value.trim().toLowerCase();
      renderAssetsList();
    });
  }
  const categoryEls = document.querySelectorAll('.category-btn');
  if (categoryEls && categoryEls.length > 0) {
    categoryEls.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedCategory = btn.getAttribute('data-category') || 'all';
        // Update active state
        categoryEls.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderAssetsList();
      });
    });
  }

  // Initial update of portfolio bar on page load
  updatePortfolioBar();

  // Render account page and attach actions if on account.html
  renderAccount();
  initAccountActions();

  // ---------- Initialize treasury sliders (pools and raffle) ----------
  function initTreasurySliders() {
    // Pools slider
    const poolsWrapper = document.getElementById('poolsWrapper');
    const poolsPrevBtn = document.querySelector('.pools-prev');
    const poolsNextBtn = document.querySelector('.pools-next');
    if (poolsWrapper && poolsPrevBtn && poolsNextBtn) {
      // Define 12 fictional pools with name and details
      const pools = [
        { title: 'ETH Pool', details: ['32 ETH', 'yield 2 ETH', 'Maturity 29th August'] },
        { title: 'USDC Pool', details: ['$140,056 USDC', 'yield $2,304', 'Maturity 12th September'] },
        { title: 'SOL Growth Pool', details: ['1,200 SOL', 'yield 30 SOL', 'Maturity 15th September'] },
        { title: 'Diversified Crypto Pool', details: ['50% BTC, 30% ETH, 20% USDC', 'yield 7%', 'Maturity 1st October'] },
        { title: 'Stable Yield Pool', details: ['200,000 USDT', 'yield 5.5%', 'Maturity 20th November'] },
        { title: 'BTC Growth Pool', details: ['10 BTC', 'yield 0.5 BTC', 'Maturity 22nd August'] },
        { title: 'ETH2 Staking Pool', details: ['64 ETH', 'yield 3 ETH', 'Maturity 2nd September'] },
        { title: 'AVAX Growth Pool', details: ['3,000 AVAX', 'yield 50 AVAX', 'Maturity 10th November'] },
        { title: 'DOT Index Pool', details: ['10,000 DOT', 'yield 300 DOT', 'Maturity 18th December'] },
        { title: 'Crypto Index Pool', details: ['30% BTC, 30% ETH, 40% alt', 'yield 8%', 'Maturity 5th January'] },
        { title: 'Metaverse Pool', details: ['100 MANA, 100 SAND', 'yield 10 MANA + 10 SAND', 'Maturity 23rd September'] },
        { title: 'Commodity Token Pool', details: ['$50K Gold tokens, $20K Silver tokens', 'yield 4%', 'Maturity 30th December'] }
      ];
      poolsWrapper.innerHTML = '';
      pools.forEach((pool) => {
        const card = document.createElement('div');
        card.className = 'pool-card';
        const title = document.createElement('h4');
        title.textContent = pool.title;
        card.appendChild(title);
        pool.details.forEach((line) => {
          const p = document.createElement('p');
          p.textContent = line;
          card.appendChild(p);
        });
        poolsWrapper.appendChild(card);
      });
      let poolsIndex = 0;
      const visibleCards = 7;
      const totalCards = pools.length;
      function updatePoolsSlider() {
        // compute the width of one card including margin
        const cardEl = poolsWrapper.children[0];
        if (!cardEl) return;
        const cardWidth = cardEl.getBoundingClientRect().width + 8; // margin-right set to 0.5rem (approx 8px)
        const offset = poolsIndex * cardWidth;
        poolsWrapper.style.transform = `translateX(-${offset}px)`;
        poolsPrevBtn.disabled = poolsIndex <= 0;
        poolsNextBtn.disabled = poolsIndex >= totalCards - visibleCards;
      }
      poolsPrevBtn.addEventListener('click', () => {
        if (poolsIndex > 0) {
          poolsIndex -= 1;
          updatePoolsSlider();
        }
      });
      poolsNextBtn.addEventListener('click', () => {
        if (poolsIndex < totalCards - visibleCards) {
          poolsIndex += 1;
          updatePoolsSlider();
        }
      });
      // call once to set initial state
      setTimeout(updatePoolsSlider, 50);
    }
    // Raffle slider
    const raffleContent = document.getElementById('raffleContent');
    const rafflePrevBtn = document.querySelector('.raffle-prev');
    const raffleNextBtn = document.querySelector('.raffle-next');
    if (raffleContent && rafflePrevBtn && raffleNextBtn) {
      const raffleData = [
        {
          month: 'April',
          winners: [
            { place: '1st', user: 'user 1', prize: '$2,000' },
            { place: '2nd', user: 'user 2', prize: '$1,000' },
            { place: '3rd', user: 'user 3', prize: '$500' }
          ]
        },
        {
          month: 'May',
          winners: [
            { place: '1st', user: 'user 4', prize: '$2,500' },
            { place: '2nd', user: 'user 5', prize: '$1,200' },
            { place: '3rd', user: 'user 6', prize: '$600' }
          ]
        },
        {
          month: 'June',
          winners: [
            { place: '1st', user: 'user 7', prize: '$1,800' },
            { place: '2nd', user: 'user 8', prize: '$900' },
            { place: '3rd', user: 'user 9', prize: '$400' }
          ]
        },
        {
          month: 'July',
          winners: [
            { place: '1st', user: 'user 10', prize: '$2,200' },
            { place: '2nd', user: 'user 11', prize: '$1,100' },
            { place: '3rd', user: 'user 12', prize: '$550' }
          ]
        }
      ];
      raffleContent.innerHTML = '';
      raffleData.forEach((entry) => {
        const slide = document.createElement('div');
        slide.className = 'raffle-slide';
        const heading = document.createElement('h4');
        heading.textContent = entry.month;
        slide.appendChild(heading);
        const leaderboard = document.createElement('div');
        leaderboard.className = 'leaderboard';
        entry.winners.forEach((win) => {
          const card = document.createElement('div');
          card.className = 'place-card';
          const place = document.createElement('h5');
          place.textContent = win.place;
          card.appendChild(place);
          const user = document.createElement('p');
          user.innerHTML = `<strong>${win.user}</strong>`;
          card.appendChild(user);
          const prize = document.createElement('p');
          prize.textContent = win.prize;
          card.appendChild(prize);
          leaderboard.appendChild(card);
        });
        slide.appendChild(leaderboard);
        raffleContent.appendChild(slide);
      });
      let raffleIndex = 0;
      const maxRaffleIndex = raffleData.length - 1;
      function updateRaffleSlider() {
        raffleContent.style.transform = `translateX(-${raffleIndex * 100}%)`;
        rafflePrevBtn.disabled = raffleIndex <= 0;
        raffleNextBtn.disabled = raffleIndex >= maxRaffleIndex;
      }
      rafflePrevBtn.addEventListener('click', () => {
        if (raffleIndex > 0) {
          raffleIndex -= 1;
          updateRaffleSlider();
        }
      });
      raffleNextBtn.addEventListener('click', () => {
        if (raffleIndex < maxRaffleIndex) {
          raffleIndex += 1;
          updateRaffleSlider();
        }
      });
      // initial call after DOM has inserted slides
      setTimeout(updateRaffleSlider, 50);
    }
    // Asset breakdown row scroll
    const assetWrapper = document.getElementById('assetRowWrapper');
    const assetPrevBtn = document.querySelector('.asset-prev');
    const assetNextBtn = document.querySelector('.asset-next');
    if (assetWrapper && assetPrevBtn && assetNextBtn) {
      function updateAssetNav() {
        // update disabled states when scroll reaches ends
        const scrollLeft = assetWrapper.scrollLeft;
        const maxScroll = assetWrapper.scrollWidth - assetWrapper.clientWidth;
        assetPrevBtn.disabled = scrollLeft <= 0;
        assetNextBtn.disabled = scrollLeft >= maxScroll;
      }
      assetPrevBtn.addEventListener('click', () => {
        assetWrapper.scrollBy({ left: -200, behavior: 'smooth' });
        setTimeout(updateAssetNav, 200);
      });
      assetNextBtn.addEventListener('click', () => {
        assetWrapper.scrollBy({ left: 200, behavior: 'smooth' });
        setTimeout(updateAssetNav, 200);
      });
      // update nav states on scroll
      assetWrapper.addEventListener('scroll', updateAssetNav);
      setTimeout(updateAssetNav, 50);
    }
  }

  // Initialize treasury sliders
  initTreasurySliders();

  // Update positions progress every second (for 2 minute maturity).
  setInterval(() => {
    renderPositions();
  }, 1000);

  // ---------- Sign-up logic (multi-step form) ----------
  const signupWrapper = document.querySelector('.signup-wrapper');
  if (signupWrapper) {
    const steps = Array.from(signupWrapper.querySelectorAll('.step'));
    let currentStep = 0;
    const formData = {};
    // helper to show only the current step
    const showStep = (i) => {
      steps.forEach((step, idx) => {
        if (idx === i) {
          step.classList.add('active');
        } else {
          step.classList.remove('active');
        }
      });
    };
    showStep(currentStep);

    signupWrapper.addEventListener('click', (e) => {
      // handle next (including final finish) using closest to capture clicks on children
      const nextBtn = e.target.closest('.next-btn');
      const backBtn = e.target.closest('.back-btn');
      const petCard = e.target.closest('.pet-card');
      if (petCard) {
        signupWrapper.querySelectorAll('.pet-card').forEach((c) => c.classList.remove('selected'));
        petCard.classList.add('selected');
        formData.pet = petCard.dataset.pet;
      }
      if (backBtn) {
        e.preventDefault();
        if (currentStep > 0) {
          currentStep -= 1;
          showStep(currentStep);
        }
        return;
      }
      if (nextBtn) {
        e.preventDefault();
        // capture inputs in current step
        const active = steps[currentStep];
        const inputs = active.querySelectorAll('input, select');
        inputs.forEach((input) => {
          const key = input.id || input.name || input.placeholder;
          formData[key] = input.type === 'checkbox' ? input.checked : input.value;
        });
        // move to next step or finish
        if (currentStep < steps.length - 1) {
          currentStep += 1;
          showStep(currentStep);
        } else {
          // final step: create account
          const email = (formData.email || formData.Email || '').trim().toLowerCase();
          const password = (formData.password || formData['Create password'] || formData['create password'] || '').toString();
          if (!email || !password) {
            alert('Please provide a valid email and password to sign up.');
            return;
          }
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
            balance: 100000,
            positions: []
          };
          saveUsers(users);
          setCurrent(email);
          signupWrapper.innerHTML = `
            <h2>Welcome to Trove!</h2>
            <p>Thanks for signing up, ${formData.firstName || 'friend'}.</p>
            <p>Your account has been created on this device.</p>
            <div style="margin-top: 1rem;">
              <a href="index.html" class="primary-btn">Return home</a>
              <a href="positions.html" class="secondary-btn" style="margin-left: 0.5rem;">Go to positions</a>
            </div>
          `;
          // update portfolio bar now that a new user is created
          updatePortfolioBar();
        }
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
      // ensure default balance and positions array (migrating legacy portfolio)
      if (typeof user.balance !== 'number') user.balance = 100000;
      if (!Array.isArray(user.positions)) {
        // migrate legacy portfolio object if it exists
        if (user.portfolio && typeof user.portfolio === 'object') {
          user.positions = Object.keys(user.portfolio).map((k) => {
            const v = user.portfolio[k];
            return {
              id: Date.now() + Math.random(),
              name: k,
              quantity: v.quantity || 0,
              purchasePrice: livePrice(k, 0),
              purchaseDate: v.purchaseDate || Date.now()
            };
          });
          delete user.portfolio;
        } else {
          user.positions = [];
        }
      }
      // persist user if loaded from CSV
      const allUsers = getUsers();
      allUsers[email] = user;
      saveUsers(allUsers);
      setCurrent(email);
      // redirect to home page
      window.location.href = 'index.html';
    });
  }
});


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
      // ensure default balance and positions array (migrating legacy portfolio)
      if (typeof user.balance !== 'number') user.balance = 100000;
      if (!Array.isArray(user.positions)) {
        // migrate legacy portfolio object if it exists
        if (user.portfolio && typeof user.portfolio === 'object') {
          user.positions = Object.keys(user.portfolio).map((k) => {
            const v = user.portfolio[k];
            return {
              id: Date.now() + Math.random(),
              name: k,
              quantity: v.quantity || 0,
              purchasePrice: ASSET_LIST.find((a) => a.name === k)?.price || 0,
              purchaseDate: v.purchaseDate || Date.now()
            };
          });
          delete user.portfolio;
        } else {
          user.positions = [];
        }
      }
      // persist user if loaded from CSV
      const allUsers = getUsers();
      allUsers[email] = user;
      saveUsers(allUsers);
      setCurrent(email);
      // redirect to home page
      window.location.href = 'index.html';
    });
  }
});
