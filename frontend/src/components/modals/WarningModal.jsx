// components/WarningModal.jsx
import React, { useState } from "react";
import "./css/warning_animation.css";
import WarningAnimation from "./WarningAnimation.jsx";

const WarningModal = ({
  isVisible,
  onClose,
  title,
  message,
  buttonText = "Ok",
  severity = "warning",
}) => {
  const [modalClasses, setModalClasses] = useState(
    isVisible ? "pop-in" : "pop-out"
  );

  if (!isVisible) return null;

  const handleModalBack = () => {
    setModalClasses("pop-out");
    setTimeout(() => onClose(), 450);
  };

  // Different colors based on severity
  const buttonColor =
    severity === "error"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-yellow-600 hover:bg-yellow-700";

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleModalBack}
    >
      <div
        className={`${modalClasses} w-[28em] h-[22em] bg-white rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center flex-col pt-8">
          <div className="flex">
            <WarningAnimation severity={severity} />
          </div>
          <div className="flex justify-center items-center pt-2">
            <p className="font-bold text-2xl text-center mx-16">{title}</p>
          </div>
          <div className="pt-1">
            <p className="font-medium text-base text-center mx-10 pt-1">
              {message}
            </p>
          </div>
          <div className="flex flex-row pt-7">
            <button
              type="submit"
              onClick={handleModalBack}
              className={`${buttonColor} font-semibold rounded-lg px-10 py-3 text-white text-base`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarningModal;
