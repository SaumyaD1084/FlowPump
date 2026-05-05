let pumpData = null;

// DOM Elements
const form = document.getElementById('pump-form');
const flowInput = document.getElementById('flow');
const headInput = document.getElementById('head');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');
const spinner = document.getElementById('loading-spinner');
const btnText = submitBtn.querySelector('span');
const resultsContainer = document.getElementById('results-container');
const resultsContent = document.getElementById('results-content');
const errorMessage = document.getElementById('error-message');
const themeToggle = document.getElementById('theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');

// Load JSON data
async function loadData() {
  try {
    // Added a cache-busting timestamp so the browser always loads the newest pumps.json
    const response = await fetch('pumps.json?t=' + new Date().getTime());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    pumpData = await response.json();
  } catch (error) {
    showError("Failed to load pump data. Please ensure 'pumps.json' is available.");
    console.error("Error loading data:", error);
    submitBtn.disabled = true;
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  // Theme check
  if (localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
  }
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    moonIcon.classList.remove('hidden');
    sunIcon.classList.add('hidden');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
  }
});

// Reset logic
form.addEventListener('reset', () => {
  hideResults();
  hideError();
});

// Main Search Logic
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (!pumpData) {
    showError("Data not loaded yet. Please wait.");
    return;
  }

  // Get raw inputs
  const rawFlow = flowInput.value.trim();
  const rawHead = headInput.value.trim();

  // If input is empty: Show validation error
  if (rawFlow === '' || rawHead === '') {
    showError("Please enter both flow and head values.");
    return;
  }

  const inputFlow = parseFloat(rawFlow);
  const inputHead = parseFloat(rawHead);

  if (isNaN(inputFlow) || isNaN(inputHead)) {
    showError("Please enter valid numbers for flow and head.");
    return;
  }

  // UI state update
  setLoading(true);
  hideResults();
  hideError();

  // Simulate slight processing time for UX (smooth transitions)
  setTimeout(() => {
    try {
      const candidate = findBestPump(pumpData, inputFlow, inputHead);
      
      if (!candidate) {
        showError("No suitable pump found");
      } else {
        displayResults(candidate);
      }
    } catch (err) {
      showError("An error occurred during selection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, 400);
});

// The Exact Final JS Function
function findBestPump(data, inputFlow, inputHead) {
  let candidates = [];

  for (const series in data) {
    const flow = data[series].flow;
    const products = data[series].data;

    const maxFlow = Math.max(...flow);
    const minFlow = Math.min(...flow);

    // Skip series that cannot handle the flow
    if (inputFlow > maxFlow || inputFlow < minFlow) {
      continue;
    }

    let index = -1;

    // Handle both ascending and descending flows
    for (let i = 0; i < flow.length - 1; i++) {
      const f1 = flow[i];
      const f2 = flow[i + 1];

      if (
        (inputFlow >= f1 && inputFlow <= f2) ||
        (inputFlow >= f2 && inputFlow <= f1)
      ) {
        index = i;
        break;
      }
    }

    // If not found, use closest flow index
    if (index === -1) {
      let minDiff = Infinity;
      for (let i = 0; i < flow.length; i++) {
        const diff = Math.abs(flow[i] - inputFlow);
        if (diff < minDiff) {
          minDiff = diff;
          index = i;
        }
      }
    }

    console.log("Series:", series);
    console.log("Flow array:", flow);
    console.log("Selected index:", index);

    if (index === -1) continue;

    // Step 2: Check all products
    for (const p of products) {
      const head = p.values[index];

      if (head >= inputHead) {
        candidates.push({
          product: p.product,
          hp: p.hp,
          series: series
        });
      }
    }
  }

  // Step 3: Pick lowest HP
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.hp - b.hp);

  return candidates[0];
}

function displayResults(candidate) {
  resultsContent.innerHTML = '';
  
  const card = document.createElement('div');
  card.className = `result-card best-match`;
  
  const badgeHtml = `<div class="best-badge">Best Match</div>`;
  
  // Display: Product Code, HP, Pump Series
  card.innerHTML = `
    ${badgeHtml}
    <h3>${candidate.product}</h3>
    <div class="result-details">
      <span><strong>HP</strong> ${candidate.hp}</span>
      <span><strong>Series</strong> ${candidate.series}</span>
    </div>
  `;
  
  resultsContent.appendChild(card);
  resultsContainer.classList.remove('hidden');
}

function setLoading(isLoading) {
  if (isLoading) {
    submitBtn.disabled = true;
    btnText.textContent = 'Searching...';
    spinner.classList.remove('hidden');
  } else {
    submitBtn.disabled = false;
    btnText.textContent = 'Find Pump';
    spinner.classList.add('hidden');
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function hideResults() {
  resultsContainer.classList.add('hidden');
}
