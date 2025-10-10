// RoadSearch.jsx
import React, { useState } from "react";
import "./Search.css";
import API from "../../api.js";
import { useSchema } from "../SchemaContext";
import L from "leaflet";

const RoadSearch = () => {
  const { schema } = useSchema();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [status, setStatus] = useState("");

  // 🧹 Reset all road styles to black
  const resetRoadStyles = () => {
    window.roadLayers?.forEach(({ layer }) =>
      layer.setStyle({ color: "black", weight: 1 })
    );
  };

  // 🔍 Search logic
  const handleSearch = async () => {
    if (!schema) {
      alert("Please select a municipality schema first.");
      return;
    }

    const term = query.trim();
    if (!term) {
      setStatus("Please enter a road name or keyword.");
      setResults([]);
      return;
    }

    try {
      setStatus("Searching...");

      // Fetch search results
      const res = await fetch(`${API}/search/road-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema,
          filters: { road_name: term },
        }),
      });

      const json = await res.json();
      if (json.status !== "success" || !json.data?.length) {
        setStatus("No matching roads found.");
        setResults([]);
        return;
      }

      // Remove previous road layer if any
      if (window.roadLayerGroup) {
        window.map.removeLayer(window.roadLayerGroup);
      }
      window.roadLayers = [];

      // Load and draw road layer
      const url = `${API}/single-table?schema=${schema}&table=RoadNetwork`;
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken");
      const layerRes = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const geojson = await layerRes.json();
      const group = L.geoJSON(geojson, {
        style: { color: "black", weight: 1 },
        onEachFeature: (feature, layer) => {
          window.roadLayers.push({ feature, layer });
        },
      }).addTo(window.map);
      window.roadLayerGroup = group;

      // Group results by unique road_name
      const grouped = {};
      json.data.forEach((r) => {
        const name = r.road_name?.trim() || "Unnamed Road";
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(r);
      });

      const groupedList = Object.keys(grouped)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ name, features: grouped[name] }));

      setResults(groupedList);
      setStatus("");
      resetRoadStyles();

      // Highlight matched roads in dark green
      json.data.forEach((road) => {
        const match = window.roadLayers?.find(
          ({ feature }) =>
            feature.properties.id === road.id ||
            feature.properties.road_name === road.road_name
        );
        if (match)
          match.layer.setStyle({ color: "#006400", weight: 3 }); // dark green
      });

      console.log(`✅ Grouped into ${groupedList.length} unique road names`);
    } catch (err) {
      console.error("❌ Road search error:", err);
      setStatus("Search failed.");
    }
  };

  // 🎯 Zoom to clicked road group
  const handleResultClick = (roadGroup) => {
    const roadName = roadGroup.name;
    setSelectedRoad(roadName);
    resetRoadStyles();

    // Find all matching layers by name or id
    const matches = window.roadLayers?.filter(({ feature }) =>
      roadGroup.features.some(
        (r) =>
          feature.properties.id === r.id ||
          feature.properties.road_name === r.road_name
      )
    );

    matches?.forEach(({ layer }) => {
      layer.setStyle({ color: "yellow", weight: 4 });
    });

    if (matches?.length) {
      const bounds = matches
        .map(({ layer }) => layer.getBounds())
        .reduce((a, b) => a.extend(b), matches[0].layer.getBounds());
      window.map.fitBounds(bounds, { maxZoom: 18 });
    }
  };

  // 🧼 Clear everything (including road layer)
  const handleClear = () => {
    console.log("🧹 Clearing Road Search and removing layer");
    setQuery("");
    setResults([]);
    setSelectedRoad(null);
    setStatus("");
    resetRoadStyles();

    if (window.roadLayerGroup) {
      window.map.removeLayer(window.roadLayerGroup);
      delete window.roadLayerGroup;
    }
    window.roadLayers = [];
  };

  return (
    <div className="tab-content">
      {/* Input Field */}
      <div className="field-grid">
        <div className="field-cell" style={{ gridColumn: "span 3" }}>
          <label>Road Name</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter road name..."
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="button-row">
        <button className="search-btn" onClick={handleSearch}>
          Search
        </button>
        <button className="clear-btn" onClick={handleClear}>
          Clear
        </button>
      </div>

      {/* Results */}
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
            {results.map((group, idx) => (
              <li
                key={idx}
                className={selectedRoad === group.name ? "selected" : ""}
                onClick={() => handleResultClick(group)}
              >
                {group.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RoadSearch;
