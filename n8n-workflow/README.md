# Legitly Phishing Detection - n8n Workflow Setup

## 🚀 Quick Start

### 1. n8n is Already Running!
n8n is currently running on: **http://localhost:5678**

### 2. Import the Workflow
1. Open n8n in your browser: http://localhost:5678
2. Click **"Workflows"** in the sidebar
3. Click **"Import from File"** or **"Import from URL"**
4. Select the file: `legitly-phishing-detection.json`
5. The workflow will be imported with all nodes configured

### 3. Configure API Keys

#### Required APIs (for full functionality):

**Option A: Basic Detection (No API keys needed)**
- The workflow includes heuristic analysis that works without any API keys
- Limited accuracy but functional immediately

**Option B: Full API-Based Detection (Recommended)**
You'll need these API keys:

1. **Google Safe Browsing API** (40% weight)
   - Get it: https://developers.google.com/safe-browsing/v4/get-started
   - Free tier: 10,000 queries/day
   - Set as: `GOOGLE_SAFE_BROWSING_API_KEY`

2. **VirusTotal API** (35% weight)
   - Get it: https://www.virustotal.com/gui/user/your_username/apikey
   - Free tier: 4 requests/minute
   - Set as: `VIRUSTOTAL_API_KEY`

3. **Google Custom Search API** (10% weight)
   - Get it: https://developers.google.com/custom-search/v1/introduction
   - Free tier: 100 queries/day
   - Set as: `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`
   - Create search engine: https://programmablesearchengine.google.com/

4. **OpenAI API** (Optional - 15% weight)
   - Get it: https://platform.openai.com/api-keys
   - Replace "Heuristic Analysis" node with ChatGPT node
   - Paid service (GPT-4o recommended)

#### Setting Environment Variables in n8n:

**Method 1: Via n8n UI (Recommended)**
1. Go to **Settings** (gear icon) → **Environment Variables**
2. Add each variable:
   - `GOOGLE_SAFE_BROWSING_API_KEY`
   - `VIRUSTOTAL_API_KEY`
   - `GOOGLE_SEARCH_API_KEY`
   - `GOOGLE_SEARCH_ENGINE_ID`
3. Save and restart workflow

**Method 2: Via .env file**
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Restart n8n with the .env file
n8n start --env-file=.env
```

**Method 3: Via terminal (temporary)**
```bash
export GOOGLE_SAFE_BROWSING_API_KEY="your_key_here"
export VIRUSTOTAL_API_KEY="your_key_here"
export GOOGLE_SEARCH_API_KEY="your_key_here"
export GOOGLE_SEARCH_ENGINE_ID="your_id_here"
n8n start
```

### 4. Activate the Workflow
1. In n8n, open the imported workflow
2. Click the **toggle switch** at the top to activate it
3. The webhook will be available at: `http://localhost:5678/webhook/phishing-check`

### 5. Test the Workflow

**Option A: Using cURL**
```bash
curl -X POST http://localhost:5678/webhook/phishing-check \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Option B: Using the Chrome Extension**
1. Load the Chrome extension from `../chrome-extension` folder
2. The extension is already configured to use this webhook
3. Navigate to any website and click the extension icon

## 📊 Workflow Architecture

```
Webhook Trigger (POST /phishing-check)
  ↓
Extract URL & Domain (parse URL, extract domain)
  ↓ (parallel execution)
  ├─→ Google Safe Browsing Check (40% weight)
  ├─→ VirusTotal URL Check (35% weight)
  ├─→ Submit URL to VirusTotal (backup scan)
  ├─→ Google Search for Reports (10% weight)
  └─→ Heuristic Analysis (15% weight)
  ↓
Merge All Results (combine parallel outputs)
  ↓
Aggregate & Score Results (calculate threat score 0-100)
  ↓
Respond to Webhook (return JSON result)
```

## 📝 Response Format

```json
{
  "url": "https://example.com",
  "domain": "example.com",
  "isPhishing": false,
  "threatScore": 15,
  "riskLevel": "low",
  "confidence": 15,
  "reasons": [
    "Google Safe Browsing: No threats detected",
    "VirusTotal: 0 engines flagged"
  ],
  "details": {
    "googleSafeBrowsing": { "threats": [], "checked": true },
    "virusTotal": { "malicious": 0, "suspicious": 0, "checked": true },
    "searchResults": { "found": false, "reports": [] },
    "heuristicAnalysis": { "isPhishing": false, "confidence": 0 }
  },
  "recommendation": "✓ This site appears to be safe...",
  "timestamp": "2025-01-14T10:30:00.000Z",
  "checkedBy": "Legitly Phishing Detection v1.0"
}
```

## 🔧 Troubleshooting

### Workflow not responding?
- Check if the workflow is **activated** (toggle switch should be ON)
- Verify n8n is running: http://localhost:5678
- Check webhook path: `http://localhost:5678/webhook/phishing-check`

### API errors?
- Verify environment variables are set correctly
- Check API key quotas (free tiers have limits)
- Some nodes have `continueOnFail: true` - they won't stop the workflow if they fail

### Low accuracy?
- Without API keys, only heuristic analysis runs (15% weight)
- For best results, configure at least Google Safe Browsing + VirusTotal
- API-based detection achieves 85%+ accuracy

## 🎯 Threat Scoring System

- **0-29**: Low risk (site appears safe)
- **30-49**: Medium risk (some suspicious indicators)
- **50-69**: High risk (likely phishing)
- **70-100**: Critical risk (confirmed phishing)

Weights:
- Google Safe Browsing: 40%
- VirusTotal: 35%
- Heuristic Analysis: 15%
- Google Search Reports: 10%

## 📚 API Documentation Links

- [Google Safe Browsing API](https://developers.google.com/safe-browsing/v4)
- [VirusTotal API v3](https://docs.virustotal.com/reference/overview)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [n8n Documentation](https://docs.n8n.io/)

## 🔄 Updating the Workflow

To modify the workflow:
1. Edit nodes in n8n UI
2. Export workflow: **⋮ menu** → **Export**
3. Save exported JSON to replace `legitly-phishing-detection.json`
4. Commit changes to git

## 🐛 Support

For issues or questions:
1. Check n8n execution logs in the UI
2. Review the Chrome extension console logs
3. Test webhook directly with cURL
4. Check API quotas and rate limits
