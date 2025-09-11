import { useEffect, useRef } from "react";
import API from "../../api";

const StreetLabel = ({ map, activeSchemas }) => {
  const labelGroupRef = useRef(null);

  useEffect(() => {
    if (!map || !activeSchemas.length) return;

    const labelGroup = L.layerGroup();
    labelGroupRef.current = labelGroup;
    window.streetLayerGroup = labelGroup;

    const updateVisibility = () => {
      if (!labelGroupRef.current) return;
      const zoom = map.getZoom();
      if (zoom >= 17 && zoom <= 19) {
        if (!map.hasLayer(labelGroupRef.current)) {
          map.addLayer(labelGroupRef.current);
        }
      } else {
        if (map.hasLayer(labelGroupRef.current)) {
          map.removeLayer(labelGroupRef.current);
        }
      }
    };

    const fetchStreetData = async () => {
      try {
        const schema = activeSchemas[0];
        const url = `${API}/single-table?schema=${encodeURIComponent(schema)}&table=RoadNetwork`;
        const res = await fetch(url);
        const geojson = await res.json();

        if (!geojson || geojson.type !== "FeatureCollection") return;

        geojson.features.forEach(feature => {
          const name =
            feature.properties?.road_name ||
            feature.properties?.name ||
            feature.properties?.label ||
            feature.properties?.roadlabel;

          let coords = feature.geometry?.coordinates;
          if (!coords || !name) return;

          if (feature.geometry.type === "MultiLineString") coords = coords[0];
          if (!coords || coords.length < 2) return;

          const dx = coords[coords.length - 1][0] - coords[0][0];
          const dy = coords[coords.length - 1][1] - coords[0][1];
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle > 90 || angle < -90) coords.reverse();

          const latlngs = coords.map(([lng, lat]) => [lat, lng]);

          const polyline = L.polyline(latlngs, { color: "transparent" }).addTo(labelGroup);
          polyline.setText(name, {
            repeat: false,
            center: true,
            offset: 0,
            attributes: {
              fill: "#111",
              "font-weight": "bold",
              "font-size": "12px",
              "text-shadow": "1px 1px 2px white",
              "paint-order": "stroke",
              "stroke": "#fff",
              "stroke-width": "2px"
            }
          });
        });

        map.on("zoomend", updateVisibility);
        updateVisibility();

        window.updateStreetLabelVisibility = updateVisibility;
      } catch (err) {
        console.error("❌ Street label error:", err);
      }
    };

    fetchStreetData();

    return () => {
      const group = labelGroupRef.current;
      if (group && map.hasLayer(group)) {
        map.removeLayer(group);
      }

      map.off("zoomend", updateVisibility);
      delete window.updateStreetLabelVisibility;
      delete window.streetLayerGroup;
      labelGroupRef.current = null;
    };
  }, [map, activeSchemas]);

  return null;
};

export default StreetLabel;
