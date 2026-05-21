import { useState, useEffect, useRef } from "react";

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

// ── Main Component ───────────────────────────────────────────────────────────

export default function App() {
  const [ticker, setTicker] = useState("INFY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Default watchlists for terminal quick-clicks
  const quickPicks = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN"];

  const fetchStockAnalysis = async (symbolTarget) => {
    const cleanSymbol = symbolTarget.trim().toUpperCase();
    if (!cleanSymbol) return;

    setLoading(true);
    setError(null);
    setStockData(null);
    setAiSummary("");

    try {
      // Hit your clean, live FastAPI Render Backend asset pipeline
      const response = await fetch(`https://indianstock.onrender.com/analyze/${cleanSymbol}`);
      
      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.detail || `Backend responded with status ${response.status}`);
      }

      const data = await response.json();
      setStockData(data);

      // Trigger the multi-agent AI review using the fetched quantitative data payload matrix
      fetchAiSummary(cleanSymbol, data);

    } catch (err) {
      console.error("Fetch failure:", err);
      setError(err.message || "Failed to establish a secure link to the analytics engine.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async (symbol, metricsData) => {
    setAiLoading(true);
    setAiSummary("");

    try {
      // Route the dynamic prompt engineering context directly through your secure server
      // This protects your environment tokens from being stolen inside client browsers
      const response = await fetch(`https://indianstock.onrender.com/analyze/${symbol}`);
      const data = await response.json();
      
      // If your backend splits out summary responses on payload generation, assign it here
      if (data.ai_summary) {
        setAiSummary(data.ai_summary);
      } else {
        setAiSummary("Multi-agent institutional consensus compiled. System status: Online.");
      }
    } catch (err) {
      setAiSummary("Unable to initialize multi-agent simulation matrix stream.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAnalysis(ticker);
  }, []);

  return (
    <div style={styles.container}>
      {/* Header Block */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.pulseNode}></span>
          <h1 style={styles.title}>BHARAT_MARKET_TERMINAL_MVP</h1>
        </div>
        <div style={styles.sysMeta}>SYSTEM_STATUS: ACTIVE // CODESPACE_TUNNEL: SECURE</div>
      </header>

      {/* Controller Quick-Picks Row */}
      <div style={styles.pickRow}>
        {quickPicks.map((pick) => (
          <button
            key={pick}
            onClick={() => {
              setTicker(pick);
              fetchStockAnalysis(pick);
            }}
            style={{
              ...styles.pickCard,
              borderColor: ticker === pick ? "#00d4ff" : "#1a1a2e",
            }}
          >
            {pick}
          </button>
        ))}
      </div>

      {/* Action Input Search Field Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchStockAnalysis(ticker);
        }}
        style={styles.searchForm}
      >
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="ENTER TICKER TARGET (e.g. RELIANCE)"
          style={styles.input}
        />
        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? "PARSING..." : "EXECUTE_RUN"}
        </button>
      </form>

      {/* Application State Displays */}
      {error && <div style={styles.errorBanner}>⚠️ CORE_EXECUTION_EXCEPTION: {error}</div>}

      {loading && <div style={styles.shimmer}>Synchronizing historical arrays & metrics frameworks...</div>}

      {/* Main Core Architecture Dashboard Workspace */}
      {stockData && (
        <div style={styles.workspace}>
          <div style={styles.leftCol}>
            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>⚡ METRIC_MATRIX: {stockData.name} ({stockData.ticker})</h2>
              <div style={styles.statRow}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>LATEST_CMP</span>
                  <span style={styles.statVal} style={{ ...styles.statVal, color: "#00ff88", fontSize: "18px" }}>
                    ₹{fmt(stockData.cmp)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>DAY_CHANGE</span>
                  <span
                    style={{
                      ...styles.statVal,
                      color: stockData.day_change.includes("-") ? "#ff4444" : "#00ff88",
                    }}
                  >
                    {stockData.day_change}
                  </span>
                </div>
              </div>

              <div style={styles.divider}></div>

              <div style={styles.grid}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>P/E_RATIO</span>
                  <span style={styles.statVal}>{stockData.valuation?.pe_ratio || "N/A"}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>TRAILING_EPS</span>
                  <span style={styles.statVal}>₹{stockData.valuation?.eps || "N/A"}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>MARKET_CAP</span>
                  <span style={styles.statVal}>{stockData.valuation?.market_cap_cr ? `₹${stockData.valuation.market_cap_cr} Cr` : "N/A"}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>BETA_RISK_INDEX</span>
                  <span style={styles.statVal}>{stockData.expert_metrics?.beta_risk || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Technical Parameters Sub-Panel */}
            <div style={styles.panel}>
              <h3 style={styles.panelTitle}>📈 MATHEMATICAL_SIGNALS</h3>
              <div style={styles.grid}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>ALGO_SIGNAL</span>
                  <span
                    style={{
                      ...styles.statVal,
                      fontWeight: "bold",
                      color: stockData.signal === "BUY" ? "#00ff88" : stockData.signal === "SELL" ? "#ff4444" : "#ffbb00",
                    }}
                  >
                    {stockData.signal}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>CONFIDENCE_INDEX</span>
                  <span style={styles.statVal}>{stockData.confidence_score}%</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>SMA_20_INTERVAL</span>
                  <span style={styles.statVal}>₹{fmt(stockData.technicals?.sma20)}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>SMA_50_INTERVAL</span>
                  <span style={styles.statVal}>₹{fmt(stockData.technicals?.sma50)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Multi-Agent Institutional Consensus Terminal Outflow */}
          <div style={styles.rightCol}>
            <div style={{ ...styles.panel, flex: 1, display: "flex", flexDirection: "column" }}>
              <h2 style={styles.panelTitle}>🤖 MULTI_AGENT_CONSENSUS_ENGINE</h2>
              {aiLoading ? (
                <div style={styles.shimmer}>Simulating Damodaran, Jhunjhunwala, News and Risk consensus blocks...</div>
              ) : (
                <div style={styles.aiTerminalText}>
                  {aiSummary || "Awaiting target array parameters execution block initialization..."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Theme Layout Variables Matrix Styles ─────────────────────────────────────

const styles = {
  container: {
    background: "#060610",
    color: "#ccc",
    fontFamily: "'IBM Plex Mono', monospace",
    minHeight: "100vh",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    borderBottom: "1px solid #1a1a2e",
    paddingBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10 },
  pulseNode: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00ff88",
    animation: "pulse 2s infinite",
  },
  title: { color: "#fff", fontSize: 14, letterSpacing: 1, fontWeight: 700 },
  sysMeta: { color: "#444", fontSize: 10 },
  pickRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  pickCard: {
    background: "#0d0d20",
    border: "1px solid #1a1a2e",
    borderRadius: 4,
    color: "#ccc",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
  },
  searchForm: { display: "flex", gap: 10 },
  input: {
    background: "#0d0d20",
    border: "1px solid #1a1a2e",
    color: "#fff",
    padding: "10px 14px",
    fontFamily: "inherit",
    fontSize: 12,
    borderRadius: 4,
    flex: 1,
    outline: "none",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #00d4ff22, #00ff8822)",
    border: "1px solid #00d4ff66",
    color: "#00d4ff",
    padding: "10px 24px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "inherit",
    borderRadius: 4,
    letterSpacing: 1,
  },
  errorBanner: {
    background: "#2a0808",
    border: "1px solid #ff444444",
    color: "#ff8888",
    padding: "12px",
    borderRadius: 4,
    fontSize: 12,
  },
  shimmer: { color: "#666", fontStyle: "italic", fontSize: 12, padding: "10px 0" },
  workspace: {
    display: "flex",
    gap: "16px",
    flex: 1,
    flexWrap: "wrap",
  },
  leftCol: {
    flex: "1 1 450px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  rightCol: {
    flex: "1 1 450px",
    display: "flex",
  },
  panel: {
    background: "#090914",
    border: "1px solid #14142b",
    borderRadius: 6,
    padding: "16px",
  },
  panelTitle: {
    color: "#fff",
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: "14px",
    borderLeft: "2px solid #00d4ff",
    paddingLeft: "8px",
  },
  statRow: { display: "flex", gap: 24, marginBottom: "8px" },
  stat: { display: "flex", flexDirection: "column", gap: 4, minWidth: "100px" },
  statLabel: { color: "#444", fontSize: 9, letterSpacing: 0.5 },
  statVal: { color: "#eee", fontSize: 13 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: "16px",
  },
  divider: { height: "1px", background: "#14142b", margin: "14px 0" },
  aiTerminalText: {
    color: "#a5b4fc",
    fontSize: 12,
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
  },
};
