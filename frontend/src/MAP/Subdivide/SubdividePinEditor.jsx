import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import API from "../../api.js";
import { loadGeoTable } from "../view";

const SubdividePinEditor = ({
  map,
  parts,
  suggestedPins,
  schema,
  table,
  basePin,
  splitLines,
  onCancel,
  onDone,
}) => {
  const [pins, setPins] = useState(suggestedPins || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const layerRefs = useRef([]); // polygon layers for highlight

  // === Draw preview polygons ===
  useEffect(() => {
    if (!map || !parts?.length) return;

    // Clear previous
    layerRefs.current.forEach((l) => map.removeLayer(l));
    layerRefs.current = [];

    // Add new polygons
    parts.forEach((part, i) => {
      const layer = L.geoJSON(part.geom, {
        style: {
          color: "black",
          weight: 1,
          fillColor: "lightblue",
          fillOpacity: 0.35,
        },
      }).addTo(map);
      layerRefs.current.push(layer);
    });

    console.log(`🗺️ Rendered ${layerRefs.current.length} preview parts on map.`);

    return () => {
      // Cleanup on unmount
      layerRefs.current.forEach((l) => map.removeLayer(l));
      layerRefs.current = [];
    };
  }, [map, parts]);

  // === Highlight active polygon when focusing a PIN
  const handlePinFocus = (index) => {
    setEditingIndex(index);

    layerRefs.current.forEach((layer, i) => {
      layer.setStyle({
        color: "black",
        weight: 1,
        fillColor: "lightblue",
        fillOpacity: 0.3,
      });
    });

    const target = layerRefs.current[index];
    if (target) {
      target.setStyle({
        color: "black",
        weight: 2,
        fillColor: "yellow",
        fillOpacity: 0.6,
      });
      map.fitBounds(target.getBounds(), { maxZoom: 18 });
    }
  };

  // === Update PIN value
  const handlePinChange = (index, value) => {
    const updated = [...pins];
    updated[index] = value;
    setPins(updated);
  };

  // === Save final result to DB
  const handleSave = async () => {
    if (!pins.length || !schema || !table || !splitLines?.length) {
      alert("❌ Missing required inputs (schema, table, lines, or pins).");
      return;
    }

    setIsSaving(true);

    const payload = {
      schema,
      table,
      pin: basePin,
      split_lines: splitLines,
      new_pins: pins,
    };

    try {
      const res = await fetch(`${API}/subdivide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === "success") {
        alert(`✅ Subdivision saved: ${data.message}`);
        // Remove all preview layers
        layerRefs.current.forEach((l) => map.removeLayer(l));
        layerRefs.current = [];
        // Reload parcel table
        await loadGeoTable(map, schema, table);
        onDone?.();
      } else {
        alert(`❌ Save failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("Subdivision save failed. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // === Cancel and discard preview
  const handleDiscard = () => {
    layerRefs.current.forEach((l) => map.removeLayer(l));
    layerRefs.current = [];
    onCancel?.();
  };

  return (
    <div
      style={{
        marginTop: "12px",
        background: "#f8f8f8",
        padding: "12px",
        borderRadius: "8px",
        boxShadow: "0 0 5px rgba(0,0,0,0.1)",
      }}
    >
      <h4 style={{ marginBottom: "10px" }}>Subdivision Preview</h4>

      {pins.map((pin, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <label style={{ width: "70px" }}>Part {idx + 1}</label>
          <input
            type="text"
            value={pin}
            onChange={(e) => handlePinChange(idx, e.target.value)}
            onFocus={() => handlePinFocus(idx)}
            style={{
              flex: 1,
              border:
                idx === editingIndex
                  ? "2px solid orange"
                  : "1px solid #ccc",
              padding: "5px 6px",
              borderRadius: "4px",
              outline: "none",
            }}
          />
        </div>
      ))}

      <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
        <button
          className="subdivide-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Subdivide (Save)"}
        </button>
        <button
          className="subdivide-btn"
          style={{ backgroundColor: "#b33", color: "white" }}
          onClick={handleDiscard}
        >
          Cancel & Discard
        </button>
      </div>
    </div>
  );
};

export default SubdividePinEditor;
