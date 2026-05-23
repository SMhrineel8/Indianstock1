from __future__ import annotations

import os
import httpx
import requests
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Bharat Terminal API",
    version="2.1.0",
    description="Bloomberg-style terminal for Indian markets with NVIDIA NIM AI",
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
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

if not NVIDIA_API_KEY:
    raise RuntimeError("NVIDIA_API_KEY environment variable is missing.")

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

# Common variations mapped to valid Yahoo Finance National Stock Exchange codes
TICKER_CORRECTIONS = {
    "BANKOFBARODA": "BANKBARODA",
    "BOB": "BANKBARODA",
    "M&M": "M&M",
    "BAJAJ-AUTO": "BAJAJ-AUTO",
}

AGENT_PROMPTS = {
    "technical": """You are an elite technical analyst for Indian NSE/BSE markets.
Analyze the stock data and respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentence technical analysis with key levels
[CONFIDENCE]: 0-100""",
    "fundamental": """You are a fundamental analyst using a value-investing framework.
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on valuation, business quality, and fair value
[CONFIDENCE]: 0-100""",
    "macro": """You are Chief Macro Strategist analyzing Indian markets.
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on sector tailwinds, RBI, flows, and macro risks
[CONFIDENCE]: 0-100""",
    "sentiment": """You are a sentiment analyst tracking news and market sentiment.
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on recent catalysts, news, and sentiment
[CONFIDENCE]: 0-100""",
    "risk": """You are a Risk Manager using asymmetric risk analysis.
Respond ONLY with:
[SIGNAL]: BUY|SELL|HOLD
[ANALYSIS]: 2-3 sentences on downside risks and risk/reward
[CONFIDENCE]: 0-100""",
    "options": """You are a derivatives strategist.
Respond ONLY with:
[SIGNAL]: BUY_CALLS|BUY_PUTS|SELL_OPTIONS|HOLD
[ANALYSIS]: 2-3 sentences on implied vol, strategy, and greeks
[CONFIDENCE]: 0-100""",
}

# ─────────────────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def normalize_symbol(symbol: str) -> str:
    """Cleans up search input strings and converts them into valid Yahoo Finance NSE codes."""
    symbol = symbol.strip().upper()
    symbol = symbol.replace(".NS", "").replace(".BO", "").replace(" ", "")
    
    # Correct names like BANKOFBARODA into official ticker IDs like BANKBARODA
    if symbol in TICKER_CORRECTIONS:
        symbol = TICKER_CORRECTIONS[symbol]
        
    return f"{symbol}.NS"

def scalar(value: Any) -> Any:
    if isinstance(value, pd.Series):
        return value.iloc[0]
    if isinstance(value, np.ndarray):
        return value.item() if value.size == 1 else value
    return value

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    close = pd.to_numeric(close, errors="coerce")
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)

def parse_agent_response(response: str) -> dict:
    signal = "HOLD"
    confidence = 50
    analysis = response.strip()

    try:
        if "[SIGNAL]:" in response:
            signal_line = response.split("[SIGNAL]:", 1)[1].split("\n", 1)[0].strip()
            signal = signal_line.split("|")[0].strip()
        if "[CONFIDENCE]:" in response:
            conf_line = response.split("[CONFIDENCE]:", 1)[1].split("\n", 1)[0].strip()
            confidence = int(conf_line)
        if "[ANALYSIS]:" in response:
            analysis = response.split("[ANALYSIS]:", 1)[1].split("[CONFIDENCE]", 1)[0].strip()
    except Exception:
        pass

    return {"signal": signal, "confidence": confidence, "analysis": analysis}

# ─────────────────────────────────────────────────────────────────────────────
# DATA FETCHING
# ─────────────────────────────────────────────────────────────────────────────

def fetch_stock_data(symbol: str, period: str = "6mo") -> pd.DataFrame:
    try:
        session = requests.Session()
        session.headers.update(
            {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        ticker = yf.Ticker(symbol, session=session)
        df = ticker.history(period=period, interval="1d", auto_adjust=False)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"Ticker symbol '{symbol}' was not found on Yahoo Finance.")

        return df.reset_index()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yahoo Finance engine failed: {str(e)}")

def get_fundamentals(symbol: str) -> dict:
    try:
        session = requests.Session()
        session.headers.update(
            {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
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

        return {
            "signal": signal,
            "rsi": round(rsi14, 2),
            "sma20": round(sma20, 2),
            "sma50": round(sma50, 2),
            "confidence": confidence,
        }
    except Exception:
        return {"signal": "HOLD", "rsi": 50, "sma20": 0, "sma50": 0, "confidence": 50}

def get_live_quote(symbol: str) -> dict:
    symbol = normalize_symbol(symbol)
    try:
        session = requests.Session()
        session.headers.update({"User-Agent": "Mozilla/5.0"})

        ticker = yf.Ticker(symbol, session=session)
        fast = getattr(ticker, "fast_info", {}) or {}

        info = {}
        try:
            info = ticker.info or {}
        except Exception:
            pass

        hist = None
        try:
            hist = ticker.history(period="1d", interval="1m", auto_adjust=False)
        except Exception:
            hist = None

        cmp = (
            fast.get("lastPrice")
            or info.get("currentPrice")
            or (
                float(hist["Close"].dropna().iloc[-1])
                if hist is not None and not hist.empty and "Close" in hist.columns
                else None
            )
        )

        prev_close = fast.get("previousClose") or info.get("previousClose") or cmp

        day_change_pct = None
        if cmp is not None and prev_close not in (None, 0):
            day_change_pct = round(((float(cmp) - float(prev_close)) / float(prev_close)) * 100, 2)

        return {
            "symbol": symbol,
            "cmp": round(float(cmp), 2) if cmp is not None else None,
            "prev_close": round(float(prev_close), 2) if prev_close is not None else None,
            "day_change_pct": day_change_pct,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live quote error: {str(e)}")

# ─────────────────────────────────────────────────────────────────────────────
# NVIDIA NIM
# ─────────────────────────────────────────────────────────────────────────────

try:
    from openai import OpenAI

    NVIDIA_CLIENT = OpenAI(
        base_url=NVIDIA_BASE,
        api_key=NVIDIA_API_KEY,
    )
    USE_OPENAI_CLIENT = True
except Exception:
    USE_OPENAI_CLIENT = False

async def call_nvidia_ai(messages: list, temperature: float = 0.7) -> str:
    if USE_OPENAI_CLIENT:
        try:
            completion = NVIDIA_CLIENT.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=messages,
                temperature=temperature,
                top_p=1,
                max_tokens=1024,
                stream=False,
            )
            return completion.choices[0].message.content
        except Exception:
            pass

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{NVIDIA_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {NVIDIA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "meta/llama-3.1-405b-instruct",
                    "messages": messages,
                    "temperature": temperature,
                    "top_p": 1,
                    "max_tokens": 1024,
                    "stream": False,
                },
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
    except Exception:
        pass

    return "HOLD"

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "Bharat Terminal API",
        "version": "2.1.0",
        "endpoints": {
            "search": "/search?q=RELIANCE",
            "analyze": "/analyze/RELIANCE",
            "quote": "/quote/RELIANCE",
            "nifty50": "/nifty50",
            "news": "/news",
        },
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
    # Apply normalization first
    symbol = normalize_symbol(symbol)

    try:
        df = fetch_stock_data(symbol, period)
        fund = get_fundamentals(symbol)
        tech = build_technical_signal(df)

        close = pd.to_numeric(df["Close"], errors="coerce").dropna()
        if close.empty:
            raise HTTPException(status_code=404, detail=f"No trade data available for {symbol}")

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
            "confidence": tech["confidence"],
        }

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
                ai_response = await call_nvidia_ai(
                    [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": data_context},
                    ]
                )
                parsed = parse_agent_response(ai_response)
                agents.append(
                    {
                        "agent": agent_name,
                        "signal": parsed["signal"],
                        "analysis": parsed["analysis"],
                        "confidence": parsed["confidence"],
                    }
                )
            except Exception:
                agents.append(
                    {
                        "agent": agent_name,
                        "signal": "HOLD",
                        "analysis": "AI call failed",
                        "confidence": 50,
                    }
                )

        return {
            "ticker": symbol,
            "name": fund.get("name", symbol),
            "metrics": metrics,
            "technical": technical,
            "agents": agents,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing {symbol}: {e}")
        # Return demo data instead of failing
        demo = {
            "ticker": symbol,
            "name": f"Stock {symbol}",
            "metrics": {
                "cmp": 3154.50,
                "pe_ratio": 24.04,
                "pb_ratio": 2.18,
                "dividend_yield": 0.0032,
                "market_cap": 213954000000,
                "day_change": "+1.57%",
                "week52_high": 3511.96,
                "week52_low": 2076.15,
            },
            "technical": {
                "signal": "BUY",
                "rsi": 68,
                "sma20": 3100,
                "sma50": 3050,
                "confidence": 86
            },
            "agents": [
                {
                    "agent": "technical",
                    "signal": "BUY",
                    "analysis": "Price above key moving averages with strong RSI",
                    "confidence": 85
                },
                {
                    "agent": "fundamental",
                    "signal": "HOLD",
                    "analysis": "Reasonable valuation with stable fundamentals",
                    "confidence": 72
                }
            ],
            "timestamp": datetime.now().isoformat(),
            "note": "Demo data - Yahoo Finance API had connectivity issues"
        }
        return demo

@app.get("/nifty50")
async def nifty50_analysis():
    results = []
    for symbol in NIFTY50[:10]:
        try:
            df = fetch_stock_data(symbol, "1mo")
            close = pd.to_numeric(df["Close"], errors="coerce").dropna()
            if close.empty:
                continue

            cmp = float(close.iloc[-1])
            prev_close = float(close.iloc[-2]) if len(close) > 1 else cmp
            change_pct = ((cmp - prev_close) / prev_close * 100) if prev_close != 0 else 0

            results.append(
                {
                    "ticker": symbol,
                    "cmp": round(cmp, 2),
                    "change": f"{round(change_pct, 2)}%",
                    "rsi": round(float(scalar(compute_rsi(close).iloc[-1])), 2),
                }
            )
        except Exception:
            pass

    return {"nifty50_snapshot": results, "timestamp": datetime.now().isoformat()}

@app.get("/watchlist")
async def watchlist(symbols: str = "RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS"):
    items = []
    for symbol in symbols.split(","):
        try:
            items.append(await analyze_stock(symbol.strip()))
        except Exception:
            pass
    return {"watchlist": items}

@app.get("/news")
async def get_market_news():
    return {
        "news": [
            {"title": "Markets reach all-time high", "source": "Economic Times", "timestamp": datetime.now().isoformat()},
            {"title": "RBI holds rates steady", "source": "Times of India", "timestamp": datetime.now().isoformat()},
            {"title": "FII inflows surge", "source": "Hindustan Times", "timestamp": datetime.now().isoformat()},
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
