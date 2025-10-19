import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./PredictedMapModal.css";
import API from "../../api.js";

// 🌈 Color scale for prediction values
const getColor = (val, min, max) => {
  if (isNaN(val)) return "#ccc";
  const ratio = (val - min) / (max - min);
  const hue = (1 - ratio) * 240; // from blue (low) to red (high)
  return `hsl(${hue}, 100%, 50%)`;
};

// 🧭 Zoom map to bounds after layer load
const FitBoundsOnce = ({ data }) => {
  const map = useMap();
  useEffect(() => {
    if (data && data.features && data.features.length > 0) {
      const geojson = L.geoJSON(data);
      const bounds = geojson.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds);
    }
  }, [data, map]);
  return null;
};

const PredictedMapModal = ({ onClose, geojsonUrl = null }) => {
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minMax, setMinMax] = useState([0, 0]);

  // 🧠 Fetch predicted GeoJSON
  useEffect(() => {
    const fetchGeo = async () => {
      setLoading(true);
      try {
        // ✅ Detect if it's a preview or database-based GeoJSON
        const url =
          geojsonUrl && geojsonUrl.includes("/preview-geojson")
            ? geojsonUrl
            : geojsonUrl ||
              `${API}/linear-regression/predicted-geojson?table=Predicted_Output`;

        console.log("🗺️ Loading predicted map from:", url);

        const res = await fetch(url);
        const data = await res.json();

        if (!data || !data.features) throw new Error("Invalid GeoJSON data.");

        // compute prediction min/max
        const preds = data.features
          .map((f) => parseFloat(f.properties.prediction))
          .filter((v) => !isNaN(v));

        const min = Math.min(...preds);
        const max = Math.max(...preds);
        setMinMax([min, max]);
        setGeojson(data);
      } catch (err) {
        console.error("❌ Error loading GeoJSON:", err);
        alert("Failed to load predicted map.");
      } finally {
        setLoading(false);
      }
    };
    fetchGeo();
  }, [geojsonUrl]);

  // 🎨 Style each feature
  const styleFeature = (feature) => ({
    color: "#000",
    weight: 0.3,
    fillColor: getColor(feature.properties.prediction, minMax[0], minMax[1]),
    fillOpacity: 0.7,
  });

  // 🪄 Compute legend ranges
  const ranges = [];
  for (let i = Math.floor(minMax[0] / 500) * 500; i <= minMax[1]; i += 500) {
    ranges.push([i, i + 500]);
  }

  return (
    <div className="predictmap-overlay" onClick={onClose}>
        <div className="predictmap-box" onClick={(e) => e.stopPropagation()}>
        <button className="predictmap-close" onClick={onClose}>✕</button>
        <h3 className="predictmap-title">🗺️ Predicted Values Thematic Map</h3>

        {loading ? (
            <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading predicted map...</p>
        ) : geojson ? (
            <>
            <div className="predictmap-map">
                <MapContainer
                zoom={14}
                minZoom={5}
                maxZoom={20}
                center={[12.8797, 121.774]}
                >
                <TileLayer
                    attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON
                    data={geojson}
                    style={styleFeature}
                    onEachFeature={(feature, layer) => {
                    const value = feature.properties.prediction;
                    const formatted =
                        typeof value === "number"
                        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : "N/A";
                    layer.bindTooltip(
                        `<div style="font-size:12px;"><b>Prediction:</b> ${formatted}</div>`,
                        { sticky: true, direction: "top", opacity: 0.9 }
                    );
                    }}
                />
                <FitBoundsOnce data={geojson} />
                </MapContainer>
            </div>

            <div className="predictmap-legend">
                <h4>Legend (Prediction)</h4>
                {ranges.map(([min, max], i) => (
                <div key={i} className="legend-item">
                    <span
                    className="legend-color"
                    style={{ background: getColor(min, minMax[0], minMax[1]) }}
                    ></span>
                    <span className="legend-label">
                    {min.toFixed(0)} – {max.toFixed(0)}
                    </span>
                </div>
                ))}
            </div>
            </>
        ) : (
            <p style={{ textAlign: "center", marginTop: "2rem" }}>No map data available.</p>
        )}
        </div>
    </div>
    );
};

export default PredictedMapModal;
