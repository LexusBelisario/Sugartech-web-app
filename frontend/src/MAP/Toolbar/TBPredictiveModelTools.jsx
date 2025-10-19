import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./toolbar.css";
import LinearRegression from "../PredictiveModelTools/LinearRegression/LinearRegression.jsx";

const TBPredictiveModelTools = () => {
  const [showLinearRegression, setShowLinearRegression] = useState(false);
  const [showXGBoost, setShowXGBoost] = useState(false);
  const [showGWR, setShowGWR] = useState(false);

  const handleLinearRegression = () => setShowLinearRegression(true);
  const handleXGBoost = () => setShowXGBoost(true);
  const handleGWR = () => setShowGWR(true);

  const renderLinearRegressionModal = () =>
    showLinearRegression
      ? ReactDOM.createPortal(
          <LinearRegression onClose={() => setShowLinearRegression(false)} />,
          document.body
        )
      : null;

  const renderXGBoostModal = () =>
    showXGBoost
      ? ReactDOM.createPortal(
          <div className="modal-placeholder">
            <h2>XGBoost Model (Coming Soon)</h2>
            <button onClick={() => setShowXGBoost(false)}>Close</button>
          </div>,
          document.body
        )
      : null;

  const renderGWRModal = () =>
    showGWR
      ? ReactDOM.createPortal(
          <div className="modal-placeholder">
            <h2>Geographically Weighted Regression (Coming Soon)</h2>
            <button onClick={() => setShowGWR(false)}>Close</button>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="predictive-tools-wrapper">
        {/* === AI MODELS === */}
        <h4 className="section-title">AI MODEL</h4>
        <div className="predictive-grid-3col">
          <button
            className="tool-button"
            onClick={handleLinearRegression}
            title="Run Multiple Linear Regression"
          >
            <img src="/icons/mlr.png" alt="Linear Regression" />
            <span>Linear Regression</span>
          </button>

          <button
            className="tool-button"
            onClick={handleXGBoost}
            title="Run XGBoost Model"
          >
            <img src="/icons/xgboost.png" alt="XGBoost" />
            <span>XGBoost</span>
          </button>
        </div>

        {/* === GEO-AI MODELS === */}
        <h4 className="section-title">GEO-AI MODEL</h4>
        <div className="predictive-grid-3col">
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

      {renderLinearRegressionModal()}
      {renderXGBoostModal()}
      {renderGWRModal()}
    </>
  );
};

export default TBPredictiveModelTools;
