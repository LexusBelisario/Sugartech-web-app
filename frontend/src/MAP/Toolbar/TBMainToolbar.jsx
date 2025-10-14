import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ParcelClickHandler from "../ParcelClickHandler.jsx";
import Search from "../Search/Search.jsx";
import InfoTool from "../InfoTool/InfoTool.jsx";
import Consolidate from "../Consolidate/consolidate.jsx";
import Subdivide from "../Subdivide/subdivide.jsx";
import "./toolbar.css";

const TBMainToolbar = ({ activeTool, setActiveTool }) => {
  const [showTMCR, setShowTMCR] = useState(false);
  const [showMismatchChecker, setShowMismatchChecker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const [infoProps, setInfoProps] = useState({});
  const [editHeader, setEditHeader] = useState("Land Parcel Information");

  // === Sync global tool state ===
  useEffect(() => {
    window.currentActiveTool = activeTool;
    return () => {
      window.currentActiveTool = null;
    };
  }, [activeTool]);

  // === Register global helpers ===
  useEffect(() => {
    window.switchToEditMode = () => setActiveTool("edit");
    window.switchToInfoMode = () => setActiveTool("info");

    // 🩵 Allow SearchResults to open InfoTool directly
    window.setReactInfoToolData = (parcelData) => {
      setInfoProps(parcelData);
      setActiveTool("info");
    };

    return () => {
      delete window.switchToEditMode;
      delete window.switchToInfoMode;
      delete window.setReactInfoToolData;
    };
  }, [setActiveTool]);

  const toggleTool = (tool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  const infoOrEditActive = activeTool === "info" || activeTool === "edit";

  // === Handle Search open/close ===
  const openSearch = () => {
    if (window.onParcelsLoaded) window.onParcelsLoaded();
    if (window.enforceLayerOrder) window.enforceLayerOrder();
    setToolbarVisible(false);
    setShowSearch(true);
    setActiveTool("search");
  };

  const closeSearch = () => {
    setShowSearch(false);
    setToolbarVisible(true);
    setActiveTool(null);
    if (window.onParcelsLoaded) window.onParcelsLoaded();
    if (window.enforceLayerOrder) window.enforceLayerOrder();
  };

  return (
    <>
      {/* === Main Toolbar Buttons === */}
      {toolbarVisible && (
        <>
          <button
            className={`tool-button ${activeTool === "search" ? "active" : ""}`}
            onClick={openSearch}
            title="Search for a parcel/property/road/landmark by its attributes"
          >
            <img src="/icons/property_search_tool_icon.png" alt="Search" />
            <span>Search</span>
          </button>

          <button
            className={`tool-button ${activeTool === "info" ? "active" : ""}`}
            onClick={() => toggleTool("info")}
            title="Click on any parcel to see its property information"
          >
            <img src="/icons/land_parcel_info_icon.png" alt="Info" />
            <span>Land Parcel Info Tool</span>
          </button>

          <button
            className={`tool-button ${activeTool === "edit" ? "active" : ""}`}
            onClick={() => toggleTool("edit")}
            title="Select a parcel and edit its attributes"
          >
            <img src="/icons/parcel_editing_tool_icon.png" alt="Edit" />
            <span>Parcel Attribute Editing Tool</span>
          </button>

          <button
            className={`tool-button ${activeTool === "taxmap" ? "active" : ""}`}
            id="btnLayout"
            onClick={() => setActiveTool("taxmap")}
            title="Create map layout for Section Index Map or Property Identification Map"
          >
            <img src="/icons/taxmap_layout_icon.png" alt="Layout" />
            <span>Taxmap Layout</span>
          </button>

          <button
            className="tool-button"
            id="btnTMCR"
            onClick={() => setShowTMCR(true)}
            title="Generate and Print Tax Map Control Roll"
          >
            <img src="/icons/tmcr_icon.png" alt="TMCR" />
            <span>TMCR Report</span>
          </button>

          <button
            className="tool-button"
            id="btnMatch"
            onClick={() => setShowMismatchChecker(true)}
            title="Generate Matching Report based on PIN of RPT and GIS"
          >
            <img src="/icons/matching_report_icon.png" alt="Match" />
            <span>Matching Report</span>
          </button>

          <button
            className={`tool-button ${activeTool === "consolidate" ? "active" : ""}`}
            onClick={() => toggleTool("consolidate")}
            title="Merge 2 or more property features"
          >
            <img src="/icons/consolidate_icon.png" alt="Consolidate" />
            <span>Consolidate</span>
          </button>

          <button
            className={`tool-button ${activeTool === "subdivide" ? "active" : ""}`}
            onClick={() => toggleTool("subdivide")}
            title="Split a parcel"
          >
            <img src="/icons/subdivide_icon.png" alt="Subdivide" />
            <span>Subdivide</span>
          </button>
        </>
      )}

      {/* === Search Panel === */}
      {showSearch &&
        createPortal(
          <Search visible={showSearch} onClose={closeSearch} />,
          document.body
        )}

      {/* === Consolidate Tool === */}
      {activeTool === "consolidate" &&
        createPortal(
          <Consolidate onClose={() => setActiveTool(null)} />,
          document.body
        )}

      {/* === Subdivide Tool (Popup Now Visible) === */}
      {activeTool === "subdivide" &&
        createPortal(
          <Subdivide
            visible={activeTool === "subdivide"}
            onClose={() => setActiveTool(null)}
          />,
          document.body
        )}

      {/* === Parcel Click Handler === */}
      <ParcelClickHandler
        activeTool={activeTool}
        setInfoProps={setInfoProps}
        setInfoVisible={() => {}}
        setAttributeEditMode={() => {}}
        setEditHeader={setEditHeader}
      />

      {/* === Info Tool (Portal) === */}
      {infoOrEditActive &&
        createPortal(
          <InfoTool
            visible={true}
            onClose={() => setActiveTool(null)}
            data={infoProps}
            editable={activeTool === "edit"}
            position={infoProps?.fromSearch ? "right" : "left"}
          />,
          document.body
        )}
    </>
  );
};

export default TBMainToolbar;
