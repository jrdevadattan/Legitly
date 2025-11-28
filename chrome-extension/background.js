// Legitly - Background Service Worker
// Connects to n8n workflow for phishing detection

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/phishing-check';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkUrl') {
    checkPhishingUrl(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message, isPhishing: false }));
    return true; // Required for async response
  }
});

// Check URL against n8n phishing detection workflow
async function checkPhishingUrl(urlData) {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: urlData.url,
        domain: urlData.domain,
        timestamp: new Date().toISOString(),
        pageTitle: urlData.title || '',
        hasLoginForm: urlData.hasLoginForm || false,
        hasPasswordField: urlData.hasPasswordField || false,
        externalLinks: urlData.externalLinks || [],
        formActions: urlData.formActions || []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Store result in local storage for quick access
    await chrome.storage.local.set({
      [urlData.domain]: {
        result: result,
        checkedAt: new Date().toISOString()
      }
    });

    // Update badge based on result
    updateBadge(sender.tab.id, result);

    return result;
  } catch (error) {
    console.error('Phishing check failed:', error);
    return {
      isPhishing: false,
      confidence: 0,
      error: error.message,
      message: 'Could not connect to phishing detection service'
    };
  }
}

// Update extension badge based on result
function updateBadge(tabId, result) {
  if (result.isPhishing) {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId });
  } else if (result.isSuspicious) {
    chrome.action.setBadgeText({ text: '?', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FFA500', tabId });
  } else {
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#00FF00', tabId });
  }
}

// Listen for tab updates to check new URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    // Clear badge for new page load
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

console.log('Legitly background service worker initialized');
