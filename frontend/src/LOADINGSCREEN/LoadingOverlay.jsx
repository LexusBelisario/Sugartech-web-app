import React, { useState, useEffect } from "react";
import "./Loading.css";

const loadingMessages = [
  "Please wait...",
  "Loading your data...",
  "Preparing the map...",
  "Almost there...",
  "Just a moment...",
  "Fetching information...",
  "Setting things up...",
];

const LoadingOverlay = ({ visible }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        {/* Main Spinner */}
        <div className="spinner-container">
          <div className="spinner"></div>
          <div className="spinner-inner"></div>
        </div>

        {/* Loading Text */}
        <div className="loading-text-container">
          <h3 className="loading-title">Loading</h3>
          <p className="loading-message">{loadingMessages[messageIndex]}</p>
        </div>

        {/* Animated Dots */}
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        {/* Progress Bar */}
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;