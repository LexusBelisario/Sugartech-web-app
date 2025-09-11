import { useEffect } from "react";
import L from "leaflet";
import API from "../../api";

const LandmarkLabel = ({ map }) => {
  useEffect(() => {
    if (!map || !window.activeSchema) return;

    const layerGroup = L.layerGroup().addTo(map);
    window.landmarkLabelLayer = layerGroup;

    fetch(`${API}/single-table?schema=${window.activeSchema}&table=Landmarks`)
      .then(res => res.json())
      .then(data => {
        const features = data?.features || [];

        features.forEach(feature => {
          const name = feature.properties?.name;
          if (!name || !name.trim() || feature.geometry?.type !== "Point") return;

          const [lng, lat] = feature.geometry.coordinates;

          const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const label = L.divIcon({
            html: `<div style="
              font-family: 'Segoe UI', sans-serif;
              font-size: 11px;
              font-weight: 500;
              color: #0d47a1;
              background: rgba(255, 255, 255, 0.85);
              padding: 2px 5px;
              border-radius: 3px;
              border: 1px solid rgba(0, 0, 0, 0.15);
              line-height: 1;
              white-space: nowrap;
              display: inline-block;
              box-shadow: none;
              box-sizing: border-box;
              text-shadow: none;
            ">${safeName}</div>`,
            className: "", // remove default label-icon class
          });

          const marker = L.marker([lat, lng], { icon: label, interactive: false });
          layerGroup.addLayer(marker);
        });
      })
      .catch(err => {
        console.error("❌ Failed to fetch landmarks for labeling:", err);
      });

    return () => {
      map.removeLayer(layerGroup);
    };
  }, [map]);

  return null;
};

export default LandmarkLabel;
