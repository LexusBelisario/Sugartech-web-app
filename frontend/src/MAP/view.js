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
  // ✅ Updated endpoint (moved to parcel.py)
  const url = `${API}/parcel/all-barangays?${query}`;

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

    // 🔑 clear existing parcel layers from map
    parcelLayers.forEach(({ layer }) => map.removeLayer(layer));
    parcelLayers.length = 0;

    // create new layer but don't zoom automatically
    const newLayer = L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        parcelLayers.push({ feature, layer });
      },
    });

    newLayer.addTo(map);

    // ✅ only zoom to bounds if schemas were explicitly provided
    if (selectedSchemas && selectedSchemas.length > 0) {
      try {
        const bounds = newLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        }
      } catch (err) {
        console.warn("⚠️ Could not fit bounds:", err);
      }
    }

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
  // ✅ Updated endpoint (moved to table_viewer.py)
  const url = `${API}/table-viewer/single-table?schema=${encodeURIComponent(
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

    // create new layer but don't zoom automatically
    const newLayer = L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        parcelLayers.push({ feature, layer });
      },
    });

    newLayer.addTo(map);

    // ✅ zoom to updated table bounds
    try {
      const bounds = newLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    } catch (err) {
      console.warn("⚠️ Could not fit bounds:", err);
    }

    // 🔔 notify AdminBoundaries that parcels are ready
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
