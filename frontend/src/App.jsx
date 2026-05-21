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
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${NVIDIA_API_KEY}` 
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-405b-instruct", // Updated to a live valid Nvidia API catalog fallback
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
  try {
    // Uses your configured local proxy endpoint to safely query Yahoo without CORS blocks
    const url = `/api/stock/${symbol}`; 
    const r = await fetch(url);
    if (!r.ok) {
      // Fallback directly to Yahoo Query if backend path differs
      const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=6mo`;
      const fallbackRes = await fetch(directUrl);
      const d = await fallbackRes.json();
      return parseYahooData(d, symbol);
    }
    const d = await r.json();
    return parseYahooData(d, symbol);
  } catch (e) {
    console.error("Data fetch error for " + symbol, e);
    return null;
  }
}

function parseYahooData(d, symbol) {
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
    exchange: meta.exchangeName || "NSE",
    closes: quotes?.close || [],
    timestamps: timestamps || [],
  };
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
    system: `You are an elite technical analyst. Given stock data (price, RSI, SMA, volume trends), provide:\n1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL\n2. Key technical observations (2-3 bullet points)\n3. Entry price, Stop Loss, Target 1, Target 2\nKeep it sharp and institutional. Use Indian market context.`,
  },
  fundamental: {
    name: "Fundamentals AI",
    icon: "📊",
    color: "#00ff88",
    system: `You are a senior fundamental analyst (JPMorgan India). Analyze the stock's fundamentals based on known data and recent news.\n1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL  \n2. Valuation assessment\n3. Key fundamental drivers\n4. Fair value estimate in INR\nKeep institutional tone. Reference Rakesh Jhunjhunwala / Warren Buffett framework where relevant.`,
  },
  macro: {
    name: "Macro AI",
    icon: "🌐",
    color: "#ffaa00",
    system: `You are Chief Global Macro Strategist (Bridgewater India desk). Given a stock, assess:\n1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL\n2. Macro tailwinds/headwinds for this sector\n3. FII/DII flow implications\n4. RBI/Fed policy impact on this stock\nBe precise, institutional-grade.`,
  },
  sentiment: {
    name: "Sentiment AI",
    icon: "🧠",
    color: "#ff6b9d",
    system: `You are a sentiment and news analyst for Indian markets. For the given stock:\n1. Signal: STRONG BUY / BUY / HOLD / SELL / STRONG SELL\n2. Current market sentiment (bullish/bearish/neutral)\n3. Key news catalysts (recent)\n4. Reddit/social media sentiment summary\n5. Sentiment score: 0-100\nKeep it data-driven.`,
  },
  risk: {
    name: "Risk AI",
    icon: "🛡️",
    color: "#ff4444",
    system: `You are a Risk Manager at a top hedge fund. For the given stock:\n1. Risk Level: LOW / MEDIUM / HIGH / EXTREME\n2. Key risks (regulatory, market, business)\n3. Max position size recommendation (% of portfolio)\n4. Downside scenario\n5. Risk-adjusted verdict\nUse Nassim Taleb's asymmetric risk framework.`,
  },
  final: {
    name: "Final Decision AI",
    icon: "⚡",
    color: "#ffffff",
    system: `You are the Portfolio Manager making the final institutional trade decision. You receive signals from Technical, Fundamental, Macro, Sentiment, and Risk agents.\nSynthesize all signals and provide:\n1. FINAL VERDICT: STRONG BUY / BUY / HOLD / SELL / STRONG SELL\n2. Confidence Score: X/100\n3. Reasoning (3-4 sentences, institutional-grade)\n4. Trade Setup: Entry, SL, Target 1, Target 2\n5. Suitable for: Aggressive / Moderate / Conservative investors\n6. Time Horizon: Intraday / Swing (1-2 weeks) / Positional (1-3 months) / Long-term`,
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

function MarketTicker({ stocks }) {
  return (
    <div style={{ color: "#00ff88", fontSize: 11, fontFamily: "monospace", display: "flex", gap: 15 }}>
      <span>RELIANCE • LIVE</span> <span>TCS • ACTIVE</span> <span>NIFTY • STABLE</span>
    </div>
  );
}

function SentimentGauge({ value, label }) {
  return (
    <div style={{ background: "#0d0d20", padding: "12px", borderRadius: 6, border: "1px solid #1a1a2e", textAlign: "center" }}>
      <div style={{ color: "#888", fontSize: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: "bold", color: "#00ff88", fontFamily: "monospace", marginTop: 4 }}>{value}%</div>
    </div>
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
  const [marketSentiment] = useState(68);
  const [news, setNews] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const chatEndRef = useRef(null);

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
      await new Promise((r) => setTimeout(r, 80));
    }
    setLoadingStocks(false);
  }

  async function loadNews() {
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
      ? `Stock: ${stock.name} (${symbol})\nPrice: ₹${fmt(stock.price)}\nChange: ${fmt(((stock.price - stock.prevClose) / stock.prevClose) * 100)}%\nOpen: ₹${fmt(stock.open)} | High: ₹${fmt(stock.high)} | Low: ₹${fmt(stock.low)}\nVolume: ${(stock.volume / 1e5).toFixed(2)} L shares\nMarket Cap: ${fmtCr(stock.marketCap)}\nExchange: NSE`
      : `Stock: ${symbol} (NSE India)`;

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
        text = "Error fetching agent pipeline data streams.";
        setAgentOutputs((prev) => ({ ...prev, [key]: { loading: false, text } }));
      }
      await new Promise((r) => setTimeout(r, 150));
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
            content: `You are an elite Indian stock market AI assistant with deep knowledge of NSE, BSE, derivatives, F&O, technical analysis, and fundamental investing.\nYou embody insights from Warren Buffett, Rakesh Jhunjhunwala framework adapted for Indian markets.`,
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
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error streaming chat data lines." }]);
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
        {activeTab === "terminal" && (
          <div style={styles.twoCol}>
            {/* Left: Stock List */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span>NSE TOP STOCKS</span>
                <span style={styles.liveTag}>● LIVE</span>
                {loadingStocks && <span style={{ color: "#888", fontSize: 11, marginLeft: 8 }}>Syncing...</span>}
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
                      <span style={{ width: 70, textAlign: "right", fontFamily: "monospace", fontSize: 12, color: chg == null ? "#888" : chg >= 0 ? "#00ff88" : "#ff4444" }}>
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
                <button style={styles.bigAnalyzeBtn} onClick={() => analyzeStock(selectedStock)} disabled={analyzing}>
                  {analyzing ? "🤖 AI AGENTS ANALYZING..." : "🤖 LAUNCH AI ANALYSIS"}
                </button>
              </div>

              {/* Market Intelligence */}
              <div style={styles.panel}>
                <div style={styles.panelHeader}>MARKET INTELLIGENCE</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <SentimentGauge value={marketSentiment} label="MARKET SENTIMENT" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "FII Activity", value: "BUYING", color: "#00ff88" },
                      { label: "DII Activity", value: "BUYING", color: "#00ff88" },
                      { label: "Put/Call Ratio", value: "0.82 (Bullish)", color: "#00ff88" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1a1a2e", paddingBottom: 4 }}>
                        <span style={{ color: "#888", fontSize: 12 }}>{label}</span>
                        <span style={{ color, fontSize: 12, fontFamily: "monospace" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === "analysis" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#00d4ff", fontFamily: "monospace", marginBottom: 16 }}>
              AI AGENT DEBATE — {selectedStock}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {Object.entries(AGENTS).map(([key, agent]) => {
                const out = agentOutputs[key];
                return (
                  <div key={key} style={{ ...styles.panel, borderTop: `2px solid ${agent.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{agent.icon}</span>
                      <span style={{ color: agent.color, fontWeight: 700, fontSize: 13 }}>{agent.name}</span>
                      {out?.loading && <span style={{ color: "#888", fontSize: 11 }}>⟳ Streaming...</span>}
                    </div>
                    <div style={{ color: "#ccc", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {out ? out.text || "Assembling response array data..." : "Waiting to execute segment analysis..."}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NEWS TAB */}
        {activeTab === "news" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {news.map((item, i) => (
              <div key={i} style={styles.panel}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>{item.source} • {item.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* EXPERT CALLS TAB */}
        {activeTab === "telegram" && (
          <div>
            <div style={{ ...styles.panel, display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={styles.input} placeholder="Channel descriptor" value={telegramInput.channel} onChange={(e) => setTelegramInput((p) => ({ ...p, channel: e.target.value }))} />
              <input style={{ ...styles.input, flex: 2 }} placeholder="Call content log" value={telegramInput.call} onChange={(e) => setTelegramInput((p) => ({ ...p, call: e.target.value }))} />
              <button style={styles.analyzeBtn} onClick={addTelegramCall}>+ LOG CALL</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {telegramCalls.map((call, i) => (
                <div key={i} style={styles.panel}>
                  <strong>[{call.channel}]</strong> {call.call} <span style={{ color: "#555", fontSize: 11 }}>({call.time})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI COPILOT WORKSPACE */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#090914", padding: 12, borderRadius: 6, border: "1px solid #14142b", minHeight: "250px" }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 10, color: m.role === "user" ? "#fff" : "#00ff88" }}>
                  <strong>{m.role === "user" ? "▶ USER: " : "▶ COPILOT: "}</strong>{m.content}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={styles.input} value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query workspace insights..." />
              <button style={styles.analyzeBtn} onClick={sendChat}>SEND</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Strict System Matrix CSS Layout Styles ───────────────────────────────────
const styles = {
  root: { background: "#060610", color: "#ccc", fontFamily: "monospace", minHeight: "100vh", padding: "16px" },
  header: { borderBottom: "1px solid #14142b", paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 1 },
  logoSub: { color: "#444", fontSize: 10, marginLeft: 10 },
  headerRight: { display: "flex", gap: 16, alignItems: "center" },
  headerStat: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  headerStatLabel: { color: "#444", fontSize: 8 },
  badge: { padding: "2px 8px", borderRadius: 3, fontSize: 10 },
  nav: { display: "flex", gap: 6, margin: "12px 0" },
  navBtn: { background: "#090914", border: "1px solid #14142b", color: "#666", padding: "6px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: 11, borderRadius: 4 },
  navBtnActive: { color: "#00d4ff", borderColor: "#00d4ff" },
  main: { minHeight: "calc(100vh - 180px)" },
  twoCol: { display: "flex", gap: "12px", flexWrap: "wrap" },
  panel: { background: "#090914", border: "1px solid #14142b", borderRadius: 6, padding: "12px", flex: 1, minWidth: "320px" },
  panelHeader: { color: "#fff", fontSize: 11, fontWeight: 700, marginBottom: 10, borderBottom: "1px solid #14142b", paddingBottom: 6 },
  stockTableHeader: { display: "flex", color: "#444", fontSize: 10, padding: "4px 8px", borderBottom: "1px solid #14142b" },
  stockRow: { display: "flex", padding: "8px", borderBottom: "1px solid #090914", cursor: "pointer", alignItems: "center" },
  analyzeBtn: { background: "transparent", border: "1px solid #14142b", color: "#00d4ff", padding: "2px 6px", cursor: "pointer", borderRadius: 3, fontSize: 10 },
  bigAnalyzeBtn: { background: "linear-gradient(135deg, #00d4ff11, #00ff8811)", border: "1px solid #00d4ff44", color: "#00d4ff", width: "100%", padding: "8px", marginTop: "10px", cursor: "pointer", borderRadius: 4, fontFamily: "monospace", fontSize: 11, fontWeight: 700 },
  statRow: { display: "flex", gap: 12, margin: "12px 0", flexWrap: "wrap" },
  stat: { flex: 1, minWidth: "80px", background: "#0d0d20", padding: 6, borderRadius: 4 },
  statLabel: { color: "#444", fontSize: 8 },
  statVal: { color: "#fff", fontSize: 12, marginTop: 2 },
  input: { background: "#0d0d20", border: "1px solid #14142b", color: "#fff", padding: "8px", fontFamily: "monospace", fontSize: 11, borderRadius: 4, flex: 1, outline: "none" }
};
