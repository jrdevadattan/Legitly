// Phishing Detector - Background Service Worker
// Listens for navigation events and sends URL to n8n webhook
// Stores response keyed by tabId in chrome.storage.local

const N8N_WEBHOOK_URL = 'https://rethu.app.n8n.cloud/webhook/phish-check';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function postToWebhook(url) {
  const rawBody = `{\r\n  \"url\": \"${url}\"\r\n}`;
  const resp = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: rawBody
  });
  if (!resp.ok) throw new Error(`Webhook HTTP ${resp.status}`);
  const rawResponse = await resp.json();
  const parsed = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;
  return { rawResponse, parsed };
}

function calculateScores(rawResponse) {
  // Response format: [safeBrowsing, virusTotal, metadata]
  let totalScore = 100;
  let gsbScore = 100;
  let vtScore = 100;

  const safeBrowsing = Array.isArray(rawResponse) ? (rawResponse[0] || {}) : {};
  const virusTotal = Array.isArray(rawResponse) ? (rawResponse[1] || {}) : {};

  // Google Safe Browsing: empty {} means safe; any matches => unsafe
  if (safeBrowsing && safeBrowsing.matches && safeBrowsing.matches.length > 0) {
    totalScore -= 50;
    gsbScore = 0;
  } else {
    gsbScore = 100;
  }

  // VirusTotal stats scoring using provided structure
  const stats = virusTotal?.data?.attributes?.stats || {};
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const harmless = stats.harmless || 0;
  const undetected = stats.undetected || 0;
  const total = malicious + suspicious + harmless + undetected;

  if (total > 0) {
    // vtScore = percentage of non-threatening findings
    vtScore = Math.round(((harmless + undetected) / total) * 100);
    // Total score penalty up to 40 based on threat ratio
    const threatRatio = (malicious + suspicious) / total;
    totalScore -= Math.min(40, Math.round(threatRatio * 100) * 0.4);
  }

  totalScore = Math.max(0, Math.round(totalScore));
  gsbScore = Math.max(0, Math.round(gsbScore));
  vtScore = Math.max(0, Math.round(vtScore));

  let status = 'SAFE';
  if (totalScore < 30) status = 'DANGEROUS';
  else if (totalScore < 60) status = 'SUSPICIOUS';
  else if (totalScore < 80) status = 'CAUTION';

  return { totalScore, gsbScore, vtScore, status };
}

function isFresh(entry) {
  return entry && entry.checkedAt && (Date.now() - new Date(entry.checkedAt).getTime()) < CACHE_TTL_MS;
}

async function handleCheck(tabId, url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Use promise-based storage API
    const store = await chrome.storage.local.get([String(tabId)]);
    const existing = store[String(tabId)];
    
    // Check if cache is fresh AND URL hasn't changed
    if (existing && isFresh(existing) && existing.url === url) {
      console.log('Using cached result for tab', tabId, url);
      updateBadge(tabId, existing.data.parsed);
      return;
    }
    
    console.log('Fetching new result for tab', tabId, url);
    const { rawResponse, parsed } = await postToWebhook(url);
    const scores = calculateScores(rawResponse);
    const wrapped = { data: { raw: rawResponse, parsed, scores }, domain, url, checkedAt: new Date().toISOString() };
    await chrome.storage.local.set({ [String(tabId)]: wrapped });
    updateBadge(tabId, scores);
    console.log('Phishing check stored for tab', tabId, domain, 'Score:', scores.totalScore, 'JSON length:', JSON.stringify(rawResponse).length);
  } catch (e) {
    console.error('Phishing check failed:', e);
    const errorData = { parsed: { verdict: 'ERROR', summary: e.message } };
    await chrome.storage.local.set({ 
      [String(tabId)]: { 
        data: errorData, 
        url, 
        domain: new URL(url).hostname, 
        checkedAt: new Date().toISOString() 
      } 
    });
    updateBadge(tabId, errorData.parsed);
  }
}

// Badge updater based on verdict
function updateBadge(tabId, scoresOrParsed) {
  let status = scoresOrParsed?.status;
  if (!status) {
    const verdict = (scoresOrParsed?.verdict || scoresOrParsed?.final_verdict || '').toUpperCase();
    status = verdict === 'DANGEROUS' || verdict === 'MALICIOUS' ? 'DANGEROUS'
      : verdict === 'SUSPICIOUS' || verdict === 'WARN' ? 'SUSPICIOUS'
      : verdict === 'ERROR' ? 'ERROR' : 'SAFE';
  }
  let text = '✓';
  let color = '#00AA00';
  if (status === 'DANGEROUS') { text = '!'; color = '#FF0000'; }
  else if (status === 'SUSPICIOUS') { text = '?'; color = '#FFA500'; }
  else if (status === 'CAUTION') { text = '◐'; color = '#FFC107'; }
  else if (status === 'ERROR') { text = 'X'; color = '#666666'; }
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}

// Listen for completed top-frame navigations
chrome.webNavigation.onCompleted.addListener(({ tabId, frameId, url }) => {
  if (frameId !== 0) return; // only top frame
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;
  handleCheck(tabId, url);
});

// React to URL changes (including SPA navigations)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !changeInfo.url.startsWith('chrome://') && !changeInfo.url.startsWith('chrome-extension://')) {
    handleCheck(tabId, changeInfo.url);
  }
});

// Cleanup on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(String(tabId));
});

// Expose a message API for manual refresh from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'refreshCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) handleCheck(tabs[0].id, tabs[0].url);
    });
    sendResponse({ status: 'refresh_started' });
    return true;
  }
  if (msg.action === 'getTabData') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return sendResponse({ error: 'No active tab' });
      chrome.storage.local.get([String(tabs[0].id)], (store) => {
        sendResponse({ tabId: tabs[0].id, entry: store[String(tabs[0].id)] });
      });
    });
    return true;
  }
});

console.log('Phishing Detector background service worker initialized');
