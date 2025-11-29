# Legitly

Legitly Phishing Detector (Lite Extension)

This extension posts each visited page URL to a webhook and shows the returned verdict, risk score, and summary.

## Quick Start

### Option A: Using n8n Cloud

1. Ensure your workflow is activated.

### Option B: Local n8n

```bash
n8n start
```

Adjust the webhook URL in `background.js` to match your local endpoint (for example `http://localhost:5678/webhook/phish-check`).

### Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `chrome-extension` folder.

## Project Structure

```
Legitly/
├── chrome-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.js
│   └── icons/
│
├── n8n-workflow/
│   └── legitly-phishing-workflow.json
│
└── README.md
```

## How It Works

```
Navigation complete
→ background.js posts { url } to webhook
→ n8n workflow returns JSON
→ stored under chrome.storage.local[tabId]
→ popup.js reads entry when opened
→ displays verdict, risk score, summary
```

## Detection Features

| Feature | Description |
|---------|-------------|
| Domain Analysis | Checks for IP addresses, suspicious TLDs, excessive subdomains |
| Brand Impersonation | Detects fake PayPal, Google, Microsoft, Amazon pages |
| Typosquatting | Catches misspelled brand domains (g00gle, paypa1) |
| HTTPS Check | Warns about login forms on non-HTTPS pages |
| Keyword Detection | Finds urgent/threatening language |
| Form Analysis | Checks if forms submit to suspicious domains |
# Legitly

Legitly is a Chrome extension that estimates how trustworthy a website appears using two independent sources: Google Safe Browsing and VirusTotal. It shows an overall score and two concentric rings representing each source. The extension checks automatically when you visit pages and lets you recheck on demand.

## Repository layout

```
README.md
test.json
main-extension/
        background.js
        manifest.json
        popup.html
        popup.js
        README.md
        assets/
sample-ext/
        background.js
        manifest.json
        popup.html
        popup.js
test/
        index.js
        package.json
```

## Install the extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked and select `main-extension/`.
4. Pin the extension icon if desired.

## What it does

- Sends the current page URL to an n8n webhook for analysis
- Computes an overall trust score from 0 to 100
- Displays separate Google Safe Browsing and VirusTotal ring scores
- Rechecks on navigation and supports manual recheck
- Provides an Auto toggle to enable or disable automatic checks
 - Highlights pages likely to be fake, suspicious, or misinformation based on detected signals

## Scoring summary

- Start at 100 points
- Google Safe Browsing match subtracts 50 points; Google ring is 0 (otherwise 100)
- VirusTotal ring is `(harmless + undetected) / (malicious + suspicious + harmless + undetected) * 100`
- Up to 40 points are subtracted from the overall score based on `malicious + suspicious` ratio

For detailed behavior, see `main-extension/README.md`.

## Development notes

- MV3 background service worker in `main-extension/background.js`
- Popup UI in `main-extension/popup.html` and logic in `main-extension/popup.js`
- Icons and images in `main-extension/assets/`

## Contributions

