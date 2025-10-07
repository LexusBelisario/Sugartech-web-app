import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminBoundaries.css";
import BoundaryLayers from "./BoundaryLayers";

function AdminBoundaries() {
  const map = useMap();

  // ✅ Checkbox states (for integration with BoundaryLayers)
  const [showBarangay, setShowBarangay] = useState(true);
  const [showSection, setShowSection] = useState(true);

  useEffect(() => {
    if (!map) return;

    // --- Define WMS (municipal only, unchanged)
    const municipalBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:PH_MunicipalMap",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
    });

    // --- Zoom thresholds ---
    const municipalMin = 6;
    const municipalMax = 14;

    // --- Parcel styles ---
    window.parcelOutlineColor = window.parcelOutlineColor || "black";
    function makeDefaultParcelStyle() {
      return {
        color: window.parcelOutlineColor,
        weight: 1.5,
        opacity: 1,
        fillColor: "black",
        fillOpacity: 0.1,
      };
    }
    const hiddenParcelStyle = { opacity: 0, fillOpacity: 0 };
    const parcelMinZoom = 17;
    const parcelMaxZoom = 25;

    function bindParcelClick(feature, layer) {
      layer.on("click", () => {
        window.parcelLayers.forEach(({ layer: l }) => l.setStyle(makeDefaultParcelStyle()));
        layer.setStyle({
          fillColor: "white",
          color: window.parcelOutlineColor,
          weight: 2.5,
          fillOpacity: 0.5,
        });
        if (document.getElementById("infoPopup") && window.populateParcelInfo) {
          window.populateParcelInfo(feature.properties);
        }
      });
    }

    // --- Update visibility for WMS + Parcels ---
    function updateVisibility() {
      const zoom = map.getZoom();

      // Municipal
      const municipalCheckbox = document.getElementById("municipal");
      if (zoom >= municipalMin && zoom <= municipalMax && municipalCheckbox?.checked) {
        if (!map.hasLayer(municipalBoundary)) map.addLayer(municipalBoundary);
      } else if (map.hasLayer(municipalBoundary)) {
        map.removeLayer(municipalBoundary);
      }

      // Parcels
      if (window.parcelLayers) {
        const visible = zoom >= parcelMinZoom && zoom <= parcelMaxZoom;
        const parcelCheckbox = document.getElementById("parcels");
        window.parcelLayers.forEach(({ feature, layer }) => {
          if (visible && parcelCheckbox?.checked) {
            layer.setStyle(makeDefaultParcelStyle());
            bindParcelClick(feature, layer);
            layer.bringToBack();
          } else {
            layer.setStyle(hiddenParcelStyle);
            layer.off("click");
          }
        });
      }

      // Keep proper stacking order
      if (map.hasLayer(municipalBoundary)) municipalBoundary.bringToFront();
    }

    window.onParcelsLoaded = () => {
      updateVisibility();
    };

    map.on("zoomend", updateVisibility);
    updateVisibility();

    window._boundaryLayers = { municipalBoundary };

    // --- Control Panel ---
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

        button.onclick = () => {
          panel.classList.toggle("hidden");
        };

        // Toggle logic
        panel.querySelector("#municipal").onchange = (e) => {
          e.target.checked
            ? map.addLayer(municipalBoundary)
            : map.removeLayer(municipalBoundary);
        };
        panel.querySelector("#barangay").onchange = (e) => {
          setShowBarangay(e.target.checked);
        };
        panel.querySelector("#section").onchange = (e) => {
          setShowSection(e.target.checked);
        };
        panel.querySelector("#parcels").onchange = () => {
          updateVisibility();
        };

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

  // ✅ Smooth zoom animation (unchanged)
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

  // ✅ Inject our schema-based vector boundaries (Barangay + Section)
  return <BoundaryLayers showBarangay={showBarangay} showSection={showSection} />;
}

export default AdminBoundaries;
