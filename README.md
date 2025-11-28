# 🛡️ Legitly - Phishing Detection System

A real-time phishing detection system powered by n8n workflow automation with a Chrome extension for browser protection.

## 🚀 Quick Start

### Step 1: Start n8n

Open a terminal and run:

```bash
n8n start
```

This will start n8n on `http://localhost:5678`

### Step 2: Import the Workflow

1. Open n8n in your browser: `http://localhost:5678`
2. Create a new workflow
3. Click on the **⋮** menu → **Import from File**
4. Select `n8n-workflow/legitly-phishing-workflow.json`
5. **Activate** the workflow (toggle in top right)

### Step 3: Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. The Legitly extension should appear in your toolbar

### Step 4: Generate Icons (Optional)

You need PNG icons for the extension. You can convert the SVG or create simple icons:

```bash
# Using ImageMagick (if installed)
cd chrome-extension/icons
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

Or use any online SVG to PNG converter with the `icons/icon.svg` file.

## 📁 Project Structure

```
Legitly/
├── chrome-extension/
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Service worker (calls n8n)
│   ├── content.js         # Page analysis script
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic
│   └── icons/             # Extension icons
│       └── icon.svg       # Source icon
│
├── n8n-workflow/
│   └── legitly-phishing-workflow.json  # n8n workflow
│
└── README.md
```

## 🔧 How It Works

### Flow Diagram

```
[User visits website]
        ↓
[Content Script analyzes page]
    - Extracts URL, domain
    - Detects login forms
    - Finds suspicious keywords
    - Checks for brand impersonation
        ↓
[Background Script sends to n8n]
        ↓
[n8n Webhook receives data]
        ↓
[Phishing Analysis Code Node]
    - Domain analysis (IP, TLD, length)
    - Brand impersonation check
    - Typosquatting detection
    - HTTPS verification
    - Suspicious patterns
        ↓
[Response sent to extension]
        ↓
[Extension shows result]
    - ✅ Safe (green badge)
    - ⚠️ Suspicious (orange badge)
    - 🚨 Phishing (red overlay)
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

## 🔗 n8n Webhook Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/phishing-check` | POST | Main phishing analysis |
| `/webhook/report-false-positive` | POST | Report incorrect detections |

### Sample Request

```json
{
  "url": "https://example.com/login",
  "domain": "example.com",
  "pageTitle": "Login Page",
  "hasLoginForm": true,
  "hasPasswordField": true,
  "suspiciousKeywords": [],
  "brandIndicators": [],
  "isHttps": true
}
```

### Sample Response

```json
{
  "isPhishing": false,
  "isSuspicious": false,
  "confidence": 0.1,
  "score": 10,
  "reason": "No issues detected",
  "allReasons": [],
  "timestamp": "2025-11-28T10:30:00.000Z"
}
```

## ⚙️ Configuration

### Change n8n Webhook URL

If running n8n on a different port or server, update these files:

**background.js** (line 4):
```javascript
const N8N_WEBHOOK_URL = 'http://your-server:5678/webhook/phishing-check';
```

**popup.js** (line 3):
```javascript
const N8N_WEBHOOK_URL = 'http://your-server:5678/webhook/phishing-check';
```

## 🧪 Testing

1. Start n8n: `n8n start`
2. Activate the workflow
3. Load the Chrome extension
4. Visit test sites:
   - `https://google.com` - Should show ✅ Safe
   - Any site with suspicious patterns - Should show warnings

## 🚨 Warning Signs Detected

- IP address as domain
- Suspicious TLDs (.tk, .xyz, .top, etc.)
- Brand name in URL but wrong domain
- Typosquatted domains
- Login forms without HTTPS
- Urgent/threatening language
- Forms submitting to different domains

## 📝 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

1. Fork the repository
2. Add new detection rules in the n8n workflow
3. Submit a pull request

---

**Built with ❤️ using n8n and Chrome Extensions API**
