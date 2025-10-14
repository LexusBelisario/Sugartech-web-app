import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import API from "../../api.js";
import { loadGeoTable } from "../view";
import { useSchema } from "../SchemaContext";

const AddLine = ({ map }) => {
  const { schema } = useSchema();
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasValidLine, setHasValidLine] = useState(false);
  const activePoints = useRef([]);
  const currentLine = useRef(null);
  const pointMarkers = useRef([]);
  const allLines = useRef([]);
  const clickHandlers = useRef({});

  // keep ref synced with state
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // Allow selecting parcel only when not locked
  useEffect(() => {
    window.setSelectedParcelForSubdivide = (parcel) => {
      if (!lockedRef.current) setSelectedParcel(parcel);
    };
  }, []);

  // === Lock parcel and enable drawing
  const handleChooseParcel = () => {
    if (!selectedParcel) {
      alert("Click a parcel on the map first before choosing it.");
      return;
    }
    setLocked(true);
    lockedRef.current = true;
    window.subdivideLocked = true;
    enableDrawing();
  };

  // === Drawing logic
  const enableDrawing = () => {
    if (!map) return;

    // Remove any old listeners
    if (clickHandlers.current.left) map.off("click", clickHandlers.current.left);
    if (clickHandlers.current.right) map.off("contextmenu", clickHandlers.current.right);

    activePoints.current = [];
    pointMarkers.current.forEach((m) => map.removeLayer(m));
    pointMarkers.current = [];

    if (currentLine.current) {
      map.removeLayer(currentLine.current);
      currentLine.current = null;
    }

    currentLine.current = L.polyline([], {
      color: "blue",
      weight: 2,
      dashArray: "5, 5",
    }).addTo(map);

    const handleLeftClick = (e) => {
      if (!lockedRef.current) return;
      const { lat, lng } = e.latlng;
      activePoints.current.push([lng, lat]);
      const marker = L.circleMarker([lat, lng], {
        radius: 4,
        color: "red",
        fillColor: "red",
        fillOpacity: 1,
      }).addTo(map);
      pointMarkers.current.push(marker);
      const latlngs = activePoints.current.map(([lng, lat]) => [lat, lng]);
      currentLine.current.setLatLngs(latlngs);
    };

    const handleRightClick = (e) => {
      if (!lockedRef.current) return;
      e.originalEvent.preventDefault();
      if (activePoints.current.length > 1) {
        allLines.current.push({
          points: [...activePoints.current],
          layer: currentLine.current,
          markers: [...pointMarkers.current],
        });
        setHasValidLine(true);
      } else {
        map.removeLayer(currentLine.current);
      }

      activePoints.current = [];
      pointMarkers.current = [];
      currentLine.current = L.polyline([], {
        color: "blue",
        weight: 2,
        dashArray: "5, 5",
      }).addTo(map);
    };

    map.on("click", handleLeftClick);
    map.on("contextmenu", handleRightClick);

    clickHandlers.current.left = handleLeftClick;
    clickHandlers.current.right = handleRightClick;
  };

  // === Clear all drawn lines and points
  const clearDrawings = () => {
    allLines.current.forEach((line) => {
      map.removeLayer(line.layer);
      line.markers?.forEach((m) => map.removeLayer(m));
    });
    pointMarkers.current.forEach((m) => map.removeLayer(m));
    if (currentLine.current) map.removeLayer(currentLine.current);

    allLines.current = [];
    pointMarkers.current = [];
    activePoints.current = [];
    currentLine.current = null;
    setHasValidLine(false);
  };

  // === Undo last completed line
  const undoLastLine = () => {
    const last = allLines.current.pop();
    if (last) {
      map.removeLayer(last.layer);
      last.markers?.forEach((m) => map.removeLayer(m));
      if (allLines.current.length === 0) setHasValidLine(false);
    }
  };

  // === Cancel & discard everything (keep tool open)
  const handleCancelAndDiscard = () => {
    clearDrawings();
    if (lockedRef.current && map) enableDrawing();
  };

  // === Reload only the affected table (no zoom/pan)
  const reloadSingleTable = (schema, table) => {
    if (!schema || !table || !map) return;
    console.log(`🔄 Reloading ${schema}.${table}`);
    const center = map.getCenter();
    const zoom = map.getZoom();

    if (window.parcelLayers && Array.isArray(window.parcelLayers)) {
      const oldLayers = window.parcelLayers.filter(
        (p) =>
          p.feature.properties.source_table === table &&
          p.feature.properties.source_schema === schema
      );
      oldLayers.forEach((p) => map.removeLayer(p.layer));

      window.parcelLayers = window.parcelLayers.filter(
        (p) =>
          p.feature.properties.source_table !== table ||
          p.feature.properties.source_schema !== schema
      );
    }

    loadGeoTable(map, schema, table);
    map.setView(center, zoom);
  };

  // === Save subdivision
  const handleSubdivideSave = async () => {
    if (!lockedRef.current || !selectedParcel) {
      alert("Select and lock a parcel first.");
      return;
    }
    if (!schema) {
      alert("No schema selected.");
      return;
    }
    if (allLines.current.length === 0) {
      alert("Draw at least one split line before saving.");
      return;
    }

    setIsSaving(true);
    const splitLines = allLines.current.map((l) => l.points);
    const payload = {
      schema,
      table: selectedParcel.source_table || "LandParcels",
      pin: selectedParcel.pin,
      split_lines: splitLines,
      new_pins: [],
    };

    try {
      const res = await fetch(`${API}/subdivide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === "success") {
        alert(`✅ Subdivision complete: ${data.message}`);
        reloadSingleTable(schema, payload.table);
        clearDrawings();
        setLocked(false);
        lockedRef.current = false;
        setSelectedParcel(null);
        window.subdivideLocked = false;
      } else {
        alert(`❌ Subdivision failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("❌ Subdivision error:", err);
      alert("Subdivision request failed. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // === TOOL CLEANUP (when closed)
  useEffect(() => {
    return () => {
      console.log("🧹 Subdivide tool closed — cleaning up");
      if (map) {
        if (clickHandlers.current.left)
          map.off("click", clickHandlers.current.left);
        if (clickHandlers.current.right)
          map.off("contextmenu", clickHandlers.current.right);
      }
      clearDrawings();
      setLocked(false);
      lockedRef.current = false;
      setSelectedParcel(null);
      window.subdivideLocked = false;
    };
  }, [map]);

  return (
    <>
      <div className="subdivide-instructions">
        <p><strong>1.</strong> Click a parcel to select it.</p>
        <p><strong>2.</strong> Click <strong>Choose This Parcel</strong> to lock it in.</p>
        <p><strong>3.</strong> After locking, parcel clicks are disabled.</p>
        <p><strong>4.</strong> Left-click adds red dots; they connect with a dashed blue line.</p>
        <p><strong>5.</strong> Right-click ends the current line; the next click starts a new one.</p>
      </div>

      <div className="parcel-selection-controls">
        {!selectedParcel && (
          <p style={{ fontSize: "13px", color: "#aaa" }}>
            Click a parcel on the map to enable selection.
          </p>
        )}

        {selectedParcel && !locked && (
          <button className="subdivide-btn" onClick={handleChooseParcel}>
            Choose This Parcel
          </button>
        )}

        {selectedParcel && locked && (
          <>
            <div style={{ fontSize: "13px", marginBottom: "6px" }}>
              Selected Parcel: <strong>{selectedParcel.pin}</strong> (Locked)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                className="subdivide-btn"
                onClick={handleSubdivideSave}
                disabled={isSaving || !hasValidLine}
              >
                {isSaving
                  ? "Saving..."
                  : hasValidLine
                  ? "Subdivide and Save"
                  : "Draw a Line First"}
              </button>

              <button
                className="subdivide-btn"
                style={{ backgroundColor: "#777" }}
                onClick={undoLastLine}
              >
                Undo Last Line
              </button>

              <button
                className="subdivide-btn"
                style={{ backgroundColor: "#b33", color: "white" }}
                onClick={handleCancelAndDiscard}
              >
                Cancel & Discard
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AddLine;
