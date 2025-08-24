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
            pet: formData.pet || ''
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
      setCurrent(email);
      // redirect to home page
      window.location.href = 'index.html';
    });
  }
});