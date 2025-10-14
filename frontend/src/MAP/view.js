// === Layer Arrays ===
export const parcelLayers = [];
import API from "../api";
window.parcelLayers = parcelLayers;

// === Function to load all parcel features from selected schemas ===
export async function loadAllGeoTables(map, selectedSchemas = []) {
  if (!selectedSchemas.length) {
    if (window.setLoadingProgress) window.setLoadingProgress(false);
    return;
  }

  if (window.setLoadingProgress) window.setLoadingProgress(true);

  const query = selectedSchemas.map(s => `schemas=${encodeURIComponent(s)}`).join("&");
  const url = `${API}/all-barangays?${query}`;

  try {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken");

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const toggleBtn = document.getElementById("toggleToolbarBtn");
    if (toggleBtn) toggleBtn.style.display = "block";

    // 🧹 clear existing parcel layers from map
    parcelLayers.forEach(({ layer }) => map.removeLayer(layer));
    parcelLayers.length = 0;

    // 🆕 create new layer with proper style and NO auto-zoom
    const newLayer = L.geoJSON(data, {
      style: {
        color: "black",
        weight: 1,
        fillColor: "white",
        fillOpacity: 0.1,
      },
      onEachFeature: (feature, layer) => {
        parcelLayers.push({ feature, layer });
      },
    });

    newLayer.addTo(map);

    // ❌ removed fitBounds here — we don't want zoom changes
    // (if you ever need it, wrap it under a manual flag)

    // 🔔 notify AdminBoundaries that parcels are ready
    if (window.onParcelsLoaded) {
      window.onParcelsLoaded();
    }

    if (window.setLoadingProgress) window.setLoadingProgress(false);
  } catch (err) {
    console.error("❌ Failed to load geographic data:", err);
    if (window.setLoadingProgress) window.setLoadingProgress(false);
  }
}

// === Function to reload a single parcel table ===
export async function loadGeoTable(map, schema, table) {
  const url = `${API}/single-table?schema=${encodeURIComponent(
    schema
  )}&table=${encodeURIComponent(table)}`;

  if (window.setLoadingProgress) window.setLoadingProgress(true);

  try {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken");

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 🧹 remove existing layers for this schema/table
    const toRemove = parcelLayers.filter(
      (p) =>
        p.feature.properties.source_table === table &&
        p.feature.properties.source_schema === schema
    );

    toRemove.forEach((p) => map.removeLayer(p.layer));
    for (let i = parcelLayers.length - 1; i >= 0; i--) {
      const f = parcelLayers[i].feature.properties;
      if (f.source_table === table && f.source_schema === schema) {
        parcelLayers.splice(i, 1);
      }
    }

    // 🆕 create new layer with correct parcel style (no blue)
    const newLayer = L.geoJSON(data, {
      style: {
        color: "black",
        weight: 1,
        fillColor: "white",
        fillOpacity: 0.1,
      },
      onEachFeature: (feature, layer) => {
        parcelLayers.push({ feature, layer });
      },
    });

    newLayer.addTo(map);

    // ❌ removed fitBounds — keep existing view
    // No zoom or panning after reload

    // 🔔 notify other modules
    if (window.onParcelsLoaded) {
      window.onParcelsLoaded();
    }

    if (window.setLoadingProgress) window.setLoadingProgress(false);
  } catch (err) {
    console.error("❌ Failed to reload parcel table:", err);
    if (window.setLoadingProgress) window.setLoadingProgress(false);
  }
}

// === Export to global scope if needed ===
window.loadAllGeoTables = loadAllGeoTables;
window.loadGeoTable = loadGeoTable;
