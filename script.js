/*
 * JavaScript for Trove landing page and signup flow
 */

// Basic sign‑up flow management
document.addEventListener('DOMContentLoaded', () => {
  const signupContainer = document.querySelector('.signup-wrapper');
  // Update navigation login button based on authentication status
  const loginLink = document.querySelector('.login-btn');
  const currentUser = localStorage.getItem('currentUser');
  if (loginLink) {
    if (currentUser) {
      // User is logged in – offer log out
      loginLink.textContent = 'log out';
      loginLink.href = '#';
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        // Reload the page to update nav
        window.location.href = 'index.html';
      });
    } else {
      // User not logged in – link to login page
      loginLink.href = 'login.html';
    }
  }
  // Only run sign‑up logic if signup container exists on this page
  if (signupContainer) {
    const steps = Array.from(signupContainer.querySelectorAll('.step'));
    let currentStep = 0;
    const formData = {};

    function showStep(index) {
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === index);
      });
    }

    showStep(currentStep);

    // Next button events
    signupContainer.addEventListener('click', (e) => {
      if (e.target.matches('.next-btn')) {
        // Collect input values from current step
        const activeStep = steps[currentStep];
        const inputs = activeStep.querySelectorAll('input, select');
        inputs.forEach((input) => {
          formData[input.id || input.name || input.placeholder] = input.value;
        });
        if (currentStep < steps.length - 1) {
          currentStep += 1;
          showStep(currentStep);
        } else {
          // All steps completed
          // Save user data to localStorage for demo purposes
          try {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            // Basic user object
            const user = {
              firstName: formData['firstName'] || formData['First name'] || '',
              surname: formData['surname'] || formData['Surname'] || '',
              email: formData['email'] || formData['Email'] || '',
              password: formData['password'] || formData['Password'] || '',
              phone: formData['phone'] || formData['Phone number'] || '',
              country: formData['country'] || formData['Country'] || '',
              currency: formData['currency'] || formData['Choose currency'] || '',
              pet: formData['pet'] || ''
            };
            users.push(user);
            localStorage.setItem('users', JSON.stringify(users));
            // Set current user (use email as identifier)
            localStorage.setItem('currentUser', user.email);
          } catch (err) {
            console.error('Error storing user data', err);
          }
          // Display success message or redirect back to home
          signupContainer.innerHTML = `<h2>Welcome to Trove!</h2><p>Thanks for signing up, ${formData['firstName'] || formData['First name']}!</p><p>We’re excited to have you on board.</p><a href="index.html" class="primary-btn">Return to home</a>`;
        }
      }

  // Login form handling
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      const errorEl = document.getElementById('loginError');
      if (!emailInput || !passwordInput) return;
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const matchedUser = users.find((u) => u.email === email && u.password === password);
      if (matchedUser) {
        localStorage.setItem('currentUser', matchedUser.email);
        // Redirect to home page after successful login
        window.location.href = 'index.html';
      } else {
        if (errorEl) {
          errorEl.textContent = 'Invalid email or password.';
        }
      }
    });
  }
      // Back button events
      if (e.target.matches('.back-btn')) {
        if (currentStep > 0) {
          currentStep -= 1;
          showStep(currentStep);
        }
      }
      // Pet card selection
      if (e.target.closest('.pet-card')) {
        const card = e.target.closest('.pet-card');
        // Toggle selection for single choice
        signupContainer.querySelectorAll('.pet-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        formData['pet'] = card.dataset.pet;
      }
    });
  }
});