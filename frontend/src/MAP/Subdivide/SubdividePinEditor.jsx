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
  const layerRefs = useRef([]);

  // === Draw preview polygons ===
  useEffect(() => {
    if (!map || !parts?.length) return;

    layerRefs.current.forEach((l) => map.removeLayer(l));
    layerRefs.current = [];

    parts.forEach((part) => {
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

    return () => {
      layerRefs.current.forEach((l) => map.removeLayer(l));
      layerRefs.current = [];
    };
  }, [map, parts]);

  // === Highlight active polygon when focusing a PIN
  const handlePinFocus = (index) => {
    setEditingIndex(index);

    layerRefs.current.forEach((layer) => {
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
        fillColor: "#FFF500", // vivid yellow
        fillOpacity: 0.8,
      });

      const bounds = target.getBounds();
      const currentView = map.getBounds();

      // Only adjust if the target is not already visible
      if (!currentView.contains(bounds)) {
        map.fitBounds(bounds, { maxZoom: 18 });
      } else {
        // Just pan gently without zooming out
        map.panTo(bounds.getCenter());
      }
    }
  };

  const handlePinChange = (index, value) => {
    const updated = [...pins];
    updated[index] = value;
    setPins(updated);
  };

  // === Highlight newly created parcels (after Save)
  const highlightNewParcels = (pinList, schema, table) => {
    if (!window.parcelLayers?.length) {
      setTimeout(() => highlightNewParcels(pinList, schema, table), 600);
      return;
    }

    // Reset all parcel styles
    window.parcelLayers.forEach(({ layer }) => {
      layer.setStyle?.({
        color: "black",
        weight: 1,
        fillColor: "white",
        fillOpacity: 0.1,
      });
    });

    // Highlight new parcels
    const targets = window.parcelLayers.filter(
      (p) =>
        pinList.includes(p.feature?.properties?.pin) &&
        p.feature?.properties?.source_schema === schema &&
        p.feature?.properties?.source_table === table
    );

    targets.forEach((t) => {
      t.layer.setStyle?.({
        color: "black",
        weight: 2,
        fillColor: "#FFF500", // bright yellow
        fillOpacity: 0.7,
      });
    });

    if (targets.length > 0) {
      const group = L.featureGroup(targets.map((t) => t.layer));
      map.fitBounds(group.getBounds(), { maxZoom: 18 });
    }
  };

  // === Save to DB and reload updated parcels
  const handleSave = async () => {
    if (!pins.length || !schema || !table || !splitLines?.length) return;
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
        // Remove preview layers
        layerRefs.current.forEach((l) => map.removeLayer(l));
        layerRefs.current = [];

        // Reload updated parcels
        await loadGeoTable(map, schema, table);

        // Highlight all new parcels
        highlightNewParcels(pins, schema, table);

        // Notify parent
        onDone?.(pins);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

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
                idx === editingIndex ? "2px solid orange" : "1px solid #ccc",
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
