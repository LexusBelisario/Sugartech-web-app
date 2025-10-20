import { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminBoundaries.css";
import { useSchema } from "../SchemaContext";
import API from "../../api";

function AdminBoundaries() {
  const map = useMap();
  const { schema } = useSchema();

  // === State controls (linked to panel) ===
  const [showMunicipal, setShowMunicipal] = useState(true);
  const [showBarangay, setShowBarangay] = useState(true);
  const [showSection, setShowSection] = useState(true);

  // === Layer Refs ===
  const municipalRef = useRef(null);
  const barangayLayerRef = useRef(null);
  const sectionLayerRef = useRef(null);
  const barangayLabelsRef = useRef([]);

  // === Zoom thresholds ===
  const limits = {
    municipal: [4, 13],
    barangay: [12, 14],
    section: [12, 25],
    parcel: [16, 25],
  };

  // === Parcel styling ===
  const hiddenStyle = { opacity: 0, fillOpacity: 0 };
  const getParcelStyle = () => ({
    color: window.parcelOutlineColor || "black",
    weight: 1.2,
    opacity: 1,
    fillColor: "black",
    fillOpacity: 0.1,
  });

  // 🧩 Label style once
  useEffect(() => {
    if (!document.getElementById("brgy-label-style")) {
      const style = document.createElement("style");
      style.id = "brgy-label-style";
      style.innerHTML = `
        .leaflet-tooltip.barangay-label {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // === Unified visibility handler (accepts direct overrides) ===
  const updateVisibility = useCallback(
    (force = false, overrides = {}) => {
      if (!map) return;
      const zoom = map.getZoom();

      const active = {
        municipal:
          overrides.showMunicipal !== undefined
            ? overrides.showMunicipal
            : showMunicipal,
        barangay:
          overrides.showBarangay !== undefined
            ? overrides.showBarangay
            : showBarangay,
        section:
          overrides.showSection !== undefined
            ? overrides.showSection
            : showSection,
      };

      // === Municipal ===
      if (municipalRef.current) {
        const [min, max] = limits.municipal;
        const visible = active.municipal && zoom >= min && zoom <= max;
        if (visible) {
          if (!map.hasLayer(municipalRef.current))
            map.addLayer(municipalRef.current);
        } else {
          if (map.hasLayer(municipalRef.current))
            map.removeLayer(municipalRef.current);
        }
      }

      // === Barangay ===
      if (barangayLayerRef.current) {
        const [min, max] = limits.barangay;
        const visible = active.barangay && zoom >= min && zoom <= max;
        if (visible) {
          if (!map.hasLayer(barangayLayerRef.current)) {
            map.addLayer(barangayLayerRef.current);
            barangayLabelsRef.current.forEach((label) => map.addLayer(label));
          }
        } else {
          if (map.hasLayer(barangayLayerRef.current)) {
            map.removeLayer(barangayLayerRef.current);
            barangayLabelsRef.current.forEach((label) =>
              map.removeLayer(label)
            );
          }
        }
      }

      // === Section ===
      if (sectionLayerRef.current) {
        const [min, max] = limits.section;
        const visible = active.section && zoom >= min && zoom <= max;
        if (visible) {
          if (!map.hasLayer(sectionLayerRef.current))
            map.addLayer(sectionLayerRef.current);
        } else if (map.hasLayer(sectionLayerRef.current)) {
          map.removeLayer(sectionLayerRef.current);
        }
      }

      // === Parcels ===
      const [pmin, pmax] = limits.parcel;
      const parcelVisible =
        zoom >= pmin &&
        zoom <= pmax &&
        (document.getElementById("parcels")?.checked ?? true);
      if (window.parcelLayers && Array.isArray(window.parcelLayers)) {
        const style = getParcelStyle();
        window.parcelLayers.forEach(({ layer }) => {
          if (!layer || !layer.setStyle) return;
          layer.setStyle(parcelVisible ? style : hiddenStyle);
        });
      }
    },
    [map, showMunicipal, showBarangay, showSection]
  );

  // === Load municipal WMS ===
  useEffect(() => {
    if (!map) return;
    municipalRef.current = L.tileLayer.wms(
      "http://104.199.142.35:8080/geoserver/MapBoundaries/wms",
      {
        layers: "MapBoundaries:PH_MunicipalMap",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        crs: L.CRS.EPSG4326,
      }
    );
  }, [map]);

  // === Load barangay + section GeoJSON ===
  useEffect(() => {
    if (!map || !schema) return;

    const loadData = async () => {
      const url = `${API}/municipal-boundaries?schema=${schema}`;
      console.log(`📡 Loading boundaries for schema=${schema}`);
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== "success") return;

        // Clear old
        [barangayLayerRef, sectionLayerRef].forEach((ref) => {
          if (ref.current && map.hasLayer(ref.current))
            map.removeLayer(ref.current);
        });
        barangayLabelsRef.current.forEach((l) => map.removeLayer(l));
        barangayLabelsRef.current = [];

        // 🎨 Color palette
        const palette = [
          "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
          "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
          "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
          "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
        ];

        // Barangay color assignments
        const barangayColors = {};
        let brgyIndex = 0;
        data.barangay?.features?.forEach((f) => {
          const n = f.properties.barangay;
          if (n && !barangayColors[n]) {
            barangayColors[n] = palette[brgyIndex++ % palette.length];
          }
        });

        // Section colors inherit barangay palette
        const sectionColors = {};
        let secIndex = 0;
        data.section?.features?.forEach((f) => {
          const n = f.properties.barangay;
          if (n && !sectionColors[n]) {
            sectionColors[n] = palette[secIndex++ % palette.length];
          }
        });

        // Barangay layer
        barangayLayerRef.current = L.geoJSON(data.barangay || null, {
          style: (f) => ({
            color: "#000",
            weight: 1.2,
            fillColor: barangayColors[f.properties.barangay] || "#999",
            fillOpacity: 0.5,
          }),
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.barangay;
            if (name) {
              const center = layer.getBounds().getCenter();
              const label = L.tooltip({
                permanent: true,
                direction: "center",
                className: "barangay-label",
              }).setContent(
                `<div style="
                  color:white;
                  font-size:12px;
                  font-weight:700;
                  text-shadow:
                    -1px -1px 0 #000,
                     1px -1px 0 #000,
                    -1px  1px 0 #000,
                     1px  1px 0 #000;">${name}</div>`
              ).setLatLng(center);
              barangayLabelsRef.current.push(label);
            }
          },
          interactive: false,
        });

        // ✅ Section layer (from your old BoundaryLayers version)
        sectionLayerRef.current = L.geoJSON(data.section || null, {
          style: (f) => ({
            color: "#202020",
            weight: 2.0,
            fillColor: sectionColors[f.properties.barangay] || "#999",
            fillOpacity: 0.15,
          }),
          interactive: false,
        });

        updateVisibility(true);
      } catch (err) {
        console.error("❌ Boundary fetch error:", err);
      }
    };

    loadData();
  }, [map, schema, updateVisibility]);

  // === Apply on zoom change ===
  useEffect(() => {
    if (!map) return;
    const handler = () => updateVisibility(false);
    map.on("zoomend", handler);
    return () => map.off("zoomend", handler);
  }, [map, updateVisibility]);

  // === Expose global control hooks (used by AdminBoundariesPanel.jsx) ===
  useEffect(() => {
    window._updateBoundaryVisibility = (force, overrides) =>
      updateVisibility(force, overrides);
    window._setShowMunicipal = setShowMunicipal;
    window._setShowBarangay = setShowBarangay;
    window._setShowSection = setShowSection;
  }, [updateVisibility]);

  // === Cleanup ===
  useEffect(() => {
    return () => {
      [barangayLayerRef, sectionLayerRef].forEach((ref) => {
        if (ref.current && map.hasLayer(ref.current)) map.removeLayer(ref.current);
        ref.current = null;
      });
      barangayLabelsRef.current.forEach((label) => map.removeLayer(label));
      barangayLabelsRef.current = [];
      if (municipalRef.current && map.hasLayer(municipalRef.current))
        map.removeLayer(municipalRef.current);
    };
  }, [map]);

  return null;
}

export default AdminBoundaries;
