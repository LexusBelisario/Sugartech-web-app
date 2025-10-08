import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./toolbar.css";
import LinearRegression from "../AIModelTools/LinearRegression/LinearRegression.jsx";

const TBAIModelTools = () => {
  const [showLinearRegression, setShowLinearRegression] = useState(false);

  const handleLinearRegression = () => {
    setShowLinearRegression(true);
  };

  // 🔹 Use React Portal to render LinearRegression outside toolbar container
  const renderLinearRegressionModal = () => {
    if (!showLinearRegression) return null;
    return ReactDOM.createPortal(
      <LinearRegression onClose={() => setShowLinearRegression(false)} />,
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

      {/* === Modal rendered OUTSIDE toolbar === */}
      {renderLinearRegressionModal()}
    </>
  );
};

export default TBAIModelTools;
