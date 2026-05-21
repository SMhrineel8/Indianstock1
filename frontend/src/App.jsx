import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "https://bharat-terminal-api.onrender.com";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

function getSignalColor(signal) {
  const s = signal?.toUpperCase() || "HOLD";
  if (s.includes("BUY")) return "#0f0";
  if (s.includes("SELL")) return "#f00";
  return "#ff0";
}

function SignalBadge({ signal, confidence }) {
  return (
    <div className="signal-badge" style={{ borderColor: getSignalColor(signal) }}>
      <div className="signal-text">{signal}</div>
      <div className="confidence">{confidence}%</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SearchBar({ onSearch, loading }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = async (e) => {
    const value = e.target.value.toUpperCase();
    setInput(value);
    
    if (value.length > 0) {
      try {
        const res = await fetch(`${API_BASE}/search?q=${value}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (e, symbol = input) => {
    e?.preventDefault();
    if (symbol.trim()) {
      onSearch(symbol.toUpperCase());
      setInput("");
      setSuggestions([]);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-bar">
        <input
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="Search stock (e.g., RELIANCE, TCS, INFY)..."
          className="search-input"
          disabled={loading}
        />
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? "Analyzing..." : "Search"}
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <div
              key={s}
              className="suggestion-item"
              onClick={() => handleSubmit(null, s)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsCard({ metrics }) {
  return (
    <div className="metrics-grid">
      <div className="metric">
        <div className="metric-label">CMP</div>
        <div className="metric-value">₹{fmt(metrics.cmp)}</div>
        <div className={`metric-change ${metrics.day_change.includes("-") ? "down" : "up"}`}>
          {metrics.day_change}
        </div>
      </div>
      <div className="metric">
        <div className="metric-label">PE Ratio</div>
        <div className="metric-value">{metrics.pe_ratio ? fmt(metrics.pe_ratio) : "N/A"}</div>
      </div>
      <div className="metric">
        <div className="metric-label">Market Cap</div>
        <div className="metric-value">{fmtCr(metrics.market_cap)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">52W High</div>
        <div className="metric-value">₹{fmt(metrics.week52_high)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">52W Low</div>
        <div className="metric-value">₹{fmt(metrics.week52_low)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">Dividend Yield</div>
        <div className="metric-value">{metrics.dividend_yield ? (metrics.dividend_yield * 100).toFixed(2) + "%" : "N/A"}</div>
      </div>
    </div>
  );
}

function TechnicalSection({ technical }) {
  return (
    <div className="section technical-section">
      <h3>📊 Technical Analysis</h3>
      <div className="tech-content">
        <SignalBadge signal={technical.signal} confidence={technical.confidence} />
        <div className="tech-metrics">
          <div className="tech-metric">
            <span>RSI(14)</span>
            <span className={technical.rsi > 70 ? "overbought" : technical.rsi < 30 ? "oversold" : ""}>
              {fmt(technical.rsi)}
            </span>
          </div>
          <div className="tech-metric">
            <span>SMA(20)</span>
            <span>₹{fmt(technical.sma20)}</span>
          </div>
          <div className="tech-metric">
            <span>SMA(50)</span>
            <span>₹{fmt(technical.sma50)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }) {
  return (
    <div className="agent-card">
      <div className="agent-header">
        <span className="agent-name">{agent.agent.toUpperCase()}</span>
        <SignalBadge signal={agent.signal} confidence={agent.confidence} />
      </div>
      <p className="agent-analysis">{agent.analysis}</p>
    </div>
  );
}

function AgentsSection({ agents }) {
  return (
    <div className="section agents-section">
      <h3>🤖 Multi-Agent Consensus</h3>
      <div className="agents-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.agent} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function Nifty50Snapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const fetchSnapshot = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/nifty50`);
      const data = await res.json();
      setSnapshot(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="section nifty-section">
      <div className="section-header">
        <h3>📈 NIFTY50 Snapshot</h3>
        <button onClick={fetchSnapshot} disabled={loading} className="refresh-btn">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      {snapshot?.nifty50_snapshot && (
        <div className="nifty-grid">
          {snapshot.nifty50_snapshot.map((stock) => (
            <div key={stock.ticker} className="nifty-card">
              <div className="nifty-ticker">{stock.ticker.replace(".NS", "")}</div>
              <div className="nifty-cmp">₹{fmt(stock.cmp)}</div>
              <div className={`nifty-change ${stock.change.includes("-") ? "down" : "up"}`}>
                {stock.change}
              </div>
              <div className="nifty-rsi">RSI: {fmt(stock.rsi)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsSection() {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/news`);
      const data = await res.json();
      setNews(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="section news-section">
      <div className="section-header">
        <h3>📰 Market News</h3>
        <button onClick={fetchNews} disabled={loading} className="refresh-btn">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      {news?.news && (
        <div className="news-list">
          {news.news.map((item, idx) => (
            <div key={idx} className="news-item">
              <div className="news-title">{item.title}</div>
              <div className="news-meta">
                <span className="news-source">{item.source}</span>
                <span className="news-time">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StockDetail({ stock, onClose }) {
  return (
    <div className="stock-detail">
      <button className="close-btn" onClick={onClose}>✕</button>
      <div className="stock-header">
        <h2>{stock.ticker}</h2>
        <h3>{stock.name}</h3>
      </div>
      <MetricsCard metrics={stock.metrics} />
      <TechnicalSection technical={stock.technical} />
      <AgentsSection agents={stock.agents} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/analyze/${symbol}`);
      if (!res.ok) throw new Error("Stock not found");
      const data = await res.json();
      setSelectedStock(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>⚡ BHARAT TERMINAL</h1>
          <p>AI-Powered Institutional Intelligence for Indian Markets</p>
        </div>
      </header>

      <main className="app-main">
        <SearchBar onSearch={handleSearch} loading={loading} />
        
        {error && <div className="error-message">{error}</div>}

        {selectedStock ? (
          <StockDetail stock={selectedStock} onClose={() => setSelectedStock(null)} />
        ) : (
          <>
            <Nifty50Snapshot />
            <NewsSection />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2024 Bharat Terminal | Live NSE/BSE Data | NVIDIA NIM AI</p>
      </footer>
    </div>
  );
}