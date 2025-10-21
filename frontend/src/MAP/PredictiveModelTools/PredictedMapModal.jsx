import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./PredictedMapModal.css";
import API from "../../api.js";

// 🌈 Color scale (blue → red)
const getColor = (val, min, max) => {
  if (isNaN(val)) return "#ccc";
  const ratio = (val - min) / (max - min);
  const hue = (1 - ratio) * 240;
  return `hsl(${hue}, 100%, 50%)`;
};

// 🧭 Auto-zoom once
const FitBoundsOnce = ({ data }) => {
  const map = useMap();
  useEffect(() => {
    if (data?.features?.length) {
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
  const [ranges, setRanges] = useState([]);

  // 🧠 Fetch predicted GeoJSON
  useEffect(() => {
    const fetchGeo = async () => {
      setLoading(true);
      try {
        const url =
          geojsonUrl && geojsonUrl.includes("/preview-geojson")
            ? geojsonUrl
            : geojsonUrl ||
              `${API}/linear-regression/predicted-geojson?table=Predicted_Output`;

        console.log("🗺️ Loading predicted map from:", url);
        const res = await fetch(url);
        const data = await res.json();
        if (!data?.features) throw new Error("Invalid GeoJSON data.");

        const preds = data.features
          .map((f) => parseFloat(f.properties.prediction))
          .filter((v) => !isNaN(v));

        const min = Math.min(...preds);
        const max = Math.max(...preds);
        setMinMax([min, max]);

        // ✅ 10 ranges between min and max
        const step = (max - min) / 10;
        const diff = max - min;

        // Smart rounding factor
        let roundTo = 10;
        if (diff > 2000) roundTo = 100;
        else if (diff > 10000) roundTo = 500;

        const newRanges = [];
        for (let i = 0; i < 10; i++) {
          let start = min + step * i;
          let end = i === 9 ? max : min + step * (i + 1);

          // Keep exact min and max, but round middle ones
          if (i !== 0) start = Math.round(start / roundTo) * roundTo;
          if (i !== 9) end = Math.round(end / roundTo) * roundTo;

          newRanges.push([start, end]);
        }

        setRanges(newRanges);
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

  // 🎨 Feature style
  const styleFeature = (feature) => ({
    color: "#000",
    weight: 0.3,
    fillColor: getColor(feature.properties.prediction, minMax[0], minMax[1]),
    fillOpacity: 0.7,
  });

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
              <MapContainer zoom={14} minZoom={5} maxZoom={20} center={[12.8797, 121.774]}>
                <TileLayer
                  attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON
                  data={geojson}
                  style={styleFeature}
                  onEachFeature={(feature, layer) => {
                    const val = feature.properties.prediction;
                    const formatted =
                      typeof val === "number"
                        ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
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
              <h4>Legend (Predicted Values)</h4>
              {ranges.map(([min, max], i) => (
                <div key={i} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: getColor(min, minMax[0], minMax[1]) }}
                  ></span>
                  <span className="legend-label">
                    {min.toLocaleString(undefined, { maximumFractionDigits: 0 })} –{" "}
                    {max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ textAlign: "center", marginTop: "2rem" }}>
            No map data available.
          </p>
        )}
      </div>
    </div>
  );
};

export default PredictedMapModal;
