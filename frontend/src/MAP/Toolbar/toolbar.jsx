import React, { useState, useEffect } from "react";
import "./toolbar.css";
import TBMainToolbar from "./TBMainToolbar.jsx";
import TBLandLegendTools from "./TBLandLegendTools.jsx";
import TBThematicMaps from "./TBThematicMaps.jsx";
import TBLabelTools from "./TBLabelTools.jsx";
import TBLandmarkTools from "./TBLandmarkTools.jsx";
import { useSchema } from "../SchemaContext.jsx";
import { Wrench } from "lucide-react"; // New icon!

const tabs = [
  { id: "parcel", label: "Main Toolbar" },
  { id: "land", label: "Land Legend Tools" },
  { id: "thematic", label: "Thematic Maps" },
  { id: "label", label: "Label Tools" },
  { id: "landmark", label: "Landmark Tools" },
];

const Toolbar = ({
  onSearchClick,
  onInfoClick,
  onAttributeEditClick,
  onConsolidateClick,
  onSubdivideClick,
  onLandmarkInfoClick,
  onShowLandmarksClick,
  isConsolidatePanelOpen,
  isSubdividePanelOpen,
  isAttributeEditPanelOpen,
  isSearchPanelOpen,
  isInfoPanelOpen,
}) => {
  const [visible, setVisible] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [activeTab, setActiveTab] = useState("parcel");
  const [shouldShift, setShouldShift] = useState(false);
  const { schema } = useSchema();

  const handleToggle = () => setVisible(v => !v);

  useEffect(() => {
    const anyPanelOpen = 
      isConsolidatePanelOpen || 
      isSubdividePanelOpen || 
      isAttributeEditPanelOpen ||
      isSearchPanelOpen ||
      isInfoPanelOpen;
    
    setShouldShift(anyPanelOpen);
  }, [
    isConsolidatePanelOpen, 
    isSubdividePanelOpen, 
    isAttributeEditPanelOpen,
    isSearchPanelOpen,
    isInfoPanelOpen
  ]);

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
        return <TBLandLegendTools activeTool={activeTool} setActiveTool={setActiveTool} />;
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
      default:
        return null;
    }
  };

  return (
    <>
      <button 
        id="toggleToolbarBtn" 
        onClick={handleToggle}
        className={`${shouldShift ? "shifted" : ""} ${visible ? "active" : ""}`}
      >
        <Wrench className="toolbar-icon" size={20} strokeWidth={2.5} />
        <span>Toolbar</span>
      </button>

      <div 
        className={`toolbar-panel ${visible ? "visible" : ""} ${shouldShift ? "shifted-left" : ""}`} 
        id="toolbarPanel"
      >
        <div className="toolbar-header">
          <div className="toolbar-header-icon">
            <Wrench size={22} strokeWidth={2.5} />
          </div>
          <h3 className="toolbar-title">Toolbar</h3>
        </div>

        <select 
          className="toolbar-dropdown" 
          value={activeTab} 
          onChange={e => setActiveTab(e.target.value)}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>

        <div className="toolbar-grid" style={{ position: "relative" }}>
          {renderButtons()}
          {!schema && (
            <div className="toolbar-overlay">
              <div className="overlay-content">
                <p>No Mun/City selected yet.</p>
                <p>Please select a Mun/City first.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Toolbar;