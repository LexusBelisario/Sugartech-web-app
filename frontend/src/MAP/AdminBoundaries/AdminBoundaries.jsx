import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminBoundaries.css";

function AdminBoundaries() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // --- Define boundary layers ---
    const municipalBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:PH_MunicipalMap",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
    });

    const barangayBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:BarangayBoundary",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      tileSize: 4096,
      crs: L.CRS.EPSG4326,
    });

    const sectionBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:SectionBoundary",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      tileSize: 4096,
      crs: L.CRS.EPSG4326,
    });

    // --- Zoom thresholds ---
    const municipalMin = 6;
    const municipalMax = 14;
    const barangayMin = 12;
    const barangayMax = 15;
    const sectionMin = 15;
    const sectionMax = 16;

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
        // Reset styles
        window.parcelLayers.forEach(({ layer: l }) =>
          l.setStyle(makeDefaultParcelStyle())
        );

        // Highlight clicked
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

    // --- Update visibility with zoom thresholds + toggle state ---
    function updateVisibility() {
      const zoom = map.getZoom();

      // Municipal
      const municipalCheckbox = document.getElementById("municipal");
      if (zoom >= municipalMin && zoom <= municipalMax && municipalCheckbox?.checked) {
        if (!map.hasLayer(municipalBoundary)) map.addLayer(municipalBoundary);
      } else if (map.hasLayer(municipalBoundary)) {
        map.removeLayer(municipalBoundary);
      }

      // Barangay
      const barangayCheckbox = document.getElementById("barangay");
      if (zoom >= barangayMin && zoom <= barangayMax && barangayCheckbox?.checked) {
        if (!map.hasLayer(barangayBoundary)) map.addLayer(barangayBoundary);
      } else if (map.hasLayer(barangayBoundary)) {
        map.removeLayer(barangayBoundary);
      }

      // Section
      const sectionCheckbox = document.getElementById("section");
      if (zoom >= sectionMin && zoom <= sectionMax && sectionCheckbox?.checked) {
        if (!map.hasLayer(sectionBoundary)) map.addLayer(sectionBoundary);
      } else if (map.hasLayer(sectionBoundary)) {
        map.removeLayer(sectionBoundary);
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
      if (map.hasLayer(barangayBoundary)) barangayBoundary.bringToFront();
      if (map.hasLayer(sectionBoundary)) sectionBoundary.bringToFront();
    }

    // --- Hook for parcels loading ---
    window.onParcelsLoaded = () => {
      updateVisibility();
    };

    map.on("zoomend", updateVisibility);
    updateVisibility();

    window._boundaryLayers = { municipalBoundary, barangayBoundary, sectionBoundary };

    // --- Custom control ---
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

        // Layer toggles
        panel.querySelector("#municipal").onchange = (e) => {
          e.target.checked
            ? map.addLayer(municipalBoundary)
            : map.removeLayer(municipalBoundary);
        };
        panel.querySelector("#barangay").onchange = (e) => {
          e.target.checked
            ? map.addLayer(barangayBoundary)
            : map.removeLayer(barangayBoundary);
        };
        panel.querySelector("#section").onchange = (e) => {
          e.target.checked
            ? map.addLayer(sectionBoundary)
            : map.removeLayer(sectionBoundary);
        };

        // Parcels toggle
        panel.querySelector("#parcels").onchange = () => {
          updateVisibility();
        };

        // Outline color selector
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
      Object.values(window._boundaryLayers).forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      delete window._boundaryLayers;
      delete window.onParcelsLoaded;
    };
  }, [map]);

  // ✅ Smooth zoom animation only for programmatic zooms (no jittery scroll)
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

  return null;
}

export default AdminBoundaries;
