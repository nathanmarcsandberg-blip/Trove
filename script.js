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
      loginBtn.textContent = 'log out';
      loginBtn.href = '#';
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
          clearCurrent();
          window.location.href = 'index.html';
        }
      });
    } else {
      loginBtn.textContent = 'log in';
      if (!loginBtn.getAttribute('href') || loginBtn.getAttribute('href') === '#') {
        loginBtn.setAttribute('href', 'login.html');
      }
    }
  }

  // ---------- Update hero call-to-action ----------
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

  // ---------- LIVE ASSET helpers ----------
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
      document.body.style.paddingBottom = '';
      return;
    }
    let portfolioValue = 0;
    if (Array.isArray(user.positions)) {
      user.positions.forEach((pos) => {
        const price = livePrice(pos.name, pos.purchasePrice);
        portfolioValue += pos.quantity * price;
      });
    }
    const available = typeof user.balance === 'number' ? user.balance : 0;
    const accountValue = available + portfolioValue;
    const portfolioStr = portfolioValue.toFixed(2);
    const availableStr = available.toFixed(2);
    const accountStr = accountValue.toFixed(2);
    const return24h = (Math.random() * 6 - 3).toFixed(2);
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
    document.body.style.paddingBottom = '80px';
  }

  // ---------- Account page rendering ----------
  function renderAccount() {
    const valueEl = document.getElementById('accountValue');
    if (!valueEl) return;
    const user = getCurrentUser();
    const chartContainer = document.getElementById('accountChart');
    const dividendsEl = document.getElementById('dividendsEarned');
    const extraEl = document.getElementById('extraDividends');
    const treasuryEl = document.getElementById('treasuryYields');
    const totalEl = document.getElementById('totalReturns');
    if (!user) {
      if (chartContainer) chartContainer.textContent = 'Please log in to view account details.';
      if (valueEl) valueEl.textContent = '$0.00';
      if (dividendsEl) dividendsEl.textContent = '$0.00';
      if (extraEl) extraEl.textContent = '$0.00';
      if (treasuryEl) treasuryEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      return;
    }
    let totalValue = 0;
    if (Array.isArray(user.positions)) {
      user.positions.forEach((pos) => {
        const price = livePrice(pos.name, pos.purchasePrice);
        totalValue += pos.quantity * price;
      });
    }
    valueEl.textContent = `$${totalValue.toFixed(2)}`;
    const dividends = totalValue * 0.008;
    const extra = totalValue * 0.003;
    const treasury = totalValue * 0.005;
    const total = dividends + extra + treasury;
    if (dividendsEl) dividendsEl.textContent = `$${dividends.toFixed(2)}`;
    if (extraEl) extraEl.textContent = `$${extra.toFixed(2)}`;
    if (treasuryEl) treasuryEl.textContent = `$${treasury.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  }

  // ---------- Utility functions ----------
  function getCurrentUser() {
    const users = getUsers();
    const current = getCurrent();
    if (current && users[current]) {
      const u = users[current];
      if (typeof u.balance !== 'number') u.balance = 100000;
      if (!Array.isArray(u.positions)) u.positions = [];
      return u;
    }
    return null;
  }
  function saveCurrentUser(user) {
    const users = getUsers();
    users[user.email] = user;
    saveUsers(users);
  }

  // ---------- Render assets ----------
  function renderAssetsList() {
    const container = document.getElementById('assetsList');
    if (!container) return;
    const user = getCurrentUser();
    const filtered = liveAssets();
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

  // ---------- Render positions ----------
  function renderPositions() {
    const container = document.getElementById('positionsContainer');
    if (!container) return;
    const user = getCurrentUser();
    if (!user) {
      container.innerHTML = '<p>Please log in to view your portfolio.</p>';
      return;
    }
    const positions = Array.isArray(user.positions) ? user.positions : [];
    if (positions.length === 0) {
      container.innerHTML = '<p>No positions yet.</p>';
      return;
    }
    let html = '';
    positions.forEach((pos) => {
      const name = pos.name;
      const quantity = pos.quantity;
      const price = pos.purchasePrice;
      const total = price * quantity;
      html += `<div>${name}: ${quantity} units @ $${price} = $${total}</div>`;
    });
    container.innerHTML = html;
  }

  // ---------- Initial render ----------
  renderAssetsList();
  renderPositions();
  updatePortfolioBar();
  renderAccount();
});
