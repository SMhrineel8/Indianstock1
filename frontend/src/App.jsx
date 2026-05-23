import { useState, useEffect, useMemo } from "react";
import "./App.css";
import api from "./api";

// Global API configuration fallback
const API_BASE = "https://your-render-backend-url.onrender.com"; // Replace with your actual Render URL

// Simple helper function for formatting numbers safely
const fmt = (val) => (val != null && !isNaN(val) ? Number(val).toFixed(2) : "—");

// Missing Sub-Components needed by your code
function SignalBadge({ signal, confidence }) {
  const isUp = signal?.toUpperCase() === "BUY" || signal?.toUpperCase() === "BULLISH";
  return (
    <span className={`signal-badge ${isUp ? "up" : "down"}`}>
      {signal} ({confidence}%)
    </span>
  );
}

function MetricsCard({ metrics = {} }) {
  return (
    <div className="metrics-card">
      <h4>Key Metrics</h4>
      {Object.entries(metrics).map(([key, val]) => (
        <div className="metric-row" key={key}>
          <span className="metric-label">{key}</span>
          <span className="metric-value">{val}</span>
        </div>
      ))}
    </div>
  );
}

function TechnicalSection({ technical = {} }) {
  return (
    <div className="technical-section">
      <h4>Technical Indicators</h4>
      <div className="metric-row">
        <span className="metric-label">RSI</span>
        <span className="metric-value">{technical.rsi || "N/A"}</span>
      </div>
    </div>
  );
}

// Separate search bar component extracted cleanly from your template
function SearchBar({ onSearch, loading }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (e) => {
    setInput(e.target.value);
    // Add suggestion logic here if needed
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

// Renamed your duplicate component from App to DashboardLayout
function DashboardLayout({ selectedStock }) {
  // Dummy data fallback if props are empty
  const stock = selectedStock || {
    ticker: "GRASIM",
    name: "Grasim Industries Ltd",
    cmp: 3154.5,
    change: "+48.75 (1.57%)",
    high: 3180.0,
    low: 3021.0,
    open: 3105.75,
    volume: "1.24 Cr",
    marketCap: "₹2,13,954 Cr",
    pe: 24.04,
    rsi: 68,
    signal: "BUY",
    confidence: 86,
  };

  return (
    <div className="dashboard-layout">
      <div className="navbar-right">
        <div className="search-header">
          <input type="text" placeholder="Search stocks, indices, ETFs..." className="search-input-header" />
          <span className="search-icon">🔍</span>
        </div>
        <button className="user-btn">SK</button>
      </div>

      {/* Stock Header Info */}
      <div className="stock-header-info">
        <div className="stock-info-left">
          <div className="stock-name">
            <h2>{stock.name}</h2>
            <span className="stock-ticker">{stock.ticker}</span>
            <span className="stock-exchange">NSE</span>
          </div>
        </div>
        <div className="stock-price-section">
          <div className="current-price">₹{stock.cmp?.toFixed(2)}</div>
          <div className="price-change up">{stock.change}</div>
          <div className="action-buttons">
            <button className="btn-buy">Buy for the Day</button>
            <button className="btn-hold">Hold</button>
            <button className="btn-sell">Sell for the Day</button>
          </div>
        </div>
        <div className="watchlist-section">
          <div className="watchlist-header">RELIANCE</div>
          <div className="watchlist-price">₹2,856.75</div>
          <div className="watchlist-change">+0.65%</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="main-content">
        {/* Left Sidebar - Stock Details */}
        <div className="left-sidebar">
          <div className="metrics-card">
            <h4>Key Metrics</h4>
            <div className="metric-row">
              <span className="metric-label">High</span>
              <span className="metric-value">₹{stock.high}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Low</span>
              <span className="metric-value">₹{stock.low}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Open</span>
              <span className="metric-value">₹{stock.open}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Volume</span>
              <span className="metric-value">{stock.volume}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Market Cap</span>
              <span className="metric-value">{stock.marketCap}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">P/E</span>
              <span className="metric-value">{stock.pe}</span>
            </div>
          </div>

          {/* AI Sentiment */}
          <div className="sentiment-card">
            <h4>AI Sentiment Analysis</h4>
            <div className="sentiment-score">
              <div className="score-number">{stock.rsi}</div>
              <div className="score-label">Bullish</div>
            </div>
            <div className="sentiment-items">
              <div className="sentiment-item">
                <span className="sentiment-label">News Sentiment</span>
                <span className="sentiment-badge positive">Positive</span>
              </div>
              <div className="sentiment-item">
                <span className="sentiment-label">Analyst Sentiment</span>
                <span className="sentiment-badge bullish">Bullish</span>
              </div>
              <div className="sentiment-item">
                <span className="sentiment-label">Social Sentiment</span>
                <span className="sentiment-badge neutral">Neutral</span>
              </div>
              <div className="sentiment-item">
                <span className="sentiment-label">Technical Sentiment</span>
                <span className="sentiment-badge bullish">Bullish</span>
              </div>
            </div>
            <button className="view-details-btn">View detailed analysis →</button>
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
    } finaly {
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

// Single Main App Export Router at the bottom
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
            day_change: q.day_change_pct != null ? `${q.day_change_pct}%` : prev.metrics?.day_change,
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
    } finaly {
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
            <DashboardLayout selectedStock={selectedStock} />
            <Nifty50Snapshot />
            <NewsSection />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 Bharat Terminal | Live NSE/BSE Data | NVIDIA NIM AI</p>
      </footer>
    </div>
  );
}
