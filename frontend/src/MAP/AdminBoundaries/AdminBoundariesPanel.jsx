import React, { useRef, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

const AdminBoundariesPanel = ({ isVisible, onClose }) => {
  const containerRef = useRef(null);
  
  const [municipalChecked, setMunicipalChecked] = useState(true);
  const [barangayChecked, setBarangayChecked] = useState(true);
  const [sectionChecked, setSectionChecked] = useState(true);
  const [parcelsChecked, setParcelsChecked] = useState(true);
  const [parcelColor, setParcelColor] = useState("black");

  // 🧩 Prevent map zoom & drag interference inside panel
  useEffect(() => {
    if (!containerRef.current) return;
    const stopEvent = (e) => e.stopPropagation();
    const el = containerRef.current;
    el.addEventListener("wheel", stopEvent);
    el.addEventListener("dblclick", stopEvent);
    return () => {
      el.removeEventListener("wheel", stopEvent);
      el.removeEventListener("dblclick", stopEvent);
    };
  }, []);

  // Handle municipal checkbox change
  const handleMunicipalChange = (e) => {
    setMunicipalChecked(e.target.checked);
    if (window._updateBoundaryVisibility) {
      window._updateBoundaryVisibility(false);
    }
  };

  // Handle barangay checkbox change
  const handleBarangayChange = (e) => {
    const checked = e.target.checked;
    setBarangayChecked(checked);
    if (window._setShowBarangay) {
      window._setShowBarangay(checked);
    }
  };

  // Handle section checkbox change
  const handleSectionChange = (e) => {
    const checked = e.target.checked;
    setSectionChecked(checked);
    if (window._setShowSection) {
      window._setShowSection(checked);
    }
    // ✅ Also update section layer visibility
    if (window._updateBoundaryVisibility) {
      window._updateBoundaryVisibility(false);
    }
  };

  // Handle parcels checkbox change
  const handleParcelsChange = (e) => {
    setParcelsChecked(e.target.checked);
    if (window._updateBoundaryVisibility) {
      window._updateBoundaryVisibility(false);
    }
  };

  // Handle color change
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setParcelColor(newColor);
    window.parcelOutlineColor = newColor;
    if (window._updateBoundaryVisibility) {
      // ✅ Force refresh to apply new color
      window._updateBoundaryVisibility(true);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 right-14 w-[260px] bg-[#151922] text-white rounded-l-lg shadow-xl border border-[#2A2E35] animate-slideIn z-[9999]"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#F7C800] text-black font-semibold px-4 py-2 rounded-tl-lg">
        <span>Admin Boundaries</span>
        <button
          className="text-black hover:opacity-70 transition"
          onClick={onClose}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 text-sm space-y-3">
        {/* Municipal Boundary */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-[#F7C800] transition">
          <input
            type="checkbox"
            id="municipal"
            checked={municipalChecked}
            onChange={handleMunicipalChange}
            className="accent-[#F7C800] w-4 h-4"
          />
          <span>Municipal Boundary</span>
        </label>

        {/* Barangay Boundary */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-[#F7C800] transition">
          <input
            type="checkbox"
            id="barangay"
            checked={barangayChecked}
            onChange={handleBarangayChange}
            className="accent-[#F7C800] w-4 h-4"
          />
          <span>Barangay Boundary</span>
        </label>

        {/* Section Boundary */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-[#F7C800] transition">
          <input
            type="checkbox"
            id="section"
            checked={sectionChecked}
            onChange={handleSectionChange}
            className="accent-[#F7C800] w-4 h-4"
          />
          <span>Section Boundary</span>
        </label>

        {/* Divider */}
        <hr className="border-[#2A2E35]" />

        {/* Parcels */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-[#F7C800] transition">
          <input
            type="checkbox"
            id="parcels"
            checked={parcelsChecked}
            onChange={handleParcelsChange}
            className="accent-[#F7C800] w-4 h-4"
          />
          <span>Parcels</span>
        </label>

        {/* Parcel Outline Color */}
        <div className="space-y-2">
          <label htmlFor="parcelColor" className="block text-gray-300 text-xs">
            Parcel Outline Color:
          </label>
          <select
            id="parcelColor"
            value={parcelColor}
            onChange={handleColorChange}
            className="w-full bg-[#1E1E1E] text-white border border-[#2A2E35] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#F7C800] cursor-pointer"
          >
            <option value="red">Red</option>
            <option value="orange">Orange</option>
            <option value="yellow">Yellow</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="violet">Violet</option>
            <option value="black">Black</option>
            <option value="white">White</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default AdminBoundariesPanel;