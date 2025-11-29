# Legitly Chrome Extension

Legitly helps you quickly understand how trustworthy a website appears, based on two independent signals: Google Safe Browsing and VirusTotal. The popup shows an overall score along with two concentric rings for the individual sources. It also provides a simple way to recheck a page and control automatic scanning.

## What it does

- Calculates an overall trust score from 0 to 100
- Shows Google Safe Browsing and VirusTotal scores separately
- Checks pages automatically when you visit or navigate within them
- Lets you turn automatic checks on or off
- Allows a manual “Recheck Page” when needed
 - Highlights pages likely to be fake, suspicious, or misinformation based on detected signals

## How the score is calculated

The overall score starts at 100.
- If Google Safe Browsing reports a match, 50 points are subtracted. If there is no match, the Google score is 100; otherwise it is 0.
- VirusTotal’s score is the percentage of non‑threat findings: `(harmless + undetected) / (malicious + suspicious + harmless + undetected) * 100`.
- A penalty of up to 40 points is applied to the overall score based on the ratio of `malicious + suspicious` detections.

Category guidance for the overall score:
- 80–100: Safe
- 60–79: Caution
- 30–59: Suspicious
- 0–29: Dangerous

## Install

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable Developer mode (toggle in the top‑right).
3. Click “Load unpacked”.
4. Select the folder containing the extension files.

## Use

1. Click the Legitly icon to open the popup for the current page.
2. Toggle Auto to enable or disable automatic checks. When off, the popup content is visually dimmed.
3. Click “Recheck Page” to run a fresh check.

## API integration

Legitly posts the current page URL to an n8n webhook and expects a JSON array response:

```
[
   { /* Google Safe Browsing result */ },
   { /* VirusTotal result with data.attributes.stats */ },
   { /* optional metadata */ }
]
```

The VirusTotal statistics section typically contains counts like:

```
"stats": {"malicious": 9, "suspicious": 0, "undetected": 28, "harmless": 61, "timeout": 0}
```

## Project layout

- `manifest.json` — Chrome MV3 manifest
- `background.js` — Service worker that posts to the webhook, computes scores, caches results, and updates the badge
- `popup.html` — Popup UI with the concentric ring visualization
- `popup.js` — Popup logic that renders scores and handles user actions
- `assets/` — Icons and images used by the UI

## Permissions and behavior

- Uses `webNavigation` and `tabs` to detect page loads and URL changes
- Stores results in `chrome.storage.local`, separated by tab
- Applies a short cache to avoid unnecessary calls while keeping checks responsive

## Contributing

If you want to change how scoring works or adjust the visualization, start with `background.js` for the calculation logic and `popup.html`/`popup.js` for rendering. Keep changes simple and focused so the extension remains fast and easy to understand.

## License

MIT
