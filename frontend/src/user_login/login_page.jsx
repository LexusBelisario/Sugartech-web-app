import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
// import MockLogo from "C:/Users/lexus/IDGI-MangoBased-WebApp/Frontend/src/assets/mock_logo.svg";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("accessToken", data.access_token);

        alert(`✅ ${data.message}`);

        navigate("/map");
      } else {
        alert(`❌ Login failed: ${data.detail}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("❌ Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#372b80] to-[#2a1f63] flex items-center justify-center px-4">
      <div className="bg-white/[0.08] backdrop-blur-md rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 w-[500px] h-[600px] flex flex-col">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-20 h-20 mb-4 bg-white/10 rounded-full p-4 backdrop-blur-sm">
            {/* <img
              src={MockLogo}
              alt="Mock Logo"
              className="w-full h-full object-contain"
            /> */}
          </div>
          <h1 className="text-white text-4xl font-bold tracking-wide">
            RPTGIS
          </h1>
          <p className="text-white/60 text-sm mt-2">Welcome back</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col justify-center space-y-7 max-w-sm mx-auto w-full"
        >
          <div className="relative group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none z-10">
                <div
                  className={`w-12 h-full flex items-center justify-center border-r transition-colors duration-200 ${
                    usernameFocused || username
                      ? "border-[#E5C206]/50"
                      : "border-white/10"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 transition-colors duration-200 ${
                      usernameFocused || username
                        ? "text-[#E5C206]"
                        : "text-white/40"
                    }`}
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
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                className={`w-full pl-14 pr-4 py-4 bg-white/5 backdrop-blur-sm border rounded-xl text-white placeholder-transparent focus:outline-none transition-all duration-300 ${
                  usernameFocused || username
                    ? "border-[#E5C206] bg-white/10 shadow-[0_0_20px_rgba(229,194,6,0.3)]"
                    : "border-white/20 hover:border-white/30 hover:bg-white/[0.07]"
                }`}
                placeholder="Username"
                id="username"
              />
              <label
                htmlFor="username"
                className={`absolute left-14 transition-all duration-300 pointer-events-none ${
                  usernameFocused || username
                    ? "top-0 -translate-y-1/2 text-xs text-[#E5C206] bg-[#372b80] px-2 font-medium"
                    : "top-4 text-base text-white/60"
                }`}
              >
                Username
              </label>
            </div>
          </div>

          <div className="relative group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none z-10">
                <div
                  className={`w-12 h-full flex items-center justify-center border-r transition-colors duration-200 ${
                    passwordFocused || password
                      ? "border-[#E5C206]/50"
                      : "border-white/10"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 transition-colors duration-200 ${
                      passwordFocused || password
                        ? "text-[#E5C206]"
                        : "text-white/40"
                    }`}
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
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                className={`w-full pl-14 pr-12 py-4 bg-white/5 backdrop-blur-sm border rounded-xl text-white placeholder-transparent focus:outline-none transition-all duration-300 ${
                  passwordFocused || password
                    ? "border-[#E5C206] bg-white/10 shadow-[0_0_20px_rgba(229,194,6,0.3)]"
                    : "border-white/20 hover:border-white/30 hover:bg-white/[0.07]"
                }`}
                placeholder="Password"
                id="password"
              />
              <label
                htmlFor="password"
                className={`absolute left-14 transition-all duration-300 pointer-events-none ${
                  passwordFocused || password
                    ? "top-0 -translate-y-1/2 text-xs text-[#E5C206] bg-[#372b80] px-2 font-medium"
                    : "top-4 text-base text-white/60"
                }`}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-3 flex items-center transition-all duration-200 z-10 ${
                  passwordFocused || password
                    ? "text-[#E5C206] hover:text-yellow-300"
                    : "text-white/40 hover:text-white/60"
                }`}
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

          <div className="flex items-center justify-between">
            <label className="flex items-center text-white/60 text-sm cursor-pointer hover:text-white/80 transition-colors">
              <input type="checkbox" className="mr-2 rounded border-white/20" />
              Remember me
            </label>
            <a
              href="#"
              className="text-sm text-white/60 hover:text-[#E5C206] transition-colors duration-200"
            >
              Forgot password?
            </a>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-[#F2D25B] to-[#E5C206] hover:from-[#E5C206] hover:to-[#d4b305] text-[#2C2D86] text-lg font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[0_8px_30px_rgba(229,194,6,0.4)] ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Connecting..." : "Login"}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-1 pt-6">
          <span className="text-white/60 text-sm">Don't have an account?</span>
          <a
            href="/register"
            className="text-sm text-[#E5C206] hover:text-yellow-300 font-medium transition-colors duration-200"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
