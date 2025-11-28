// Legitly - Popup Script

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/phishing-check';
const N8N_HEALTH_URL = 'http://localhost:5678/healthz';

document.addEventListener('DOMContentLoaded', async () => {
  // Check n8n connection
  checkN8nConnection();
  
  // Get current tab info
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  if (!currentTab || !currentTab.url || currentTab.url.startsWith('chrome://')) {
    showResult({
      isPhishing: false,
      confidence: 1,
      reason: 'System page - not analyzed'
    }, { domain: 'System Page', isHttps: true });
    return;
  }

  const domain = new URL(currentTab.url).hostname;
  
  // Check cache first
  const cached = await chrome.storage.local.get(domain);
  
  if (cached[domain] && isRecent(cached[domain].checkedAt)) {
    showResult(cached[domain].result, { 
      domain, 
      isHttps: currentTab.url.startsWith('https'),
      checkedAt: cached[domain].checkedAt
    });
  } else {
    // Trigger new check via content script
    try {
      await chrome.tabs.sendMessage(currentTab.id, { action: 'recheck' });
      
      // Wait a moment then check cache again
      setTimeout(async () => {
        const newCached = await chrome.storage.local.get(domain);
        if (newCached[domain]) {
          showResult(newCached[domain].result, {
            domain,
            isHttps: currentTab.url.startsWith('https'),
            checkedAt: newCached[domain].checkedAt
          });
        } else {
          showResult({
            isPhishing: false,
            confidence: 0,
            reason: 'Analysis in progress...'
          }, { domain, isHttps: currentTab.url.startsWith('https') });
        }
      }, 1500);
    } catch (e) {
      showResult({
        isPhishing: false,
        confidence: 0,
        reason: 'Could not analyze this page'
      }, { domain, isHttps: currentTab.url.startsWith('https') });
    }
  }

  // Setup buttons
  document.getElementById('recheckBtn').addEventListener('click', recheckPage);
  document.getElementById('reportBtn').addEventListener('click', reportFalsePositive);
});

function isRecent(timestamp) {
  const fiveMinutes = 5 * 60 * 1000;
  return (new Date() - new Date(timestamp)) < fiveMinutes;
}

function showResult(result, pageData) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('result').style.display = 'block';

  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusDesc = document.getElementById('statusDesc');
  const confidenceBar = document.getElementById('confidenceBar');

  if (result.isPhishing) {
    statusIcon.textContent = '🚨';
    statusTitle.textContent = 'PHISHING DETECTED!';
    statusDesc.textContent = result.reason || 'This site appears to be a phishing attempt';
    confidenceBar.className = 'confidence-fill danger';
    confidenceBar.style.width = `${(result.confidence || 0.9) * 100}%`;
  } else if (result.isSuspicious) {
    statusIcon.textContent = '⚠️';
    statusTitle.textContent = 'Suspicious Site';
    statusDesc.textContent = result.reason || 'Some suspicious elements detected';
    confidenceBar.className = 'confidence-fill suspicious';
    confidenceBar.style.width = `${(result.confidence || 0.5) * 100}%`;
  } else {
    statusIcon.textContent = '✅';
    statusTitle.textContent = 'Safe Website';
    statusDesc.textContent = result.reason || 'No phishing indicators detected';
    confidenceBar.className = 'confidence-fill safe';
    confidenceBar.style.width = `${(1 - (result.confidence || 0)) * 100}%`;
  }

  // Update details
  document.getElementById('domainValue').textContent = pageData.domain || '-';
  document.getElementById('httpsValue').textContent = pageData.isHttps ? '✓ Secure' : '✗ Not Secure';
  document.getElementById('loginFormValue').textContent = result.hasLoginForm ? 'Detected' : 'None';
  document.getElementById('checkedAtValue').textContent = pageData.checkedAt 
    ? new Date(pageData.checkedAt).toLocaleTimeString() 
    : 'Just now';
}

async function checkN8nConnection() {
  const dot = document.getElementById('n8nDot');
  const status = document.getElementById('n8nStatus');

  try {
    const response = await fetch(N8N_HEALTH_URL, { 
      method: 'GET',
      mode: 'no-cors' 
    });
    dot.className = 'n8n-dot connected';
    status.textContent = 'n8n connected';
  } catch (e) {
    dot.className = 'n8n-dot disconnected';
    status.textContent = 'n8n not running - start n8n locally';
  }
}

async function recheckPage() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').style.display = 'none';

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const domain = new URL(tabs[0].url).hostname;
  
  // Clear cache
  await chrome.storage.local.remove(domain);
  
  // Reload page to trigger fresh check
  chrome.tabs.reload(tabs[0].id);
  
  // Close popup
  window.close();
}

async function reportFalsePositive() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0].url;
  
  // Send to n8n for false positive reporting
  try {
    await fetch('http://localhost:5678/webhook/report-false-positive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        reportedAt: new Date().toISOString(),
        type: 'false-positive'
      })
    });
    alert('Thank you! Your report has been submitted.');
  } catch (e) {
    alert('Could not submit report. Please ensure n8n is running.');
  }
}
