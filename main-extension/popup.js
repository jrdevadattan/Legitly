const VT_RADIUS = 50;
const GSB_RADIUS = 34;
const VT_CIRC = 2 * Math.PI * VT_RADIUS;
const GSB_CIRC = 2 * Math.PI * GSB_RADIUS;

const elements = {
  loadingState: document.getElementById('loadingState'),
  contentState: document.getElementById('contentState'),
  scoreValue: document.getElementById('scoreValue'),
  vtProgress: document.getElementById('vtProgress'),
  gsbProgress: document.getElementById('gsbProgress'),
  ringWrapper: document.getElementById('ringWrapper'),
  ringTooltip: document.getElementById('ringTooltip'),
  gsbScoreText: document.getElementById('gsbScoreText'),
  vtScoreText: document.getElementById('vtScoreText'),
  domainValue: document.getElementById('domainValue'),
  httpsValue: document.getElementById('httpsValue'),
  lastCheckedValue: document.getElementById('lastCheckedValue'),
  autoToggle: document.getElementById('autoToggle'),
  recheckBtn: document.getElementById('recheckBtn'),
  reportBtn: document.getElementById('reportBtn')
};

function calculateScores(rawResponse) {
  if (!Array.isArray(rawResponse) || rawResponse.length < 2) {
    return { totalScore: 50, gsbScore: 50, vtScore: 50 };
  }
  
  const safeBrowsing = rawResponse[0] || {};
  const virusTotal = rawResponse[1] || {};
  
  let totalScore = 100;
  let gsbScore = 100;
  let vtScore = 100;
  
  if (safeBrowsing.matches && safeBrowsing.matches.length > 0) {
    totalScore -= 50;
    gsbScore = 0;
  } else {
    gsbScore = 100;
  }
  
  if (virusTotal.data && virusTotal.data.attributes) {
    const stats = virusTotal.data.attributes.stats;
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const total = malicious + suspicious + (stats.harmless || 0) + (stats.undetected || 0);
    
    if (total > 0) {
      const threatPercentage = ((malicious + suspicious) / total) * 100;
      totalScore -= Math.min(40, threatPercentage * 0.4);
      const safePct = ((stats.harmless || 0) + (stats.undetected || 0)) / total * 100;
      vtScore = Math.round(safePct);
    }
  }
  
  totalScore = Math.max(0, Math.round(totalScore));
  gsbScore = Math.max(0, Math.round(gsbScore));
  vtScore = Math.max(0, Math.round(vtScore));
  return { totalScore, gsbScore, vtScore };
}

function renderRings(gsbScore, vtScore) {
  const vtLen = Math.max(0, Math.min(100, vtScore)) / 100 * VT_CIRC;
  const gsbLen = Math.max(0, Math.min(100, gsbScore)) / 100 * GSB_CIRC;
  
  elements.vtProgress.style.strokeDasharray = `${vtLen} ${VT_CIRC}`;
  elements.vtProgress.style.strokeDashoffset = 0;
  
  elements.gsbProgress.style.strokeDasharray = `${gsbLen} ${GSB_CIRC}`;
  elements.gsbProgress.style.strokeDashoffset = 0;
}

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function render(entry) {
  if (!entry || !entry.data) {
    elements.loadingState.classList.remove('hidden');
    elements.contentState.classList.add('hidden');
    return;
  }
  
  elements.loadingState.classList.add('hidden');
  elements.contentState.classList.remove('hidden');
  
  const { raw, parsed, scores } = entry.data;
  const computed = scores || calculateScores(raw);
  
  elements.scoreValue.textContent = computed.totalScore;
  renderRings(computed.gsbScore, computed.vtScore);
  elements.gsbScoreText.textContent = `${computed.gsbScore}%`;
  elements.vtScoreText.textContent = `${computed.vtScore}%`;
  
  // Domain
  elements.domainValue.textContent = entry.domain || '--';
  
  const isHttps = entry.url && entry.url.startsWith('https://');
  elements.httpsValue.textContent = 'List Item'; // Placeholder as per design
  
  elements.lastCheckedValue.textContent = entry.checkedAt 
    ? formatTimestamp(entry.checkedAt) 
    : '--';
  
  console.log('[Popup] Rendered:', { totalScore: computed.totalScore, raw, parsed });
}

async function loadData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getTabData' });
    if (response.error) {
      console.error('[Popup] Error:', response.error);
      return;
    }
    render(response.entry);
  } catch (err) {
    console.error('[Popup] Load failed:', err);
  }
}

elements.recheckBtn.addEventListener('click', async () => {
  elements.loadingState.classList.remove('hidden');
  elements.contentState.classList.add('hidden');
  
  await chrome.runtime.sendMessage({ action: 'refreshCurrentTab' });
  
  setTimeout(loadData, 1500);
});

elements.reportBtn.addEventListener('click', () => {
  chrome.tabs.create({ 
    url: 'https://github.com/your-org/legitly/issues/new?template=false_positive.md' 
  });
});

elements.autoToggle.addEventListener('click', () => {
  const currentlyActive = elements.autoToggle.classList.contains('active');
  const nextState = !currentlyActive;
  
  elements.autoToggle.classList.toggle('active', nextState);
  elements.autoToggle.setAttribute('aria-pressed', String(nextState));
  const toggleLabelEl = document.getElementById('toggleLabel');
  if (toggleLabelEl) toggleLabelEl.textContent = nextState ? 'ON' : 'OFF';
  const content = document.getElementById('contentState');
  if (content) content.classList.toggle('disabled', !nextState);
  
  chrome.storage.local.set({ autoCheckEnabled: nextState });
  console.log('[Popup] Auto-check:', nextState ? 'ON' : 'OFF');
});

(async function init() {
  const settings = await chrome.storage.local.get(['autoCheckEnabled']);
  const autoEnabled = settings.autoCheckEnabled !== false; // Default true
  const toggleLabelEl = document.getElementById('toggleLabel');
  elements.autoToggle.classList.toggle('active', autoEnabled);
  elements.autoToggle.setAttribute('aria-pressed', String(autoEnabled));
  if (toggleLabelEl) toggleLabelEl.textContent = autoEnabled ? 'ON' : 'OFF';
  const content = document.getElementById('contentState');
  if (content) content.classList.toggle('disabled', !autoEnabled);
  
  loadData();
  
  elements.ringWrapper.addEventListener('mouseenter', () => {
    elements.ringTooltip.style.display = 'block';
  });
  elements.ringWrapper.addEventListener('mouseleave', () => {
    elements.ringTooltip.style.display = 'none';
  });
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      console.log('[Popup] Storage changed, reloading...');
      loadData();
    }
  });
})();
