// Legitly - Popup Script (Clean)

(function() {
  const verdictLabel = document.getElementById('verdictLabel');
  const riskScoreEl = document.getElementById('riskScore');
  const summaryEl = document.getElementById('summary');
  const loadingEl = document.getElementById('loading');
  const refreshBtn = document.getElementById('refreshBtn');
  const rawJsonBox = document.getElementById('rawJson');
  const toggleJsonBtn = document.getElementById('toggleJsonBtn');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const badgeSymbol = document.getElementById('badgeSymbol');
  const statusDiv = document.getElementById('status');

  function setLoading(state) {
    if (loadingEl) loadingEl.style.display = state ? 'block' : 'none';
  }

  function colorForVerdict(v) {
    v = (v || '').toUpperCase();
    if (v === 'MALICIOUS' || v === 'DANGEROUS') return '#d32f2f'; // Red
    if (v === 'SUSPICIOUS' || v === 'WARN') return '#f57c00'; // Orange
    if (v === 'ERROR') return '#616161'; // Grey
    return '#2e7d32'; // Green
  }

  function symbolForVerdict(v) {
    v = (v || '').toUpperCase();
    if (v === 'MALICIOUS' || v === 'DANGEROUS') return '!';
    if (v === 'SUSPICIOUS' || v === 'WARN') return '?';
    if (v === 'ERROR') return 'X';
    return '✓';
  }

  function render(entry) {
    console.log('[Popup] Full entry:', entry);
    
    if (!entry) {
      verdictLabel.textContent = 'No data yet';
      riskScoreEl.textContent = '';
      summaryEl.textContent = 'Waiting for analysis...';
      badgeSymbol.textContent = '...';
      statusDiv.style.background = '#666';
      rawJsonBox.textContent = '{}';
      return;
    }

    const payload = entry.data || {};
    console.log('[Popup] Payload:', payload);
    
    // Display the FULL raw response from webhook
    const fullRaw = payload.raw || payload;
    const parsed = payload.parsed || (Array.isArray(fullRaw) ? fullRaw[0] : fullRaw);
    
    console.log('[Popup] Full raw:', fullRaw);
    console.log('[Popup] Parsed:', parsed);

    const verdict = parsed.verdict || parsed.final_verdict || 'SAFE';
    const risk = parsed.risk_score ?? parsed.final_trust_score ?? parsed.total_score;
    const summary = parsed.summary || parsed.description || 'No summary provided.';

    verdictLabel.textContent = verdict.toUpperCase();
    riskScoreEl.textContent = (risk !== undefined && risk !== null) ? `Risk Score: ${risk}` : 'Risk Score: N/A';
    summaryEl.textContent = summary;
    
    statusDiv.style.background = colorForVerdict(verdict);
    badgeSymbol.textContent = symbolForVerdict(verdict);
    
    // Render the COMPLETE JSON response
    const jsonStr = JSON.stringify(fullRaw, null, 2);
    rawJsonBox.textContent = jsonStr;
    console.log('[Popup] JSON length:', jsonStr.length);
    
    // Auto-show JSON if it has content and isn't already shown
    if (rawJsonBox.style.display === 'none') {
      rawJsonBox.style.display = 'block';
      toggleJsonBtn.textContent = 'Hide JSON';
    }
  }

  function pollForData(maxAttempts = 20, interval = 400) {
    let attempts = 0;
    const loop = () => {
      attempts++;
      chrome.runtime.sendMessage({ action: 'getTabData' }, (resp) => {
        console.log('[Popup Poll] Attempt', attempts, 'Got:', resp);
        if (resp && resp.entry) {
          setLoading(false);
          render(resp.entry);
        } else if (attempts < maxAttempts) {
          setTimeout(loop, interval);
        } else {
          setLoading(false);
          render(null);
        }
      });
    };
    loop();
  }

  function initialLoad() {
    // Clear any previous render state
    rawJsonBox.textContent = '';
    verdictLabel.textContent = 'Loading...';
    
    setLoading(true);
    // Always get fresh data for the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0]?.id;
      console.log('[Popup] Loading data for tab:', currentTabId, tabs[0]?.url);
      
      chrome.runtime.sendMessage({ action: 'getTabData' }, (resp) => {
        console.log('[Popup] Got response for tab:', resp?.tabId, 'has entry:', !!resp?.entry);
        if (resp && resp.entry) {
          setLoading(false);
          render(resp.entry);
        } else {
          // If no data, trigger a refresh
          console.log('[Popup] No data found, triggering refresh');
          chrome.runtime.sendMessage({ action: 'refreshCurrentTab' }, () => {
            pollForData();
          });
        }
      });
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      setLoading(true);
      chrome.runtime.sendMessage({ action: 'refreshCurrentTab' }, () => pollForData());
    });
  }

  if (toggleJsonBtn) {
    toggleJsonBtn.addEventListener('click', () => {
      const isHidden = rawJsonBox.style.display === 'none';
      rawJsonBox.style.display = isHidden ? 'block' : 'none';
      toggleJsonBtn.textContent = isHidden ? 'Hide JSON' : 'Show JSON';
    });
  }

  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', () => {
      const text = rawJsonBox.textContent;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = copyJsonBtn.textContent;
        copyJsonBtn.textContent = 'Copied!';
        setTimeout(() => copyJsonBtn.textContent = originalText, 1200);
      });
    });
  }

  // Start
  initialLoad();
})();
