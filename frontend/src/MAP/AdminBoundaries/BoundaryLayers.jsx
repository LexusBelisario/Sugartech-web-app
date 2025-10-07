// BoundaryLayers.jsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useSchema } from "../SchemaContext";
import API from "../../api.js";

const BoundaryLayers = ({ showBarangay, showSection }) => {
  const { schema } = useSchema();
  const map = useMap();

  const barangayLayerRef = useRef(null);
  const sectionLayerRef = useRef(null);

  // 🎨 Standard color palette
  const colorPalette = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
    "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
    "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
  ];

  const barangayMin = 12;
  const barangayMax = 15;
  const sectionMin = 15;
  const sectionMax = 16;

  useEffect(() => {
    if (!map || !schema) return;

    const url = `${API}/municipal-boundaries?schema=${schema}`;
    console.log(`📡 Fetching boundaries for schema=${schema}`);

    let currentZoom = map.getZoom();

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "success") {
          console.warn("⚠️ No boundaries found:", data);
          return;
        }

        // --- Clear old layers ---
        if (barangayLayerRef.current) {
          map.removeLayer(barangayLayerRef.current);
          barangayLayerRef.current = null;
        }
        if (sectionLayerRef.current) {
          map.removeLayer(sectionLayerRef.current);
          sectionLayerRef.current = null;
        }

        // --- Barangay colors ---
        const barangayColors = {};
        let brgyColorIndex = 0;
        if (data.barangay?.features) {
          data.barangay.features.forEach((f) => {
            const name = f.properties.barangay;
            if (name && !barangayColors[name]) {
              barangayColors[name] = colorPalette[brgyColorIndex % colorPalette.length];
              brgyColorIndex++;
            }
          });
        }

        // --- Section colors (grouped by barangay) ---
        const sectionColors = {};
        let secColorIndex = 0;
        if (data.section?.features) {
          data.section.features.forEach((f) => {
            const brgyName = f.properties.barangay;
            if (brgyName && !sectionColors[brgyName]) {
              sectionColors[brgyName] = colorPalette[secColorIndex % colorPalette.length];
              secColorIndex++;
            }
          });
        }

        // --- Create barangay layer ---
        if (showBarangay && data.barangay) {
          barangayLayerRef.current = L.geoJSON(data.barangay, {
            style: (feature) => {
              const name = feature.properties.barangay;
              const color = barangayColors[name] || "#999";
              return {
                color: "#000000", // 🟫 black outline
                weight: 1.5,
                fillColor: color,
                fillOpacity: 1.0,
              };
            },
            interactive: false,
          });
        }

        // --- Create section layer ---
        if (showSection && data.section) {
          sectionLayerRef.current = L.geoJSON(data.section, {
            style: (feature) => {
              const brgyName = feature.properties.barangay;
              const color = sectionColors[brgyName] || "#999";
              return {
                color: "#202020", // 🟫 dark gray outline
                weight: 1.0,
                fillColor: color,
                fillOpacity: 1.0,
              };
            },
            interactive: false,
          });
        }

        // --- Apply visibility based on zoom ---
        const updateVisibility = () => {
          const zoom = map.getZoom();

          // Barangay layer zoom logic
          if (
            showBarangay &&
            zoom >= barangayMin &&
            zoom <= barangayMax &&
            barangayLayerRef.current &&
            !map.hasLayer(barangayLayerRef.current)
          ) {
            map.addLayer(barangayLayerRef.current);
          } else if (
            barangayLayerRef.current &&
            map.hasLayer(barangayLayerRef.current) &&
            (zoom < barangayMin || zoom > barangayMax)
          ) {
            map.removeLayer(barangayLayerRef.current);
          }

          // Section layer zoom logic
          if (
            showSection &&
            zoom >= sectionMin &&
            zoom <= sectionMax &&
            sectionLayerRef.current &&
            !map.hasLayer(sectionLayerRef.current)
          ) {
            map.addLayer(sectionLayerRef.current);
          } else if (
            sectionLayerRef.current &&
            map.hasLayer(sectionLayerRef.current) &&
            (zoom < sectionMin || zoom > sectionMax)
          ) {
            map.removeLayer(sectionLayerRef.current);
          }
        };

        updateVisibility();
        map.on("zoomend", updateVisibility);
      })
      .catch((err) => {
        console.error("❌ Boundary fetch error:", err);
      });

    // 🧹 Cleanup
    return () => {
      map.off("zoomend");
      if (barangayLayerRef.current) {
        map.removeLayer(barangayLayerRef.current);
        barangayLayerRef.current = null;
      }
      if (sectionLayerRef.current) {
        map.removeLayer(sectionLayerRef.current);
        sectionLayerRef.current = null;
      }
    };
  }, [map, schema, showBarangay, showSection]);

  return null;
};

export default BoundaryLayers;
