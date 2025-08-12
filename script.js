/*
 * Trove MVP script
 * Simulates changing 24h return percentage for the position card.
 */

function simulateReturn() {
  const percentEl = document.getElementById('return-percent');
  if (!percentEl) return;
  let current = parseFloat(percentEl.textContent);
  // update every 5 seconds
  setInterval(() => {
    // random change between -0.5 and +0.5 percentage points
    const change = (Math.random() - 0.5) * 1;
    let newVal = current + change;
    // clamp to -10% to +10%
    newVal = Math.max(-10, Math.min(10, newVal));
    current = newVal;
    const sign = newVal >= 0 ? '+' : '';
    percentEl.textContent = `${sign}${newVal.toFixed(2)}%`;
    // color update
    if (newVal >= 0) {
      percentEl.style.color = '#059669';
    } else {
      percentEl.style.color = '#dc2626';
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  simulateReturn();
});