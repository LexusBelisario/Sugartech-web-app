import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search as SearchIcon,
  Merge,
  Scissors,
  Info,
  Edit3,
  Map,
  FileCheck,
  FileText,
} from "lucide-react";
import ParcelClickHandler from "../ParcelClickHandler.jsx";
import Search from "../Search/Search.jsx";
import InfoTool from "../InfoTool/InfoTool.jsx";
import Consolidate from "../Consolidate/consolidate.jsx";
import Subdivide from "../Subdivide/subdivide.jsx";
import "./toolbar.css";

const TOOLS = {
  SEARCH: "search",
  CONSOLIDATE: "consolidate",
  SUBDIVIDE: "subdivide",
  INFO: "info",
  EDIT: "edit",
  TAXMAP: "taxmap",
};

const TBMainToolbar = ({ activeTool, setActiveTool }) => {
  const [showTMCR, setShowTMCR] = useState(false);
  const [showMismatchChecker, setShowMismatchChecker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [infoProps, setInfoProps] = useState({});
  const [editHeader, setEditHeader] = useState("Land Parcel Information");

  // Sync global tool state & register helpers
  useEffect(() => {
    window.currentActiveTool = activeTool;
    window.switchToEditMode = () => setActiveTool(TOOLS.EDIT);
    window.switchToInfoMode = () => setActiveTool(TOOLS.INFO);
    window.setReactInfoToolData = (parcelData) => {
      setInfoProps(parcelData);
      setActiveTool(TOOLS.INFO);
    };

    return () => {
      window.currentActiveTool = null;
      delete window.switchToEditMode;
      delete window.switchToInfoMode;
      delete window.setReactInfoToolData;
    };
  }, [activeTool, setActiveTool]);

  const toggleTool = (tool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  const handleLayerRefresh = () => {
    window.onParcelsLoaded?.();
    window.enforceLayerOrder?.();
  };

  const openSearch = () => {
    handleLayerRefresh();
    setToolbarVisible(false);
    setShowSearch(true);
    setActiveTool(TOOLS.SEARCH);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setToolbarVisible(true);
    setActiveTool(null);
    handleLayerRefresh();
  };

  const infoOrEditActive = [TOOLS.INFO, TOOLS.EDIT].includes(activeTool);

  const toolButtons = [
    {
      id: TOOLS.SEARCH,
      icon: SearchIcon,
      label: "Search",
      title: "Search for a parcel/property/road/landmark by its attributes",
      onClick: openSearch,
    },
    {
      id: TOOLS.CONSOLIDATE,
      icon: Merge,
      label: "Consolidate",
      title: "Merge 2 or more property features",
      onClick: () => toggleTool(TOOLS.CONSOLIDATE),
    },
    {
      id: TOOLS.SUBDIVIDE,
      icon: Scissors,
      label: "Subdivide",
      title: "Split a parcel",
      onClick: () => toggleTool(TOOLS.SUBDIVIDE),
    },
    {
      id: TOOLS.INFO,
      icon: Info,
      label: "Land Parcel Info Tool",
      title: "Click on any parcel to see its property information",
      onClick: () => toggleTool(TOOLS.INFO),
    },
    {
      id: TOOLS.EDIT,
      icon: Edit3,
      label: "Attribute Editing Tool",
      title: "Select a parcel and edit its attributes",
      onClick: () => toggleTool(TOOLS.EDIT),
    },
    {
      id: TOOLS.TAXMAP,
      icon: Map,
      label: "Taxmap Layout",
      title:
        "Create map layout for Section Index Map or Property Identification Map",
      onClick: () => setActiveTool(TOOLS.TAXMAP),
    },
    {
      id: "matching",
      icon: FileCheck,
      label: "Matching Report",
      title: "Generate Matching Report based on PIN of RPT and GIS",
      onClick: () => setShowMismatchChecker(true),
    },
    {
      id: "tmcr",
      icon: FileText,
      label: "TMCR",
      title: "Generate and Print Tax Map Control Roll",
      onClick: () => setShowTMCR(true),
    },
  ];

  return (
    <>
      {/* Main Toolbar Buttons */}
      {toolbarVisible && (
        <>
          {toolButtons.map(({ id, icon: Icon, label, title, onClick }) => (
            <button
              key={id}
              className={`tool-button ${activeTool === id ? "active" : ""}`}
              onClick={onClick}
              title={title}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </>
      )}

      {/* Modals & Tools */}
      {showSearch &&
        createPortal(
          <Search visible={showSearch} onClose={closeSearch} />,
          document.body
        )}

      {activeTool === TOOLS.CONSOLIDATE &&
        createPortal(
          <Consolidate onClose={() => setActiveTool(null)} />,
          document.body
        )}

      {activeTool === TOOLS.SUBDIVIDE &&
        createPortal(
          <Subdivide visible={true} onClose={() => setActiveTool(null)} />,
          document.body
        )}

      <ParcelClickHandler
        activeTool={activeTool}
        setInfoProps={setInfoProps}
        setInfoVisible={() => {}}
        setAttributeEditMode={() => {}}
        setEditHeader={setEditHeader}
      />

      {infoOrEditActive &&
        createPortal(
          <InfoTool
            visible={true}
            onClose={() => setActiveTool(null)}
            data={infoProps}
            editable={activeTool === TOOLS.EDIT}
            position={infoProps?.fromSearch ? "right" : "left"}
          />,
          document.body
        )}
    </>
  );
};

export default TBMainToolbar;
