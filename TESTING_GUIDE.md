# 🚀 Quick Start - Testing Bharat Terminal Locally

## One-Command Setup (Recommended)

### **1. Start Backend (Terminal 1)**
```bash
cd /workspaces/Indianstock1/Backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### **2. Start Frontend (Terminal 2)**
```bash
cd /workspaces/Indianstock1/frontend
npm install
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### **3. Open Browser**
- Open: `http://localhost:5173`
- You should see: **Bharat Terminal** with modern gradient UI

---

## Test the Search Feature

### ✅ Expected Success Flow

1. **Homepage loads with:**
   - Purple gradient "BHARAT TERMINAL" title
   - Cyan "Next-Gen AI Stock Analysis" subtitle
   - Animated search bar with glass effect
   - NIFTY50 top 10 stocks grid below

2. **Type in search:**
   - Click search input
   - Type: `REL` (watch autocomplete suggestions)
   - Click "RELIANCE" from dropdown

3. **Should see:**
   - Loading state on button: "Analyzing..."
   - Smooth fade-in of stock analysis
   - 6 metrics: CMP, PE Ratio, Market Cap, 52W High/Low, Dividend Yield
   - Technical section with RSI, SMA indicators
   - 6 AI Agent cards with signals (STRONG BUY/BUY/HOLD/SELL/STRONG SELL)
   - Agent analysis text from NVIDIA AI

---

## ❌ If Search Fails

### **Step 1: Check Console**
1. Open DevTools: Press `F12`
2. Click "Console" tab
3. Look for error message like:
   - `"Failed to fetch from: http://localhost:8000/analyze/RELIANCE"`
   - `"Failed to fetch stock data. Check backend connection."`

### **Step 2: Verify Backend is Running**
```bash
# In a new terminal, test the backend directly:
curl http://localhost:8000/search?q=REL

# Should return something like:
# {"results":["RELIANCE", "RELIANCETECH"]}
```

### **Step 3: Check API Base URL**
In browser console, type:
```javascript
console.log(API_BASE)  // Should print: http://localhost:8000
```

### **Step 4: Common Issues**

| Issue | Solution |
|-------|----------|
| `Error: Cannot POST /` | Backend not running on port 8000 |
| `Network error` | Port 8000 is blocked/in use - try `lsof -i :8000` |
| `API_BASE undefined` | Close and reopen browser (Ctrl+Shift+R hard refresh) |
| `Stock not found` | Try: RELIANCE, TCS, INFY, HDFCBANK, WIPRO |

---

## 🎨 UI Features to Test

### **Modern Design Elements**
- ✨ Gradient text on headers
- 🟦 Glassmorphism effect (semi-transparent cards)
- 🎬 Smooth animations (hover effects, slide-in)
- 📱 Responsive layout (resize to mobile width)
- 💫 Glowing signal badges
- 🌊 Floating background animation

### **Try These Interactions**
1. **Hover over metric cards** → See them float up with glow
2. **Search suggestions** → See them slide in smoothly
3. **Agent cards** → Hover to see gradient glow effect
4. **NIFTY50 cards** → Click to analyze that stock
5. **Mobile view** → Resize browser to < 768px width

---

## 📊 Test Data

### **Stocks to Try**
```
RELIANCE, TCS, INFY, HDFCBANK, WIPRO, MARUTI, ICICI, AXISBANK, LT, BAJAJ
```

### **What Each Agent Analyzes**
1. **🔴 Technical AI** → RSI, Moving Averages, Chart patterns
2. **💰 Fundamental AI** → P/E ratio, Market cap, Growth metrics
3. **🌍 Macro AI** → GDP, FII flows, RBI policy
4. **📰 Sentiment AI** → News sentiment, Social signals
5. **⚠️ Risk AI** → Beta, drawdown, volatility
6. **📈 Options AI** → Implied volatility, Greeks, strategies

---

## 🛠️ Troubleshooting Checklist

- [ ] Backend running on port 8000 (check with `curl http://localhost:8000`)
- [ ] Frontend running on port 5173 (browser shows welcome page)
- [ ] NVIDIA_API_KEY set as environment variable (for AI responses)
- [ ] Python packages installed (`pip list | grep fastapi`)
- [ ] Node packages installed (`ls frontend/node_modules`)
- [ ] Browser console clear of errors (F12 → Console)
- [ ] API_BASE correctly set to `http://localhost:8000`

---

## 📝 Expected API Responses

### **Search Endpoint**
```bash
curl http://localhost:8000/search?q=REL
```
Response:
```json
{"results": ["RELIANCE", "RELIANCETECH"]}
```

### **Analyze Endpoint**
```bash
curl http://localhost:8000/analyze/RELIANCE
```
Response:
```json
{
  "stock": "RELIANCE",
  "metrics": {"cmp": 2934.5, "pe": 28.5, ...},
  "technical": {"rsi": 65.2, "sma20": 2900, ...},
  "agents": [
    {"name": "Technical AI", "signal": "BUY", "analysis": "...", "confidence": 0.85},
    ...
  ]
}
```

---

## ⚡ Performance Tips

For faster development:
```bash
# Skip AI analysis (remove from main.py):
# Just comment out agent calls to speed up responses

# Or use mock data:
export MOCK_DATA=true  # (if implemented)
```

---

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Homepage loads with modern gradient UI
2. ✅ Search autocomplete shows suggestions
3. ✅ Clicking a stock shows all 6 agent analyses
4. ✅ Cards have hover animations
5. ✅ No errors in console
6. ✅ Mobile view is responsive

---

**Need Help?** Check the browser console (F12) and backend logs for detailed error messages.

**Ready to Deploy?** See `FIX_REPORT.md` for production deployment steps.
