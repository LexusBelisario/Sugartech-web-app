import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import WarningModal from "../components/modals/WarningModal";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [accessModal, setAccessModal] = useState({
    isVisible: false,
    title: "",
    message: "",
    severity: "warning",
    canProceed: false,
  });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const resp = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 403) {
          setAccessModal({
            isVisible: true,
            title: "Access Denied",
            message:
              data?.detail ||
              "You do not have municipal access yet. Please contact administrator.",
            severity: "error",
            canProceed: false,
          });
        } else {
          alert(`Login failed: ${data?.detail || "Invalid credentials"}`);
        }
        return;
      }

      const token = data?.access_token;
      localStorage.setItem("accessToken", token);

      if (data?.user_type === "admin") {
        navigate("/admin");
      } else {
        navigate("/map");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setAccessModal({
      isVisible: false,
      title: "",
      message: "",
      severity: "warning",
      canProceed: false,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] via-[#FAFAF9] to-[#F5F5F5] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#D50032]/5 to-[#A50034]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#B22234]/5 to-[#D50032]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#A50034]/3 to-[#B22234]/3 rounded-full blur-3xl"></div>
      </div>

      {/* Montalban Logo - Full Screen Background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <img
          src="/Montalban_Logo.png"
          alt="Montalban Logo"
          className="w-full h-full object-contain select-none"
          style={{
            opacity: 0.20,
            filter: "drop-shadow(0 10px 40px rgba(213, 0, 50, 0.1))",
            transform: "scale(0.65)",
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/40"></div>
      </div>

      {/* Navbar with Integrated Login */}
      <nav className="relative z-20 bg-white/80 backdrop-blur-md border-b border-[#B22234]/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#D50032] to-[#A50034] rounded-xl p-[2px] shadow-lg">
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                  <span className="text-xl font-bold bg-gradient-to-br from-[#A50034] to-[#B22234] text-transparent bg-clip-text">
                    GIS
                  </span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#222222]">
                  <span className="text-[#D50032]">Sugartech</span> GIS
                </h1>
                <p className="text-xs text-[#222222]/60">
                  A GIS Web Application
                </p>
              </div>
            </div>

            {/* Login Form - Desktop */}
            <form
              onSubmit={handleSubmit}
              className="hidden lg:flex items-center space-x-3"
            >
              {/* Username Input */}
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-48 px-4 py-2.5 bg-[#F5F5F5] border border-[#222222]/10 rounded-lg text-sm text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#D50032] focus:bg-white focus:shadow-lg transition-all duration-300"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-48 px-4 py-2.5 pr-10 bg-[#F5F5F5] border border-[#222222]/10 rounded-lg text-sm text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#D50032] focus:bg-white focus:shadow-lg transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#222222]/40 hover:text-[#D50032] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group px-6 py-2.5 bg-gradient-to-r from-[#D50032] to-[#A50034] hover:from-[#A50034] hover:to-[#D50032] text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                <span className="absolute inset-0 -top-1/2 h-[200%] w-12 bg-white/20 transform -skew-x-12 -translate-x-full transition-transform duration-700 group-hover:translate-x-[250%]"></span>
                <span className="relative flex items-center">
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      Login
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Register Link */}
              <a
                href="/register"
                className="text-sm text-[#A50034] hover:text-[#D50032] font-medium transition-colors duration-200 whitespace-nowrap"
              >
                Register
              </a>
            </form>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6 text-[#222222]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Login Form */}
      <div className="lg:hidden relative z-10 max-w-md mx-auto px-4 py-16">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-[#B22234]/20">
          <h2 className="text-2xl font-bold text-[#222222] mb-6 text-center">
            Sign in to continue
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <label className="block text-sm font-medium text-[#222222]/70 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-[#222222]/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F5F5] border border-[#222222]/10 rounded-lg text-[#222222] focus:outline-none focus:border-[#D50032] focus:bg-white focus:shadow-lg transition-all duration-300"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block text-sm font-medium text-[#222222]/70 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-[#222222]/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-[#F5F5F5] border border-[#222222]/10 rounded-lg text-[#222222] focus:outline-none focus:border-[#D50032] focus:bg-white focus:shadow-lg transition-all duration-300"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#222222]/40 hover:text-[#D50032] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-[#222222]/60 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-[#222222]/20 text-[#D50032] focus:ring-[#D50032]"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-[#A50034] hover:text-[#D50032] font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#D50032] to-[#A50034] hover:from-[#A50034] hover:to-[#D50032] text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-[#222222]/10">
              <span className="text-[#222222]/60 text-sm">
                Don't have an account?{" "}
              </span>
              <a
                href="/register"
                className="text-sm text-[#A50034] hover:text-[#D50032] font-medium transition-colors"
              >
                Register here
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-[#B22234]/10 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <p className="text-sm text-[#222222]/60">
              © {new Date().getFullYear()} Sugartech GIS Web App. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Stars */}
      <div className="absolute top-40 left-1/4 opacity-10 z-10 pointer-events-none">
        <svg
          className="w-6 h-6 text-[#D50032]"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      <div className="absolute bottom-40 right-1/4 opacity-10 z-10 pointer-events-none">
        <svg
          className="w-8 h-8 text-[#A50034]"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>

      {/* Warning Modal */}
      {accessModal.isVisible && (
        <WarningModal
          isVisible={accessModal.isVisible}
          onClose={handleModalClose}
          title={accessModal.title}
          message={accessModal.message}
          severity={accessModal.severity}
          buttonText="Ok"
        />
      )}
    </div>
  );
}

export default LoginPage;