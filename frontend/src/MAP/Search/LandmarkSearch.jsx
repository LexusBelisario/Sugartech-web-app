import React, { useState, useEffect } from "react";
import { clearParcelHighlights } from "./SearchHelpers";
import L from "leaflet";
import API from "../../api";

// === Helper to get icon path based on landmark type ===
function getIconPath(type) {
  const typeMap = {
    "commercial entities": "Commercial Entities.svg",
    "educational entities": "Educational Entities.svg",
    "financial entities": "Financial Entities.svg",
    "fire station": "Fire Station.svg",
    "gas station": "Gas Station.svg",
    "government entities": "Government Entities.svg",
    "industrial entities": "Industrial Entities.svg",
    "medical entities": "Medical Entities.svg",
    "police station": "Police Station.svg",
    "recreational entities": "Recreational Entities.svg",
    "religious entities": "Religious Entities.svg",
    "subdivision": "Subdivision.svg",
    "telecommunication entities": "Telecommunication Entities.svg",
    "transportation entities": "Transportation Entities.svg",
  };

  const file = typeMap[type?.toLowerCase()] || "default.svg";
  return `/icons/LandmarkIcons/${file}`;
}

const LandmarkSearch = ({ schema }) => {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState("");
  const [queryBarangay, setQueryBarangay] = useState("");
  const [features, setFeatures] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [typeOptions, setTypeOptions] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);

  const map = window.map;
  if (!window.landmarkLayerGroup) {
    window.landmarkLayerGroup = L.layerGroup().addTo(map);
  }
  const landmarkLayerGroup = window.landmarkLayerGroup;

  // === Load landmarks and populate filters ===
  useEffect(() => {
    if (!schema) return;

    fetch(`${API}/single-table?schema=${schema}&table=Landmarks`)
      .then(res => res.json())
      .then(data => {
        const feats = data?.features || [];
        setFeatures(feats);

        const uniqueTypes = [...new Set(feats.map(f => f.properties?.type).filter(Boolean))].sort();
        const uniqueBarangays = [...new Set(feats.map(f => f.properties?.barangay).filter(Boolean))].sort();
        setTypeOptions(uniqueTypes);
        setBarangayOptions(uniqueBarangays);
      })
      .catch(err => {
        console.error("Failed to load landmarks:", err);
        setFeatures([]);
        setTypeOptions([]);
        setBarangayOptions([]);
      });
  }, [schema]);

  // === Filter and render landmark search results ===
  const handleSearch = () => {
    clearParcelHighlights();
    landmarkLayerGroup.clearLayers();

    const nameTerm = query.trim().toLowerCase();
    const typeTerm = queryType.trim().toLowerCase();
    const barangayTerm = queryBarangay.trim().toLowerCase();

    const matched = features
      .filter(f => {
        const props = f.properties || {};
        const nameMatch = !nameTerm || props.name?.toLowerCase().includes(nameTerm);
        const typeMatch = !typeTerm || props.type?.toLowerCase() === typeTerm;
        const brgyMatch = !barangayTerm || props.barangay?.toLowerCase() === barangayTerm;
        return nameMatch && typeMatch && brgyMatch;
      })
      .map(feature => {
        const props = feature.properties || {};
        const name = props.name;
        const iconPath = getIconPath(props.type);

        const customIcon = L.icon({
          iconUrl: iconPath,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const layer = L.geoJSON(feature, {
          pointToLayer: (_, latlng) => L.marker(latlng, { icon: customIcon }),
        });

        layer.feature = feature;
        layer.addTo(landmarkLayerGroup);
        return { name, layer, feature };
      });

    setResults(matched);
  };

  const handleResultClick = (name) => {
    const match = results.find(r => r.name === name);
    if (!match) return;

    setSelected(name);
    const bounds = match.layer.getBounds();
    map.fitBounds(bounds, { maxZoom: 18 });

    const center = bounds.getCenter();
    L.popup().setLatLng(center).setContent(`<b>${name}</b>`).openOn(map);

    if (window.openLandmarkInfoOnly) {
      window.openLandmarkInfoOnly(match.feature.properties);
    }
  };

  const handleClear = () => {
    setQuery("");
    setQueryType("");
    setQueryBarangay("");
    setResults([]);
    setSelected(null);
    clearParcelHighlights();
    landmarkLayerGroup.clearLayers();
  };

  return (
    <div className="tab-content">
      <div className="field-grid">
        <div className="field-cell" style={{ gridColumn: "span 3" }}>
          <label>Landmark Name</label>
          <input
            type="text"
            value={query}
            placeholder="Search by name..."
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        <div className="field-cell" style={{ gridColumn: "span 2" }}>
          <label>Type</label>
          <select value={queryType} onChange={(e) => setQueryType(e.target.value)}>
            <option value="">-- Select Type --</option>
            {typeOptions.map((t, i) => (
              <option key={i} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="field-cell" style={{ gridColumn: "span 2" }}>
          <label>Barangay</label>
          <select value={queryBarangay} onChange={(e) => setQueryBarangay(e.target.value)}>
            <option value="">-- Select Barangay --</option>
            {barangayOptions.map((b, i) => (
              <option key={i} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="button-row">
        <button className="search-btn" onClick={handleSearch}>Search</button>
        <button className="clear-btn" onClick={handleClear}>Clear</button>
      </div>

      {(query || queryType || queryBarangay) && (
        <div className="search-results">
          <p><b>Results:</b> {results.length}</p>
          {results.length === 0 ? (
            <p style={{ fontStyle: "italic" }}>No matching landmarks found.</p>
          ) : (
            <ul>
              {results.map(({ name }, i) => (
                <li
                  key={i}
                  className={selected === name ? "selected" : ""}
                  onClick={() => handleResultClick(name)}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default LandmarkSearch;
