# ⚡ BHARAT TERMINAL
## AI-Powered Institutional Intelligence for Indian Markets

> Bloomberg-style terminal with multi-agent AI debate, live NSE/BSE data, expert call tracking, and institutional-grade analysis.

---

## 🧠 What This Does

- **Live NSE/BSE stock data** via Yahoo Finance
- **Multi-Agent AI Debate** — 7 specialized AI agents analyze each stock:
  - Technical AI (RSI, SMA, patterns)
  - Fundamental AI (valuation, business quality)
  - Macro AI (RBI, FII, global macro)
  - Sentiment AI (news, social signals)
  - Risk AI (downside, position sizing)
  - Options/Derivatives AI (calls, puts, Greeks)
  - P&F AI (Point & Figure signals)
  - Final Decision AI (synthesizes all agents)
- **News Intelligence** — TOI, HT, ET headlines with AI stock recommendations
- **Expert Call Tracker** — Add Telegram calls (PL Capital etc.) and verify with AI
- **AI Copilot Chat** — Ask anything about Indian markets
- **Powered by NVIDIA NIM** (GPT-OSS 120B)

---

## 🚀 DEPLOYMENT GUIDE FOR RENDER

### Prerequisites
- GitHub account with repo pushed
- Render.com account
- NVIDIA API Key for NIM

---

### Step 1: Deploy Backend API on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo (`Indianstock1`)
3. Configure the Web Service:
   ```
   Name: bharat-terminal-api
   Root Directory: backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port 8000
   ```
4. Add Environment Variables:
   - Key: `NVIDIA_API_KEY`
   - Value: [Your NVIDIA NIM API Key]
5. Click **Deploy**
6. Wait for deployment ✅
7. **Copy your Backend URL** (e.g., `https://bharat-terminal-api.onrender.com`)

---

### Step 2: Deploy Frontend Static Site on Render

1. Go to [render.com](https://render.com) → **New** → **Static Site**
2. Connect your GitHub repo (`Indianstock1`)
3. Configure the Static Site:
   ```
   Name: bharat-terminal-ui
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
4. Click **Deploy**
5. Wait for deployment ✅
6. **Copy your Frontend URL** (e.g., `https://bharat-terminal-ui.onrender.com`)

---

### Step 3: Update Frontend to Use Live Backend

1. In `frontend/vite.config.js`, update the backend URL:
   ```javascript
   proxy: {
     '/api': {
       target: 'https://YOUR-BACKEND-URL.onrender.com',  // Update this!
       changeOrigin: true,
       secure: true,
     }
   }
   ```
2. Commit and push to GitHub
3. Render will auto-redeploy

---

## 📁 Project Structure

```
Indianstock1/
├── frontend/                ← React + Vite
│   ├── src/
│   │   ├── App.jsx          ← Main terminal UI
│   │   └── main.jsx         ← React entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js       ← ✅ Correctly named
│   ├── .gitignore
│   └── dist/                ← Build output (auto-generated)
├── backend/                 ← FastAPI
│   ├── main.py
│   └── requirements.txt
├── render.yaml              ← Render deployment config
├── .nvmrc                   ← Node version 24.14.1
└── README.md
```

---

## 🔧 Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev        # Start on http://localhost:3000
npm run build      # Build for production
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## ✅ Deployment Checklist

- [x] Frontend config fixed (vite.config.js)
- [x] render.yaml updated (type: static)
- [x] index.html script path corrected (/src/main.jsx)
- [x] package.json includes react-dom
- [x] .gitignore added (excludes node_modules)
- [x] .nvmrc set to Node 24.14.1
- [x] Build tested locally (npm run build works)
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Render (Static Site)
- [ ] Backend URL updated in vite.config.js
- [ ] Frontend redeployed with updated backend URL

---

## 🤖 AI Agents System

Each stock analysis triggers a **debate** between 7 specialized agents:

```
Raw Stock Data (Yahoo Finance)
         ↓
┌─────────────────────────────────────────┐
│  AGENT DEBATE                           │
│  Technical AI  →  BUY                  │
│  Fundamental AI → HOLD                 │
│  Macro AI      →  BUY                  │
│  Sentiment AI  →  STRONG BUY           │
│  Risk AI       →  MEDIUM RISK          │
│  Options AI    →  BUY CALLS            │
│  P&F AI        →  BREAKOUT BUY         │
└─────────────────────────────────────────┘
         ↓
Final AI Consensus → Recommendation
```

---

## 📊 API Endpoints

### Stock Analysis
```
GET /api/analyze?symbol=RELIANCE
```

### News Feed
```
GET /api/news
```

### Expert Calls
```
GET /api/expert-calls
POST /api/expert-calls (add new call)
```

---

## 🐛 Troubleshooting

### Build fails with "terser not found"
- **Fixed**: Removed custom minify config
- Vite uses esbuild by default (faster, simpler)

### "Cannot find module 'react-dom'"
- **Fixed**: Added to package.json dependencies

### Render shows "Cannot GET /"
- **Cause**: Static site not building correctly
- **Solution**: Check render.yaml has `type: static` and `publishPath: dist`

### Frontend can't reach backend
- **Solution**: Update vite.config.js proxy target to your backend URL
- Redeploy frontend after update

---

## 📝 Notes

- NVIDIA NIM calls happen **directly from browser** (no backend needed)
- Stock data & news go through **backend API**
- Static site deployment means **no Node runtime needed** on Render (cheaper!)
- Frontend is fully compiled to HTML/CSS/JS in `dist/` folder
  FINAL DECISION AI
  "STRONG BUY | 82/100 Confidence"
  Entry: ₹2920 | SL: ₹2870 | T1: ₹3050 | T2: ₹3200
```

---

## 📡 Expert Call Integration (Telegram)

You can add calls from any Telegram channel:
1. Go to **Expert Calls** tab
2. Add channel name + call text
3. Click **VERIFY AI** to have the AI cross-check against its own analysis

---

## 🗺️ Roadmap

**Phase 1 (Now)** — Live prices, AI agent analysis, news, expert calls ✅  
**Phase 2** — Options chain viewer, F&O analysis, backtesting  
**Phase 3** — P&F charts, portfolio tracker, alerts  
**Phase 4** — Broker integration (Zerodha/Upstox), live trading  

---

## ⚠️ Disclaimer

This terminal provides AI-generated analysis for informational purposes only.
Not financial advice. Always do your own research. Trading involves risk.

---

Built with: React + Vite + FastAPI + NVIDIA NIM + Yahoo Finance
