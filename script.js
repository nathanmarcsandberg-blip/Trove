/*
 * JavaScript for Trove landing page and signup flow
 */

// Basic sign‑up flow management
document.addEventListener('DOMContentLoaded', () => {
  const signupContainer = document.querySelector('.signup-wrapper');
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
          // Display success message or redirect back to home
          signupContainer.innerHTML = `<h2>Welcome to Trove!</h2><p>Thanks for signing up, ${formData['firstName'] || formData['First name']}!</p><p>We’re excited to have you on board.</p><a href="index.html" class="primary-btn">Return to home</a>`;
        }
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