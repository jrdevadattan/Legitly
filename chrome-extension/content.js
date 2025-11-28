// Legitly - Content Script
// Analyzes page content and sends data to background script for phishing detection

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', analyzePage);
  } else {
    analyzePage();
  }

  function analyzePage() {
    // Debounce to avoid multiple calls
    setTimeout(() => {
      const pageData = extractPageData();
      
      // Send data to background script for n8n workflow check
      chrome.runtime.sendMessage({
        action: 'checkUrl',
        data: pageData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Legitly: Could not connect to background script');
          return;
        }
        
        if (response && response.isPhishing) {
          showWarningOverlay(response);
        } else if (response && response.isSuspicious) {
          showCautionBanner(response);
        }
      });
    }, 500);
  }

  function extractPageData() {
    const url = window.location.href;
    const domain = window.location.hostname;
    
    // Check for login forms
    const forms = document.querySelectorAll('form');
    const passwordFields = document.querySelectorAll('input[type="password"]');
    const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="user"]');
    
    // Extract form actions
    const formActions = Array.from(forms).map(form => ({
      action: form.action || 'same-page',
      method: form.method || 'get',
      hasPassword: form.querySelector('input[type="password"]') !== null,
      hasEmail: form.querySelector('input[type="email"]') !== null
    }));

    // Check external links
    const links = document.querySelectorAll('a[href]');
    const externalLinks = Array.from(links)
      .filter(link => {
        try {
          const linkUrl = new URL(link.href);
          return linkUrl.hostname !== domain;
        } catch {
          return false;
        }
      })
      .slice(0, 20) // Limit to 20 external links
      .map(link => link.href);

    // Look for suspicious indicators
    const pageText = document.body ? document.body.innerText.toLowerCase() : '';
    const suspiciousKeywords = [
      'verify your account',
      'confirm your identity',
      'unusual activity',
      'suspended',
      'limited access',
      'update payment',
      'expire',
      'urgent action required',
      'verify immediately',
      'account will be closed'
    ];
    
    const foundKeywords = suspiciousKeywords.filter(keyword => 
      pageText.includes(keyword)
    );

    // Check for brand impersonation
    const brandIndicators = detectBrandImpersonation(domain, document.title, pageText);

    return {
      url: url,
      domain: domain,
      title: document.title,
      hasLoginForm: passwordFields.length > 0 && emailFields.length > 0,
      hasPasswordField: passwordFields.length > 0,
      formCount: forms.length,
      formActions: formActions,
      externalLinks: externalLinks,
      suspiciousKeywords: foundKeywords,
      brandIndicators: brandIndicators,
      isHttps: window.location.protocol === 'https:',
      pageLength: pageText.length
    };
  }

  function detectBrandImpersonation(domain, title, pageText) {
    const popularBrands = [
      { name: 'paypal', domains: ['paypal.com'] },
      { name: 'microsoft', domains: ['microsoft.com', 'live.com', 'outlook.com'] },
      { name: 'google', domains: ['google.com', 'gmail.com'] },
      { name: 'apple', domains: ['apple.com', 'icloud.com'] },
      { name: 'amazon', domains: ['amazon.com', 'amazon.co.uk'] },
      { name: 'facebook', domains: ['facebook.com', 'fb.com'] },
      { name: 'netflix', domains: ['netflix.com'] },
      { name: 'bank of america', domains: ['bankofamerica.com'] },
      { name: 'chase', domains: ['chase.com'] },
      { name: 'wells fargo', domains: ['wellsfargo.com'] }
    ];

    const indicators = [];
    const lowerTitle = title.toLowerCase();
    
    for (const brand of popularBrands) {
      const brandMentioned = lowerTitle.includes(brand.name) || 
                            pageText.includes(brand.name);
      const isOfficialDomain = brand.domains.some(d => domain.includes(d));
      
      if (brandMentioned && !isOfficialDomain) {
        indicators.push({
          brand: brand.name,
          officialDomains: brand.domains,
          currentDomain: domain,
          suspicious: true
        });
      }
    }

    return indicators;
  }

  function showWarningOverlay(result) {
    // Create warning overlay
    const overlay = document.createElement('div');
    overlay.id = 'legitly-warning-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0.95);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
      ">
        <div style="font-size: 72px; margin-bottom: 20px;">⚠️</div>
        <h1 style="font-size: 36px; margin: 0 0 20px 0;">PHISHING DETECTED!</h1>
        <p style="font-size: 18px; max-width: 600px; text-align: center; margin: 0 0 10px 0;">
          Legitly has detected this website as a potential phishing site.
        </p>
        <p style="font-size: 16px; max-width: 600px; text-align: center; color: #ffcccc;">
          Confidence: ${Math.round((result.confidence || 0) * 100)}%
        </p>
        <p style="font-size: 14px; max-width: 600px; text-align: center; margin: 20px 0;">
          ${result.reason || 'This site may be trying to steal your personal information.'}
        </p>
        <div style="margin-top: 30px;">
          <button id="legitly-go-back" style="
            background: white;
            color: #d32f2f;
            border: none;
            padding: 15px 40px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            margin: 0 10px;
          ">← Go Back to Safety</button>
          <button id="legitly-proceed" style="
            background: transparent;
            color: white;
            border: 2px solid white;
            padding: 15px 40px;
            font-size: 18px;
            border-radius: 8px;
            cursor: pointer;
            margin: 0 10px;
          ">Proceed Anyway (Risky)</button>
        </div>
        <p style="font-size: 12px; margin-top: 30px; opacity: 0.7;">
          Protected by Legitly Phishing Detection
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('legitly-go-back').addEventListener('click', () => {
      window.history.back();
    });

    document.getElementById('legitly-proceed').addEventListener('click', () => {
      overlay.remove();
    });
  }

  function showCautionBanner(result) {
    const banner = document.createElement('div');
    banner.id = 'legitly-caution-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: #ff9800;
        color: white;
        padding: 12px 20px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">⚠️</span>
          <span style="font-weight: bold;">Caution:</span>
          <span style="margin-left: 8px;">${result.reason || 'This site has some suspicious characteristics.'}</span>
        </div>
        <button id="legitly-dismiss-banner" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 5px 15px;
          border-radius: 4px;
          cursor: pointer;
        ">Dismiss</button>
      </div>
    `;

    document.body.appendChild(banner);
    document.body.style.marginTop = '50px';

    document.getElementById('legitly-dismiss-banner').addEventListener('click', () => {
      banner.remove();
      document.body.style.marginTop = '0';
    });
  }
})();
