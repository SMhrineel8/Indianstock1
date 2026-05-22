import { useState, useEffect, useMemo } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://indianstock1.onrender.com";

function fmt(n, dec = 2) {
  const num = Number(n);
  if (n == null || Number.isNaN(num)) return "—";
  return num.toFixed(dec);
}

function fmtCr(n) {
  const num = Number(n);
  if (n == null || Number.isNaN(num)) return "—";
  if (Math.abs(num) >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
  if (Math.abs(num) >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
  return `₹${num.toFixed(2)}`;
}

function getSignalColor(signal) {
  const s = String(signal || "HOLD").toUpperCase();
  if (s.includes("BUY")) return "#0f0";
  if (s.includes("SELL")) return "#f00";
  return "#ff0";
}

function SignalBadge({ signal, confidence }) {
  return (
    <div className="signal-badge" style={{ borderColor: getSignalColor(signal) }}>
      <div className="signal-text">{signal || "HOLD"}</div>
      <div className="confidence">{confidence ?? 0}%</div>
    </div>
  );
}

function SearchBar({ onSearch, loading }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = async (e) => {
    const value = e.target.value.toUpperCase();
    setInput(value);

    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setSuggestions(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      console.error("Search failed:", err);
      setSuggestions([]);
    }
  };

  const handleSubmit = (e, symbol = input) => {
    e?.preventDefault?.();
    const trimmed = String(symbol || "").trim();
    if (!trimmed) return;
    onSearch(trimmed.toUpperCase());
    setInput("");
    setSuggestions([]);
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
              role="button"
              tabIndex={0}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsCard({ metrics = {} }) {
  const dayChange = String(metrics.day_change || "0").trim();
  const isDown = dayChange.includes("-");

  return (
    <div className="metrics-grid">
      <div className="metric">
        <div className="metric-label">CMP</div>
        <div className="metric-value">₹{fmt(metrics.cmp)}</div>
        <div className={`metric-change ${isDown ? "down" : "up"}`}>{dayChange}</div>
      </div>

      <div className="metric">
        <div className="metric-label">PE Ratio</div>
        <div className="metric-value">
          {metrics.pe_ratio != null ? fmt(metrics.pe_ratio) : "N/A"}
        </div>
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
        <div className="metric-value">
          {metrics.dividend_yield != null ? `${(Number(metrics.dividend_yield) * 100).toFixed(2)}%` : "N/A"}
        </div>
      </div>
    </div>
  );
}

function TechnicalSection({ technical = {} }) {
  return (
    <div className="section technical-section">
      <h3>Technical Analysis</h3>
      <div className="tech-content">
        <SignalBadge signal={technical.signal} confidence={technical.confidence} />
        <div className="tech-metrics">
          <div className="tech-metric">
            <span>RSI(14)</span>
            <span
              className={
                Number(technical.rsi) > 70 ? "overbought" : Number(technical.rsi) < 30 ? "oversold" : ""
              }
            >
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

function AgentCard({ agent = {} }) {
  return (
    <div className="agent-card">
      <div className="agent-header">
        <span className="agent-name">{String(agent.agent || "").toUpperCase()}</span>
        <SignalBadge signal={agent.signal} confidence={agent.confidence} />
      </div>
      <p className="agent-analysis">{agent.analysis || ""}</p>
    </div>
  );
}

function AgentsSection({ agents = [] }) {
  return (
    <div className="section agents-section">
      <h3>Multi-Agent Consensus</h3>
      <div className="agents-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.agent || Math.random()} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function Nifty50Snapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSnapshot = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/nifty50`);
      if (!res.ok) throw new Error(`NIFTY50 fetch failed: ${res.status}`);
      const data = await res.json();
      setSnapshot(data);
    } catch (err) {
      console.error(err);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const rows = useMemo(() => snapshot?.nifty50_snapshot || [], [snapshot]);

  return (
    <div className="section nifty-section">
      <div className="section-header">
        <h3>NIFTY50 Snapshot</h3>
        <button onClick={fetchSnapshot} disabled={loading} className="refresh-btn">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="nifty-grid">
          {rows.map((stock) => {
            const change = String(stock.change || "0");
            return (
              <div key={stock.ticker} className="nifty-card">
                <div className="nifty-ticker">{String(stock.ticker || "").replace(".NS", "")}</div>
                <div className="nifty-cmp">₹{fmt(stock.cmp)}</div>
                <div className={`nifty-change ${change.includes("-") ? "down" : "up"}`}>{change}</div>
                <div className="nifty-rsi">RSI: {fmt(stock.rsi)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewsSection() {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/news`);
      if (!res.ok) throw new Error(`News fetch failed: ${res.status}`);
      const data = await res.json();
      setNews(data);
    } catch (err) {
      console.error(err);
      setNews(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="section news-section">
      <div className="section-header">
        <h3>Market News</h3>
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
                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}
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
      <button className="close-btn" onClick={onClose}>
        ✕
      </button>
      <div className="stock-header">
        <h2>{stock?.ticker || "—"}</h2>
        <h3>{stock?.name || ""}</h3>
      </div>
      <MetricsCard metrics={stock?.metrics || {}} />
      <TechnicalSection technical={stock?.technical || {}} />
      <AgentsSection agents={stock?.agents || []} />
    </div>
  );
}

export default function App() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshLiveQuote = async (ticker) => {
    if (!ticker) return;

    try {
      const res = await fetch(`${API_BASE}/quote/${encodeURIComponent(ticker)}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const q = await res.json();

      setSelectedStock((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            cmp: q.cmp ?? prev.metrics?.cmp,
            day_change:
              q.day_change_pct != null ? `${q.day_change_pct}%` : prev.metrics?.day_change,
          },
        };
      });
    } catch (err) {
      console.error("Live quote refresh failed:", err);
    }
  };

  const handleSearch = async (symbol) => {
    setLoading(true);
    setError(null);

    try {
      const clean = String(symbol || "").trim().toUpperCase();
      if (!clean) throw new Error("Enter a stock symbol");

      const res = await fetch(`${API_BASE}/analyze/${encodeURIComponent(clean)}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Stock "${clean}" not found`);
        }
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setSelectedStock(data);
      refreshLiveQuote(data.ticker || clean);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Failed to fetch stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedStock?.ticker) return;

    refreshLiveQuote(selectedStock.ticker);

    const interval = setInterval(() => {
      refreshLiveQuote(selectedStock.ticker);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedStock?.ticker]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>BHARAT TERMINAL</h1>
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
