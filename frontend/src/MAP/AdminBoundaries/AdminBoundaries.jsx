import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminBoundaries.css";
import BoundaryLayers from "./BoundaryLayers";

function AdminBoundaries() {
  const map = useMap();
  const [showBarangay, setShowBarangay] = useState(true);
  const [showSection, setShowSection] = useState(true);

  useEffect(() => {
    if (!map) return;

    // --- Municipal boundary (WMS)
    const municipalBoundary = L.tileLayer.wms(
      "http://104.199.142.35:8080/geoserver/MapBoundaries/wms",
      {
        layers: "MapBoundaries:PH_MunicipalMap",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        crs: L.CRS.EPSG4326,
      }
    );

    // --- Zoom thresholds ---
    const municipalMin = 4;
    const municipalMax = 14;
    const sectionParcelMinZoom = 16;
    const sectionParcelMaxZoom = 25;

    // --- Parcel outline color ---
    window.parcelOutlineColor = window.parcelOutlineColor || "black";

    const hiddenStyle = { opacity: 0, fillOpacity: 0 };

    // --- Style cache (fixed, not per-zoom) ---
    const parcelVisibleStyle = {
      color: window.parcelOutlineColor,
      weight: 1.2,
      opacity: 1,
      fillColor: "black",
      fillOpacity: 0.1,
    };
    const sectionVisibleStyle = {
      color: "#202020",
      weight: 0.8,
      opacity: 0.8,
      fillOpacity: 0.1,
    };

    // --- Bind parcel click (once only) ---
    function bindParcelClick(feature, layer) {
      layer.off("click");
      layer.on("click", () => {
        // Reset all parcel styles
        window.parcelLayers?.forEach(({ layer: l }) =>
          l.setStyle(parcelVisibleStyle)
        );
        // Highlight selected parcel
        layer.setStyle({
          fillColor: "white",
          color: window.parcelOutlineColor,
          weight: 2.5,
          fillOpacity: 0.5,
        });
        // Show info popup
        if (document.getElementById("infoPopup") && window.populateParcelInfo) {
          window.populateParcelInfo(feature.properties);
        }
      });
    }

    // --- Maintain layer order ---
    function enforceLayerOrder() {
      if (window.sectionLayers)
        window.sectionLayers.forEach(({ layer }) => layer.bringToBack());
      if (window.parcelLayers)
        window.parcelLayers.forEach(({ layer }) => layer.bringToFront());
      if (map.hasLayer(municipalBoundary)) municipalBoundary.bringToFront();
      if (window.barangayLayers)
        window.barangayLayers.forEach(({ layer }) => layer.bringToFront());
    }

    // --- Optimized visibility logic ---
    function updateVisibility() {
      const zoom = map.getZoom();

      // Municipal visibility
      const municipalCheckbox = document.getElementById("municipal");
      const municipalVisible =
        zoom >= municipalMin &&
        zoom <= municipalMax &&
        municipalCheckbox?.checked;

      if (municipalVisible) {
        if (!map.hasLayer(municipalBoundary)) map.addLayer(municipalBoundary);
      } else if (map.hasLayer(municipalBoundary)) {
        map.removeLayer(municipalBoundary);
      }

      const sectionCheckbox = document.getElementById("section");
      const parcelCheckbox = document.getElementById("parcels");
      const visible = zoom >= sectionParcelMinZoom && zoom <= sectionParcelMaxZoom;

      // --- Section visibility ---
      if (window.sectionLayers) {
        const show = visible && sectionCheckbox?.checked;
        window.sectionLayers.forEach(({ layer }) => {
          if (layer._lastVisible !== show) {
            layer._lastVisible = show;
            layer.setStyle(show ? sectionVisibleStyle : hiddenStyle);
          }
        });
      }

      // --- Parcel visibility ---
      if (window.parcelLayers) {
        const show = visible && parcelCheckbox?.checked;
        window.parcelLayers.forEach(({ feature, layer }) => {
          if (layer._lastVisible !== show) {
            layer._lastVisible = show;
            if (show) {
              layer.setStyle(parcelVisibleStyle);
              bindParcelClick(feature, layer);
            } else {
              layer.setStyle(hiddenStyle);
              layer.off("click");
            }
          }
        });
      }

      enforceLayerOrder();
    }

    // --- Run only once per zoomend ---
    map.on("zoomend", updateVisibility);
    window.onParcelsLoaded = updateVisibility;

    // --- Initial run ---
    updateVisibility();

    window._boundaryLayers = { municipalBoundary };

    // --- Control Panel UI ---
    const BoundaryControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar boundary-control");
        const button = L.DomUtil.create("button", "boundary-toggle-button", container);
        button.innerHTML = "🏘️";

        const panel = L.DomUtil.create("div", "boundary-panel hidden", container);
        panel.innerHTML = `
          <h4>Admin Boundaries</h4>
          <div><input type="checkbox" id="municipal" checked/> <label for="municipal">Municipal Boundary</label></div>
          <div><input type="checkbox" id="barangay" checked/> <label for="barangay">Barangay Boundary</label></div>
          <div><input type="checkbox" id="section" checked/> <label for="section">Section Boundary</label></div>
          <hr/>
          <div><input type="checkbox" id="parcels" checked/> <label for="parcels">Parcels</label></div>
          <div style="margin-top:6px;">
            <label for="parcelColor">Outline:</label>
            <select id="parcelColor">
              <option value="red">Red</option>
              <option value="orange">Orange</option>
              <option value="yellow">Yellow</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="violet">Violet</option>
              <option value="black">Black</option>
              <option value="white">White</option>
            </select>
          </div>
        `;

        L.DomEvent.disableClickPropagation(panel);
        L.DomEvent.disableScrollPropagation(panel);
        button.onclick = () => panel.classList.toggle("hidden");

        panel.querySelector("#municipal").onchange = updateVisibility;
        panel.querySelector("#barangay").onchange = (e) =>
          setShowBarangay(e.target.checked);
        panel.querySelector("#section").onchange = (e) =>
          setShowSection(e.target.checked);
        panel.querySelector("#parcels").onchange = updateVisibility;

        const colorSelect = panel.querySelector("#parcelColor");
        colorSelect.value = window.parcelOutlineColor;
        colorSelect.onchange = (e) => {
          window.parcelOutlineColor = e.target.value;
          updateVisibility();
        };

        return container;
      },
    });

    const control = new BoundaryControl({ position: "bottomright" });
    map.addControl(control);

    return () => {
      map.removeControl(control);
      map.off("zoomend", updateVisibility);
      if (map.hasLayer(municipalBoundary)) map.removeLayer(municipalBoundary);
      delete window._boundaryLayers;
      delete window.onParcelsLoaded;
    };
  }, [map]);

  // ✅ Smooth zoom animation
  useEffect(() => {
    if (!map) return;

    let lastZoom = map.getZoom();
    let isUserZoom = false;

    const handleUserZoom = () => {
      isUserZoom = true;
    };

    const handleZoom = () => {
      const targetZoom = map.getZoom();
      if (!isUserZoom && targetZoom !== lastZoom) {
        const currentCenter = map.getCenter();
        map.flyTo(currentCenter, targetZoom, {
          animate: true,
          duration: 0.6,
          easeLinearity: 0.25,
        });
      }
      lastZoom = targetZoom;
      isUserZoom = false;
    };

    map.on("zoomstart", handleUserZoom);
    map.on("zoomend", handleZoom);

    return () => {
      map.off("zoomstart", handleUserZoom);
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  // ✅ Inject schema-based Barangay + Section boundaries
  return <BoundaryLayers showBarangay={showBarangay} showSection={showSection} />;
}

export default AdminBoundaries;
