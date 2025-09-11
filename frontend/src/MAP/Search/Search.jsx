// Search.jsx

import React, { useState } from "react";
import "./Search.css";
import PropertySearch from "./PropertySearch";
import RoadSearch from "./RoadSearch";
import LandmarkSearch from "./LandmarkSearch";

const Search = ({ visible, onClose, schema }) => {
  const [activeTab, setActiveTab] = useState("property");

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (window.closeReactInfoTool) window.closeReactInfoTool();
  };

  if (!visible) return null;

  return (
    <div className={`search-popup ${visible ? "visible" : ""}`} id="searchPopup">
      <div id="searchPopupInner">
        {/* Close Button */}
        <button
          className="search-close-btn"
          onClick={() => {
            onClose();
            if (window.closeReactInfoTool) window.closeReactInfoTool();
          }}
        >
          <strong>CLOSE</strong>
        </button>

        <h2>Search</h2>

        {/* Tab Buttons */}
        <div className="button-row">
          <button
            className={`search-btn ${activeTab === "property" ? "active" : ""}`}
            onClick={() => handleTabSwitch("property")}
          >
            Property
          </button>
          <button
            className={`search-btn ${activeTab === "road" ? "active" : ""}`}
            onClick={() => handleTabSwitch("road")}
          >
            Road
          </button>
          <button
            className={`search-btn ${activeTab === "landmark" ? "active" : ""}`}
            onClick={() => handleTabSwitch("landmark")}
          >
            Landmark
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "property" && <PropertySearch schema={schema} />}
        {activeTab === "road" && <RoadSearch schema={schema} />}
        {activeTab === "landmark" && <LandmarkSearch schema={schema} />}
      </div>
    </div>
  );
};

export default Search;
