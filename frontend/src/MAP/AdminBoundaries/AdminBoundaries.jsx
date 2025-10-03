import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminBoundaries.css";

function AdminBoundaries() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // --- Define boundary layers
    const municipalBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:ph_municipalmap",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
      minZoom: 6,
      maxZoom: 15,
    });

    const barangayBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:BarangayBoundary",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      tileSize: 4096,
      crs: L.CRS.EPSG4326,
      minZoom: 12,
      maxZoom: 15,
    });

    const sectionBoundary = L.tileLayer.wms("http://104.199.142.35:8080/geoserver/MapBoundaries/wms", {
      layers: "MapBoundaries:SectionBoundary",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      tileSize: 4096,
      crs: L.CRS.EPSG4326,
      minZoom: 16,
      maxZoom: 25,
    });

    // --- Add them immediately (preselected)
    municipalBoundary.addTo(map);
    barangayBoundary.addTo(map);
    sectionBoundary.addTo(map);

    // --- Store globally for toggling
    window._boundaryLayers = { municipalBoundary, barangayBoundary, sectionBoundary };

    // --- Default parcel outline color (global so it persists)
    window.parcelOutlineColor = window.parcelOutlineColor || "black";

    // --- Function to build default style with current outline
    function makeDefaultParcelStyle() {
      return {
        color: window.parcelOutlineColor, // outline (dynamic)
        weight: 1.5,
        opacity: 1,
        fillColor: "black",  // fill is always black
        fillOpacity: 0.1,
      };
    }
    const hiddenParcelStyle = { opacity: 0, fillOpacity: 0 };

    // --- Zoom thresholds for parcels
    const parcelMinZoom = 17;
    const parcelMaxZoom = 25;

    // --- Helper: bind parcel click logic
    function bindParcelClick(feature, layer) {
      layer.on("click", () => {
        // reset all parcels to default
        window.parcelLayers.forEach(({ layer: l }) => l.setStyle(makeDefaultParcelStyle()));
        // highlight clicked
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

    // --- Function to apply parcel styles based on zoom
    function updateParcelVisibility() {
      if (!window.parcelLayers) return;
      const zoom = map.getZoom();
      const visible = zoom >= parcelMinZoom && zoom <= parcelMaxZoom;
      const parcelCheckbox = document.getElementById("parcels");

      window.parcelLayers.forEach(({ feature, layer }) => {
        if (visible && parcelCheckbox?.checked) {
          layer.setStyle(makeDefaultParcelStyle());
          bindParcelClick(feature, layer);
        } else {
          layer.setStyle(hiddenParcelStyle);
          layer.off("click");
        }
      });
    }

    // --- Handler when parcels finish loading
    window.onParcelsLoaded = () => {
      updateParcelVisibility();
    };

    // --- Listen for zoom changes
    map.on("zoomend", updateParcelVisibility);

    // --- Custom control with toggle button + pre-checked boxes
    const BoundaryControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar boundary-control");

        const button = L.DomUtil.create("button", "boundary-toggle-button", container);
        button.innerHTML = "🏘️";

        const panel = L.DomUtil.create("div", "boundary-panel hidden", container);
        panel.innerHTML = `
          <h4>Administrative Boundaries</h4>
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

        // Boundary toggles
        panel.querySelector("#municipal").onchange = (e) => {
          e.target.checked ? municipalBoundary.addTo(map) : map.removeLayer(municipalBoundary);
        };
        panel.querySelector("#barangay").onchange = (e) => {
          e.target.checked ? barangayBoundary.addTo(map) : map.removeLayer(barangayBoundary);
        };
        panel.querySelector("#section").onchange = (e) => {
          e.target.checked ? sectionBoundary.addTo(map) : map.removeLayer(sectionBoundary);
        };

        // Parcels toggle
        panel.querySelector("#parcels").onchange = () => {
          updateParcelVisibility();
        };

        // Outline color selector
        const colorSelect = panel.querySelector("#parcelColor");
        colorSelect.value = window.parcelOutlineColor; // set dropdown to current
        colorSelect.onchange = (e) => {
          window.parcelOutlineColor = e.target.value;
          updateParcelVisibility(); // restyle parcels with new outline color
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
