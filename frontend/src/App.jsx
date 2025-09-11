import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Map from "./MAP/Map.jsx";
import LoginPage from "./user_login/login_page.jsx";

export const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://blgf-gis-webapp-nq0r.onrender.com"
    : "http://localhost:8000";

const ProtectedRoute = ({ children }) => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
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


      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Map />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
