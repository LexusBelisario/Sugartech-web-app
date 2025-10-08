import React, { useState } from "react";
import "./toolbar.css";
import TBMainToolbar from "./TBMainToolbar.jsx";
import TBLandLegendTools from "./TBLandLegendTools.jsx";
import TBThematicMaps from "./TBThematicMaps.jsx";
import TBLabelTools from "./TBLabelTools.jsx";
import TBLandmarkTools from "./TBLandmarkTools.jsx";
import TBAIModelTools from "./TBAIModelTools.jsx";




const tabs = [
  { id: "parcel", label: "Parcel Main Toolbar" },
  { id: "land", label: "Land Legend Tools" },
  { id: "thematic", label: "Thematic Maps" },
  { id: "label", label: "Label Tools" },
  { id: "landmark", label: "Landmark Tools" },
  { id: "ai", label: "AI Model Tools" },
];


const Toolbar = ({
  onSearchClick,
  onInfoClick,
  onAttributeEditClick,
  onConsolidateClick,
  onSubdivideClick,
  onLandmarkInfoClick,
  onShowLandmarksClick,
}) => {

  const [visible, setVisible] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [activeTab, setActiveTab] = useState("parcel");

  const handleToggle = () => {
    setVisible(prev => !prev);
  };

  // Renders the buttons depending on selected tab
  const renderButtons = () => {
    switch (activeTab) {
      case "parcel":
        return (
          <TBMainToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onSearchClick={onSearchClick}
            onInfoClick={onInfoClick}
            onAttributeEditClick={onAttributeEditClick}
            onConsolidateClick={onConsolidateClick}
            onSubdivideClick={onSubdivideClick}
          />
        );
      case "land":
        return (
          <TBLandLegendTools
            activeTool={activeTool}
            setActiveTool={setActiveTool}
          />
        );

      case "thematic":
        return <TBThematicMaps />;

      case "label":
      return <TBLabelTools />;

      case "landmark":
        return (
          <TBLandmarkTools
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onLandmarkInfoClick={onLandmarkInfoClick}
            onShowLandmarksClick={onShowLandmarksClick}
          />
        );

      case "ai":
        return (
          <TBAIModelTools
            onLinearRegressionClick={() => console.log("Linear Regression clicked")}
          />
        );


      default:
        return null;
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button id="toggleToolbarBtn" onClick={handleToggle}>
        ☰ GISTools
      </button>

      <div className={`toolbar-panel ${visible ? "visible" : ""}`} id="toolbarPanel">
        {/* Tab selector */}
        <select
          className="toolbar-dropdown"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>

        {/* Tools grid */}
        <div className="toolbar-grid">
          {renderButtons()}
        </div>
      </div>
    </>
  );
};

export default Toolbar;
