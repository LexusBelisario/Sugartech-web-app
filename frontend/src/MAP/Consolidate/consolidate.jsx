import React, { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import { loadGeoTable } from "../view";
import "./consolidate.css";
import API from "../../api";
import { useSchema } from "../SchemaContext";
import ParcelClickHandler from "../ParcelClickHandler";

const Consolidate = ({ onClose }) => {
  const { schema } = useSchema();
  const map = useMap();
  const [selected, setSelected] = useState([]);
  const [newPin, setNewPin] = useState("");

  // ✅ Callback from ParcelClickHandler
  const handleParcelSelect = (pin, feature, isSelected) => {
    if (isSelected) {
      setSelected(prev => [...prev, feature]);
    } else {
      setSelected(prev => prev.filter(f => f.properties.pin !== pin));
    }
  };

  // === Suggest new PIN ===
  useEffect(() => {
    if (selected.length < 2) {
      setNewPin("");
      return;
    }

    const sample = selected[0].properties;
    const fullParts = sample.pin.split("-");
    if (fullParts.length !== 5) {
      setNewPin("");
      return;
    }

    const prefix = fullParts.slice(0, 4).join("-");
    const matches = (window.parcelLayers || [])
      .map(p => p.feature?.properties?.pin)
      .filter(p => p?.startsWith(prefix));

    const suffixes = matches
      .map(p => {
        const parts = p.split("-");
        return parseInt(parts[4]);
      })
      .filter(n => !isNaN(n));

    const nextSuffix = Math.max(...suffixes, 0) + 1;
    setNewPin(`${prefix}-${String(nextSuffix).padStart(3, "0")}`);
  }, [selected]);

  const removeFromList = (pin) => {
    setSelected(prev => prev.filter(f => f.properties.pin !== pin));
    // let ParcelClickHandler handle style reset automatically
  };

  const mergeAndSend = async () => {
    if (selected.length < 2) {
      alert("Please select at least two parcels.");
      return;
    }
    if (!schema) {
      alert("No schema selected.");
      return;
    }

    try {
      const validGeometries = selected.map(f => f.geometry).filter(g => g?.type && g?.coordinates);
      if (validGeometries.length < 2) {
        alert("Must have at least 2 valid geometries.");
        return;
      }

      const table = selected[0].properties.source_table;
      const firstPin = selected[0].properties.pin;

      const fullInfoRes = await fetch(
        `${API}/parcel-info?pin=${encodeURIComponent(firstPin)}&schema=${encodeURIComponent(schema)}`
      );
      const fullInfoJson = await fullInfoRes.json();

      if (fullInfoJson.status !== "success") {
        alert("Failed to fetch full parcel attributes.");
        return;
      }

      const baseProps = {
        ...fullInfoJson.data,
        pin: newPin,
        parcel: "",
        section: "",
      };

      Object.keys(baseProps).forEach((k) => {
        if (baseProps[k] === null || baseProps[k] === undefined) {
          baseProps[k] = "";
        }
      });

      const res = await fetch(`${API}/merge-parcels-postgis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema,
          table,
          base_props: baseProps,
          original_pins: selected.map((f) => f.properties.pin),
          geometries: validGeometries,
        }),
      });

      const json = await res.json();

      if (json.status === "success") {
        window.parcelLayers
          .filter(
            (p) =>
              p.feature.properties.source_table === table &&
              p.feature.properties.source_schema === schema
          )
          .forEach((p) => map.removeLayer(p.layer));

        for (let i = window.parcelLayers.length - 1; i >= 0; i--) {
          const f = window.parcelLayers[i].feature.properties;
          if (f.source_table === table && f.source_schema === schema) {
            window.parcelLayers.splice(i, 1);
          }
        }

        loadGeoTable(map, schema, table);
        setSelected([]);
        setNewPin("");
        onClose();
      } else {
        alert("Consolidation failed: " + json.message);
      }
    } catch (err) {
      console.error("Consolidate error:", err);
      alert("Unexpected error during consolidation.");
    }
  };

  const clearAndClose = () => {
    setSelected([]);
    onClose();
  };

  return (
    <>
      {/* ✅ Consolidate now reuses ParcelClickHandler */}
      <ParcelClickHandler activeTool="consolidate" onConsolidateSelect={handleParcelSelect} />

      <div id="consolidatePopup" className="visible">
        <div className="consolidate-header">
          <h3>Consolidate Tool</h3>
          <button className="close-btn" onClick={clearAndClose}>Close</button>
        </div>

        <div className="consolidate-instructions">
          <p>1. Click parcels on the map to select them.</p>
          <p>2. Selected parcels will be highlighted in <b>blue</b> and listed below.</p>
          <p>3. A new PIN is suggested below but you can edit it.</p>
          <p>4. Click <strong>Consolidate and Save</strong> to merge and store the result.</p>
        </div>

        {selected.length > 0 && (
          <div className="consolidate-selected-label">
            Parcels selected for consolidation (PIN):
          </div>
        )}
        {selected.length === 0 && (
          <p style={{ color: "gray", fontSize: "12px" }}>No parcels selected yet.</p>
        )}

        <ul className="consolidate-pin-list">
          {selected.map((f) => (
            <li key={f.properties.pin}>
              {f.properties.pin}
              <button
                className="remove-btn"
                onClick={() => removeFromList(f.properties.pin)}
                title="Remove from list"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {selected.length >= 2 && (
          <div style={{ marginTop: "12px", paddingLeft: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "bold" }}>
              New PIN to assign:
            </label>
            <input
              type="text"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              style={{
                width: "90%",
                marginTop: "4px",
                padding: "6px",
                fontSize: "13px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
        )}

        <div className="consolidate-popup-buttons">
          <button
            className="consolidate-btn confirm"
            onClick={mergeAndSend}
            disabled={selected.length < 2}
            style={{
              opacity: selected.length < 2 ? 0.5 : 1,
              cursor: selected.length < 2 ? "not-allowed" : "pointer",
            }}
          >
            Consolidate and Save
          </button>

          <button className="consolidate-btn cancel" onClick={clearAndClose}>
            Cancel and Discard
          </button>
        </div>
      </div>
    </>
  );
};

export default Consolidate;
