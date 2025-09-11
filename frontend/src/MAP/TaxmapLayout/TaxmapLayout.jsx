import React, { useEffect, useState } from "react";
import SectionMap from "./SectionMap.jsx";
import PropertyID from "./PropertyID.jsx";
import Vicinity from "./Vicinity.jsx";

import "./TaxmapLayout.css";


const TaxmapLayout = ({ map, onClose, selectedSchema }) => {
  const [activeTab, setActiveTab] = useState("section");

  useEffect(() => {
    const toolbar = document.getElementById("mainToolbar");
    if (toolbar) toolbar.style.display = "none";

    return () => {
      if (toolbar) toolbar.style.display = "block";
    };
  }, []);

  return (
    <div className="taxmap-panel">
      {/* Header */}
      <div className="tabs">
        <span className="tabs-title"><h2>Taxmap Layout</h2></span>
        <button className="close-btn" onClick={onClose}>CLOSE</button>
      </div>

      {/* Tab Buttons */}
      <div className="tab-buttons">
        <button
          className={activeTab === "section" ? "active" : ""}
          onClick={() => setActiveTab("section")}
        >
          Section Map
        </button>
        <button
          className={activeTab === "property" ? "active" : ""}
          onClick={() => setActiveTab("property")}
        >
          Property ID Map
        </button>
        <button
          className={activeTab === "vicinity" ? "active" : ""}
          onClick={() => setActiveTab("vicinity")}
        >
          Vicinity Map
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "section" && (
          <SectionMap map={map} selectedSchema={selectedSchema} />
        )}
        {activeTab === "property" && (
          <PropertyID map={map} selectedSchema={selectedSchema} />
        )}
        {activeTab === "vicinity" && (
          <Vicinity map={map} selectedSchema={selectedSchema} />
        )}
      </div>
    </div>
  );
};

export default TaxmapLayout;
