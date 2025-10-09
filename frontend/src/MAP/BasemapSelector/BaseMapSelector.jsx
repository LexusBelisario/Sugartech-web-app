import { useEffect, useState, useRef } from "react";
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
  const [activeBase, setActiveBase] = useState("terrain");
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  // Orthophoto states
  const [orthoLayer, setOrthoLayer] = useState(null);
  const [orthoConfig, setOrthoConfig] = useState(null);
  const [orthoOn, setOrthoOn] = useState(false);

  // ==========================================================
  // 🛰️ Fetch Orthophoto Config from Backend
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
  // 🗺️ Basemap Options
  // ==========================================================
  const basemaps = [
    {
      key: "osm",
      label: "OpenStreetMap",
      thumbnail: "https://a.tile.openstreetmap.org/5/16/10.png",
      layer: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 25,
      }),
    },
    {
      key: "satellite",
      label: "Google Satellite",
      thumbnail: "https://mt1.google.com/vt/lyrs=s&x=16&y=10&z=5",
      layer: L.tileLayer("http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "© Google Satellite",
        maxZoom: 25,
      }),
    },
    {
      key: "terrain",
      label: "Google Terrain",
      thumbnail: "https://mt1.google.com/vt/lyrs=p&x=16&y=10&z=5",
      layer: L.tileLayer("http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "© Google Terrain",
        maxZoom: 25,
      }),
    },
  ];

  // ==========================================================
  // 🗺️ Initialize Default Basemap
  // ==========================================================
  useEffect(() => {
    if (!map) return;

    console.log("🗺️ Initializing basemap selector...");

    // Store layers globally
    window._basemapLayers = {};
    basemaps.forEach(({ key, layer }) => {
      window._basemapLayers[key] = layer;
    });

    // Add default basemap
    window._basemapLayers[activeBase].addTo(map);

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
  // 🔁 Switch Basemap (Orthophoto stays on top)
  // ==========================================================
  const switchBase = (key) => {
    if (!map || !window._basemapLayers) return;

    console.log(`🔄 Switching to ${key}`);

    // Remove current basemap
    if (activeBase && window._basemapLayers[activeBase]) {
      map.removeLayer(window._basemapLayers[activeBase]);
    }

    // Add new basemap
    const newLayer = window._basemapLayers[key];
    newLayer.addTo(map);
    setActiveBase(key);

    // ✅ Keep orthophoto above basemap
    if (orthoOn && orthoLayer) {
      orthoLayer.bringToFront();
    }

    // Collapse after selection
    setIsExpanded(false);
  };

  // ==========================================================
  // 🌍 Toggle Orthophoto Visibility
  // ==========================================================
  const toggleOrtho = () => {
    if (!map || !orthoLayer) return;

    if (orthoOn) {
      map.removeLayer(orthoLayer);
      setOrthoOn(false);
      console.log("🛰️ Orthophoto hidden");
    } else {
      orthoLayer.addTo(map).bringToFront();
      setOrthoOn(true);
      console.log("🛰️ Orthophoto shown");
    }
  };

  // ==========================================================
  // 🖱️ Click Outside to Close
  // ==========================================================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  // ==========================================================
  // 📝 Get Sorted Basemaps (Active at Bottom)
  // ==========================================================
  const activeBasemap = basemaps.find((b) => b.key === activeBase);
  const inactiveBasemaps = basemaps.filter((b) => b.key !== activeBase);

  // ==========================================================
  // 🧩 Collapsible UI
  // ==========================================================
  return (
    <div className="basemap-selector-container" ref={containerRef}>
      <div
        className={`basemap-cards ${
          isExpanded ? "basemap-cards-expanded" : ""
        }`}
      >
        {/* Other Cards - Show when Expanded */}
        {isExpanded && (
          <>
            <div className="basemap-cards-list">
              {inactiveBasemaps.map(({ key, label, thumbnail }) => (
                <button
                  key={key}
                  className="basemap-card"
                  onClick={() => switchBase(key)}
                  title={label}
                >
                  <div className="basemap-card-thumbnail">
                    <img src={thumbnail} alt={label} />
                  </div>
                  <div className="basemap-card-label">{label}</div>
                </button>
              ))}
            </div>

            {/* Orthophoto Toggle - Only show when config exists */}
            {orthoConfig && (
              <div className="basemap-ortho-toggle">
                <label className="ortho-checkbox-label">
                  <input
                    type="checkbox"
                    checked={orthoOn}
                    onChange={toggleOrtho}
                    className="ortho-checkbox"
                  />
                  <span className="ortho-label-text">🛰️ Orthophoto</span>
                </label>
              </div>
            )}
          </>
        )}

        {/* Active Card - Always at Bottom */}
        <button
          className="basemap-card basemap-card-active basemap-card-main"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Change basemap"}
        >
          <div className="basemap-card-thumbnail">
            <img src={activeBasemap.thumbnail} alt={activeBasemap.label} />
            <div className="basemap-card-chevron">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="white"
                style={{
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                <path d="M7 14l5-5 5 5z" />
              </svg>
            </div>
          </div>
          <div className="basemap-card-label">{activeBasemap.label}</div>
        </button>
      </div>
    </div>
  );
}

export default BaseMapSelector;
