import React, { useRef, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

const OrthophotoPanel = ({ isVisible, onClose, initialData, onSave }) => {
  const containerRef = useRef(null);
  
  const [gserverUrl, setGserverUrl] = useState(initialData?.Gsrvr_URL || "");
  const [layerName, setLayerName] = useState(initialData?.Layer_Name || "");
  const [message, setMessage] = useState(initialData?.message || "");
  const [loading, setLoading] = useState(false);
  const [orthoVisible, setOrthoVisible] = useState(initialData?.orthoVisible || false);

  // ✅ Compute hasConfig based on actual form values
  const hasConfig = !!(gserverUrl && layerName);

  // Sync with external data changes
  useEffect(() => {
    if (initialData) {
      setGserverUrl(initialData.Gsrvr_URL || "");
      setLayerName(initialData.Layer_Name || "");
      setMessage(initialData.message || "");
      setOrthoVisible(initialData.orthoVisible || false);
    }
  }, [initialData]);

  // 🧩 Prevent map zoom & drag interference inside panel
  useEffect(() => {
    if (!containerRef.current) return;
    const stopEvent = (e) => e.stopPropagation();
    const el = containerRef.current;
    el.addEventListener("wheel", stopEvent);
    el.addEventListener("dblclick", stopEvent);
    return () => {
      el.removeEventListener("wheel", stopEvent);
      el.removeEventListener("dblclick", stopEvent);
    };
  }, []);

  const handleSave = async () => {
    if (!gserverUrl || !layerName) {
      setMessage("Please fill in both fields before saving.");
      return;
    }

    setLoading(true);
    const result = await onSave({ Gsrvr_URL: gserverUrl, Layer_Name: layerName });
    setLoading(false);
    
    if (result) {
      setMessage(result.message);
    }
  };

  const handleToggleVisibility = () => {
    if (window._toggleOrthoVisibility) {
      window._toggleOrthoVisibility();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 right-14 w-[280px] bg-[#151922] text-white rounded-l-lg shadow-xl border border-[#2A2E35] animate-slideIn z-[9999]"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#F7C800] text-black font-semibold px-4 py-2 rounded-tl-lg">
        <span>Orthophoto Configuration</span>
        <button
          className="text-black hover:opacity-70 transition"
          onClick={onClose}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 text-sm space-y-3">
        {/* ✅ Orthophoto Toggle - Show at TOP if config exists */}
        {hasConfig && (
          <div className="bg-[#1E1E1E] border border-[#2A2E35] rounded p-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-white font-semibold flex items-center gap-2">
                <span>🛰️</span>
                <span>Show Orthophoto</span>
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={orthoVisible}
                  onChange={handleToggleVisibility}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F7C800]"></div>
              </div>
            </label>
            <p className="text-xs text-gray-400 mt-2">
              {orthoVisible ? "Orthophoto layer is visible" : "Orthophoto layer is hidden"}
            </p>
          </div>
        )}

        {/* Configuration Section */}
        <div className={hasConfig ? "border-t border-[#2A2E35] pt-3" : ""}>
          <h5 className="text-xs text-gray-400 mb-2 font-semibold">LAYER CONFIGURATION</h5>

          {/* GeoServer URL */}
          <div className="space-y-1 mb-3">
            <label htmlFor="gserverUrl" className="block text-gray-300 text-xs">
              GeoServer URL:
            </label>
            <input
              id="gserverUrl"
              type="text"
              value={gserverUrl}
              onChange={(e) => setGserverUrl(e.target.value)}
              placeholder="http://your-geoserver/geoserver/gwc/service/wmts"
              className="w-full bg-[#1E1E1E] text-white border border-[#2A2E35] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#F7C800]"
            />
          </div>

          {/* Layer Name */}
          <div className="space-y-1 mb-3">
            <label htmlFor="layerName" className="block text-gray-300 text-xs">
              Layer Name:
            </label>
            <input
              id="layerName"
              type="text"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="workspace:layername"
              className="w-full bg-[#1E1E1E] text-white border border-[#2A2E35] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#F7C800]"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading || !gserverUrl || !layerName}
            className={`w-full py-2 rounded font-semibold text-sm transition ${
              loading || !gserverUrl || !layerName
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-[#F7C800] text-black hover:bg-[#E0B700]"
            }`}
          >
            {loading ? "Saving..." : "Save Configuration"}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`text-xs p-2 rounded ${
            message.includes("success") 
              ? "bg-green-900/30 text-green-300" 
              : message.includes("failed") || message.includes("Error")
              ? "bg-red-900/30 text-red-300"
              : "bg-blue-900/30 text-blue-300"
          }`}>
            {message}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-400 border-t border-[#2A2E35] pt-2 mt-2">
          <p>Configure the orthophoto layer source for the current municipality.</p>
        </div>
      </div>
    </div>
  );
};

export default OrthophotoPanel;