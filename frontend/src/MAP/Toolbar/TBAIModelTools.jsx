import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./toolbar.css";
import LinearRegression from "../AIModelTools/LinearRegression/LinearRegression.jsx";
// (Optional placeholder) Import RandomForest modal once available
// import RandomForest from "../AIModelTools/RandomForest/RandomForest.jsx";

const TBAIModelTools = () => {
  const [showLinearRegression, setShowLinearRegression] = useState(false);
  const [showRandomForest, setShowRandomForest] = useState(false);

  // === Handlers ===
  const handleLinearRegression = () => setShowLinearRegression(true);
  const handleRandomForest = () => setShowRandomForest(true);

  // === Modals ===
  const renderLinearRegressionModal = () => {
    if (!showLinearRegression) return null;
    return ReactDOM.createPortal(
      <LinearRegression onClose={() => setShowLinearRegression(false)} />,
      document.body
    );
  };

  const renderRandomForestModal = () => {
    if (!showRandomForest) return null;
    // Placeholder for RandomForest modal component once created
    return ReactDOM.createPortal(
      <div className="modal-placeholder">
        <h2>Random Forest Model (Coming Soon)</h2>
        <button onClick={() => setShowRandomForest(false)}>Close</button>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* === Toolbar Buttons === */}
      <button
        className="tool-button"
        id="btnLinearRegression"
        onClick={handleLinearRegression}
        title="Run Multiple Linear Regression"
      >
        <img src="/icons/mlr.png" alt="Linear Regression" />
        <span>Linear Regression</span>
      </button>

      <button
        className="tool-button"
        id="btnRandomForest"
        onClick={handleRandomForest}
        title="Run Random Forest Model"
      >
        <img src="/icons/randomforest.png" alt="Random Forest" />
        <span>Random Forest</span>
      </button>

      {/* === Modals rendered OUTSIDE toolbar === */}
      {renderLinearRegressionModal()}
      {renderRandomForestModal()}
    </>
  );
};

export default TBAIModelTools;
