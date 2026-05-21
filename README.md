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

## 🚀 Quick Setup (No Coding Required)

### Step 1: Get the Code on GitHub

1. Go to [github.com](https://github.com) → Create New Repository
2. Name it `bharat-terminal`
3. Upload all these files

### Step 2: Deploy Frontend on Render

1. Go to [render.com](https://render.com) → New → Static Site
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Click Deploy

### Step 3: Deploy Backend on Render

1. Render → New → Web Service
2. Connect same GitHub repo
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. Add Environment Variable:
   - `NVIDIA_API_KEY` = your NVIDIA NIM API key
5. Click Deploy

### Step 4: Connect Frontend to Backend

In `frontend/src/App.jsx`, the NVIDIA API calls go directly from browser.
For the backend API (stock data, etc.), update the base URL to your Render backend URL.

---

## 📁 Project Structure

```
bharat-terminal/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Main terminal UI (all-in-one)
│   │   └── main.jsx         ← React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── main.py              ← FastAPI server
│   └── requirements.txt
└── README.md
```

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
