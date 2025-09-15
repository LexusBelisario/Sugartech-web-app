// src/components/Thematic/FloodRisk.jsx
import React, { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import { useSchema } from "../SchemaContext";
import Table_Column from "../LandLegend/Table_Column.jsx";
import API from "../../api.js";

const FloodRisk = () => {
  const map = useMap();
  const { schema } = useSchema();
  const [selectedColumn, setSelectedColumn] = useState("rating");
  const [showColumnPopup, setShowColumnPopup] = useState(false);
  const [geojsonData, setGeojsonData] = useState(null);
  const isBusy = useRef(false);

  const smartColorMap = {
    high: "#ff0000",
    moderate: "#ffa500",
    low: "#ffff00",
    none: "#008000",
    floodway: "#800080",
    unknown: "#ccc",
  };

  const categoryLabels = {
    high: "High",
    moderate: "Moderate",
    low: "Low",
    none: "Not Susceptible",
    floodway: "Floodway",
    unknown: "Unknown",
  };

  const classifyCategory = (rawValue) => {
    const v = (rawValue || "").toString().toLowerCase().trim();
    if (!v || v === "null" || v === "undefined") return "none";
    if (["0", "none", "not susceptible", "n/a"].includes(v)) return "none";
    if (["3", "level 3", "lvl 3"].includes(v)) return "high";
    if (["2", "level 2", "lvl 2"].includes(v)) return "moderate";
    if (["1", "level 1", "lvl 1"].includes(v)) return "low";
    if (v.includes("floodway")) return "floodway";
    if (v.includes("high")) return "high";
    if (v.includes("moderate") || v.includes("medium")) return "moderate";
    if (v.includes("low")) return "low";
    if (v.includes("not") || v.includes("none")) return "none";
    return "unknown";
  };

  useEffect(() => {
    if (!schema) {
      console.log("⚠️ FloodRisk: no schema, toggle not registered");
      return;
    }

    console.log("✅ FloodRisk: registering toggle for schema =", schema);

    const updateButton = (active) => {
      const btn = document.getElementById("btnFloodRisk");
      if (btn) btn.classList.toggle("active-tool", active);
    };

    window.toggleFloodRisk = async () => {
      console.log("🖱️ toggleFloodRisk called");

      if (!map || !schema || isBusy.current) {
        console.log("⏸️ FloodRisk: map/schema missing or busy");
        return;
      }
      isBusy.current = true;

      try {
        // === Turn OFF
        if (window.floodRiskLayerGroup) {
          console.log("🔄 Removing FloodRisk layer");
          if (map.hasLayer(window.floodRiskLayerGroup)) {
            map.removeLayer(window.floodRiskLayerGroup);
          }
          window.floodRiskLayerGroup = null;
          updateButton(false);
          window.removeThematicLegend?.("floodrisk");
          isBusy.current = false;
          return;
        }

        // === Turn ON
        const url = `${API}/single-table?schema=${schema}&table=FloodRisk`;
        console.log("🌐 Fetching:", url);
        const res = await fetch(url);
        const geojson = await res.json();
        setGeojsonData(geojson);

        const props = geojson.features?.[0]?.properties || {};
        if (!props.hasOwnProperty("rating")) {
          console.warn("⚠️ FloodRisk: no 'rating' column, showing picker");
          setShowColumnPopup(true);
          return;
        }

        renderLayer(geojson, "rating");
        updateButton(true);
      } catch (err) {
        console.error("❌ FloodRisk fetch error:", err);
      } finally {
        isBusy.current = false;
      }
    };
  }, [map, schema]);

  const renderLayer = (geojson, column) => {
    console.log("🎨 Rendering FloodRisk by column:", column);

    const valueToCategory = {};
    const valueToColor = {};

    geojson.features.forEach((f) => {
      const raw = f.properties?.[column];
      const val = (raw || "").toString().trim();
      const cat = classifyCategory(val);
      valueToCategory[val] = cat;
      valueToColor[val] = smartColorMap[cat] || smartColorMap.unknown;
    });

    const priority = { high: 1, moderate: 2, low: 3 };
    const uniqueValues = Object.keys(valueToColor).sort((a, b) => {
      const catA = valueToCategory[a];
      const catB = valueToCategory[b];
      return (priority[catA] || 999) - (priority[catB] || 999);
    });

    const group = L.geoJSON(geojson, {
      style: (feature) => {
        const val = (feature.properties?.[column] || "").toString().trim();
        return {
          color: valueToColor[val] || "#ccc",
          fillColor: valueToColor[val] || "#ccc",
          fillOpacity: 0.5,
          weight: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        layer.on("click", () => {
          if (window.openRoadInfoOnly) {
            window.openRoadInfoOnly(feature.properties);
          }
        });
      },
    });

    group.addTo(map);
    window.floodRiskLayerGroup = group;

    if (window.addThematicLegend) {
      window.addThematicLegend(
        "floodrisk",
        <>
          <strong>Flood Risk Legend:</strong>
          <div className="legend-items">
            {uniqueValues.map((val, i) => {
              const cat = valueToCategory[val];
              return (
                <div key={i}>
                  <span
                    className="legend-swatch"
                    style={{ backgroundColor: valueToColor[val] || "#ccc" }}
                  ></span>
                  {categoryLabels[cat] || val}
                </div>
              );
            })}
          </div>
        </>
      );
    }
  };

  const handleApplyColumn = (col) => {
    console.log("📊 User applied FloodRisk column:", col);
    setSelectedColumn(col);
    setShowColumnPopup(false);
    if (geojsonData) {
      renderLayer(geojsonData, col);
      document.getElementById("btnFloodRisk")?.classList.add("active-tool");
    }
  };

  return (
    <>
      {showColumnPopup && (
        <Table_Column
          schema={schema}
          table="FloodRisk"
          onApply={handleApplyColumn}
          onClose={() => setShowColumnPopup(false)}
        />
      )}
    </>
  );
};

export default FloodRisk;
