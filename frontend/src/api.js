/**
 * API Service for Bharat Terminal
 * Connects to backend at https://indianstock1.onrender.com
 */

const API_BASE = process.env.REACT_APP_API_URL || 
                 import.meta.env.VITE_API_BASE_URL || 
                 "https://indianstock1.onrender.com";

// Helper function for API calls with error handling
async function apiCall(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Search for stocks
 * @param {string} query - Stock symbol or name to search
 * @returns {Promise} Search results
 */
export async function searchStock(query) {
  if (!query || query.trim().length === 0) {
    return { results: [], count: 0 };
  }
  return apiCall(`/search?q=${encodeURIComponent(query)}`);
}

/**
 * Get comprehensive stock analysis
 * @param {string} symbol - Stock symbol (e.g., "RELIANCE.NS")
 * @param {string} period - Period for historical data (1mo, 3mo, 6mo, 1y)
 * @returns {Promise} Stock analysis with metrics, technical signals, and AI agent analysis
 */
export async function analyzeStock(symbol, period = "6mo") {
  return apiCall(`/analyze/${encodeURIComponent(symbol)}?period=${period}`);
}

/**
 * Get NIFTY50 snapshot
 * @returns {Promise} Top 10 NIFTY50 stocks with current prices
 */
export async function getNifty50() {
  return apiCall("/nifty50");
}

/**
 * Get watchlist analysis
 * @param {string[]} symbols - Array of symbols to analyze
 * @returns {Promise} Watchlist items with analysis
 */
export async function getWatchlist(symbols = []) {
  const symbolsStr = symbols.length > 0 ? symbols.join(",") : "RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS";
  return apiCall(`/watchlist?symbols=${symbolsStr}`);
}

/**
 * Get market news
 * @returns {Promise} Latest market news
 */
export async function getMarketNews() {
  return apiCall("/news");
}

/**
 * Check backend health
 * @returns {Promise} Health status
 */
export async function healthCheck() {
  return apiCall("/health");
}

// Normalize stock symbol to NSE format
export function normalizeSymbol(symbol) {
  symbol = symbol.trim().toUpperCase();
  if (!symbol.endsWith(".NS") && !symbol.endsWith(".BO")) {
    symbol = `${symbol}.NS`;
  }
  return symbol;
}

// Format currency for INR
export function formatINR(value) {
  if (!value || isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format percentage
export function formatPercent(value) {
  if (!value || isNaN(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default {
  searchStock,
  analyzeStock,
  getNifty50,
  getWatchlist,
  getMarketNews,
  healthCheck,
  normalizeSymbol,
  formatINR,
  formatPercent,
};
