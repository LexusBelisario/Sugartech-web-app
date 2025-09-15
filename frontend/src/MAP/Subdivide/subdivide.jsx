import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { parcelLayers } from "../view";

// import useLineDrawing from "./useLineDrawing";
import AddLine from "./AddLine";
import AddPoints from "./AddPoints";
import BearingDistance from "./BearingDistance";
import "./subdivide.css";
import API from "../../api_service";

const Subdivide = ({ map, onClose }) => {
  const [activeTab, setActiveTab] = useState("line");
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [lines, setLines] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [manualPoints, setManualPoints] = useState([]);
  const [allPoints, setAllPoints] = useState([]);
  const [suggestedPins, setSuggestedPins] = useState([]);

  const ghostLine = useRef(null);
  const manualMarkers = useRef([]);
  const pointMarkers = useRef([]);
  const addLineRef = useRef(null);
  const addPointsRef = useRef(null);
  const bearingRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const handleParcelClick = (e) => {
      if (locked || lines.length > 0) return;
      const layer = e.target;
      const match = parcelLayers.find((p) => p.layer === layer);
      if (!match?.feature) return;

      parcelLayers.forEach(({ layer }) => {
        if (layer.options.fillColor !== "lime") {
          layer.setStyle({
            color: "black",
            weight: 1,
            fillColor: "black",
            fillOpacity: 0.1,
          });
        }
      });

      layer.setStyle({
        color: "black",
        weight: 2,
        fillColor: "yellow",
        fillOpacity: 0.4,
      });
      setSelectedParcel(match.feature);
      window.currentParcelLayer = layer;
      setError("");
    };

    parcelLayers.forEach(({ layer }) => {
      layer.off("click");
      layer.on("click", handleParcelClick);
    });
  }, [map, lines, locked]);

  // === Auto-generate PINs for Line Drawing ===
  useEffect(() => {
    if (
      !selectedParcel ||
      !locked ||
      lines.length === 0 ||
      activeTab !== "line"
    )
      return;

    const originalPin = selectedParcel.properties.pin;
    const prefix = originalPin.split("-").slice(0, 4).join("-");

    const existing = parcelLayers
      .map((p) => p.feature?.properties?.pin)
      .filter((p) => p?.startsWith(prefix));
    const suffixes = existing
      .map((p) => parseInt(p.split("-")[4]))
      .filter((n) => !isNaN(n));
    const base = Math.max(...suffixes, 0) + 1;

    const partCount = lines.length + 1;
    const newPins = Array.from(
      { length: partCount },
      (_, i) => `${prefix}-${String(base + i).padStart(3, "0")}`
    );

    setSuggestedPins(newPins);
  }, [lines, selectedParcel, locked, activeTab]);

  // === Auto-generate PINs for Point Input ===
  useEffect(() => {
    if (
      !selectedParcel ||
      !locked ||
      manualPoints.length < 2 ||
      activeTab !== "point"
    )
      return;

    const originalPin = selectedParcel.properties.pin;
    const prefix = originalPin.split("-").slice(0, 4).join("-");

    const existing = parcelLayers
      .map((p) => p.feature?.properties?.pin)
      .filter((p) => p?.startsWith(prefix));
    const suffixes = existing
      .map((p) => parseInt(p.split("-")[4]))
      .filter((n) => !isNaN(n));
    const base = Math.max(...suffixes, 0) + 1;

    const newPins = Array.from(
      { length: 2 },
      (_, i) => `${prefix}-${String(base + i).padStart(3, "0")}`
    );

    setSuggestedPins(newPins);
  }, [manualPoints, selectedParcel, locked, activeTab]);

  const resetAllSubdivide = () => {
    if (addLineRef.current) {
      addLineRef.current.clearDrawnLines();
    }

    parcelLayers.forEach(({ layer }) =>
      layer.setStyle({
        color: "black",
        weight: 1,
        fillColor: "black",
        fillOpacity: 0.1,
      })
    );
    if (window.currentParcelLayer) window.currentParcelLayer = null;

    setLocked(false);
    setSelectedParcel(null);
    setLines([]);
    setAllPoints([]);
    pointMarkers.current.forEach((m) => m.remove());
    pointMarkers.current = [];
    setError("");
    setSuggestedPins([]);

    if (activeTab === "point" && addPointsRef.current) {
      addPointsRef.current.clearManualPoints();
    } else if (activeTab === "bearing") {
      if (bearingRef.current) {
        bearingRef.current.clearBearingPoints();
      }
    }
  };

  // === Submit subdivision ===
  const handleSubdivide = async () => {
    if (!selectedParcel || suggestedPins.length === 0) {
      alert("Missing required input.");
      return;
    }

    const split_lines =
      activeTab === "point" || activeTab === "bearing" ? [manualPoints] : lines;

    // Add logs here for debugging
    console.log("▶️ Subdivide request");
    console.log("Schema:", selectedParcel.properties.source_schema);
    console.log("Table:", selectedParcel.properties.source_table);
    console.log("PIN:", selectedParcel.properties.pin);
    console.log("Split Lines:", split_lines);
    console.log("Suggested PINs:", suggestedPins);

    try {
      const res = await fetch(`${API}/subdivide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: selectedParcel.properties.pin,
          schema: selectedParcel.properties.source_schema,
          table: selectedParcel.properties.source_table,
          split_lines,
          new_pins: suggestedPins,
          original_properties: selectedParcel.properties,
        }),
      });

      const json = await res.json();
      if (json.status === "success") {
        alert("Subdivision successful.");

        const schema = selectedParcel.properties.source_schema;
        const table = selectedParcel.properties.source_table;

        parcelLayers
          .filter(
            (p) =>
              p.feature.properties.source_table === table &&
              p.feature.properties.source_schema === schema
          )
          .forEach((p) => map.removeLayer(p.layer));

        for (let i = parcelLayers.length - 1; i >= 0; i--) {
          const f = parcelLayers[i].feature.properties;
          if (f.source_table === table && f.source_schema === schema) {
            parcelLayers.splice(i, 1);
          }
        }

        window.loadGeoTable(map, schema, table);
        resetAllSubdivide();
      } else {
        alert("Subdivision failed: " + json.message);
      }
    } catch (err) {
      console.error("Subdivision error:", err);
      alert("Unexpected error during subdivision.");
    }
  };

  const handleUndo = () => {
    if (lines.length === 0) return;

    const lastPoints = lines[lines.length - 1];

    // Remove associated markers
    for (let i = 0; i < lastPoints.length; i++) {
      const marker = pointMarkers.current.pop();
      if (marker && map.hasLayer(marker)) map.removeLayer(marker);
    }

    // Remove last line from state
    setLines((prev) => prev.slice(0, -1));
    setAllPoints((prev) => prev.slice(0, prev.length - lastPoints.length));
  };

  const handleExportLinePoints = (format = "txt") => {
    if (allPoints.length === 0) return;

    let content = "";
    let filename = "";

    if (format === "csv") {
      content =
        "Latitude,Longitude\n" +
        allPoints
          .map(([lng, lat]) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
          .join("\n");
      filename = "subdivide_lines.csv";
    } else {
      content = allPoints
        .map(([lng, lat]) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
        .join("\n");
      filename = "subdivide_lines.txt";
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tryStartDrawing = () => {
    if (!selectedParcel) {
      setError("Please select a parcel to subdivide first.");
    } else {
      setDrawing(true);
    }
  };

  const handleCancel = () => {
    resetAllSubdivide();
    onClose();
  };

  const renderParcelControls = () => (
    <div className="subdivide-controls-grid" style={{ marginBottom: "10px" }}>
      <button
        className="subdivide-btn"
        onClick={() => setLocked(true)}
        disabled={!selectedParcel || locked}
      >
        Choose This Parcel
      </button>
      <button
        className="subdivide-btn"
        onClick={resetAllSubdivide}
        disabled={!locked}
      >
        Deselect Parcel
      </button>
    </div>
  );

  return (
    <div id="subdividePopup" className="visible">
      <div className="subdivide-header">
        <h3>Subdivide Tool</h3>
        <button className="subdivide-close-btn" onClick={handleCancel}>
          Close
        </button>
      </div>

      <div className="tab-buttons">
        <button
          className={activeTab === "line" ? "active" : ""}
          onClick={() => setActiveTab("line")}
        >
          Line Drawing
        </button>
        <button
          className={activeTab === "point" ? "active" : ""}
          onClick={() => setActiveTab("point")}
        >
          Point Input
        </button>
        <button
          className={activeTab === "bearing" ? "active" : ""}
          onClick={() => setActiveTab("bearing")}
        >
          Distance/Bearing Input
        </button>
      </div>

      {activeTab === "line" && (
        <AddLine
          ref={addLineRef}
          map={map}
          drawing={drawing}
          setDrawing={setDrawing}
          activeTab={activeTab}
          error={error}
          selectedParcel={selectedParcel}
          locked={locked}
          tryStartDrawing={tryStartDrawing}
          handleUndo={handleUndo}
          handleSubdivide={handleSubdivide}
          handleCancel={handleCancel}
          lines={lines}
          setLines={setLines}
          renderParcelControls={renderParcelControls}
          allPoints={allPoints}
          setAllPoints={setAllPoints}
          handleExportPoints={handleExportLinePoints}
          pointMarkers={pointMarkers}
          suggestedPins={suggestedPins}
          setSuggestedPins={setSuggestedPins}
        />
      )}

      {activeTab === "point" && (
        <AddPoints
          ref={addPointsRef}
          map={map}
          setLines={setLines}
          manualPoints={manualPoints}
          setManualPoints={setManualPoints}
          locked={locked}
          selectedParcel={selectedParcel}
          renderParcelControls={renderParcelControls}
          handleSubdivide={handleSubdivide}
          handleCancel={handleCancel}
          suggestedPins={suggestedPins}
          setSuggestedPins={setSuggestedPins}
        />
      )}

      {activeTab === "bearing" && (
        <BearingDistance
          ref={bearingRef}
          map={map}
          setLines={setLines}
          manualPoints={manualPoints}
          setManualPoints={setManualPoints}
          renderParcelControls={renderParcelControls}
          handleSubdivide={handleSubdivide}
          selectedParcel={selectedParcel}
          locked={locked}
          setSuggestedPins={setSuggestedPins} // ✅ This is the missing prop
        />
      )}
    </div>
  );
};

export default Subdivide;
