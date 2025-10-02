/*
 * Trove – Client-side proof-of-concept authentication and sign-up flow.
 * Reads LIVE assets from window.ASSET_LIST populated by data-prices.js
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
    const dividends = totalValue*0.008, extra=totalValue*0.003, treasury=totalValue*0.005;
    if (dividendsEl) dividendsEl.textContent = `$${dividends.toFixed(2)}`;
    if (extraEl) extraEl.textContent = `$${extra.toFixed(2)}`;
    if (treasuryEl) treasuryEl.textContent = `$${treasury.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${(dividends+extra+treasury).toFixed(2)}`;
  }

  // ---------- User helpers ----------
  function getCurrentUser() {
    const users = getUsers(); const current = getCurrent();
    if (current && users[current]) {
      const u = users[current];
      if (typeof u.balance !== 'number') u.balance = 100000;
      if (!Array.isArray(u.positions)) u.positions = [];
      return u;
    }
    return null;
  }
  function saveCurrentUser(user){ const users = getUsers(); users[user.email]=user; saveUsers(users); }

  // ---------- Assets (card list) ----------
  let currentSearchQuery=''; let selectedCategory='all';
  function renderAssetsList() {
    const container = document.getElementById('assetsList');
    if (!container) return;
    const user = getCurrentUser();
    const q = currentSearchQuery.trim().toLowerCase();
    let rows = liveAssets().filter(a => a.name.toLowerCase().includes(q));
    if (selectedCategory && selectedCategory!=='all') rows = rows.filter(a => a.class===selectedCategory);
    let html='';
    rows.forEach(asset => {
      const holdings = (user?.positions||[]).filter(p=>p.name===asset.name);
      const has = holdings.length>0;
      const price = Number(asset.price)||0;
      const meta = (price?`$${price.toFixed(2)}`:'—') + (asset.yield?` - <span class="yield-percent">${asset.yield}</span>`:'');
      html += `<div class="asset-card">
        <div class="asset-logo">logo</div>
        <button class="asset-action asset-sell-btn ${has?'':'disabled'}" data-action="sell" data-name="${asset.name}" data-price="${price}">sell</button>
        <div class="asset-info"><span class="asset-name">${asset.name}</span><span class="asset-meta">${meta}</span></div>
        <button class="asset-action asset-buy-btn" data-action="buy" data-name="${asset.name}" data-price="${price}">${has?'buy more':'buy'}</button>
      </div>`;
    });
    container.innerHTML = html;
    updatePortfolioBar();
  }
  window.renderAssetsList = renderAssetsList; // allow pricing layer to trigger re-render

  // ---------- Positions ----------
  function renderPositions(){
    const container = document.getElementById('positionsContainer');
    if (!container) return;
    const user = getCurrentUser();
    if (!user) { container.innerHTML='<p>Please log in to view your portfolio.</p>'; return; }
    const positions = (user.positions||[]).filter(p=>p.quantity>0);
    if (!positions.length){ container.innerHTML='<p>You don\\'t have any positions yet. Visit the <a href="assets.html">Assets</a> page to start investing.</p>'; return; }
    let html='';
    positions.forEach(pos=>{
      const total = pos.quantity * pos.purchasePrice;
      html += `<div class="position-card">
        <div class="card-main">
          <div class="card-left">
            <div>Price: $${pos.purchasePrice.toFixed(2)}</div>
            <div>Units: ${pos.quantity}</div>
            <div>Total: $${total.toFixed(2)}</div>
          </div>
          <div class="card-right">
            <div class="card-top">
              <h3 class="asset-name">${pos.name}</h3>
              <div class="return-24h" style="color:#009900;">${(Math.random()*6-3).toFixed(2)}% <span style="font-size:0.85rem; color:#666;">(24h)</span></div>
            </div>
          </div>
        </div>
        <div class="position-actions">
          <button class="position-action sell" data-action="sell" data-name="${pos.name}" data-price="${pos.purchasePrice}" data-id="${pos.id}">Sell</button>
          <button class="position-action buy-more" data-action="buy" data-name="${pos.name}" data-price="${livePrice(pos.name, pos.purchasePrice)}">Buy More</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    updatePortfolioBar();
  }

  // ---------- Click handlers (buy/sell) ----------
  document.body.addEventListener('click', (e) => {
    const assetBtn = e.target.closest('.asset-action');
    if (assetBtn) {
      if (assetBtn.classList.contains('disabled')) { alert("You don't own this asset."); return; }
      const action = assetBtn.dataset.action;
      const name = assetBtn.dataset.name;
      const price = parseFloat(assetBtn.dataset.price||'0');
      const user = getCurrentUser();
      if (!user) { alert('Please log in to perform this action.'); return; }
      if (action === 'buy') {
        const quantity = parseFloat(prompt(`How many of ${name} would you like to buy?`)||'0');
        if (!quantity || quantity<=0) return;
        const cost = price * quantity;
        if (user.balance < cost) { alert('Insufficient balance.'); return; }
        user.balance -= cost;
        user.positions = user.positions || [];
        user.positions.push({ id: Date.now()+Math.random(), name, quantity, purchasePrice: price, purchaseDate: Date.now() });
        saveCurrentUser(user);
        renderAssetsList(); renderPositions();
      } else if (action === 'sell') {
        const positions = (user.positions||[]).filter(p=>p.name===name);
        if (!positions.length){ alert('You do not own any of this asset.'); return; }
        const totalQty = positions.reduce((s,p)=>s+p.quantity,0);
        const sellQty = parseFloat(prompt(`You own ${totalQty} of ${name}. How many would you like to sell?`)||'0');
        if (!sellQty || sellQty<=0) return;
        if (sellQty > totalQty) { alert('You do not own that many units.'); return; }
        let remaining = sellQty, revenue = 0;
        for (const pos of user.positions) {
          if (pos.name !== name || remaining<=0) continue;
          const d = Math.min(pos.quantity, remaining);
          revenue += d * pos.purchasePrice;
          pos.quantity -= d;
          remaining -= d;
        }
        user.positions = user.positions.filter(p=>p.quantity>0);
        user.balance += revenue;
        saveCurrentUser(user);
        renderAssetsList(); renderPositions();
      }
    }

    const posBtn = e.target.closest('.position-action');
    if (posBtn) {
      const action = posBtn.dataset.action;
      const name   = posBtn.dataset.name;
      const price  = parseFloat(posBtn.dataset.price||'0');
      const user = getCurrentUser();
      if (!user){ alert('Please log in.'); return; }
      if (action === 'buy') {
        const quantity = parseFloat(prompt(`How many of ${name} would you like to buy?`)||'0');
        if (!quantity || quantity<=0) return;
        const cost = price * quantity;
        if (user.balance < cost) { alert('Insufficient balance.'); return; }
        user.balance -= cost;
        user.positions.push({ id: Date.now()+Math.random(), name, quantity, purchasePrice: price, purchaseDate: Date.now() });
        saveCurrentUser(user);
        renderAssetsList(); renderPositions();
      } else if (action === 'sell') {
        const posId = posBtn.dataset.id;
        if (posId) {
          const position = (user.positions||[]).find(p=>String(p.id)===String(posId));
          if (!position){ alert('Position not found.'); return; }
          const sellQty = parseFloat(prompt(`You own ${position.quantity} of ${position.name}. How many would you like to sell?`)||'0');
          if (!sellQty || sellQty<=0) return;
          if (sellQty > position.quantity){ alert('You do not own that many units in this position.'); return; }
          user.balance += sellQty * position.purchasePrice;
          position.quantity -= sellQty;
          if (position.quantity===0) user.positions = user.positions.filter(p=>String(p.id)!==String(posId));
          saveCurrentUser(user);
          renderAssetsList(); renderPositions();
        }
      }
    }
  });

  // ---------- Search & filters ----------
  const searchEl = document.getElementById('assetSearch');
  if (searchEl) searchEl.addEventListener('input', () => { currentSearchQuery = searchEl.value; renderAssetsList(); });
  const categoryEls = document.querySelectorAll('.category-btn, .pill');
  if (categoryEls.length) {
    categoryEls.forEach(btn => btn.addEventListener('click', () => {
      selectedCategory = btn.getAttribute('data-category') || btn.getAttribute('data-cat') || 'all';
      categoryEls.forEach(b => b.classList.remove('active')); btn.classList.add('active');
      renderAssetsList();
    }));
  }

  // ---------- Initial paint ----------
  renderAssetsList();
  renderPositions();
  updatePortfolioBar();
  renderAccount();

  // ---------- Login page handling ----------
  const loginForm = document.getElementById('loginForm') || document.querySelector('form#loginForm');
  if (loginForm) {
    const emailEl = document.getElementById('loginEmail') || loginForm.querySelector('input[type="email"]');
    const passEl  = document.getElementById('loginPassword') || loginForm.querySelector('input[type="password"]');
    const errorEl = document.getElementById('loginError') || loginForm.querySelector('.error-message');

    async function fetchCsvUsers() {
      try {
        const res = await fetch('users.csv', { cache: 'no-store' });
        if (!res.ok) return {};
        const text = await res.text();
        const lines = text.trim().split(/\\r?\\n/);
        const header = (lines.shift()||'').split(',').map(h=>h.trim().toLowerCase());
        const idx = { email: header.indexOf('email'), password: header.indexOf('password'), firstname: header.indexOf('firstname'), surname: header.indexOf('surname') };
        const out = {};
        for (const line of lines) {
          const cols = line.split(',');
          const email = (cols[idx.email]||'').trim().toLowerCase();
          if (!email) continue;
          out[email] = { email, password: (cols[idx.password]||'').trim(), firstName: cols[idx.firstname]||'', surname: cols[idx.surname]||'' };
        }
        return out;
      } catch { return {}; }
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (emailEl?.value||'').trim().toLowerCase();
      const password = passEl?.value || '';
      if (!email || !password) {
        if (errorEl) { errorEl.textContent='Please enter your email and password.'; errorEl.style.display='block'; }
        return;
      }
      const users = getUsers();
      let user = users[email];
      if (!user) { const csvUsers = await fetchCsvUsers(); user = csvUsers[email]; }
      if (!user || user.password !== password) {
        if (errorEl) { errorEl.textContent='Invalid email or password.'; errorEl.style.display='block'; } else { alert('Invalid email or password.'); }
        return;
      }
      if (typeof user.balance!=='number') user.balance=100000;
      if (!Array.isArray(user.positions)) user.positions = [];
      const allUsers = getUsers(); allUsers[email]=user; saveUsers(allUsers);
      setCurrent(email);
      window.location.href='index.html';
    });
  }
}); // <— single, final close only
