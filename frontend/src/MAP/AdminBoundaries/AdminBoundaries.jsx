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
    const municipalBoundary = L.tileLayer.wms(
      "http://104.199.142.35:8080/geoserver/MapBoundaries/wms",
      {
        layers: "MapBoundaries:ph_municipalmap",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        crs: L.CRS.EPSG4326,
        minZoom: 6,
        maxZoom: 14,
      }
    );

    const sectionBoundary = L.tileLayer.wms(
      "http://104.199.142.35:8080/geoserver/MapBoundaries/wms",
      {
        layers: "MapBoundaries:SectionBoundary",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        tileSize: 4096,
        crs: L.CRS.EPSG4326,
        maxZoom: 16,
      }
    );

    const barangayBoundary = L.tileLayer.wms(
      "http://104.199.142.35:8080/geoserver/MapBoundaries/wms",
      {
        layers: "MapBoundaries:BarangayBoundary",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        tileSize: 4096,
        crs: L.CRS.EPSG4326,
        minZoom: 12,
        maxZoom: 15,
      }
    );

    // --- Add them initially with zIndex ---
    municipalBoundary.addTo(map).setZIndex(1);
    sectionBoundary.addTo(map).setZIndex(2);
    barangayBoundary.addTo(map).setZIndex(4);

    // --- Store globally for toggling ---
    window._boundaryLayers = { municipalBoundary, barangayBoundary, sectionBoundary };

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

    // --- Zoom thresholds for parcels ---
    const parcelMinZoom = 17;
    const parcelMaxZoom = 25;

    function bindParcelClick(feature, layer) {
      layer.on("click", () => {
        window.parcelLayers.forEach(({ layer: l }) =>
          l.setStyle(makeDefaultParcelStyle())
        );
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

    // --- Apply parcel styles + enforce stacking order ---
    function updateParcelVisibility() {
      if (!window.parcelLayers) return;
      const zoom = map.getZoom();
      const visible = zoom >= parcelMinZoom && zoom <= parcelMaxZoom;
      const parcelCheckbox = document.getElementById("parcels");

      window.parcelLayers.forEach(({ feature, layer }) => {
        if (visible && parcelCheckbox?.checked) {
          layer.setStyle(makeDefaultParcelStyle());
          bindParcelClick(feature, layer);
          layer.bringToFront(); // ✅ Parcels above section
        } else {
          layer.setStyle(hiddenParcelStyle);
          layer.off("click");
        }
      });

      // ✅ Reapply WMS stacking
      municipalBoundary.setZIndex(1);
      sectionBoundary.setZIndex(2);
      barangayBoundary.setZIndex(4);
    }

    // --- Hook parcel loading ---
    window.onParcelsLoaded = () => {
      updateParcelVisibility();
    };

    map.on("zoomend", updateParcelVisibility);

    // --- Custom control ---
    const BoundaryControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar boundary-control");
        const button = L.DomUtil.create("button", "boundary-toggle-button", container);
        button.innerHTML = "🏘️";

        const panel = L.DomUtil.create("div", "boundary-panel hidden", container);
        panel.innerHTML = `
          <h4>Administrative Boundaries</h4>
          <div><input type="checkbox" id="municipal" checked/> <label for="municipal">Municipal Boundary</label></div>
          <div><input type="checkbox" id="section" checked/> <label for="section">Section Boundary</label></div>
          <div><input type="checkbox" id="barangay" checked/> <label for="barangay">Barangay Boundary</label></div>
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

        // --- Layer toggles with enforced zIndex ---
        panel.querySelector("#municipal").onchange = (e) => {
          e.target.checked
            ? municipalBoundary.addTo(map).setZIndex(1)
            : map.removeLayer(municipalBoundary);
        };
        panel.querySelector("#section").onchange = (e) => {
          e.target.checked
            ? sectionBoundary.addTo(map).setZIndex(2)
            : map.removeLayer(sectionBoundary);
        };
        panel.querySelector("#barangay").onchange = (e) => {
          e.target.checked
            ? barangayBoundary.addTo(map).setZIndex(4)
            : map.removeLayer(barangayBoundary);
        };

        // Parcels toggle
        panel.querySelector("#parcels").onchange = () => {
          updateParcelVisibility();
        };

        // Outline color selector
        const colorSelect = panel.querySelector("#parcelColor");
        colorSelect.value = window.parcelOutlineColor;
        colorSelect.onchange = (e) => {
          window.parcelOutlineColor = e.target.value;
          updateParcelVisibility();
        };

        return container;
      },
    });

    const control = new BoundaryControl({ position: "bottomright" });
    map.addControl(control);

    return () => {
      map.removeControl(control);
      map.off("zoomend", updateParcelVisibility);
      Object.values(window._boundaryLayers).forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      delete window._boundaryLayers;
      delete window.onParcelsLoaded;
    };
  }, [map]);

  return null;
}

export default AdminBoundaries;
