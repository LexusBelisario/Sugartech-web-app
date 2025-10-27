import React, { useRef, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

const AdminBoundariesPanel = ({ isVisible, onClose }) => {
  const containerRef = useRef(null);

  // === Boundary Toggles ===
  const [municipalChecked, setMunicipalChecked] = useState(true);
  const [barangayChecked, setBarangayChecked] = useState(true);
  const [sectionChecked, setSectionChecked] = useState(true);
  const [parcelsChecked, setParcelsChecked] = useState(true);
  const [parcelColor, setParcelColor] = useState("black");

  // === Prevent Scroll / Zoom Interference ===
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const stop = (e) => e.stopPropagation();
    el.addEventListener("wheel", stop);
    el.addEventListener("dblclick", stop);
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("dblclick", stop);
    };
  }, []);

  // === Toggle Handlers (Instant Reaction) ===
  const handleToggle = (type, setter) => (e) => {
    const checked = e.target.checked;
    setter(checked);

    // call the corresponding setter on AdminBoundaries
    const setStateFn = window[`_setShow${type}`];
    const updateMap = window._updateBoundaryVisibility;

    if (setStateFn) setStateFn(checked);

    // pass override instantly for real-time toggle
    if (updateMap) {
      const key =
        type === "Municipal"
          ? "showMunicipal"
          : type === "Barangay"
          ? "showBarangay"
          : "showSection";
      updateMap(true, { [key]: checked });
    }
  };

  const handleParcelToggle = (e) => {
    const checked = e.target.checked;
    setParcelsChecked(checked);
    if (window._updateBoundaryVisibility) {
      window._updateBoundaryVisibility(true);
    }
  };

  const handleColorChange = (e) => {
    const color = e.target.value;
    setParcelColor(color);
    window.parcelOutlineColor = color;
    if (window._updateBoundaryVisibility) {
      window._updateBoundaryVisibility(true);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 left-14 w-[260px] z-[9999]
                 bg-[#FAFAF9] text-[#111827] rounded-r-xl border border-[#B22234]
                 shadow-[0_10px_24px_rgba(0,0,0,0.18),0_0_0_1px_rgba(178,34,52,0.18)]
                 animate-slideIn"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#A50034] text-[#FAFAF9] font-semibold px-4 py-2 rounded-tr-xl">
        <span>Admin Boundaries</span>
        <button
          className="text-[#FAFAF9]/90 hover:opacity-80 transition"
          onClick={onClose}
          aria-label="Close admin boundaries panel"
        >
          {/* flip to point toward the left edge */}
          <ChevronRight size={20} className="-rotate-180" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 text-sm space-y-3">
        {/* Municipal Boundary */}
        <label className="flex items-center gap-2 cursor-pointer transition hover:text-[#D50032]">
          <input
            type="checkbox"
            checked={municipalChecked}
            onChange={handleToggle("Municipal", setMunicipalChecked)}
            className="accent-[#D50032] w-4 h-4"
          />
          <span>Municipal Boundary</span>
        </label>

        {/* Barangay Boundary */}
        <label className="flex items-center gap-2 cursor-pointer transition hover:text-[#D50032]">
          <input
            type="checkbox"
            checked={barangayChecked}
            onChange={handleToggle("Barangay", setBarangayChecked)}
            className="accent-[#D50032] w-4 h-4"
          />
          <span>Barangay Boundary</span>
        </label>

        {/* Section Boundary */}
        <label className="flex items-center gap-2 cursor-pointer transition hover:text-[#D50032]">
          <input
            type="checkbox"
            checked={sectionChecked}
            onChange={handleToggle("Section", setSectionChecked)}
            className="accent-[#D50032] w-4 h-4"
          />
          <span>Section Boundary</span>
        </label>

        <hr className="border-[#E5E7EB]" />

        {/* Parcels */}
        <label className="flex items-center gap-2 cursor-pointer transition hover:text-[#D50032]">
          <input
            type="checkbox"
            checked={parcelsChecked}
            onChange={handleParcelToggle}
            className="accent-[#D50032] w-4 h-4"
          />
          <span>Parcels</span>
        </label>

        {/* Parcel Color Selector */}
        <div className="space-y-2">
          <label htmlFor="parcelColor" className="block text-gray-700 text-xs">
            Parcel Outline Color:
          </label>
          <select
            id="parcelColor"
            value={parcelColor}
            onChange={handleColorChange}
            className="w-full bg-white text-[#111827] border border-[#E5E7EB] rounded px-2 py-1.5 text-sm
                       focus:outline-none focus:border-[#D50032] focus:ring-2 focus:ring-[#D50032]/30 cursor-pointer"
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
