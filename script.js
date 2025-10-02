
/*
 * Trove – Client-side proof-of-concept authentication and sign-up flow.
 * Reads LIVE assets from window.ASSET_LIST populated by data-prices.js.
 * Demo-only; not for production.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Local persistence helpers ----------
  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('troveUsers')) || {}; } catch { return {}; }
  };
  const saveUsers = (users) => { localStorage.setItem('troveUsers', JSON.stringify(users)); };
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

  // ---------- Update hero CTA ----------
  (function updateHeroCta() {
    const heroBtn = document.querySelector('.hero .primary-btn');
    if (!heroBtn) return;
    const current = getCurrent();
    if (current) {
      heroBtn.textContent = 'my portfolio';
      heroBtn.setAttribute('href', 'positions.html');
    } else {
      heroBtn.textContent = 'Join';
      heroBtn.setAttribute('href', 'signup.html');
    }
  })();

  // ---------- LIVE asset helpers ----------
  const liveAssets = () => Array.isArray(window.ASSET_LIST) ? window.ASSET_LIST : [];
  const liveAssetByName = (n) => liveAssets().find(a => a.name === n);
  const livePrice = (n, fb=0) => {
    const a = liveAssetByName(n);
    const p = a ? Number(a.price) : NaN;
    return Number.isFinite(p) ? p : fb;
  };

  // ---------- Portfolio sticky bar ----------
  function updatePortfolioBar() {
    const bar = document.getElementById('portfolioBar');
    if (!bar) return;
    const user = getCurrentUser();
    if (!user) { bar.style.display='none'; document.body.style.paddingBottom=''; return; }
    let portfolioValue = 0;
    (user.positions||[]).forEach(pos => { portfolioValue += pos.quantity * livePrice(pos.name, pos.purchasePrice); });
    const available = typeof user.balance==='number' ? user.balance : 0;
    const accountValue = available + portfolioValue;
    const return24h = (Math.random()*6-3).toFixed(2);
    const returnColor = return24h>=0 ? '#009900' : '#cc0000';
    bar.innerHTML = `
      <div class="portfolio-section"><a href="positions.html" class="portfolio-link">my portfolio</a></div>
      <div class="portfolio-section"><div style="font-weight:600;">24hrs</div><div style="color:${returnColor}; font-size:1.4rem; font-weight:600;">${return24h}%</div></div>
      <div class="portfolio-section">
        <div style="font-weight:600;">account value</div>
        <div class="portfolio-value">$${accountValue.toFixed(2)}</div>
        <div style="font-size:0.8rem; color:var(--color-grey)">avail $${available.toFixed(2)} + port $${portfolioValue.toFixed(2)}</div>
      </div>
      <div class="portfolio-section"><div style="font-weight:600;">last month's yield</div><div style="font-size:1.4rem; font-weight:600;">+$${(portfolioValue*0.01).toFixed(2)}</div></div>
    `;
    bar.style.display='flex';
    document.body.style.paddingBottom='80px';
  }

  // ---------- Account page ----------
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
      valueEl.textContent = '$0.00';
      if (dividendsEl) dividendsEl.textContent = '$0.00';
      if (extraEl) extraEl.textContent = '$0.00';
      if (treasuryEl) treasuryEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      return;
    }
    let totalValue = 0;
    (user.positions||[]).forEach(pos => { totalValue += pos.quantity * livePrice(pos.name, pos.purchasePrice); });
    valueEl.textContent = `$${totalValue.toFixed(2)}`;
    if (dividendsEl) dividendsEl.textContent = `$${(totalValue*0.008).toFixed(2)}`;
    if (extraEl) dividendsEl.textContent = `$${(totalValue*0.003).toFixed(2)}`;
    if (treasuryEl) dividendsEl.textContent = `$${(totalValue*0.005).toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${(totalValue*0.016).toFixed(2)}`;
  }

  // ---------- Positions page with sorting ----------
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
    if (balanceEl) { balanceEl.textContent = `Available balance: $${user.balance.toFixed(2)}`; }
    let positions = (user.positions||[]).filter(p => p.quantity>0);
    if (!positions.length) {
      container.innerHTML = '<p style="text-align:center;">You don\'t have any positions yet. Visit the <a href="assets.html">Assets</a> page to start investing.</p>';
      return;
    }
    // Sorting logic
    const sortSelect = document.getElementById('sortSelect');
    const mode = sortSelect ? sortSelect.value : 'date';
    positions.sort((a,b) => {
      if (mode==='date') return a.purchaseDate - b.purchaseDate;
      if (mode==='name') return a.name.localeCompare(b.name);
      if (mode==='value') {
        const valA=a.quantity*livePrice(a.name,a.purchasePrice);
        const valB=b.quantity*livePrice(b.name,b.purchasePrice);
        return valB-valA;
      }
      return 0;
    });
    // Render cards
    let html = '';
    positions.forEach(pos=>{
      const name=pos.name;
      const price=pos.purchasePrice;
      const quantity=pos.quantity;
      const total=price*quantity;
      html += `<div class="position-card">
        <div class="card-main">
          <div class="card-left">
            <div>Price: $${price.toFixed(2)}</div>
            <div>Units: ${quantity}</div>
            <div>Total: $${total.toFixed(2)}</div>
          </div>
          <div class="card-right">
            <h3 class="asset-name">${name}</h3>
          </div>
        </div>
      </div>`;
    });
    container.innerHTML=html;
    updatePortfolioBar();
  }

  // ---------- User helpers ----------
  function getCurrentUser() {
    const users = getUsers();
    const current = getCurrent();
    if (current && users[current]) return users[current];
    return null;
  }
  function saveCurrentUser(user){const users=getUsers();users[user.email]=user;saveUsers(users);}

  // ---------- Initial render ----------
  renderPositions();
  renderAccount();
  updatePortfolioBar();

  // Attach sort change
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) { sortSelect.addEventListener('change', renderPositions); }
});
