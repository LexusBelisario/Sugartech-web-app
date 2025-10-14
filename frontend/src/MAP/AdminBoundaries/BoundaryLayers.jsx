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
  const updateVisibilityRef = useRef(null);

  // 🎨 Standard color palette
  const colorPalette = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
    "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
    "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
  ];

  const barangayMin = 12;
  const barangayMax = 15;
  const sectionMin = 16;
  const sectionMax = 25;

  useEffect(() => {
    if (!map || !schema) return;

    window._debugMap = map;
    const url = `${API}/municipal-boundaries?schema=${schema}`;
    console.log(`📡 Fetching boundaries for schema=${schema}`);

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.status !== "success") {
          console.warn("⚠️ No boundaries found:", data);
          return;
        }

        // 🧹 Remove old layers safely
        const removeOld = (ref) => {
          if (ref.current) {
            try {
              if (map.hasLayer(ref.current)) {
                map.removeLayer(ref.current);
              }
              ref.current.eachLayer((child) => {
                try { child.remove(); } catch {}
              });
              ref.current.clearLayers();
            } catch (e) {
              console.warn("Error removing layer:", e);
            }
            ref.current = null;
          }
        };
        removeOld(barangayLayerRef);
        removeOld(sectionLayerRef);

        // --- Color assignments ---
        const barangayColors = {};
        let brgyIndex = 0;
        data.barangay?.features?.forEach(f => {
          const n = f.properties.barangay;
          if (n && !barangayColors[n]) {
            barangayColors[n] = colorPalette[brgyIndex++ % colorPalette.length];
          }
        });

        const sectionColors = {};
        let secIndex = 0;
        data.section?.features?.forEach(f => {
          const n = f.properties.barangay;
          if (n && !sectionColors[n]) {
            sectionColors[n] = colorPalette[secIndex++ % colorPalette.length];
          }
        });

        // --- Create layers ---
        barangayLayerRef.current = L.geoJSON(data.barangay || null, {
          style: (f) => ({
            color: "#000000",
            weight: 1.5,
            fillColor: barangayColors[f.properties.barangay] || "#999",
            fillOpacity: 0.8,
          }),
          interactive: false,
        });

        sectionLayerRef.current = L.geoJSON(data.section || null, {
          style: (f) => ({
            color: "#202020",
            weight: 1.0,
            fillColor: sectionColors[f.properties.barangay] || "#999",
            fillOpacity: 0.1,
          }),
          interactive: false,
        });

        // ✅ Store references in window (do NOT overwrite parcels)
        if (!window.barangayLayers) window.barangayLayers = [];
        if (!window.sectionLayers) window.sectionLayers = [];

        // --- Visibility toggle ---
        const updateVisibility = () => {
          const zoom = map.getZoom();

          const barangayVisible =
            showBarangay && zoom >= barangayMin && zoom <= barangayMax;
          const sectionVisible =
            showSection && zoom >= sectionMin && zoom <= sectionMax;

          // Barangay toggle
          if (barangayLayerRef.current) {
            if (barangayVisible) {
              if (!map.hasLayer(barangayLayerRef.current)) {
                map.addLayer(barangayLayerRef.current);
                barangayLayerRef.current.bringToFront();
              }
            } else {
              if (map.hasLayer(barangayLayerRef.current)) {
                map.removeLayer(barangayLayerRef.current);
              }
            }
          }

          // Section toggle
          if (sectionLayerRef.current) {
            if (sectionVisible) {
              if (!map.hasLayer(sectionLayerRef.current)) {
                map.addLayer(sectionLayerRef.current);
                sectionLayerRef.current.bringToBack();
              }
            } else {
              if (map.hasLayer(sectionLayerRef.current)) {
                map.removeLayer(sectionLayerRef.current);
              }
            }
          }
        };

        updateVisibilityRef.current = updateVisibility;
        updateVisibility();
        map.on("zoomend", updateVisibility);
      })
      .catch(err => console.error("❌ Boundary fetch error:", err));

    // 🧹 Cleanup - only remove barangay and section layers
    return () => {
      if (updateVisibilityRef.current) {
        map.off("zoomend", updateVisibilityRef.current);
      }

      const destroyGeoJsonLayer = (layerRef) => {
        const layer = layerRef.current;
        if (!layer) return;
        try {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
          layer.eachLayer((child) => {
            try { child.remove(); } catch {}
          });
          layer.clearLayers();
        } catch (e) {
          console.warn("Error destroying layer:", e);
        }
        layerRef.current = null;
      };

      destroyGeoJsonLayer(barangayLayerRef);
      destroyGeoJsonLayer(sectionLayerRef);

      // ✅ DO NOT reset parcel layers here
      // window.parcelLayers should remain intact
      console.log("🧹 Barangay/Section cleanup complete");
    };
  }, [map, schema, showBarangay, showSection]);

  return null;
};

export default BoundaryLayers;