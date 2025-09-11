// === Layer Arrays ===
export const parcelLayers = [];
import { ApiService } from "../api"; // ✅ use ApiService
window.parcelLayers = parcelLayers;

// === Default style applied to parcels ===
const defaultParcelStyle = {
  color: "black",
  weight: 1,
  fillColor: "black",
  fillOpacity: 0.1,
};

// === Function to load all parcel features from selected schemas ===
export async function loadAllGeoTables(map, selectedSchemas = []) {
  if (!selectedSchemas.length) {
    if (window.setLoadingProgress) window.setLoadingProgress(false);
    return;
  }

  if (window.setLoadingProgress) window.setLoadingProgress(true);

  const query = selectedSchemas.map(s => `schemas=${encodeURIComponent(s)}`).join("&");
  const url = `/all-barangays?${query}`; // ✅ ApiService adds base + headers

  try {
    const data = await ApiService.get(url);

    const toggleBtn = document.getElementById("toggleToolbarBtn");
    if (toggleBtn) toggleBtn.style.display = "block";

    // 🔑 clear existing parcel layers from map
    parcelLayers.forEach(({ layer }) => map.removeLayer(layer));
    parcelLayers.length = 0;

    // add new parcels
    L.geoJSON(data, {
      style: defaultParcelStyle,
      onEachFeature: (feature, layer) => {
        parcelLayers.push({ feature, layer });

        layer.on("click", () => {
          parcelLayers.forEach(({ layer: l }) => l.setStyle(defaultParcelStyle));
          layer.setStyle({
            fillColor: "white",
            color: "black",
            weight: 2.5,
            fillOpacity: 0.5,
          });

          if (document.getElementById("infoPopup") && window.populateParcelInfo) {
            window.populateParcelInfo(feature.properties);
          }
        });
      }
    }).addTo(map);

    if (window.setLoadingProgress) window.setLoadingProgress(false);
  } catch (err) {
    console.error("❌ Failed to load geographic data:", err);
    if (window.setLoadingProgress) window.setLoadingProgress(false);
  }
}

// === Function to reload a single parcel table ===
export async function loadGeoTable(map, schema, table) {
  const url = `/single-table?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}`;

  if (window.setLoadingProgress) window.setLoadingProgress(true);

  try {
    const data = await ApiService.get(url);

    const toRemove = parcelLayers.filter(
      p =>
        p.feature.properties.source_table === table &&
        p.feature.properties.source_schema === schema
    );

    toRemove.forEach(p => map.removeLayer(p.layer));
    for (let i = parcelLayers.length - 1; i >= 0; i--) {
      const f = parcelLayers[i].feature.properties;
      if (f.source_table === table && f.source_schema === schema) {
        parcelLayers.splice(i, 1);
      }
    }

    L.geoJSON(data, {
      style: defaultParcelStyle,
      onEachFeature: (feature, layer) => {
        parcelLayers.push({ feature, layer });

        layer.on("click", () => {
          parcelLayers.forEach(({ layer: l }) => l.setStyle(defaultParcelStyle));
          layer.setStyle({
            fillColor: "white",
            color: "black",
            weight: 2.5,
            fillOpacity: 0.5,
          });

          if (document.getElementById("infoPopup") && window.populateParcelInfo) {
            window.populateParcelInfo(feature.properties);
          }
        });
      }
    }).addTo(map);

    if (window.setLoadingProgress) window.setLoadingProgress(false);
  } catch (err) {
    console.error("❌ Failed to reload parcel table:", err);
    if (window.setLoadingProgress) window.setLoadingProgress(false);
  }
}

// === Export to global scope if needed ===
window.loadAllGeoTables = loadAllGeoTables;
window.loadGeoTable = loadGeoTable;
