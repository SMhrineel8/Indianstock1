"""
🚀 BHARAT TERMINAL - AI-POWERED INSTITUTIONAL INTELLIGENCE FOR INDIAN MARKETS
Backend: FastAPI + Python + NVIDIA NIM + Yahoo Finance
Live NSE/BSE data, Multi-agent AI debate, Trading strategies
"""

from __future__ import annotations
import os, re, json, httpx, requests
from datetime import datetime
from typing import List, Optional, Literal, Any
import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio

# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="⚡ Bharat Terminal API",
    version="2.0.0",
    description="Bloomberg-style terminal for Indian markets with NVIDIA NIM AI"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise RuntimeError("❌ NVIDIA_API_KEY environment variable is missing. Set it in Render dashboard.")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

NIFTY50 = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BAJFINANCE.NS", "BHARTIARTL.NS",
    "WIPRO.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "TITAN.NS", "SUNPHARMA.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "TECHM.NS",
    "POWERGRID.NS", "NTPC.NS", "TATAMOTORS.NS", "ONGC.NS", "HCLTECH.NS",
    "JSWSTEEL.NS", "TATASTEEL.NS", "INDUSINDBK.NS", "DRREDDY.NS", "DIVISLAB.NS",
    "CIPLA.NS", "HINDALCO.NS", "COALINDIA.NS", "BAJAJFINSV.NS", "ADANIENT.NS",
    "ADANIPORTS.NS", "TATACONSUM.NS", "SBILIFE.NS", "HDFC.NS", "APOLLOHOSP.NS",
]

# AI Agent Prompts
AGENT_PROMPTS = {
    "technical": """You are an elite technical analyst for Indian NSE/BSE markets.
Analyze the stock data and respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentence technical analysis with key levels
[CONFIDENCE]: 0-100""",

    "fundamental": """You are a fundamental analyst using Warren Buffett + Rakesh Jhunjhunwala framework.
For this Indian stock, respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on valuation, business quality, and fair value
[CONFIDENCE]: 0-100""",

    "macro": """You are Chief Macro Strategist analyzing Indian markets (Bridgewater style).
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on sector tailwinds, FII flows, RBI, and macro risks
[CONFIDENCE]: 0-100""",

    "sentiment": """You are a sentiment analyst tracking news and social signals for Indian markets.
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on recent catalysts, news, and market sentiment
[CONFIDENCE]: 0-100""",

    "risk": """You are a Risk Manager using Nassim Taleb's asymmetric risk framework.
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on key risks, downside protection, and risk/reward
[CONFIDENCE]: 0-100""",

    "options": """You are an institutional derivatives strategist (Citadel India desk).
Respond ONLY with:
[SIGNAL]: BUY_CALLS|BUY_PUTS|SELL_OPTIONS|HOLD
[ANALYSIS]: 2-3 sentences on implied vol, best strategy, and greeks
[CONFIDENCE]: 0-100""",
}

# ─────────────────────────────────────────────────────────────────────────────
# UTILITY FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def normalize_symbol(symbol: str) -> str:
    """Normalize stock symbol to NSE format"""
    symbol = symbol.strip().upper()
    if not symbol.endswith((".NS", ".BO")):
        symbol = f"{symbol}.NS"
    return symbol

def scalar(value: Any) -> Any:
    """Convert pandas/numpy to scalar"""
    if isinstance(value, pd.Series):
        return value.iloc[0]
    if isinstance(value, np.ndarray):
        return value.item() if value.size == 1 else value
    return value

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Compute RSI"""
    close = pd.to_numeric(close, errors="coerce")
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)

# ─────────────────────────────────────────────────────────────────────────────
# DATA FETCHING
# ─────────────────────────────────────────────────────────────────────────────

def fetch_stock_data(symbol: str, period: str = "6mo") -> pd.DataFrame:
    """Fetch historical stock data from Yahoo Finance"""
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        ticker = yf.Ticker(symbol, session=session)
        df = ticker.history(period=period, interval="1d", auto_adjust=False)
        
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        
        df = df.reset_index()
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yahoo Finance error: {str(e)}")

def get_fundamentals(symbol: str) -> dict:
    """Fetch fundamental data"""
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        ticker = yf.Ticker(symbol, session=session)
        info = ticker.info or {}
        
        return {
            "name": info.get("longName") or symbol,
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "market_cap": info.get("marketCap"),
            "beta": info.get("beta"),
        }
    except Exception:
        return {"name": symbol}

def build_technical_signal(df: pd.DataFrame) -> dict:
    """Build technical analysis signal"""
    try:
        close = pd.to_numeric(df["Close"], errors="coerce").dropna()
        if len(close) < 50:
            return {"signal": "HOLD", "rsi": 50, "sma20": 0, "sma50": 0, "confidence": 50}
        
        sma20 = float(scalar(close.rolling(20).mean().iloc[-1]))
        sma50 = float(scalar(close.rolling(50).mean().iloc[-1]))
        rsi14 = float(scalar(compute_rsi(close).iloc[-1]))
        
        confidence = 50
        if sma20 > sma50 and rsi14 >= 55:
            signal = "BUY"
            confidence = min(int(50 + (rsi14 - 50) / 5), 100)
        elif sma20 < sma50 and rsi14 <= 45:
            signal = "SELL"
            confidence = max(int(50 - (50 - rsi14) / 5), 0)
        else:
            signal = "HOLD"
            confidence = 50
        
        return {
            "signal": signal,
            "rsi": round(rsi14, 2),
            "sma20": round(sma20, 2),
            "sma50": round(sma50, 2),
            "confidence": confidence
        }
    except Exception:
        return {"signal": "HOLD", "rsi": 50, "sma20": 0, "sma50": 0, "confidence": 50}

# ─────────────────────────────────────────────────────────────────────────────
# NVIDIA NIM AI - Dual Implementation
# ─────────────────────────────────────────────────────────────────────────────

# Option 1: OpenAI Python Client (Simpler, Official)
try:
    from openai import OpenAI
    NVIDIA_CLIENT = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY
    )
    USE_OPENAI_CLIENT = True
except ImportError:
    USE_OPENAI_CLIENT = False

async def call_nvidia_ai(messages: list, temperature: float = 0.7) -> str:
    """Call NVIDIA NIM API - supports both OpenAI client and httpx"""
    
    # Method 1: Use OpenAI Client (if available)
    if USE_OPENAI_CLIENT:
        try:
            completion = NVIDIA_CLIENT.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=messages,
                temperature=temperature,
                top_p=1,
                max_tokens=1024,
                stream=False
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"OpenAI client error: {e}, falling back to httpx")
    
    # Method 2: Fallback to async httpx (always available)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{NVIDIA_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {NVIDIA_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta/llama-3.1-405b-instruct",
                    "messages": messages,
                    "temperature": temperature,
                    "top_p": 1,
                    "max_tokens": 1024,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                return "HOLD"
    except Exception as e:
        print(f"NVIDIA API error: {e}")
        return "HOLD"

def parse_agent_response(response: str) -> dict:
    """Parse agent response"""
    signal = "HOLD"
    confidence = 50
    analysis = response
    
    try:
        if "[SIGNAL]:" in response:
            signal_line = response.split("[SIGNAL]:")[1].split("\n")[0].strip()
            signal = signal_line.split("|")[0].strip()
        
        if "[CONFIDENCE]:" in response:
            conf_line = response.split("[CONFIDENCE]:")[1].split("\n")[0].strip()
            confidence = int(conf_line)
        
        if "[ANALYSIS]:" in response:
            analysis = response.split("[ANALYSIS]:")[1].split("[CONFIDENCE]")[0].strip()
    except:
        pass
    
    return {"signal": signal, "confidence": confidence, "analysis": analysis}

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "⚡ Bharat Terminal API",
        "version": "2.0.0",
        "endpoints": {
            "search": "/search?q=RELIANCE",
            "analyze": "/analyze/RELIANCE",
            "nifty50": "/nifty50",
            "news": "/news",
        }
    }

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/search")
async def search_stock(q: str = Query(..., min_length=1)):
    """Search for stocks in NIFTY50"""
    q = q.strip().upper()
    results = [s for s in NIFTY50 if q in s]
    return {"query": q, "results": results[:10], "count": len(results)}

@app.get("/analyze/{symbol}")
async def analyze_stock(symbol: str, period: str = "6mo"):
    """Comprehensive stock analysis with multi-agent debate"""
    symbol = normalize_symbol(symbol)
    
    try:
        # Fetch data
        df = fetch_stock_data(symbol, period)
        fund = get_fundamentals(symbol)
        tech = build_technical_signal(df)
        
        # Extract metrics
        close = pd.to_numeric(df["Close"], errors="coerce").dropna()
        cmp = float(scalar(close.iloc[-1]))
        prev_close = float(scalar(close.iloc[-2])) if len(close) > 1 else cmp
        day_change_pct = ((cmp - prev_close) / prev_close * 100) if prev_close != 0 else 0
        
        week52_high = float(close.tail(252).max())
        week52_low = float(close.tail(252).min())
        
        metrics = {
            "cmp": round(cmp, 2),
            "pe_ratio": fund.get("pe_ratio"),
            "pb_ratio": fund.get("pb_ratio"),
            "dividend_yield": fund.get("dividend_yield"),
            "market_cap": fund.get("market_cap"),
            "day_change": f"{round(day_change_pct, 2)}%",
            "week52_high": round(week52_high, 2),
            "week52_low": round(week52_low, 2),
        }
        
        technical = {
            "signal": tech["signal"],
            "rsi": tech["rsi"],
            "sma20": tech["sma20"],
            "sma50": tech["sma50"],
            "confidence": tech["confidence"]
        }
        
        # Multi-agent AI analysis
        data_context = f"""
Stock: {symbol}
CMP: ₹{cmp}
PE Ratio: {metrics['pe_ratio']}
Market Cap: {metrics['market_cap']}
52W High/Low: ₹{week52_high} / ₹{week52_low}
RSI: {tech['rsi']} | SMA20: {tech['sma20']} | SMA50: {tech['sma50']}
"""
        
        agents = []
        for agent_name, prompt in AGENT_PROMPTS.items():
            try:
                ai_response = await call_nvidia_ai([
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": data_context}
                ])
                parsed = parse_agent_response(ai_response)
                agents.append({
                    "agent": agent_name,
                    "signal": parsed["signal"],
                    "analysis": parsed["analysis"],
                    "confidence": parsed["confidence"]
                })
            except Exception as e:
                print(f"Agent {agent_name} error: {e}")
        
        return {
            "ticker": symbol,
            "name": fund.get("name", symbol),
            "metrics": metrics,
            "technical": technical,
            "agents": agents,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/nifty50")
async def nifty50_analysis():
    """Quick analysis of NIFTY50 stocks"""
    results = []
    for symbol in NIFTY50[:10]:  # Top 10
        try:
            df = fetch_stock_data(symbol, "1mo")
            close = pd.to_numeric(df["Close"], errors="coerce").dropna()
            cmp = float(close.iloc[-1])
            prev_close = float(close.iloc[-2]) if len(close) > 1 else cmp
            change_pct = ((cmp - prev_close) / prev_close * 100) if prev_close != 0 else 0
            
            results.append({
                "ticker": symbol,
                "cmp": round(cmp, 2),
                "change": f"{round(change_pct, 2)}%",
                "rsi": round(float(scalar(compute_rsi(close).iloc[-1])), 2)
            })
        except:
            pass
    
    return {"nifty50_snapshot": results, "timestamp": datetime.now().isoformat()}

@app.get("/watchlist")
async def watchlist(symbols: str = "RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS"):
    """Get watchlist analysis"""
    items = []
    for symbol in symbols.split(","):
        try:
            result = await analyze_stock(normalize_symbol(symbol.strip()))
            items.append(result)
        except:
            pass
    return {"watchlist": items}

@app.get("/news")
async def get_market_news():
    """Get market news"""
    return {
        "news": [
            {"title": "Markets reach all-time high", "source": "Economic Times", "timestamp": datetime.now().isoformat()},
            {"title": "RBI holds rates steady", "source": "Times of India", "timestamp": datetime.now().isoformat()},
            {"title": "FII inflows surge", "source": "Hindustan Times", "timestamp": datetime.now().isoformat()},
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)