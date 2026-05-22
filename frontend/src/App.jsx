import { useState } from "react";
import "./App.css";

export default function App() {
  const [timeframe, setTimeframe] = useState("1M");

  // Dummy data for sections
  const selectedStock = {
    ticker: "GRASIM",
    name: "Grasim Industries Ltd",
    cmp: 3154.50,
    change: "+48.75 (1.57%)",
    high: 3180.00,
    low: 3021.00,
    open: 3105.75,
    volume: "1.24 Cr",
    marketCap: "₹2,13,954 Cr",
    pe: 24.04,
    rsi: 68,
    signal: "BUY",
    confidence: 86
  };

  const marketDepth = [
    { bid: "₹3,154.20", bidQty: 12, askQty: 14, ask: "₹3,154.65" },
    { bid: "₹3,154.15", bidQty: 8, askQty: 9, ask: "₹3,154.70" },
    { bid: "₹3,154.10", bidQty: 10, askQty: 11, ask: "₹3,154.75" },
    { bid: "₹3,154.05", bidQty: 20, askQty: 7, ask: "₹3,154.80" },
    { bid: "₹3,154.00", bidQty: 7, askQty: 6, ask: "₹3,154.85" }
  ];

  const keyInfo = {
    "52 Week High": "₹3,511.96",
    "52 Week Low": "₹2,076.15",
    "P/E Ratio (TTM)": 43.09,
    "EPS Ratio": "N/A",
    "Dividend Yield": "0.32%",
    "Market Cap": "₹2,13,954 Cr",
    "Book Value": "₹2,218.45",
    "Face Value": "₹2.00"
  };

  const performanceData = [
    { label: "GRASIM", value: 3154.50, change: "+13.5%" },
    { label: "NIFTY 50", value: 25100, change: "+4.2%" },
    { label: "NIFTY 500", value: 19850, change: "+3.8%" }
  ];

  const analystRatings = {
    buyPercentage: 100,
    buyCount: 11,
    holdCount: 0,
    sellCount: 0
  };

  const upcomingEvents = [
    { date: "20", month: "MAY", title: "Board Meeting", description: "Q1 Results Discussion" },
    { date: "15", month: "JUN", title: "AGM 2026", description: "Annual General Meeting" },
    { date: "12", month: "AUG", title: "Dividend Payment", description: "Final Dividend" }
  ];

  const latestNews = [
    { title: "Grasim Industries Q4 PAT rises 31% YoY to ₹1,856 Cr", category: "Earnings", time: "1 hour ago" },
    { title: "Board recommends final dividend of ₹50 per share", category: "Corporate", time: "3 days ago" },
    { title: "Birla Opus pushes 70% YoY growth in sales", category: "Business", time: "1 day ago" },
    { title: "Cement sector outlook remains positive: Report", category: "Industry", time: "2 days ago" }
  ];

  const expertCalls = [
    { price: "₹3,450", target: "12.7%", upside: "Motilal Oswal", confidence: "86%" },
    { price: "₹11,234.80", target: "82%", upside: "ULTRATECH", confidence: "82%" },
    { price: "₹567.45", target: "78%", upside: "AMBUJA", confidence: "75%" }
  ];

  const watchlist = [
    { ticker: "RELIANCE", exchange: "NSE", price: "₹2,856.75", change: "+0.65%", icon: "📊" },
    { ticker: "INFY", exchange: "NSE", price: "₹1,614.80", change: "+0.32%", icon: "📈" },
    { ticker: "HDFCBANK", exchange: "NSE", price: "₹1,721.45", change: "+0.15%", icon: "🏦" },
    { ticker: "SBIN", exchange: "NSE", price: "₹812.35", change: "+0.25%", icon: "🏛️" }
  ];

  return (
    <div className="app">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">⚡ BHARAT TERMINAL</div>
        </div>
        <div className="nav-tabs">
          <button className="nav-tab active">Terminal</button>
          <button className="nav-tab">AI Analysis</button>
          <button className="nav-tab">Markets</button>
          <button className="nav-tab">News Intel</button>
          <button className="nav-tab">Expert Calls</button>
          <button className="nav-tab">AI Copilot</button>
          <button className="nav-tab">Screener</button>
          <button className="nav-tab">Watchlist</button>
        </div>
        <div className="navbar-right">
          <div className="search-header">
            <input type="text" placeholder="Search stocks, indices, ETFs..." className="search-input-header" />
            <span className="search-icon">🔍</span>
          </div>
          <button className="user-btn">SK</button>
        </div>
      </nav>

      {/* Stock Header Info */}
      <div className="stock-header-info">
        <div className="stock-info-left">
          <div className="stock-name">
            <h2>{selectedStock.name}</h2>
            <span className="stock-ticker">{selectedStock.ticker}</span>
            <span className="stock-exchange">NSE</span>
          </div>
        </div>
        <div className="stock-price-section">
          <div className="current-price">₹{selectedStock.cmp.toFixed(2)}</div>
          <div className="price-change up">{selectedStock.change}</div>
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
              <span className="metric-value">₹{selectedStock.high}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Low</span>
              <span className="metric-value">₹{selectedStock.low}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Open</span>
              <span className="metric-value">₹{selectedStock.open}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Volume</span>
              <span className="metric-value">{selectedStock.volume}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Market Cap</span>
              <span className="metric-value">{selectedStock.marketCap}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">P/E</span>
              <span className="metric-value">{selectedStock.pe}</span>
            </div>
          </div>

          {/* AI Sentiment */}
          <div className="sentiment-card">
            <h4>AI Sentiment Analysis</h4>
            <div className="sentiment-score">
              <div className="score-number">68</div>
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

        {/* Center Content */}
        <div className="center-content">
          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-header">
              <h3>Price Chart</h3>
              <div className="timeframe-buttons">
                {["1D", "1W", "1M", "1Y", "5Y", "Max"].map((tf) => (
                  <button
                    key={tf}
                    className={`timeframe-btn ${timeframe === tf ? "active" : ""}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-placeholder">
              <div className="chart-dummy">📈 Chart Visualization ({timeframe})</div>
            </div>
          </div>

          {/* Market Depth & Key Info Row */}
          <div className="info-row">
            {/* Market Depth */}
            <div className="market-depth">
              <h4>Market Depth</h4>
              <table className="depth-table">
                <thead>
                  <tr>
                    <th>Bid</th>
                    <th>Orders</th>
                    <th>Qty</th>
                    <th>Qty</th>
                    <th>Orders</th>
                    <th>Ask</th>
                  </tr>
                </thead>
                <tbody>
                  {marketDepth.map((row, idx) => (
                    <tr key={idx}>
                      <td className="bid-price">{row.bid}</td>
                      <td className="bid-qty">{row.bidQty}</td>
                      <td className="qty">5,432</td>
                      <td className="qty">3,210</td>
                      <td className="ask-qty">{row.askQty}</td>
                      <td className="ask-price">{row.ask}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key Info */}
            <div className="key-info">
              <h4>Key Info</h4>
              <div className="key-info-grid">
                {Object.entries(keyInfo).map(([key, value]) => (
                  <div key={key} className="info-item">
                    <span className="info-label">{key}</span>
                    <span className="info-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance & Financial Row */}
          <div className="charts-row">
            {/* Performance Comparison */}
            <div className="performance-section">
              <h4>Performance Comparison</h4>
              <div className="performance-chart">
                {performanceData.map((item, idx) => (
                  <div key={idx} className="performance-item">
                    <div className="perf-label">{item.label}</div>
                    <div className="perf-chart-bar" style={{ height: `${Math.random() * 60 + 20}px` }}></div>
                    <div className="perf-value">{item.value}</div>
                    <div className="perf-change">{item.change}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="financial-section">
              <h4>Financial Summary (Q4 FY26)</h4>
              <div className="financial-items">
                <div className="fin-item">
                  <span className="fin-label">Revenue</span>
                  <span className="fin-value">₹51,444 Cr</span>
                </div>
                <div className="fin-item">
                  <span className="fin-label">Net Profit</span>
                  <span className="fin-value">₹1,957 Cr</span>
                </div>
                <div className="fin-item">
                  <span className="fin-label">EBITDA</span>
                  <span className="fin-value">₹11,135 Cr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analyst Ratings */}
          <div className="analyst-section">
            <h4>Analyst Ratings</h4>
            <div className="ratings-container">
              <div className="rating-stat">
                <div className="rating-percentage">100%</div>
                <div className="rating-label">Buy</div>
                <div className="rating-count">Based on {analystRatings.buyCount} analysts</div>
              </div>
              <div className="rating-bar-container">
                <div className="rating-bar-bg">
                  <div className="rating-bar-fill buy" style={{ width: "100%" }}></div>
                </div>
                <div className="rating-details">
                  <span>Buy: {analystRatings.buyCount}</span>
                  <span>Hold: {analystRatings.holdCount}</span>
                  <span>Sell: {analystRatings.sellCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="events-section">
            <h4>Upcoming Events</h4>
            <div className="events-grid">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="event-card">
                  <div className="event-date">
                    <div className="date-day">{event.date}</div>
                    <div className="date-month">{event.month}</div>
                  </div>
                  <div className="event-details">
                    <div className="event-title">{event.title}</div>
                    <div className="event-desc">{event.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* News Section */}
          <div className="news-section">
            <div className="section-header">
              <h4>Latest News</h4>
              <a href="#" className="view-all">View all news →</a>
            </div>
            <div className="news-list">
              {latestNews.map((item, idx) => (
                <div key={idx} className="news-item">
                  <div className="news-content">
                    <div className="news-title">{item.title}</div>
                    <div className="news-meta">
                      <span className="news-category">{item.category}</span>
                      <span className="news-time">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expert Calls */}
          <div className="expert-section">
            <div className="section-header">
              <h4>Expert Calls</h4>
              <a href="#" className="view-all">View all calls →</a>
            </div>
            <div className="expert-grid">
              {expertCalls.map((call, idx) => (
                <div key={idx} className="expert-card">
                  <div className="expert-price">{call.price}</div>
                  <div className="expert-target">
                    <span className="target-value">{call.target}</span>
                    <span className="target-label">Target Price</span>
                  </div>
                  <div className="expert-info">
                    <span className="expert-name">{call.upside}</span>
                    <span className="expert-confidence">{call.confidence}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Watchlist */}
        <div className="right-sidebar">
          <div className="watchlist-panel">
            <h4>Watchlist</h4>
            <div className="watchlist-items">
              {watchlist.map((item, idx) => (
                <div key={idx} className="watchlist-item">
                  <div className="watchlist-icon">{item.icon}</div>
                  <div className="watchlist-details">
                    <div className="watchlist-ticker">{item.ticker}</div>
                    <div className="watchlist-exchange">{item.exchange}</div>
                  </div>
                  <div className="watchlist-price-info">
                    <div className="watchlist-price">{item.price}</div>
                    <div className="watchlist-change-val">{item.change}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="insights-panel">
            <h4>AI Insights</h4>
            <p className="insights-text">Grasim shows strong quarterly growth in cement and chemicals segment. AI models predict 12.4% upside potential in next 30 days based on technical momentum and fundamental strength.</p>
            <div className="insights-buttons">
              <button className="btn-ask-copilot">🤖 Ask AI Copilot</button>
              <button className="btn-compare">👥 Compare with peers →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}