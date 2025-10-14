import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import API from "../../api.js";
import { useSchema } from "../SchemaContext";
import SubdividePinEditor from "./SubdividePinEditor";

const AddLine = ({ map }) => {
  const { schema } = useSchema();
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const [hasValidLine, setHasValidLine] = useState(false);
  const [previewData, setPreviewData] = useState(null); // contains preview parts + pins

  const activePoints = useRef([]);
  const currentLine = useRef(null);
  const pointMarkers = useRef([]);
  const allLines = useRef([]);
  const clickHandlers = useRef({});

  // Sync lock ref
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // Allow parcel selection only when not locked
  useEffect(() => {
    window.setSelectedParcelForSubdivide = (parcel) => {
      if (!lockedRef.current) setSelectedParcel(parcel);
    };
  }, []);

  // === Lock parcel and start drawing ===
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

  // === Drawing logic (left/right click)
  const enableDrawing = () => {
    if (!map) return;

    // Remove old listeners
    if (clickHandlers.current.left)
      map.off("click", clickHandlers.current.left);
    if (clickHandlers.current.right)
      map.off("contextmenu", clickHandlers.current.right);

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

      // Reset for next line
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

  // === Undo last line ===
  const handleUndo = () => {
    const last = allLines.current.pop();
    if (last) {
      map.removeLayer(last.layer);
      last.markers?.forEach((m) => map.removeLayer(m));
      setHasValidLine(allLines.current.length > 0);
    }
  };

  // === Clear all drawings ===
  const clearDrawings = () => {
    allLines.current.forEach((l) => {
      map.removeLayer(l.layer);
      l.markers?.forEach((m) => map.removeLayer(m));
    });
    pointMarkers.current.forEach((m) => map.removeLayer(m));
    if (currentLine.current) map.removeLayer(currentLine.current);

    allLines.current = [];
    activePoints.current = [];
    pointMarkers.current = [];
    currentLine.current = null;
    setHasValidLine(false);
  };

  // === Cancel entire subdivision process ===
  const handleCancel = () => {
    clearDrawings();
    setPreviewData(null);
    setLocked(false);
    lockedRef.current = false;
    window.subdivideLocked = false;
    setSelectedParcel(null);
  };

  // === Trigger preview (no save yet) ===
  const handlePreview = async () => {
    if (!lockedRef.current || !selectedParcel) {
      alert("Select and lock a parcel first.");
      return;
    }
    if (!schema) {
      alert("No schema selected.");
      return;
    }
    if (allLines.current.length === 0) {
      alert("Draw at least one line before preview.");
      return;
    }

    const splitLines = allLines.current.map((l) => l.points);
    const payload = {
      schema,
      table: selectedParcel.source_table || "LandParcels",
      pin: selectedParcel.pin,
      split_lines: splitLines,
    };

    try {
      const res = await fetch(`${API}/subdivide-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === "success" && data.parts?.length) {
        clearDrawings(); // remove blue lines
        setPreviewData({
          schema,
          table: selectedParcel.source_table || "LandParcels",
          basePin: selectedParcel.pin,
          splitLines,
          parts: data.parts,
          suggestedPins: data.suggested_pins,
        });
      } else {
        alert(`❌ Preview failed: ${data.message || "Unexpected error"}`);
      }
    } catch (err) {
      console.error("❌ Preview error:", err);
      alert("Subdivision preview failed. Check console for details.");
    }
  };

  // === Cleanup when unmounting ===
  useEffect(() => {
    return () => {
      if (map) {
        if (clickHandlers.current.left)
          map.off("click", clickHandlers.current.left);
        if (clickHandlers.current.right)
          map.off("contextmenu", clickHandlers.current.right);
      }
      clearDrawings();
    };
  }, [map]);

  return (
    <>
      <div className="subdivide-instructions">
        <p><strong>1.</strong> Click a parcel to select it.</p>
        <p><strong>2.</strong> Click <strong>Choose This Parcel</strong> to lock it for subdividing.</p>
        <p><strong>3.</strong> Left-click adds points. Two or more points draws a line. Right-click finishes a line.</p>
        <p><strong>4.</strong> Click <strong>Subdivide (Preview)</strong> to see result before saving.</p>
        <p><strong>5</strong> Assign <strong>PINs</strong> for the newly-made parcels.</p>
        <p><strong>6.</strong> Click <strong>Subdivide (Save)</strong> to save the subdivision.</p>
      </div>

      {/* === Drawing Mode === */}
      {!previewData && (
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

          {locked && (
            <>
              <div style={{ marginBottom: "6px", fontSize: "13px" }}>
                Locked Parcel: <strong>{selectedParcel.pin}</strong>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <button
                  className="subdivide-btn"
                  onClick={handlePreview}
                  disabled={!hasValidLine}
                >
                  Subdivide (Preview)
                </button>

                <button
                  className="subdivide-btn"
                  style={{ backgroundColor: "#777" }}
                  onClick={handleUndo}
                >
                  Undo Last Line
                </button>

                <button
                  className="subdivide-btn"
                  style={{ backgroundColor: "#b33", color: "white" }}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* === Preview Mode === */}
      {previewData && (
        <SubdividePinEditor
          map={map}
          {...previewData}
          onCancel={handleCancel}
          onDone={() => {
            setPreviewData(null);
            setLocked(false);
            window.subdivideLocked = false;
          }}
        />
      )}
    </>
  );
};

export default AddLine;
