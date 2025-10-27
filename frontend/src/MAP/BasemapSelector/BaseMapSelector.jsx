import { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function BaseMapSelector() {
  const map = useMap();
  const [activeBase, setActiveBase] = useState("terrain");
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

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

  useEffect(() => {
    if (!map) return;
    window._basemapLayers = {};
    basemaps.forEach(({ key, layer }) => { window._basemapLayers[key] = layer; });
    window._basemapLayers[activeBase].addTo(map);
    return () => {
      Object.values(window._basemapLayers).forEach((layer) => { if (map.hasLayer(layer)) map.removeLayer(layer); });
      delete window._basemapLayers;
    };
  }, [map]);

  const switchBase = (key) => {
    if (!map || !window._basemapLayers) return;
    if (window._basemapLayers[activeBase]) map.removeLayer(window._basemapLayers[activeBase]);
    const newLayer = window._basemapLayers[key];
    newLayer.addTo(map);
    setActiveBase(key);
    if (window._orthoLayer && map.hasLayer(window._orthoLayer)) window._orthoLayer.bringToFront();
    setIsExpanded(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsExpanded(false);
    };
    if (isExpanded) setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const activeBasemap = basemaps.find((b) => b.key === activeBase);
  const inactiveBasemaps = basemaps.filter((b) => b.key !== activeBase);

  return (
    <div className="absolute bottom-5 left-3.5 z-[1000] pointer-events-none" ref={containerRef}>
      <div
        className={`flex flex-col gap-2 bg-[#FAFAF9]/95 rounded-xl p-2 pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    border border-[#B22234]/60 shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(178,34,52,0.18)] ${
                      isExpanded ? "" : ""
                    }`}
      >
        {isExpanded && (
          <div className="flex flex-col gap-2 animate-[slideDown_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            {inactiveBasemaps.map(({ key, label, thumbnail }) => (
              <button
                key={key}
                onClick={() => switchBase(key)}
                title={label}
                className="group bg-white border-2 border-[#E7E5E4] rounded-lg p-0 cursor-pointer transition-all duration-200 ease-in-out overflow-hidden w-[90px] relative select-none
                           hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#FDF2F2] hover:border-[#D50032]
                           hover:shadow-[0_4px_14px_rgba(213,0,50,0.20)]
                           focus:outline-none focus:ring-2 focus:ring-[#D50032] focus:ring-offset-2 focus:ring-offset-white
                           contrast-more:border-[3px]
                           max-[768px]:w-[75px] max-[480px]:w-[65px]"
              >
                <div className="w-full h-[70px] relative overflow-hidden bg-black/10 rounded-t-lg max-[768px]:h-[58px] max-[480px]:h-[50px]">
                  <img
                    src={thumbnail}
                    alt={label}
                    className="w-full h-full object-cover block transition-[transform,filter] duration-300 ease-in-out group-hover:scale-[1.05] group-hover:brightness-110"
                  />
                </div>
                <div className="py-1.5 px-1 text-[10px] font-semibold text-[#1F2937] text-center bg-transparent leading-tight tracking-wide
                                group-hover:text-[#A50034] group-hover:font-bold
                                max-[768px]:text-[9px] max-[768px]:py-[5px] max-[768px]:px-[3px] max-[480px]:text-[8px] max-[480px]:py-1 max-[480px]:px-0.5">
                  {label}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Active / Toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Change basemap"}
          className="group bg-white border-2 border-[#D50032] rounded-lg p-0 cursor-pointer transition-all duration-200 ease-in-out overflow-hidden w-[90px] relative select-none
                     hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#B22234] hover:bg-[#FEF2F2]
                     hover:shadow-[0_5px_18px_rgba(213,0,50,0.25)]
                     focus:outline-none focus:ring-2 focus:ring-[#D50032] focus:ring-offset-2 focus:ring-offset-white
                     contrast-more:border-[3px]
                     max-[768px]:w-[75px] max-[480px]:w-[65px]"
        >
          <div className="w-full h-[70px] relative overflow-hidden bg-black/10 rounded-t-lg max-[768px]:h-[58px] max-[480px]:h-[50px]">
            <img
              src={activeBasemap.thumbnail}
              alt={activeBasemap.label}
              className="w-full h-full object-cover block transition-[transform,filter] duration-300 ease-in-out group-hover:scale-[1.05] group-hover:brightness-110"
            />
            <div className="absolute bottom-1 right-1 bg-white/80 rounded-full w-5 h-5 flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out group-hover:bg-[#D50032] group-hover:shadow-[0_0_10px_rgba(213,0,50,0.35)]
                            max-[768px]:w-[18px] max-[768px]:h-[18px] max-[480px]:w-4 max-[480px]:h-4 max-[480px]:bottom-[3px] max-[480px]:right-[3px]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className={`fill-[#374151] group-hover:fill-white transition-transform duration-300 ease-in-out max-[768px]:w-3.5 max-[768px]:h-3.5 max-[480px]:w-3 max-[480px]:h-3 ${isExpanded ? "rotate-180" : "rotate-0"}`}
              >
                <path d="M7 14l5-5 5 5z" />
              </svg>
            </div>
          </div>
          <div className="py-1.5 px-1 text-[10px] font-bold text-[#374151] text-center bg-transparent leading-tight tracking-wide
                          group-hover:text-[#D50032]
                          max-[768px]:text-[9px] max-[768px]:py-[5px] max-[768px]:px-[3px] max-[480px]:text-[8px] max-[480px]:py-1 max-[480px]:px-0.5">
            {activeBasemap.label}
          </div>
        </button>
      </div>

      <style>
        {`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}

export default BaseMapSelector;
