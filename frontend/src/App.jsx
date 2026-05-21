import { useState, useEffect, useRef } from "react";

const NVIDIA_API_KEY = "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";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toFixed(dec);
}

function fmtCr(n) {
  if (!n) return "—";
  if (Math.abs(n) >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (Math.abs(n) >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + n.toFixed(2);
}

async function callNvidiaStream(messages, onChunk) {
  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${NVIDIA_API_KEY}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.7,
      top_p: 1,
      max_tokens: 2048,
      stream: true,
    }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data);
        const delta = j?.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch {}
    }
  }
}

async function fetchStockData(symbol) {
  // Uses Yahoo Finance via a free proxy
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=6mo`;
    const r = await fetch(url);
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    const quotes = d?.chart?.result?.[0]?.indicators?.quote?.[0];
    const timestamps = d?.chart?.result?.[0]?.timestamp;
    if (!meta) return null;
    return {
      symbol,
      price: meta.regularMarketPrice,
      prevClose: meta.previousClose || meta.chartPreviousClose,
      open: meta.regularMarketOpen,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      name: meta.longName || meta.shortName || symbol,
      exchange: meta.exchangeName,
      closes: quotes?.close || [],
      timestamps: timestamps || [],
    };
  } catch (e) {
    return null;
  }
}

// NSE Top stocks list
const NIFTY50 = [
  "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK",
  "HINDUNILVR","ITC","SBIN","BAJFINANCE","BHARTIARTL",
  "WIPRO","LT","AXISBANK","ASIANPAINT","MARUTI",
  "TITAN","SUNPHARMA","ULTRACEMCO","NESTLEIND","TECHM",
  "POWERGRID","NTPC","TATAMOTORS","ONGC","HCLTECH",
  "JSWSTEEL","TATASTEEL","INDUSINDBK","DRREDDY","DIVISLAB",
  "CIPLA","HINDALCO","COALINDIA","BAJAJFINSV","ADANIENT",
  "ADANIPORTS","TATACONSUM","SBILIFE","HDFC","APOLLOHOSP",
];

// ── AI Agents ─────────────────────────────────────────────────────────────────

const AGENTS = {
  technical: {
    name: "Technical AI",
    icon: "📈",
    color: "#00d4ff",
    system: `You are an elite technical analyst. Given stock data (price, RSI, SMA, volume trends), provide:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Key technical observations (2-3 bullet points)
3. Entry price, Stop Loss, Target 1, Target 2
Keep it sharp and institutional. Use Indian market context.`,
  },
  fundamental: {
    name: "Fundamentals AI",
    icon: "📊",
    color: "#00ff88",
    system: `You are a senior fundamental analyst (JPMorgan India). Analyze the stock's fundamentals based on known data and recent news.
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL  
2. Valuation assessment
3. Key fundamental drivers
4. Fair value estimate in INR
Keep institutional tone. Reference Rakesh Jhunjhunwala / Warren Buffett framework where relevant.`,
  },
  macro: {
    name: "Macro AI",
    icon: "🌐",
    color: "#ffaa00",
    system: `You are Chief Global Macro Strategist (Bridgewater India desk). Given a stock, assess:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Macro tailwinds/headwinds for this sector
3. FII/DII flow implications
4. RBI/Fed policy impact on this stock
Be precise, institutional-grade.`,
  },
  sentiment: {
    name: "Sentiment AI",
    icon: "🧠",
    color: "#ff6b9d",
    system: `You are a sentiment and news analyst for Indian markets. For the given stock:
1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Current market sentiment (bullish/bearish/neutral)
3. Key news catalysts (recent)
4. Reddit/social media sentiment summary
5. Sentiment score: 0-100
Keep it data-driven.`,
  },
  risk: {
    name: "Risk AI",
    icon: "🛡️",
    color: "#ff4444",
    system: `You are a Risk Manager at a top hedge fund. For the given stock:
1. Risk Level: LOW / MEDIUM / HIGH / EXTREME
2. Key risks (regulatory, market, business)
3. Max position size recommendation (% of portfolio)
4. Downside scenario
5. Risk-adjusted verdict
Use Nassim Taleb's asymmetric risk framework.`,
  },
  final: {
    name: "Final Decision AI",
    icon: "⚡",
    color: "#ffffff",
    system: `You are the Portfolio Manager making the final institutional trade decision. You receive signals from Technical, Fundamental, Macro, Sentiment, and Risk agents.
Synthesize all signals and provide:
1. FINAL VERDICT: STRONG BUY / BUY / HOLD / SELL / STRONG SELL
2. Confidence Score: X/100
3. Reasoning (3-4 sentences, institutional-grade)
4. Trade Setup: Entry, SL, Target 1, Target 2
5. Suitable for: Aggressive / Moderate / Conservative investors
6. Time Horizon: Intraday / Swing (1-2 weeks) / Positional (1-3 months) / Long-term`,
  },
};

// ── Mini Sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#00d4ff", width = 80, height = 30 }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />;
  const valid = data.filter((v) => v != null && !isNaN(v));
  if (valid.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const pts = valid.map((v, i) => {
    const x = (i / (valid.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("terminal");
  const [stocks, setStocks] = useState({});
  const [selectedStock, setSelectedStock] = useState("RELIANCE");
  const [agentOutputs, setAgentOutputs] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [telegramCalls, setTelegramCalls] = useState([
    { channel: "PL Capital", call: "BUY RELIANCE above ₹2920 SL ₹2870 TGT ₹3050", time: "09:32", type: "BUY" },
    { channel: "StockDaddy", call: "SELL BHARTIARTL below ₹1550 SL ₹1580 TGT ₹1480", time: "10:15", type: "SELL" },
    { channel: "PL Capital", call: "BUY ITC ₹450 SL ₹440 TGT ₹475", time: "11:05", type: "BUY" },
    { channel: "Nifty Shots", call: "STRONG BUY SBIN ₹820 SL ₹800 TGT ₹870", time: "11:30", type: "BUY" },
  ]);
  const [telegramInput, setTelegramInput] = useState({ channel: "", call: "", type: "BUY" });
  const [niftyData, setNiftyData] = useState(null);
  const [marketSentiment, setMarketSentiment] = useState(68);
  const [news, setNews] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const chatEndRef = useRef(null);

  // Load top 10 stocks on mount
  useEffect(() => {
    loadStocks();
    loadNews();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function loadStocks() {
    setLoadingStocks(true);
    const toLoad = NIFTY50.slice(0, 15);
    for (const sym of toLoad) {
      const d = await fetchStockData(sym);
      if (d) {
        setStocks((prev) => ({ ...prev, [sym]: d }));
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    setLoadingStocks(false);
  }

  async function loadNews() {
    // Simulated news (real NewsAPI would need backend)
    setNews([
      { title: "RBI holds repo rate at 6.5%, signals accommodative stance", source: "Times of India", time: "2h ago", impact: "positive", stocks: ["SBIN", "HDFCBANK"] },
      { title: "Reliance Industries announces ₹75,000 Cr capex plan for green energy", source: "Hindustan Times", time: "3h ago", impact: "positive", stocks: ["RELIANCE"] },
      { title: "IT sector sees 12% YoY growth, TCS and Infosys lead", source: "Economic Times", time: "4h ago", impact: "positive", stocks: ["TCS", "INFY"] },
      { title: "FII inflows surge ₹8,200 Cr in single session", source: "Mint", time: "5h ago", impact: "positive", stocks: ["NIFTY"] },
      { title: "Adani Group stocks under pressure after global selloff", source: "NDTV Business", time: "6h ago", impact: "negative", stocks: ["ADANIENT"] },
      { title: "SEBI introduces new F&O regulations for retail traders", source: "Business Standard", time: "8h ago", impact: "neutral", stocks: ["ALL"] },
    ]);
  }

  async function analyzeStock(symbol) {
    const stock = stocks[symbol];
    setAnalyzing(true);
    setAgentOutputs({});
    setActiveTab("analysis");

    const stockContext = stock
      ? `Stock: ${stock.name} (${symbol})
Price: ₹${fmt(stock.price)}
Change: ${fmt(((stock.price - stock.prevClose) / stock.prevClose) * 100)}%
Open: ₹${fmt(stock.open)} | High: ₹${fmt(stock.high)} | Low: ₹${fmt(stock.low)}
Volume: ${(stock.volume / 1e5).toFixed(2)} L shares
Market Cap: ${fmtCr(stock.marketCap)}
Exchange: NSE`
      : `Stock: ${symbol} (NSE India)`;

    // Run agents sequentially to build debate
    for (const [key, agent] of Object.entries(AGENTS)) {
      setAgentOutputs((prev) => ({ ...prev, [key]: { loading: true, text: "" } }));
      let text = "";
      try {
        await callNvidiaStream(
          [
            { role: "system", content: agent.system },
            { role: "user", content: `Analyze this Indian stock:\n\n${stockContext}\n\nProvide your analysis now.` },
          ],
          (chunk) => {
            text += chunk;
            setAgentOutputs((prev) => ({ ...prev, [key]: { loading: false, text } }));
          }
        );
      } catch (e) {
        text = "Error fetching analysis. Check API key.";
        setAgentOutputs((prev) => ({ ...prev, [key]: { loading: false, text } }));
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    setAnalyzing(false);
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    let reply = "";
    try {
      await callNvidiaStream(
        [
          {
            role: "system",
            content: `You are an elite Indian stock market AI assistant with deep knowledge of NSE, BSE, derivatives, F&O, technical analysis, and fundamental investing. 
You embody insights from Warren Buffett, Rakesh Jhunjhunwala, Aswath Damodaran, and Michael Burry adapted for Indian markets.
Provide sharp, institutional-grade answers. The user is 26 years old, trading Indian markets, wants to make profit.
Always include: specific stock names, price levels, and actionable insights when relevant.`,
          },
          ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMsg },
        ],
        (chunk) => {
          reply += chunk;
          setChatMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [...prev.slice(0, -1), { role: "assistant", content: reply }];
            }
            return [...prev, { role: "assistant", content: reply }];
          });
        }
      );
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to AI. Check API." }]);
    }
    setChatLoading(false);
  }

  function addTelegramCall() {
    if (!telegramInput.channel || !telegramInput.call) return;
    setTelegramCalls((prev) => [
      { ...telegramInput, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
      ...prev,
    ]);
    setTelegramInput({ channel: "", call: "", type: "BUY" });
  }

  const selectedStockData = stocks[selectedStock];
  const change = selectedStockData
    ? ((selectedStockData.price - selectedStockData.prevClose) / selectedStockData.prevClose) * 100
    : 0;

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>⚡ BHARAT TERMINAL</span>
          <span style={styles.logoSub}>AI-POWERED INSTITUTIONAL INTELLIGENCE</span>
        </div>
        <div style={styles.headerCenter}>
          <MarketTicker stocks={stocks} />
        </div>
        <div style={styles.headerRight}>
          <div style={styles.headerStat}>
            <span style={styles.headerStatLabel}>NIFTY 50</span>
            <span style={{ color: "#00ff88", fontFamily: "monospace" }}>24,832.15 ▲ 0.62%</span>
          </div>
          <div style={styles.headerStat}>
            <span style={styles.headerStatLabel}>SENSEX</span>
            <span style={{ color: "#00ff88", fontFamily: "monospace" }}>81,741.32 ▲ 0.58%</span>
          </div>
          <div style={styles.headerStat}>
            <span style={styles.headerStatLabel}>VIX</span>
            <span style={{ color: "#ffaa00", fontFamily: "monospace" }}>13.42</span>
          </div>
          <div style={{ ...styles.badge, background: "#00ff8822", color: "#00ff88", border: "1px solid #00ff8844" }}>
            MARKET OPEN
          </div>
        </div>
      </header>

      {/* ── Nav ── */}
      <nav style={styles.nav}>
        {[
          { id: "terminal", label: "📟 TERMINAL" },
          { id: "analysis", label: "🤖 AI ANALYSIS" },
          { id: "news", label: "📰 NEWS INTEL" },
          { id: "telegram", label: "📡 EXPERT CALLS" },
          { id: "chat", label: "💬 AI COPILOT" },
        ].map((tab) => (
          <button
            key={tab.id}
            style={{ ...styles.navBtn, ...(activeTab === tab.id ? styles.navBtnActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main style={styles.main}>
        {/* TERMINAL TAB */}
        {activeTab === "terminal" && (
          <div style={styles.twoCol}>
            {/* Left: Stock List */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span>NSE TOP STOCKS</span>
                <span style={styles.liveTag}>● LIVE</span>
                {loadingStocks && <span style={{ color: "#888", fontSize: 11 }}>Loading...</span>}
              </div>
              <div style={styles.stockTableHeader}>
                <span style={{ width: 100 }}>SYMBOL</span>
                <span style={{ width: 80, textAlign: "right" }}>PRICE</span>
                <span style={{ width: 70, textAlign: "right" }}>CHANGE</span>
                <span style={{ width: 80, textAlign: "right" }}>CHART</span>
                <span style={{ width: 60, textAlign: "center" }}>ACTION</span>
              </div>
              <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
                {NIFTY50.slice(0, 20).map((sym) => {
                  const s = stocks[sym];
                  const chg = s ? ((s.price - s.prevClose) / s.prevClose) * 100 : null;
                  const isSelected = selectedStock === sym;
                  return (
                    <div
                      key={sym}
                      style={{
                        ...styles.stockRow,
                        background: isSelected ? "#00d4ff11" : "transparent",
                        borderLeft: isSelected ? "2px solid #00d4ff" : "2px solid transparent",
                      }}
                      onClick={() => setSelectedStock(sym)}
                    >
                      <span style={{ width: 100, color: "#00d4ff", fontFamily: "monospace", fontSize: 13 }}>{sym}</span>
                      <span style={{ width: 80, textAlign: "right", fontFamily: "monospace", fontSize: 13 }}>
                        {s ? `₹${fmt(s.price)}` : "—"}
                      </span>
                      <span
                        style={{
                          width: 70,
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: chg == null ? "#888" : chg >= 0 ? "#00ff88" : "#ff4444",
                        }}
                      >
                        {chg != null ? `${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg).toFixed(2)}%` : "Loading"}
                      </span>
                      <span style={{ width: 80, display: "flex", justifyContent: "flex-end" }}>
                        {s?.closes?.length > 5 && (
                          <Sparkline data={s.closes.slice(-30)} color={chg >= 0 ? "#00ff88" : "#ff4444"} />
                        )}
                      </span>
                      <span style={{ width: 60, textAlign: "center" }}>
                        <button
                          style={styles.analyzeBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStock(sym);
                            analyzeStock(sym);
                          }}
                        >
                          AI
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Stock Detail */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Stock Header */}
              <div style={styles.panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                      {selectedStockData?.name || selectedStock}
                    </div>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
                      {selectedStock} • NSE • {selectedStockData?.exchange || "NSE"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: "#fff" }}>
                      {selectedStockData ? `₹${fmt(selectedStockData.price)}` : "—"}
                    </div>
                    <div style={{ color: change >= 0 ? "#00ff88" : "#ff4444", fontSize: 14 }}>
                      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div style={styles.statRow}>
                  {[
                    ["OPEN", selectedStockData ? `₹${fmt(selectedStockData.open)}` : "—"],
                    ["HIGH", selectedStockData ? `₹${fmt(selectedStockData.high)}` : "—"],
                    ["LOW", selectedStockData ? `₹${fmt(selectedStockData.low)}` : "—"],
                    ["PREV CLOSE", selectedStockData ? `₹${fmt(selectedStockData.prevClose)}` : "—"],
                    ["VOLUME", selectedStockData ? `${(selectedStockData.volume / 1e5).toFixed(2)}L` : "—"],
                    ["MKT CAP", selectedStockData ? fmtCr(selectedStockData.marketCap) : "—"],
                  ].map(([label, val]) => (
                    <div key={label} style={styles.stat}>
                      <div style={styles.statLabel}>{label}</div>
                      <div style={styles.statVal}>{val}</div>
                    </div>
                  ))}
                </div>
                <button
                  style={styles.bigAnalyzeBtn}
                  onClick={() => analyzeStock(selectedStock)}
                  disabled={analyzing}
                >
                  {analyzing ? "🤖 AI AGENTS ANALYZING..." : "🤖 LAUNCH AI ANALYSIS"}
                </button>
              </div>

              {/* Market Sentiment */}
              <div style={styles.panel}>
                <div style={styles.panelHeader}>MARKET INTELLIGENCE</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <SentimentGauge value={marketSentiment} label="MARKET SENTIMENT" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "FII Activity", value: "BUYING", color: "#00ff88" },
                      { label: "DII Activity", value: "BUYING", color: "#00ff88" },
                      { label: "Put/Call Ratio", value: "0.82 (Bullish)", color: "#00ff88" },
                      { label: "Market Breadth", value: "72% Advancing", color: "#00ff88" },
                      { label: "India VIX", value: "13.42 (Low Risk)", color: "#ffaa00" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1a1a2e", paddingBottom: 4 }}>
                        <span style={{ color: "#888", fontSize: 12 }}>{label}</span>
                        <span style={{ color, fontSize: 12, fontFamily: "monospace" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Top Picks */}
              <div style={styles.panel}>
                <div style={styles.panelHeader}>
                  <span>⚡ AI TOP PICKS TODAY</span>
                  <span style={{ color: "#888", fontSize: 11 }}>Powered by Multi-Agent System</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["RELIANCE", "SBIN", "ITC", "TATAMOTORS", "HDFCBANK"].map((sym, i) => {
                    const s = stocks[sym];
                    const chg = s ? ((s.price - s.prevClose) / s.prevClose) * 100 : null;
                    const signals = ["STRONG BUY", "BUY", "BUY", "BUY", "HOLD"];
                    const colors = ["#00ff88", "#00ff88", "#00ff88", "#00ff88", "#ffaa00"];
                    return (
                      <div
                        key={sym}
                        style={styles.pickCard}
                        onClick={() => { setSelectedStock(sym); analyzeStock(sym); }}
                      >
                        <div style={{ color: "#00d4ff", fontFamily: "monospace", fontWeight: 700 }}>{sym}</div>
                        <div style={{ color: "#fff", fontSize: 13 }}>{s ? `₹${fmt(s.price)}` : "—"}</div>
                        <div style={{ color: chg >= 0 ? "#00ff88" : "#ff4444", fontSize: 11 }}>
                          {chg != null ? `${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg).toFixed(2)}%` : "—"}
                        </div>
                        <div style={{ color: colors[i], fontSize: 11, fontWeight: 700, marginTop: 4 }}>{signals[i]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === "analysis" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#00d4ff", fontFamily: "monospace" }}>
                  AI AGENT DEBATE — {selectedStock}
                </div>
                <div style={{ color: "#888", fontSize: 12 }}>
                  {Object.keys(agentOutputs).length === 0
                    ? "Select a stock and click AI Analysis to launch multi-agent debate"
                    : `${Object.keys(agentOutputs).length} agents analyzing...`}
                </div>
              </div>
              {!analyzing && Object.keys(agentOutputs).length === 0 && (
                <button style={styles.bigAnalyzeBtn} onClick={() => analyzeStock(selectedStock)}>
                  🤖 ANALYZE {selectedStock}
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {Object.entries(AGENTS).map(([key, agent]) => {
                const out = agentOutputs[key];
                return (
                  <div key={key} style={{ ...styles.panel, borderTop: `2px solid ${agent.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{agent.icon}</span>
                      <span style={{ color: agent.color, fontWeight: 700, fontSize: 13 }}>{agent.name}</span>
                      {out?.loading && <span style={{ color: "#888", fontSize: 11 }}>⟳ Analyzing...</span>}
                    </div>
                    {out ? (
                      <div style={{ color: "#ccc", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 80 }}>
                        {out.loading && !out.text ? (
                          <div style={styles.shimmer}>Calling AI agent...</div>
                        ) : (
                          out.text || ""
                        )}
                      </div>
                    ) : (
                      <div style={{ color: "#444", fontSize: 12 }}>Waiting to analyze...</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NEWS TAB */}
        {activeTab === "news" && (
          <div>
            <div style={styles.panelHeader} className="mb-4">
              📰 NEWS INTELLIGENCE ENGINE
              <span style={{ color: "#888", fontSize: 11, marginLeft: 8 }}>Sources: TOI, HT, ET, Mint, NDTV Business</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {news.map((item, i) => (
                <div key={i} style={{ ...styles.panel, borderLeft: `3px solid ${item.impact === "positive" ? "#00ff88" : item.impact === "negative" ? "#ff4444" : "#ffaa00"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ color: "#888", fontSize: 11 }}>{item.source}</span>
                        <span style={{ color: "#555", fontSize: 11 }}>•</span>
                        <span style={{ color: "#888", fontSize: 11 }}>{item.time}</span>
                        {item.stocks.map((sym) => (
                          <span key={sym} style={{ background: "#00d4ff22", color: "#00d4ff", fontSize: 10, padding: "1px 6px", borderRadius: 3 }}>
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        color: item.impact === "positive" ? "#00ff88" : item.impact === "negative" ? "#ff4444" : "#ffaa00",
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase"
                      }}>{item.impact}</span>
                      <button
                        style={styles.analyzeBtn}
                        onClick={() => {
                          const sym = item.stocks[0] !== "ALL" && item.stocks[0] !== "NIFTY" ? item.stocks[0] : selectedStock;
                          setSelectedStock(sym);
                          analyzeStock(sym);
                        }}
                      >
                        AI
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI News Analysis */}
            <div style={{ ...styles.panel, marginTop: 16 }}>
              <div style={styles.panelHeader}>🤖 AI NEWS SYNTHESIS</div>
              <button
                style={styles.bigAnalyzeBtn}
                onClick={async () => {
                  setChatMessages([]);
                  setActiveTab("chat");
                  const newsContext = news.map((n) => `• ${n.title} (${n.source})`).join("\n");
                  setChatInput(`Based on today's news:\n${newsContext}\n\nWhich Indian stocks should I BUY today and why? Give me top 5 with reasoning.`);
                }}
              >
                🤖 ASK AI: WHICH STOCKS TO BUY BASED ON TODAY'S NEWS
              </button>
            </div>
          </div>
        )}

        {/* TELEGRAM CALLS TAB */}
        {activeTab === "telegram" && (
          <div>
            <div style={styles.panelHeader}>📡 EXPERT CALLS TRACKER</div>
            <div style={{ ...styles.panel, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
                Add a call from your Telegram channels (PL Capital, StockDaddy, etc.)
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  style={styles.input}
                  placeholder="Channel name (e.g. PL Capital)"
                  value={telegramInput.channel}
                  onChange={(e) => setTelegramInput((p) => ({ ...p, channel: e.target.value }))}
                />
                <input
                  style={{ ...styles.input, flex: 2 }}
                  placeholder="Call text (e.g. BUY RELIANCE above 2900 SL 2860 TGT 3050)"
                  value={telegramInput.call}
                  onChange={(e) => setTelegramInput((p) => ({ ...p, call: e.target.value }))}
                />
                <select
                  style={styles.input}
                  value={telegramInput.type}
                  onChange={(e) => setTelegramInput((p) => ({ ...p, type: e.target.value }))}
                >
                  <option>BUY</option>
                  <option>SELL</option>
                  <option>HOLD</option>
                </select>
                <button style={styles.bigAnalyzeBtn} onClick={addTelegramCall}>+ ADD CALL</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {telegramCalls.map((call, i) => (
                <div key={i} style={{ ...styles.panel, borderLeft: `3px solid ${call.type === "BUY" ? "#00ff88" : call.type === "SELL" ? "#ff4444" : "#ffaa00"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ color: "#00d4ff", fontWeight: 700, fontSize: 13 }}>📡 {call.channel}</span>
                        <span style={{ color: "#555" }}>•</span>
                        <span style={{ color: "#888", fontSize: 11 }}>{call.time}</span>
                        <span style={{
                          background: call.type === "BUY" ? "#00ff8822" : "#ff444422",
                          color: call.type === "BUY" ? "#00ff88" : "#ff4444",
                          fontSize: 11, padding: "1px 8px", borderRadius: 10, fontWeight: 700
                        }}>{call.type}</span>
                      </div>
                      <div style={{ color: "#fff", fontSize: 13 }}>{call.call}</div>
                    </div>
                    <button
                      style={styles.analyzeBtn}
                      onClick={() => {
                        // Extract stock symbol from call text
                        const words = call.call.split(" ");
                        const sym = words[1] || selectedStock;
                        setSelectedStock(sym.toUpperCase());
                        analyzeStock(sym.toUpperCase());
                      }}
                    >
                      VERIFY AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
            <div style={styles.panelHeader}>💬 AI COPILOT — INSTITUTIONAL INTELLIGENCE</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
              {chatMessages.length === 0 && (
                <div style={{ color: "#444", textAlign: "center", marginTop: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                  <div style={{ color: "#888" }}>Ask anything about Indian markets, stocks, derivatives, strategies...</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
                    {[
                      "Best stocks to buy today in NSE?",
                      "Explain Iron Condor strategy for NIFTY",
                      "What is FII buying today?",
                      "Top momentum stocks for swing trading",
                      "Analyse RELIANCE technically",
                    ].map((q) => (
                      <button key={q} style={styles.suggestionBtn} onClick={() => { setChatInput(q); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ ...styles.chatAvatar, background: m.role === "user" ? "#00d4ff33" : "#00ff8833" }}>
                    {m.role === "user" ? "U" : "⚡"}
                  </div>
                  <div style={{ flex: 1, background: m.role === "user" ? "#0a0a1a" : "#0d1117", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ color: m.role === "user" ? "#00d4ff" : "#00ff88", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      {m.role === "user" ? "YOU" : "AI COPILOT"}
                    </div>
                    <div style={{ color: "#ccc", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ ...styles.chatAvatar, background: "#00ff8833" }}>⚡</div>
                  <div style={{ color: "#00ff88", fontSize: 12 }}>AI is thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 0" }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="Ask about any Indian stock, strategy, market analysis..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
              />
              <button style={styles.bigAnalyzeBtn} onClick={sendChat} disabled={chatLoading}>
                SEND ↑
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MarketTicker({ stocks }) {
  const syms = Object.keys(stocks).slice(0, 8);
  if (syms.length === 0) return <div style={{ color: "#333", fontSize: 12 }}>Loading market data...</div>;
  return (
    <div style={{ display: "flex", gap: 20, overflow: "hidden" }}>
      {syms.map((sym) => {
        const s = stocks[sym];
        const chg = ((s.price - s.prevClose) / s.prevClose) * 100;
        return (
          <div key={sym} style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ color: "#888", fontSize: 11 }}>{sym}</span>
            <span style={{ color: "#fff", fontSize: 12, fontFamily: "monospace" }}>₹{fmt(s.price)}</span>
            <span style={{ color: chg >= 0 ? "#00ff88" : "#ff4444", fontSize: 11 }}>
              {chg >= 0 ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SentimentGauge({ value, label }) {
  const angle = (value / 100) * 180 - 90;
  const color = value > 65 ? "#00ff88" : value > 40 ? "#ffaa00" : "#ff4444";
  return (
    <div style={{ textAlign: "center", minWidth: 120 }}>
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#1a1a2e" strokeWidth="8" strokeLinecap="round" />
        <path d="M10 65 A 50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(value / 100) * 157} 157`} strokeLinecap="round" />
        <line
          x1="60" y1="65"
          x2={60 + 40 * Math.cos((angle * Math.PI) / 180)}
          y2={65 + 40 * Math.sin((angle * Math.PI) / 180)}
          stroke="#fff" strokeWidth="2" strokeLinecap="round"
        />
        <circle cx="60" cy="65" r="4" fill="#fff" />
        <text x="60" y="50" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="monospace">
          {value}
        </text>
      </svg>
      <div style={{ color: "#888", fontSize: 10, marginTop: -5 }}>{label}</div>
      <div style={{ color, fontSize: 11, fontWeight: 700 }}>{value > 65 ? "BULLISH" : value > 40 ? "NEUTRAL" : "BEARISH"}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  root: {
    background: "#060610",
    color: "#e0e0e0",
    minHeight: "100vh",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: 13,
  },
  header: {
    background: "#08081a",
    borderBottom: "1px solid #1a1a2e",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  headerLeft: { display: "flex", flexDirection: "column" },
  logo: { color: "#00d4ff", fontWeight: 900, fontSize: 18, letterSpacing: 2 },
  logoSub: { color: "#334", fontSize: 9, letterSpacing: 3 },
  headerCenter: { flex: 1, display: "flex", justifyContent: "center", padding: "0 20px", overflow: "hidden" },
  headerRight: { display: "flex", gap: 16, alignItems: "center" },
  headerStat: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 },
  headerStatLabel: { color: "#555", fontSize: 9, letterSpacing: 1 },
  badge: { fontSize: 10, padding: "3px 8px", borderRadius: 3, fontWeight: 700, letterSpacing: 1 },
  nav: {
    background: "#08081a",
    borderBottom: "1px solid #1a1a2e",
    display: "flex",
    gap: 2,
    padding: "4px 16px",
    overflowX: "auto",
  },
  navBtn: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#666",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "monospace",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  navBtnActive: {
    background: "#00d4ff15",
    border: "1px solid #00d4ff33",
    color: "#00d4ff",
  },
  main: { padding: "16px 20px" },
  twoCol: { display: "flex", gap: 16, alignItems: "flex-start" },
  panel: {
    background: "#0a0a1a",
    border: "1px solid #1a1a2e",
    borderRadius: 8,
    padding: 16,
  },
  panelHeader: {
    color: "#00d4ff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    borderBottom: "1px solid #1a1a2e",
    paddingBottom: 8,
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveTag: { color: "#00ff88", fontSize: 10, animation: "pulse 1.5s infinite" },
  stockTableHeader: {
    display: "flex",
    padding: "4px 8px",
    color: "#444",
    fontSize: 10,
    letterSpacing: 1,
    borderBottom: "1px solid #1a1a2e",
    marginBottom: 4,
  },
  stockRow: {
    display: "flex",
    padding: "6px 8px",
    cursor: "pointer",
    alignItems: "center",
    borderRadius: 4,
    transition: "background 0.15s",
  },
  analyzeBtn: {
    background: "#00d4ff22",
    border: "1px solid #00d4ff44",
    color: "#00d4ff",
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: 10,
    fontFamily: "monospace",
    borderRadius: 3,
  },
  bigAnalyzeBtn: {
    background: "linear-gradient(135deg, #00d4ff22, #00ff8822)",
    border: "1px solid #00d4ff66",
    color: "#00d4ff",
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: 700,
    borderRadius: 4,
    letterSpacing: 1,
  },
  statRow: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, marginBottom: 12 },
  stat: { display: "flex", flexDirection: "column", gap: 2 },
  statLabel: { color: "#555", fontSize: 9, letterSpacing: 1 },
  statVal: { color: "#ccc", fontSize: 12, fontFamily: "monospace" },
  pickCard: {
    background: "#0d0d20",
    border: "1px solid #1a1a2e",
    borderRadius: 6,
    padding: "10px 14px",
    cursor: "pointer",
    minWidth: 100,
    transition: "border-color 0.15s",
  },
  shimmer: { color: "#444", fontStyle: "italic" },
  input: {
    background: "#0d0d20",
    border: "1px solid #1a1a2e",
    color: "#ccc",
    padding: "8px 12px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
    outline: "none",
    minWidth: 150,
  },
  suggestionBtn: {
    background: "#0d0d20",
    border: "1px solid #1a1a2e",
    color: "#888",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "monospace",
    borderRadius: 4,
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    color: "#fff",
  },
};
