import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./VicinityPreview.css";

const VicinityPreview = ({ background, onClose }) => {
  useEffect(() => {
    const container = document.getElementById("mapCanvas");
    if (!container) return;

    container.innerHTML = "";

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false
    });

    // === Add basemap ===
    if (background === "osm") {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);
    } else if (background === "satellite") {
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      ).addTo(map);
    }

    // Center view placeholder — update to fit parcel later
    map.setView([13.0, 122.0], 13);

    return () => map.remove();
  }, [background]);

  return (
    <div className="layout-overlay">
      <div className="layout-toolbar">
        <button onClick={onClose}>Close</button>
      </div>

      <div id="layoutPreview" className="print-layout">
        <div className="layout-border" />
        <div id="mapCanvas" className="map-canvas" />
        <div className="info-box">
          <img src="/NorthArrow.png" alt="North" className="north-arrow" />
          <div className="map-title">VICINITY MAP</div>
        </div>
      </div>
    </div>
  );
};

export default VicinityPreview;
