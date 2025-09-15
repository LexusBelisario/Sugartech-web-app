import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Map from "./MAP/Map.jsx";
import LoginPage from "./user_login/login_page.jsx";
import Admin from "./ADMIN/admin.jsx";

export const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://blgf-gis-webapp-nq0r.onrender.com"
    : "http://localhost:8000";

// ✅ ADD THIS PART - Override fetch globally
const originalFetch = window.fetch;

window.fetch = function (...args) {
  const [url, options = {}] = args;

  // Add auth header to all /api calls
  if (url.includes("/api/")) {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken");
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  return originalFetch(url, options).then((response) => {
    // Handle 401 globally
    if (response.status === 401 && url.includes("/api/")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
    return response;
  });
};
// ✅ END OF ADDITION

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If adminOnly, check if user is admin by decoding the token
  if (adminOnly) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.user_type !== "admin") {
        // Not an admin, redirect to map
        return <Navigate to="/map" replace />;
      }
    } catch (e) {
      console.error("Error decoding token:", e);
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Routes>
      {/* Root route - redirects to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Map />
          </ProtectedRoute>
        }
      />

      {/* Admin only route - Added /* to allow nested routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute adminOnly={true}>
            <Admin />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
