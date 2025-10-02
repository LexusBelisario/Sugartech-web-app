import React, { useState } from "react";
import "../css_files/animation.css";
import { ArrowLeft } from "lucide-react";

const RejectModal = ({ isVisible, onClose, onConfirm }) => {
  const [modalClasses, setModalClasses] = useState(
    isVisible ? "slide-in" : "slide-out"
  );
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  if (!isVisible) return null;

  const rejectionReasons = [
    "Province or Municipality chosen by the user is not available in the system",
    "Duplicate account found",
    "Invalid or incomplete information provided",
    "Suspicious registration attempt"
  ];

  const handleModalBack = () => {
    setModalClasses("slide-out");
    setTimeout(() => onClose(), 490);
  };

  const handleConfirm = () => {
    const reason = customReason.trim() || selectedReason;
    if (!reason) {
      alert("Please select or enter a reason before rejecting.");
      return;
    }
    onConfirm(reason);
    handleModalBack();
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-25 flex justify-end z-50 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleModalBack}
    >
      <div
        className={`${modalClasses} flex flex-col px-10 py-8 md:w-5/12 bg-white rounded-s-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          onClick={handleModalBack}
          className="flex cursor-pointer hover:text-[#00519C] mb-4"
        >
          <ArrowLeft size={24} />
          <span className="font-semibold ml-2">Back</span>
        </div>

        <h2 className="text-2xl font-bold mb-4">Reject Registration</h2>

        {/* Dropdown */}
        <label className="block font-semibold text-gray-700 mb-2">
          Select a Reason
        </label>
        <select
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2 mb-4"
        >
          <option value="">-- Choose a reason --</option>
          {rejectionReasons.map((r, i) => (
            <option key={i} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Custom Textarea */}
        <label className="block font-semibold text-gray-700 mb-2">
          Or Enter Custom Reason
        </label>
        <textarea
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          rows={3}
          className="w-full border-2 rounded-lg px-3 py-2 mb-4"
          placeholder="Type custom reason here..."
        />

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={handleModalBack}
            className="px-6 py-2 border rounded-lg mr-2 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;
