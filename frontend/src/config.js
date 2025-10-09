// src/config.js
export const API_URL = (() => {
  // 1. Check for environment variable first (Docker/production)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  const { protocol, hostname } = window.location;

  // 2. If localhost, use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8000";
  }

  // 3. For production, use same hostname but port 8000
  // Use http explicitly if not https
  const prod_protocol = protocol === "https:" ? "https" : "http";
  return `${prod_protocol}://${hostname}:8000`;
})();

export const API_BASE = `${API_URL}/api`;

console.log("🔧 API_URL configured as:", API_URL); // Debug log
