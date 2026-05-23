# 🤖 NVIDIA NIM + AI HEDGE FUND Integration Guide

## Current Setup

Your Bharat Terminal already has:
- ✅ NVIDIA NIM integration in backend
- ✅ 6 Multi-agent AI analysis system
- ✅ Real stock data from Yahoo Finance
- ✅ API-connected frontend

## Integrating AI Hedge Fund Repository

You want to take these from `https://github.com/virattt/ai-hedge-fund`:
- agents/
- backtesting/
- cli/
- data/
- graph/
- llm/
- tools/
- utils/

### Step 1: Create Enhanced Backend Structure

```python
# Backend folder structure to add:
Backend/
├── agents/          # AI agents (technical, fundamental, macro)
│   ├── technical_agent.py
│   ├── fundamental_agent.py
│   ├── macro_agent.py
│   └── sentiment_agent.py
│
├── backtesting/     # Strategy backtesting
│   ├── backtest.py
│   ├── simulator.py
│   └── performance.py
│
├── data/            # Data fetching & processing
│   ├── fetcher.py   # Replace yfinance with enhanced fetcher
│   ├── processor.py
│   └── cache.py
│
├── llm/             # LLM integrations (NVIDIA NIM, OpenAI)
│   ├── nvidia_nim.py
│   ├── openai_client.py
│   └── prompt_templates.py
│
├── tools/           # Utility tools
│   ├── indicators.py     # Technical indicators (RSI, SMA, MACD)
│   ├── portfolio.py      # Portfolio analysis
│   └── risk.py           # Risk calculations
│
├── utils/           # General utilities
│   ├── formatting.py
│   ├── logging.py
│   └── config.py
│
└── main.py          # Main API (already have this)
```

## NVIDIA NIM Configuration

### Current Setup in Your Code:
```python
# Already configured in main.py
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

# To use different models:
Models available:
- meta/llama-3.1-405b-instruct
- openai/gpt-oss-120b
- mistral-ai/mixtral-8x22b-instruct-v0.1
```

### How to Set API Keys in Render

1. Go to: https://dashboard.render.com
2. Select your service "indianstock1"
3. Go to **Settings** → **Environment**
4. Add these variables:

```
NVIDIA_API_KEY=nvapi-[your-key-here]
OPENAI_API_KEY=sk-[your-key-here]  # Optional backup
```

## Enhanced LLM Integration

### Create: Backend/llm/nvidia_nim.py
```python
from openai import OpenAI
import os

class NVIDIANIMClient:
    def __init__(self):
        self.api_key = os.getenv("NVIDIA_API_KEY")
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key
        )
    
    async def analyze_stock(self, symbol: str, data: dict) -> dict:
        """Multi-agent analysis using NVIDIA NIM"""
        prompt = f"""
        Analyze stock {symbol}:
        Price: ₹{data['price']}
        RSI: {data['rsi']}
        
        Provide: SIGNAL (BUY/SELL/HOLD), ANALYSIS, CONFIDENCE (0-100)
        """
        
        response = self.client.chat.completions.create(
            model="meta/llama-3.1-405b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024
        )
        
        return response.choices[0].message.content
```

## Without Financial API Keys

Since you mentioned you don't have money for financial APIs:

### Use Free Alternatives:
1. **yfinance** ✅ Already using
2. **Alpha Vantage** - Free tier available
3. **IEX Cloud** - Free tier
4. **NSE India Data** - Free public data
5. **Yahoo Finance** ✅ Already integrated

### Skip These Expensive APIs:
- ❌ Bloomberg Terminal
- ❌ Reuters
- ❌ FactSet
- ❌ Professional backtesting platforms

## Simplified Implementation

### You Already Have:
✅ Stock data (yfinance)
✅ Technical analysis (RSI, SMA, signals)
✅ AI analysis (NVIDIA NIM agents)
✅ Multi-agent debate system

### Add Step-by-Step:

#### 1. Better Technical Indicators
```python
# Backend/tools/indicators.py
def calculate_macd(close, fast=12, slow=26, signal=9):
    """MACD (Moving Average Convergence Divergence)"""
    ema_fast = close.ewm(span=fast).mean()
    ema_slow = close.ewm(span=slow).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal).mean()
    return macd, signal_line

def calculate_bollinger_bands(close, period=20, std_dev=2):
    """Bollinger Bands for volatility"""
    sma = close.rolling(period).mean()
    std = close.rolling(period).std()
    upper_band = sma + (std * std_dev)
    lower_band = sma - (std * std_dev)
    return upper_band, sma, lower_band
```

#### 2. Portfolio Metrics
```python
# Backend/tools/portfolio.py
def calculate_sharpe_ratio(returns, risk_free_rate=0.06):
    """Sharpe ratio for risk-adjusted returns"""
    excess_returns = returns - risk_free_rate
    return excess_returns.mean() / excess_returns.std()

def calculate_max_drawdown(cumulative_returns):
    """Maximum percentage drop from peak"""
    running_max = cumulative_returns.expanding().max()
    drawdown = (cumulative_returns - running_max) / running_max
    return drawdown.min()
```

#### 3. Backtesting Framework
```python
# Backend/backtesting/backtest.py
class SimpleBacktest:
    def __init__(self, initial_capital=100000):
        self.capital = initial_capital
        self.positions = {}
        self.trades = []
    
    def execute_signal(self, symbol, signal, price):
        """Execute BUY/SELL signals"""
        if signal == "BUY" and symbol not in self.positions:
            shares = self.capital * 0.1 / price  # Risk 10% per trade
            self.positions[symbol] = shares
            self.trades.append({
                "action": "BUY",
                "symbol": symbol,
                "price": price,
                "shares": shares
            })
        elif signal == "SELL" and symbol in self.positions:
            shares = self.positions.pop(symbol)
            profit = (price - self.trades[-1]["price"]) * shares
            self.trades.append({
                "action": "SELL",
                "symbol": symbol,
                "price": price,
                "profit": profit
            })
```

## New Endpoints to Add

### 1. Extended Analysis
```python
@app.get("/analyze-advanced/{symbol}")
async def analyze_advanced(symbol: str):
    """Advanced analysis with indicators, backtest, portfolio"""
    # Technical indicators (MACD, Bollinger, etc.)
    # Historical backtest results
    # Risk metrics (Sharpe, Sortino, Max Drawdown)
    # Optimal entry/exit points
```

### 2. Backtesting
```python
@app.post("/backtest")
async def run_backtest(symbols: list, start_date: str, end_date: str):
    """Backtest strategy on historical data"""
    # Run simulation
    # Calculate metrics
    # Return performance
```

### 3. Portfolio Analysis
```python
@app.post("/portfolio-analysis")
async def analyze_portfolio(holdings: dict):
    """Analyze portfolio of stocks"""
    # Diversification metrics
    # Risk/return analysis
    # Correlation analysis
    # Rebalancing suggestions
```

## Integration Timeline

### Week 1: Setup (What you need NOW)
- ✅ Fix search (DONE)
- ✅ Frontend API integration (DONE)
- [ ] Deploy frontend to Vercel
- [ ] Test API endpoints

### Week 2: Enhanced Features
- [ ] Add technical indicators (MACD, Bollinger)
- [ ] Improve agent prompts
- [ ] Add watchlist persistence

### Week 3: Advanced Analysis
- [ ] Backtesting framework
- [ ] Portfolio analyzer
- [ ] Risk metrics

### Week 4: Production Ready
- [ ] Performance optimization
- [ ] Caching improvements
- [ ] User feedback implementation

## Testing Your NVIDIA NIM Setup

```bash
# Test NVIDIA NIM is working
python -c "
from openai import OpenAI
import os

client = OpenAI(
    base_url='https://integrate.api.nvidia.com/v1',
    api_key=os.getenv('NVIDIA_API_KEY')
)

response = client.chat.completions.create(
    model='meta/llama-3.1-405b-instruct',
    messages=[{'role': 'user', 'content': 'Hello!'}],
    temperature=0.7,
    max_tokens=100
)

print(response.choices[0].message.content)
"
```

## Cost Breakdown

### FREE (What you're using):
- ✅ yfinance - Free stock data
- ✅ NVIDIA NIM - Free tier available
- ✅ Render - Free tier with your app
- ✅ Vercel - Free frontend hosting

### OPTIONAL (If you want):
- Optional: OpenAI ($0.30/1M tokens) - Backup to NVIDIA
- Optional: Premium data APIs - More data sources
- Optional: Premium backtesting - More advanced analysis

## Current System Architecture

```
                    ┌─────────────────┐
                    │   USER BROWSER  │
                    └────────┬────────┘
                             │
                   ┌─────────┴─────────┐
                   │   VERCEL DEPLOY   │
                   │  (frontend.next)  │
                   └────────┬──────────┘
                            │ HTTPS
                   ┌────────┴──────────┐
                   │ RENDER BACKEND    │
                   │ (FastAPI + Python)│
                   └────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼─────┐  ┌─────────▼────────┐  ┌──────▼──────┐
   │ yfinance  │  │ NVIDIA NIM API   │  │ Cache Layer │
   │ (free)    │  │ (free tier)      │  │ (Redis opt) │
   └──────────┘  └──────────────────┘  └─────────────┘
        │                  │
   ┌────▼─────┐      ┌─────▼────┐
   │Stock Data│      │AI Agents │
   │- Price   │      │- Signals │
   │- History │      │- Analysis│
   │- Metrics │      │- Reports │
   └──────────┘      └──────────┘
```

## Files to Keep & Modify

### Core Files (MODIFY):
- Backend/main.py - Already enhanced ✅
- frontend/src/App.jsx - Already integrated ✅
- frontend/src/api.js - Already created ✅

### New Files (CREATE):
- Backend/agents/ - Put your AI agents here
- Backend/backtesting/ - Add backtesting logic
- Backend/tools/ - Add indicators, portfolio tools
- Backend/data/ - Enhanced data fetching
- Backend/llm/ - NVIDIA NIM + other LLM configs

### Keep As-Is:
- Requirements.txt
- Package.json
- Vite config
- CSS styles

---

**Summary**: Your system is already 90% there. Just add technical indicators, backtesting, and improved agent prompts. You don't need financial APIs because yfinance + NVIDIA NIM gives you everything needed for analysis!
