import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletWMTS";
import "./BaseMapSelector.css";

function BaseMapSelector() {
  const map = useMap();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeBase, setActiveBase] = useState("google");

  useEffect(() => {
    if (!map) return;

    // --- Base layers ---
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      minZoom: 0,
      maxZoom: 25,
    });

    const google = L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google Maps",
      minZoom: 0,
      maxZoom: 25,
    });

    const satellite = L.tileLayer("http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google Satellite",
      minZoom: 0,
      maxZoom: 25,
    });

    // --- WMTS Orthophotos ---
    const geoserver_kanluran = L.tileLayer.wmts(
      "http://3.111.145.107/geoserver/gwc/service/wmts",
      {
        layer: "CL_OP:01_Kanluran",
        tilematrixSet: "EPSG:900913",
        format: "image/png",
        style: "",
        maxZoom: 24,
      }
    );

    const geoserver_silangan = L.tileLayer.wmts(
      "http://3.111.145.107/geoserver/gwc/service/wmts",
      {
        layer: "CL_OP:02_Silangan",
        tilematrixSet: "EPSG:900913",
        format: "image/png",
        style: "",
        maxZoom: 24,
      }
    );

    const geoserver_masiit = L.tileLayer.wmts(
      "http://3.111.145.107/geoserver/gwc/service/wmts",
      {
        layer: "CL_OP:12_Masiit",
        tilematrixSet: "EPSG:900913",
        format: "image/png",
        style: "",
        maxZoom: 24,
      }
    );

    // store globally
    window._basemapLayers = {
      osm,
      google,
      satellite,
      geoserver: [geoserver_kanluran, geoserver_silangan, geoserver_masiit],
    };

    // default layer
    google.addTo(map);

    return () => {
      Object.values(window._basemapLayers).forEach((layer) => {
        if (Array.isArray(layer)) {
          layer.forEach((l) => map.removeLayer(l));
        } else if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      delete window._basemapLayers;
    };
  }, [map]);

  // --- Switchers ---
  const switchBase = (key) => {
    if (!map || !window._basemapLayers) return;

    // remove current
    if (activeBase && window._basemapLayers[activeBase]) {
      const currentLayer = window._basemapLayers[activeBase];
      if (Array.isArray(currentLayer)) {
        currentLayer.forEach((l) => map.removeLayer(l));
      } else {
        map.removeLayer(currentLayer);
      }
    }

    // add new
    const newLayer = window._basemapLayers[key];
    if (Array.isArray(newLayer)) {
      newLayer.forEach((l) => l.addTo(map));
    } else {
      newLayer.addTo(map);
    }
    setActiveBase(key);
  };

  // --- Control button ---
  useEffect(() => {
    if (!map) return;
    const BasemapControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar basemap-selector");
        const button = L.DomUtil.create("button", "basemap-toggle-button", container);
        button.innerHTML = "🗺️";
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        button.ondblclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        button.onclick = (e) => {
          e.preventDefault();
          setPanelOpen((open) => !open);
        };
        return container;
      },
    });
    const control = new BasemapControl({ position: "topright" });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return (
    panelOpen && (
      <div className="basemap-panel">
        <h4>Select Basemap</h4>

        <div>
          <input
            id="layer-osm"
            type="radio"
            name="basemap"
            checked={activeBase === "osm"}
            onChange={() => switchBase("osm")}
          />
          <label htmlFor="layer-osm"> OpenStreetMap</label>
        </div>

        <div>
          <input
            id="layer-google"
            type="radio"
            name="basemap"
            checked={activeBase === "google"}
            onChange={() => switchBase("google")}
          />
          <label htmlFor="layer-google"> Google Maps</label>
        </div>

        <div>
          <input
            id="layer-satellite"
            type="radio"
            name="basemap"
            checked={activeBase === "satellite"}
            onChange={() => switchBase("satellite")}
          />
          <label htmlFor="layer-satellite"> Google Satellite</label>
        </div>

        <div>
          <input
            id="layer-orthophotos"
            type="radio"
            name="basemap"
            checked={activeBase === "geoserver"}
            onChange={() => switchBase("geoserver")}
          />
          <label htmlFor="layer-orthophotos"> Orthophotos</label>
        </div>
      </div>
    )
  );
}

export default BaseMapSelector;
