"""
Bharat Terminal - AI Institutional Intelligence Backend
FastAPI + Python + NVIDIA NIM + Yahoo Finance
"""

from __future__ import annotations
import os, re, json, httpx
from datetime import datetime
from typing import List, Optional, AsyncGenerator
import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Bharat Terminal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "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")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

# ── In-memory stores ──────────────────────────────────────────────────────────
TELEGRAM_CALLS: list[dict] = []

NIFTY50 = [
    "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK",
    "HINDUNILVR","ITC","SBIN","BAJFINANCE","BHARTIARTL",
    "WIPRO","LT","AXISBANK","ASIANPAINT","MARUTI",
    "TITAN","SUNPHARMA","ULTRACEMCO","NESTLEIND","TECHM",
    "POWERGRID","NTPC","TATAMOTORS","ONGC","HCLTECH",
    "JSWSTEEL","TATASTEEL","INDUSINDBK","DRREDDY","DIVISLAB",
    "CIPLA","HINDALCO","COALINDIA","BAJAJFINSV","ADANIENT",
    "ADANIPORTS","TATACONSUM","SBILIFE","HDFC","APOLLOHOSP",
]

# ── Agent Prompts ─────────────────────────────────────────────────────────────

AGENT_PROMPTS = {
    "technical": """You are an elite technical analyst for Indian markets (NSE/BSE).
Analyze the given stock data and provide:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Key Technical Observations (3 bullet points)
3. Entry Zone: ₹X - ₹Y | Stop Loss: ₹X | Target 1: ₹X | Target 2: ₹X
4. RSI Analysis | SMA Trend | Volume Trend
Keep it institutional-grade and sharp.""",

    "fundamental": """You are a senior fundamental analyst (JPMorgan India Research).
Embody the Warren Buffett + Rakesh Jhunjhunwala framework for Indian markets.
Provide:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Valuation Assessment (overvalued/fair/undervalued)
3. Key Business Drivers (3 bullets)
4. Estimated Fair Value in INR
5. Investment Grade: A/B/C""",

    "macro": """You are Chief Macro Strategist at Bridgewater Associates (India desk).
For the given Indian stock, analyze:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Macro Tailwinds for this sector
3. FII/DII Flow Implications
4. RBI Rate Cycle Impact
5. Global Macro Risks (USD/INR, crude, Fed)
Be institutional-grade and precise.""",

    "sentiment": """You are a sentiment intelligence analyst for Indian markets.
Analyze:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Overall Market Sentiment: Bullish/Bearish/Neutral (score 0-100)
3. Recent News Catalysts
4. Social/Reddit Sentiment Summary
5. Institutional vs Retail Sentiment Divergence
Be data-driven and sharp.""",

    "risk": """You are a Risk Manager at a top Indian hedge fund (Nassim Taleb framework).
Assess:
1. Risk Level: LOW / MEDIUM / HIGH / EXTREME
2. Key Risk Factors (3 bullets: regulatory, market, execution)
3. Max Recommended Position: X% of portfolio
4. Worst-Case Scenario
5. Risk-Adjusted Verdict: Worth the risk? Yes/No/Maybe
Use asymmetric risk thinking.""",

    "options": """You are an institutional derivatives strategist (Citadel India desk).
For this stock's options market:
1. Options Signal: BUY CALLS / BUY PUTS / SELL OPTIONS / HOLD
2. Implied Volatility Assessment: High/Normal/Low
3. Best Strategy for Current Setup
4. Suggested Strike + Expiry
5. Max Profit / Max Loss / Breakeven
6. Greeks that matter most for this trade""",

    "pnf": """You are a Point & Figure chart specialist for Indian markets.
One of very few experts in P&F analysis for NSE/BSE.
Analyze using P&F methodology:
1. Signal: BUY / SELL / HOLD
2. P&F Pattern Detected (Double Top, Triple Bottom, etc.)
3. Box Size and Reversal Recommendation
4. Key Support / Resistance Levels from P&F
5. Price Target from P&F pattern
6. Column Direction: X (bullish) / O (bearish)""",

    "final": """You are the Portfolio Manager at an Indian institutional fund making the FINAL trade decision.
You receive inputs from Technical, Fundamental, Macro, Sentiment, Risk, Options, and P&F agents.
Synthesize ALL signals:

1. FINAL VERDICT: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Confidence Score: XX/100
3. Reasoning: (3-4 sentences synthesizing all agent views)
4. Trade Setup:
   - Entry: ₹X | Stop Loss: ₹X | Target 1: ₹X | Target 2: ₹X
   - Risk:Reward Ratio
5. Suitable For: Aggressive / Moderate / Conservative investors
6. Time Horizon: Intraday / Swing (1-2 weeks) / Positional (1-3 months) / Long-term
7. Position Size: X% of portfolio

This is the institutional decision. Make it count.""",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def compute_rsi(close: pd.Series, period: int = 14) -> float:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.fillna(100).iloc[-1])


def compute_sma(close: pd.Series, period: int) -> Optional[float]:
    if len(close) < period:
        return None
    return float(close.rolling(period).mean().iloc[-1])


def get_signal(price: float, sma20: float, sma50: float, rsi: float) -> dict:
    score = 50
    if sma20 and sma50:
        diff_pct = ((sma20 - sma50) / price) * 100
        score += int(max(min(diff_pct * 3, 20), -20))
    if rsi >= 60:
        score += 12
    elif rsi >= 55:
        score += 6
    elif rsi <= 40:
        score -= 12
    elif rsi <= 45:
        score -= 6
    if sma20 and sma50:
        if sma20 > sma50 and rsi >= 55:
            return {"signal": "BUY", "confidence": min(100, score + 10)}
        if sma20 < sma50 and rsi <= 45:
            return {"signal": "SELL", "confidence": max(0, score - 10)}
    return {"signal": "HOLD", "confidence": max(0, min(100, score))}


async def stream_nvidia(messages: list, system: str = None) -> AsyncGenerator[str, None]:
    if system:
        messages = [{"role": "system", "content": system}] + messages

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST",
            f"{NVIDIA_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
            },
            json={
                "model": "openai/gpt-oss-120b",
                "messages": messages,
                "temperature": 0.7,
                "top_p": 1,
                "max_tokens": 1024,
                "stream": True,
            },
        ) as resp:
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    return
                try:
                    j = json.loads(data)
                    delta = j["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except Exception:
                    pass


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"name": "Bharat Terminal API", "status": "running", "version": "1.0.0"}


@app.get("/api/stock/{symbol}")
async def get_stock(symbol: str):
    """Get stock data + technical indicators from Yahoo Finance"""
    sym = symbol.upper().strip()
    # Try NSE first, then BSE
    for suffix in [".NS", ".BO", ""]:
        try:
            ticker = yf.Ticker(sym + suffix)
            df = ticker.history(period="6mo", interval="1d", auto_adjust=False)
            if df is not None and not df.empty:
                info = ticker.info or {}
                close = df["Close"]
                rsi = compute_rsi(close)
                sma20 = compute_sma(close, 20)
                sma50 = compute_sma(close, 50)
                sma200 = compute_sma(close, 200)
                price = float(close.iloc[-1])
                prev_close = float(close.iloc[-2]) if len(close) > 1 else price
                signal_data = get_signal(price, sma20, sma50, rsi) if sma20 and sma50 else {"signal": "HOLD", "confidence": 50}
                return {
                    "symbol": sym,
                    "suffix": suffix,
                    "name": info.get("longName") or info.get("shortName") or sym,
                    "price": round(price, 2),
                    "prev_close": round(prev_close, 2),
                    "change_pct": round(((price - prev_close) / prev_close) * 100, 2),
                    "open": round(float(df["Open"].iloc[-1]), 2),
                    "high": round(float(df["High"].iloc[-1]), 2),
                    "low": round(float(df["Low"].iloc[-1]), 2),
                    "volume": int(df["Volume"].iloc[-1]),
                    "market_cap": info.get("marketCap"),
                    "pe_ratio": info.get("trailingPE"),
                    "eps": info.get("trailingEps"),
                    "sector": info.get("sector"),
                    "industry": info.get("industry"),
                    "rsi14": round(rsi, 2),
                    "sma20": round(sma20, 2) if sma20 else None,
                    "sma50": round(sma50, 2) if sma50 else None,
                    "sma200": round(sma200, 2) if sma200 else None,
                    "signal": signal_data["signal"],
                    "confidence": signal_data["confidence"],
                    "closes": [round(float(v), 2) for v in close.tail(90).tolist()],
                    "volumes": [int(v) for v in df["Volume"].tail(90).tolist()],
                }
        except Exception as e:
            continue
    raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")


@app.get("/api/stocks/batch")
async def get_batch_stocks(symbols: str = "RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK"):
    """Get multiple stocks at once"""
    syms = [s.strip().upper() for s in symbols.split(",")][:20]
    results = {}
    for sym in syms:
        try:
            ticker = yf.Ticker(sym + ".NS")
            df = ticker.history(period="5d", interval="1d", auto_adjust=False)
            if df is not None and not df.empty:
                close = df["Close"]
                price = float(close.iloc[-1])
                prev = float(close.iloc[-2]) if len(close) > 1 else price
                results[sym] = {
                    "price": round(price, 2),
                    "change_pct": round(((price - prev) / prev) * 100, 2),
                    "closes": [round(float(v), 2) for v in close.tolist()],
                }
        except Exception:
            pass
    return results


@app.post("/api/analyze/{symbol}")
async def analyze_stock_stream(symbol: str, agent: str = "final"):
    """Stream AI analysis for a stock from a specific agent"""
    sym = symbol.upper()
    system_prompt = AGENT_PROMPTS.get(agent, AGENT_PROMPTS["final"])

    # Try to get stock data for context
    context = f"Stock: {sym} (NSE India)"
    try:
        ticker = yf.Ticker(sym + ".NS")
        df = ticker.history(period="3mo", interval="1d", auto_adjust=False)
        if df is not None and not df.empty:
            close = df["Close"]
            price = float(close.iloc[-1])
            prev = float(close.iloc[-2]) if len(close) > 1 else price
            rsi = compute_rsi(close)
            sma20 = compute_sma(close, 20)
            sma50 = compute_sma(close, 50)
            info = ticker.info or {}
            context = f"""Stock: {info.get('longName', sym)} ({sym})
Exchange: NSE India
Current Price: ₹{price:.2f}
Change: {((price - prev) / prev * 100):.2f}%
52W High: ₹{info.get('fiftyTwoWeekHigh', 'N/A')}
52W Low: ₹{info.get('fiftyTwoWeekLow', 'N/A')}
RSI (14): {rsi:.1f}
SMA 20: ₹{sma20:.2f if sma20 else 'N/A'}
SMA 50: ₹{sma50:.2f if sma50 else 'N/A'}
Volume Today: {int(df['Volume'].iloc[-1]):,}
Market Cap: ₹{info.get('marketCap', 0) / 1e7:.0f} Cr
P/E Ratio: {info.get('trailingPE', 'N/A')}
Sector: {info.get('sector', 'N/A')}
Industry: {info.get('industry', 'N/A')}"""
    except Exception:
        pass

    async def generate():
        async for chunk in stream_nvidia(
            [{"role": "user", "content": f"Analyze this Indian stock now:\n\n{context}"}],
            system=system_prompt,
        ):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/chat")
async def chat_stream(payload: dict):
    """Stream chat response from AI copilot"""
    messages = payload.get("messages", [])
    system = """You are an elite Indian stock market AI assistant — the best in the business.
You have deep expertise in NSE, BSE, F&O, derivatives, technical analysis, fundamental analysis, macro, and quantitative strategies.
You embody the best of: Warren Buffett, Rakesh Jhunjhunwala, Aswath Damodaran, Michael Burry, and Nassim Taleb — all applied to Indian markets.
The user is 26 years old, based in India, actively trading NSE/BSE, wants to make profit.
Always give: specific stock names, price levels, entry/exit zones, risk management, and actionable insights.
Be institutional-grade but clear."""

    async def generate():
        async for chunk in stream_nvidia(messages, system=system):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/market/overview")
async def market_overview():
    """Get overall market data"""
    indices = {
        "NIFTY50": "^NSEI",
        "SENSEX": "^BSESN",
        "NIFTYBANK": "^NSEBANK",
        "NIFTYMIDCAP": "NIFTYMIDCAP100.NS",
        "VIX": "^INDIAVIX",
    }
    result = {}
    for name, ticker_sym in indices.items():
        try:
            t = yf.Ticker(ticker_sym)
            df = t.history(period="2d", interval="1d")
            if df is not None and not df.empty:
                price = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2]) if len(df) > 1 else price
                result[name] = {
                    "price": round(price, 2),
                    "change_pct": round(((price - prev) / prev) * 100, 2),
                }
        except Exception:
            pass
    return result


# ── Telegram Calls ────────────────────────────────────────────────────────────

class TelegramCall(BaseModel):
    channel: str
    call: str
    call_type: str = "BUY"


@app.get("/api/telegram/calls")
async def get_telegram_calls():
    return TELEGRAM_CALLS


@app.post("/api/telegram/calls")
async def add_telegram_call(payload: TelegramCall):
    call = {
        "channel": payload.channel,
        "call": payload.call,
        "call_type": payload.call_type,
        "time": datetime.now().strftime("%H:%M"),
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    TELEGRAM_CALLS.insert(0, call)
    return {"status": "added", "call": call}


# ── News (scraped headlines) ──────────────────────────────────────────────────

@app.get("/api/news")
async def get_news():
    """Return curated news for Indian markets"""
    # In production, connect to NewsAPI or scrape TOI/HT/ET
    return [
        {"title": "RBI holds repo rate, signals accommodative stance for growth", "source": "Times of India", "time": "2h ago", "impact": "positive", "stocks": ["SBIN", "HDFCBANK", "ICICIBANK"]},
        {"title": "Reliance Industries unveils ₹75,000 Cr green energy capex plan", "source": "Hindustan Times", "time": "3h ago", "impact": "positive", "stocks": ["RELIANCE"]},
        {"title": "IT sector Q4 results: TCS, Infosys beat estimates", "source": "Economic Times", "time": "4h ago", "impact": "positive", "stocks": ["TCS", "INFY"]},
        {"title": "FII inflows surge ₹8,200 Cr as global risk appetite returns", "source": "Mint", "time": "5h ago", "impact": "positive", "stocks": ["NIFTY"]},
        {"title": "Adani Group stocks under pressure after short-seller report", "source": "NDTV Business", "time": "6h ago", "impact": "negative", "stocks": ["ADANIENT", "ADANIPORTS"]},
        {"title": "SEBI tightens F&O rules: New position limits from next month", "source": "Business Standard", "time": "8h ago", "impact": "neutral", "stocks": ["ALL"]},
        {"title": "Auto sector sees strong retail sales in March, Maruti leads", "source": "ET Auto", "time": "10h ago", "impact": "positive", "stocks": ["MARUTI", "TATAMOTORS"]},
        {"title": "Pharma sector on watch: US FDA inspection results expected", "source": "Pharma Times", "time": "12h ago", "impact": "neutral", "stocks": ["SUNPHARMA", "DRREDDY", "CIPLA"]},
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
