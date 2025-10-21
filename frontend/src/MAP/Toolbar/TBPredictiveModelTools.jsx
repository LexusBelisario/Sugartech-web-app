import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./toolbar.css";
import LinearRegression from "../PredictiveModelTools/LinearRegression/LinearRegression.jsx";
import GWR from "../PredictiveModelTools/GWR/GWR.jsx";  // 🧩 Import new GWR tool

const TBPredictiveModelTools = () => {
  const [showLinearRegression, setShowLinearRegression] = useState(false);
  const [showGWR, setShowGWR] = useState(false);

  const handleLinearRegression = () => setShowLinearRegression(true);
  const handleGWR = () => setShowGWR(true);

  return (
    <>
      <div className="predictive-tools-wrapper dual-column">
        {/* === AI MODEL COLUMN === */}
        <div className="column-section">
          <h4 className="section-title">AI MODEL</h4>
          <div className="predictive-grid ai-grid">
            <button
              className="tool-button"
              onClick={handleLinearRegression}
              title="Run Multiple Linear Regression"
            >
              <img src="/icons/mlr.png" alt="Linear Regression" />
              <span>Linear Regression</span>
            </button>
          </div>
        </div>

        {/* === GEO-AI MODEL COLUMN === */}
        <div className="column-section">
          <h4 className="section-title">GEO-AI MODEL</h4>
          <div className="predictive-grid geo-grid">
            <button
              className="tool-button"
              onClick={handleGWR}
              title="Run Geographically Weighted Regression"
            >
              <img src="/icons/gwr.png" alt="GWR" />
              <span>Geographically Weighted Regression</span>
            </button>
          </div>
        </div>
      </div>

      {/* === Modals === */}
      {showLinearRegression &&
        ReactDOM.createPortal(
          <LinearRegression onClose={() => setShowLinearRegression(false)} />,
          document.body
        )}

      {showGWR &&
        ReactDOM.createPortal(
          <GWR onClose={() => setShowGWR(false)} />,   // ✅ Replace placeholder with real component
          document.body
        )}
    </>
  );
};

export default TBPredictiveModelTools;
