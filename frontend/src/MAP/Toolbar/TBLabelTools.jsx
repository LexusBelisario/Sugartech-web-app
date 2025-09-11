// src/components/TBLabelTools.jsx
import React from "react";
import "./toolbar.css";

const TBLabelTools = () => {
  return (
    <>
      <button
        className="tool-button"
        id="btnBrgyLabel"
        onClick={() => window.toggleBrgyLabel?.()}
        title="Toggle Barangay, Section, Parcel labels"
      >
        <img src="/icons/multilabel.png" alt="Multi-label" />
        <span>Land Parcel Multi-label</span>
      </button>

      <button
        className="tool-button"
        id="btnStreetLabel"
        onClick={() => window.toggleStreetLabel?.()}
        title="Toggle Street Label"
      >
        <img src="/icons/street_label_icon.png" alt="Street Label" />
        <span>Street Label</span>
      </button>

      <button
        className="tool-button"
        id="btnBldgLabel"
        title="Toggles ON and OFF the labels of buildings"
        onClick={() => window.toggleBldgLabel?.()}
      >
        <img src="/icons/bldg_label_icon.png" alt="Building Label" />
        <span>Bldg Count Label</span>
      </button>

      <button
        className="tool-button"
        id="btnMachLabel"
        title="Toggles ON and OFF the labels of machinery"
        onClick={() => window.toggleMachLabel?.()}
      >
        <img src="/icons/machinery_label_icon.png" alt="Machinery Label" />
        <span>Mach. Count Label</span>
      </button>

      <button
        className="tool-button"
        id="btnLandmarkLabel"
        onClick={() => window.toggleLandmarkLabel?.()}
        title="Toggles on and off labels for Landmarks"
      >
        <img src="/icons/landmark_label_icon.png" alt="Landmark Label" />
        <span>Landmark Label</span>
      </button>
    </>
  );
};

export default TBLabelTools;
