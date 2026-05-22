import os
from openai import OpenAI

def generate_stock_summary(ticker: str, metrics: dict) -> str:
    # Looks up the environment variable KEYS configured on your Render dashboard
    api_key = os.getenv("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")
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

    if not api_key:
        return "AI Summary unavailable: NVIDIA_API_KEY missing from environment configuration."

    client = OpenAI(
        base_url=base_url,
        api_key=api_key
    )

    # Clean multi-line string configuration passing raw metrics directly into the LLM agents
    prompt = f"""ROLE & CONTEXT:
You are an elite multi-agent quantitative consensus system embedded inside the "BHARAT_MARKET_TERMINAL_MVP". Your job is to process financial numbers and generate definitive institutional-grade outlooks.

CURRENT TICKER DATA UNDER ANALYSIS:
Asset Ticker Target: {ticker}
Current Metric Payload Matrix: {metrics}

CORE AGENT PARAMETERS TO SIMULATE & COMBINE:
1. Aswath Damodaran Agent: Evaluate intrinsic valuation trends based on the current pricing parameters.
2. Rakesh Jhunjhunwala Agent: Judge macro momentum, underlying growth catalysts, and long-term positioning for the Indian market landscape.
3. Technicals Agent: Analyze SMA crossovers, RSI thresholds, and potential breakout levels.
4. Sentiment & News Agent: Weigh overall sentiment data derived from media outlets (Hindustan Times / Times of India) relative to this asset class.
5. Risk Manager Agent: Quantify tail risks, historical volatility metrics, and specify defense bounds.

STRATEGY MATCHING REQUIREMENT:
Synthesize data points against core strategy patterns (e.g., Bull Call/Put Spreads, Long Straddles, or Moving Average crossovers).

OUTPUT INSTRUCTION:
Provide a razor-sharp, professional market outlook summary for {ticker}. Combine the insights of all agents into an actionable verdict. Do not include raw markdown placeholders."""

    try:
        completion = client.chat.completions.create(
            model="nvidia/llama-3.1-nemotron-70b-instruct",  # Updated to a valid NVIDIA model name format
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000,
            stream=False  # Set to False inside an API endpoint for a structured clean return string
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"NVIDIA NIM Engine Exception error encountered: {str(e)}"
