// frontend/src/config.js
export const API_URL =
  process.env.NODE_ENV === "production"
    ? "http://3.111.145.107:8000"   // VM production backend
    : "http://localhost:8000";      // Local dev backend

export const API_BASE = `${API_URL}/api`;
