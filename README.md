# 🛡️ Legitly Phishing Detector (Lite Extension)

Lightweight Chrome Extension + n8n workflow for real‑time phishing verdicts. The current extension version (Manifest V3) posts each visited page URL to a cloud webhook and shows the returned verdict, risk score, and summary.

## 🚀 Quick Start

### Option A: Using n8n Cloud (recommended)

1. Ensure your workflow is activated at:
        `https://rethu.app.n8n.cloud/webhook/phish-check`
2. No local n8n start required.

### Option B: Local n8n

If you want to run locally instead of cloud:

```bash
n8n start
```

Adjust the webhook URL in `background.js` and (if needed) workflow to match your local endpoint (e.g. `http://localhost:5678/webhook/phish-check`).

### Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. The Legitly extension should appear in your toolbar

### (Optional) Icons

Current manifest omits custom icons for simplicity. You can add an `icons/` folder and update `manifest.json` later.

## 📁 Project Structure

```
Legitly/
├── chrome-extension/
│   ├── manifest.json      # MV3 manifest (no content script)
│   ├── background.js      # Sends URL -> n8n webhook, caches by tabId
│   ├── popup.html         # Minimal verdict / risk / summary UI
│   ├── popup.js           # Popup logic (tabId lookup + refresh)
│   └── (optional icons/)
│
├── n8n-workflow/
│   └── legitly-phishing-workflow.json  # n8n workflow
│
└── README.md
```

## 🔧 How It Works

### Runtime Flow (Lite Version)

```
Navigation complete (top frame)
   → background.js posts { url } to webhook
           → n8n workflow analyzes & returns JSON
                   → stored under chrome.storage.local[tabId]
                           → popup.js reads entry when opened
                                   → displays verdict (color), risk score, summary
```

## 🎯 Detection Features

| Feature | Description |
|---------|-------------|
| **Domain Analysis** | Checks for IP addresses, suspicious TLDs, excessive subdomains |
| **Brand Impersonation** | Detects fake PayPal, Google, Microsoft, Amazon pages |
| **Typosquatting** | Catches misspelled brand domains (g00gle, paypa1) |
| **HTTPS Check** | Warns about login forms on non-HTTPS pages |
| **Keyword Detection** | Finds urgent/threatening language |
| **Form Analysis** | Checks if forms submit to suspicious domains |

## 🔗 Webhook Contract (Current Expectation)

Request (background.js):
```json
{ "url": "https://example.com/path" }
```

Expected Response (examples):
```json
{
        "parsedOutput": {
                "verdict": "SAFE",
                "risk_score": 12,
                "summary": "No phishing indicators detected."
        }
}
```
or (without wrapper):
```json
{
        "verdict": "MALICIOUS",
        "risk_score": 87,
        "summary": "Multiple brand impersonation signals detected."
}
```

The popup falls back to alternative fields (`final_verdict`, `final_trust_score`, `total_score`, `description`) if primary keys are absent.

## ⚙️ Configuration

### Change Webhook URL

Edit `background.js` constant `N8N_WEBHOOK_URL`. Popup reads cached data only—no direct network calls.

## 🧪 Testing

1. Load extension (Developer mode → Load unpacked → `chrome-extension/`).
2. Navigate to several sites; open the popup to view results.
3. Press Recheck to force a fresh POST (overrides cache for that tab).
4. Toggle JSON to inspect raw returned object.

## 🚨 Potential Indicators (Workflow-Dependent)

Your workflow can populate verdict logic using:
- Domain risk (TLD, length, entropy)
- Brand impersonation / typosquatting
- Form & credential capture patterns
- Mixed content / HTTPS issues
- Language urgency / scam terms

## 📝 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

1. Fork the repository
2. Add new detection rules in the n8n workflow
3. Submit a pull request

---

**Built with ❤️ using n8n + Chrome Extensions API**
