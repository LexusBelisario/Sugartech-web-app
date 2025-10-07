import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletWMTS";
import "./BaseMapSelector.css";
import { ApiService } from "../../api_service";
import { useSchema } from "../SchemaContext";

function BaseMapSelector() {
  const map = useMap();
  const { schema } = useSchema();

  const [panelOpen, setPanelOpen] = useState(false);
  const [activeBase, setActiveBase] = useState("google");
  const [orthoLayer, setOrthoLayer] = useState(null);
  const [orthoConfig, setOrthoConfig] = useState(null);
  const [orthoOn, setOrthoOn] = useState(false);

  // ==========================================================
  // 🛰️ Fetch Orthophoto Config (URL + Layer) from Backend
  // ==========================================================
  useEffect(() => {
    if (!schema) return;

    const fetchOrtho = async () => {
      try {
        const res = await ApiService.get(`/orthophoto-config?schema=${schema}`);
        if (res.status === "success") {
          setOrthoConfig({
            url: res.Gsrvr_URL,
            layer: res.Layer_Name,
          });
          console.log(`✅ Loaded orthophoto config for ${schema}:`, res);
        } else {
          console.warn(`⚠️ No orthophoto config found for ${schema}`);
          setOrthoConfig(null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch orthophoto config:", err);
        setOrthoConfig(null);
      }
    };

    fetchOrtho();
  }, [schema]);

  // ==========================================================
  // 🗺️ Initialize Basemap Layers
  // ==========================================================
  useEffect(() => {
    if (!map) return;

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

    window._basemapLayers = { osm, google, satellite };
    google.addTo(map).bringToBack();

    return () => {
      Object.values(window._basemapLayers).forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      delete window._basemapLayers;
    };
  }, [map]);

  // ==========================================================
  // 🧱 Create / Update Orthophoto Layer
  // ==========================================================
  useEffect(() => {
    if (!map || !orthoConfig) return;

    const { url, layer } = orthoConfig;

    const wmtsLayer = L.tileLayer.wmts(url, {
      layer: layer,
      tilematrixSet: "EPSG:900913",
      format: "image/png",
      style: "",
      maxZoom: 24,
    });

    setOrthoLayer(wmtsLayer);

    // If user already toggled orthophoto on, show it immediately
    if (orthoOn) {
      wmtsLayer.addTo(map).bringToFront();
    }

    console.log(`🛰️ Orthophoto layer ready: ${layer}`);

    return () => {
      if (map.hasLayer(wmtsLayer)) map.removeLayer(wmtsLayer);
    };
  }, [map, orthoConfig]);

  // ==========================================================
  // 🔁 Switch Basemap (Orthophoto always stays on top)
  // ==========================================================
  const switchBase = (key) => {
    if (!map || !window._basemapLayers) return;

    if (activeBase && window._basemapLayers[activeBase]) {
      map.removeLayer(window._basemapLayers[activeBase]);
    }

    const newLayer = window._basemapLayers[key];
    newLayer.addTo(map).bringToBack();
    setActiveBase(key);

    // ✅ Keep orthophoto above basemap
    if (orthoOn && orthoLayer) {
      orthoLayer.bringToFront();
    }
  };

  // ==========================================================
  // 🌍 Toggle Orthophoto Visibility
  // ==========================================================
  const toggleOrtho = () => {
    if (!map || !orthoLayer) return;

    if (orthoOn) {
      map.removeLayer(orthoLayer);
      setOrthoOn(false);
    } else {
      orthoLayer.addTo(map).bringToFront();
      setOrthoOn(true);
    }
  };

  // ==========================================================
  // 🧭 Leaflet Control Button
  // ==========================================================
  useEffect(() => {
    if (!map) return;
    const BasemapControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar basemap-selector");
        const button = L.DomUtil.create("button", "basemap-toggle-button", container);
        button.innerHTML = "🗺️";
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        button.onclick = (e) => {
          e.preventDefault();
          setPanelOpen((open) => !open);
        };
        return container;
      },
    });
    const control = new BasemapControl({ position: "topright" });
    map.addControl(control);
    return () => map.removeControl(control);
  }, [map]);

  // ==========================================================
  // 🧩 UI Panel
  // ==========================================================
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

        <hr />

        <div>
          <input
            id="layer-orthophotos"
            type="checkbox"
            checked={orthoOn}
            onChange={toggleOrtho}
            disabled={!orthoConfig}
          />
          <label htmlFor="layer-orthophotos">
            Orthophotos {orthoConfig ? "" : "(no config)"}
          </label>
        </div>
      </div>
    )
  );
}

export default BaseMapSelector;
