import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./BaseMapSelector.css";

function BaseMapSelector() {
  const map = useMap();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    osm: false,
    google: true, // ✅ Google Maps on by default
    satellite: false,
    geoserver: false,
  });

  useEffect(() => {
    if (!map) return;

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    });

    const google = L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google Maps",
    });

    const satellite = L.tileLayer("http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google Satellite",
    });

    const geoserver = L.tileLayer.wms(
      "http://localhost:8080/geoserver/Calauan_Aerial_Photos/wms",
      {
        layers: "Calauan_Aerial_Photos:Calauan_Orthophotos",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        attribution: "GeoServer - Calauan Orthophotos",
      }
    );

    window._basemapLayers = { osm, google, satellite, geoserver };

    // ✅ add Google Maps by default
    google.addTo(map);

    return () => {
      Object.values(window._basemapLayers).forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      delete window._basemapLayers;
    };
  }, [map]);

  const toggleLayer = (key) => {
    if (!map || !window._basemapLayers) return;

    const newState = { ...activeLayers, [key]: !activeLayers[key] };
    setActiveLayers(newState);

    if (!activeLayers[key]) {
      window._basemapLayers[key].addTo(map);
    } else {
      map.removeLayer(window._basemapLayers[key]);
    }
  };

  useEffect(() => {
    if (!map) return;

    const BasemapControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar basemap-selector");
        const button = L.DomUtil.create("button", "basemap-toggle-button", container);
        button.innerHTML = "🗺️";

        // ✅ Prevent this button from triggering map interactions
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
        <h4>Select Basemaps</h4>
        <div>
          <input
            id="layer-osm"
            type="checkbox"
            checked={activeLayers.osm}
            onChange={() => toggleLayer("osm")}
          />
          <label htmlFor="layer-osm"> OpenStreetMap</label>
        </div>
        <div>
          <input
            id="layer-google"
            type="checkbox"
            checked={activeLayers.google}
            onChange={() => toggleLayer("google")}
          />
          <label htmlFor="layer-google"> Google Maps</label>
        </div>
        <div>
          <input
            id="layer-satellite"
            type="checkbox"
            checked={activeLayers.satellite}
            onChange={() => toggleLayer("satellite")}
          />
          <label htmlFor="layer-satellite"> Google Satellite</label>
        </div>
        <div>
          <input
            id="layer-geoserver"
            type="checkbox"
            checked={activeLayers.geoserver}
            onChange={() => toggleLayer("geoserver")}
          />
          <label htmlFor="layer-geoserver"> Calauan Orthophotos</label>
        </div>
      </div>
    )
  );
}

export default BaseMapSelector;
