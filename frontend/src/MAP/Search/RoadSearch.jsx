import React, { useState, useEffect } from "react";
import "./Search.css";
import API from "../../api";
import { useSchema } from "../SchemaContext";

const RoadSearch = () => {
  const { schema } = useSchema();
  const [roadName, setRoadName] = useState("");
  const [results, setResults] = useState([]);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [status, setStatus] = useState("");

  // === Load all roads when schema changes ===
  useEffect(() => {
    if (!schema) {
      console.log("⚠️ RoadSearch: No schema selected.");
      return;
    }

    console.log(`🔄 Loading roads for schema: ${schema}`);
    window.roadLayers = []; // ✅ always initialize, avoids undefined crash

    const loadRoads = async () => {
      try {
        const url = `${API}/single-table?schema=${schema}&table=RoadNetwork`;
        console.log("🌐 Fetching:", url);
        const res = await fetch(url);
        const geojson = await res.json();

        if (!geojson.features || geojson.features.length === 0) {
          console.warn("⚠️ No road features found for schema:", schema);
          return;
        }

        if (window.map) {
          if (window.roadLayerGroup) {
            console.log("🗑️ Removing old road layer group");
            window.map.removeLayer(window.roadLayerGroup);
          }

          window.roadLayers = []; // ✅ reset mapping

          console.log("➕ Adding new road layer group");
          const group = L.geoJSON(geojson, {
            style: { color: "black", weight: 1 },
            onEachFeature: (feature, layer) => {
              window.roadLayers.push({ feature, layer }); // ✅ store pair
              layer.on("click", () => {
                console.log("🖱️ Road clicked:", feature.properties);
                if (window.openRoadInfoOnly)
                  window.openRoadInfoOnly(feature.properties);
              });
            },
          }).addTo(window.map);

          window.roadLayerGroup = group;
        }
      } catch (err) {
        console.error("❌ Failed to load roads:", err);
      }
    };

    loadRoads();
  }, [schema]);

  const resetStyle = () => {
    if (window.roadLayers && window.roadLayers.length > 0) {
      console.log("🔄 Resetting road styles");
      window.roadLayers.forEach(({ layer }) =>
        layer.setStyle({ color: "black", weight: 1 })
      );
    }
  };

  // === Search ===
  const handleSearch = () => {
    console.log("🔍 Searching for:", roadName);

    if (!window.roadLayers || window.roadLayers.length === 0) {
      console.warn("⚠️ No road layers available yet — maybe still loading?");
      setStatus("Road layer not loaded yet.");
      return;
    }

    const input = roadName.trim().toLowerCase();
    if (!input) {
      setStatus("Please enter a road name.");
      setResults([]);
      return;
    }

    const matches = window.roadLayers.filter(({ feature }) =>
      (feature.properties.road_name || "").toLowerCase().includes(input)
    );
    console.log(`✅ Found ${matches.length} matches`);

    if (matches.length === 0) {
      setStatus("No matching roads found.");
      setResults([]);
      return;
    }

    const grouped = {};
    matches.forEach(({ feature }) => {
      const name = feature.properties.road_name || "Unnamed Road";
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(feature);
    });

    setResults(Object.keys(grouped).sort());
    setStatus("");
    window.groupedRoadResults = grouped;

    resetStyle();
    matches.forEach(({ layer, feature }) => {
      console.log("🟩 Highlighting green:", feature.properties.road_name);
      layer.setStyle({ color: "green", weight: 3 });
    });
  };

  // === Zoom ===
  const zoomToRoad = (name) => {
    console.log("🎯 Zooming to road:", name);
    const group = window.groupedRoadResults?.[name];
    if (!group) return;

    setSelectedRoad(name);
    resetStyle();

    const layers = window.roadLayers.filter(({ feature }) =>
      group.some((g) => g.properties.id === feature.properties.id)
    );

    layers.forEach(({ layer, feature }) => {
      console.log("🟨 Highlighting yellow:", feature.properties.road_name);
      layer.setStyle({ color: "yellow", weight: 3 });
    });

    if (layers.length > 0) {
      const bounds = layers
        .map(({ layer }) => layer.getBounds())
        .reduce((a, b) => a.extend(b), layers[0].layer.getBounds());
      console.log("📏 Fitting bounds:", bounds);
      window.map.fitBounds(bounds);
      if (window.openRoadInfoOnly) window.openRoadInfoOnly(group[0].properties);
    }
  };

  const clear = () => {
    console.log("🧹 Clearing search");
    setRoadName("");
    setResults([]);
    setStatus("");
    setSelectedRoad(null);
    resetStyle();
  };

  return (
    <div className="tab-content">
      <div className="field-grid">
        <div className="field-cell" style={{ gridColumn: "span 3" }}>
          <label>Road Name</label>
          <input
            value={roadName}
            onChange={(e) => setRoadName(e.target.value)}
            placeholder="Enter road name..."
          />
        </div>
      </div>

      <div className="button-row">
        <button id="searchBtn" className="search-btn" onClick={handleSearch}>
          Search Road
        </button>
        <button className="clear-btn" onClick={clear}>
          Clear
        </button>
      </div>

      {status && (
        <div className="search-results">
          <p style={{ fontStyle: "italic" }}>{status}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <p>
            <b>Results:</b> {results.length}
          </p>
          <ul>
            {results.map((name, idx) => (
              <li
                key={idx}
                className={selectedRoad === name ? "selected" : ""}
                onClick={() => zoomToRoad(name)}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RoadSearch;
