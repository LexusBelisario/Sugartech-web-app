import React from "react";
import "./css/warning_animation.css";

const WarningAnimation = ({ severity = "warning" }) => {
  const isError = severity === "error";

  return (
    <div className="warning-icon">
      <div className={`warning-circle ${isError ? "error" : ""}`}>
        <span className="warning-symbol">!</span>
      </div>
    </div>
  );
};

export default WarningAnimation;
