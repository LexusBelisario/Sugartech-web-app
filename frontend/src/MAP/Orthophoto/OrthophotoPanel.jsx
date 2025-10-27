import React, { useRef, useEffect, useState } from "react";
import { ChevronRight, Save, ArrowLeft } from "lucide-react";

const OrthophotoPanel = ({ isVisible, onClose, initialData, onSave }) => {
  const containerRef = useRef(null);

  const [gserverUrl, setGserverUrl] = useState("");
  const [layerName, setLayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [orthoVisible, setOrthoVisible] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // 🧩 Initialize only when panel opens
  useEffect(() => {
    if (isVisible && initialData) {
      setGserverUrl(initialData.Gsrvr_URL || "");
      setLayerName(initialData.Layer_Name || "");
      setOrthoVisible(initialData.orthoVisible || false);
    }
  }, [isVisible, initialData]);

  // 🧭 Prevent map scroll interference
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

  // 💾 Save handler
  const handleSave = async () => {
    const urlTrimmed = gserverUrl.trim();
    const layerTrimmed = layerName.trim();

    if (!urlTrimmed || !layerTrimmed) {
      alert("⚠️ Please fill in both fields before saving.");
      return;
    }

    setLoading(true);
    try {
      await onSave({ Gsrvr_URL: urlTrimmed, Layer_Name: layerTrimmed });
      alert("✅ Orthophoto configuration saved successfully.");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("❌ Failed to save orthophoto configuration.");
    } finally {
      setLoading(false);
    }
  };

  // 🛰️ Toggle orthophoto visibility
  const handleToggleVisibility = () => {
    if (window._toggleOrthoVisibility) {
      window._toggleOrthoVisibility();
      setOrthoVisible((v) => !v);
    } else {
      setOrthoVisible((v) => !v);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 left-14 w-[280px] z-[9999]
                 bg-[#FAFAF9] text-[#111827] rounded-r-xl border border-[#B22234]
                 shadow-[0_10px_24px_rgba(0,0,0,0.18),0_0_0_1px_rgba(178,34,52,0.18)]
                 animate-slideIn"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#A50034] text-[#FAFAF9] font-semibold px-4 py-2 rounded-tr-xl">
        <span>Orthophoto Configuration</span>
        <button
          className="text-[#FAFAF9]/90 hover:opacity-80 transition"
          onClick={onClose}
          aria-label="Close orthophoto panel"
        >
          {/* flip to point toward the left edge */}
          <ChevronRight size={20} className="-rotate-180" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 text-sm space-y-3">
        {/* === ON/OFF SWITCH (Maroon style) === */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-3 shadow-sm">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-semibold text-sm">Show Orthophoto</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={orthoVisible}
                onChange={handleToggleVisibility}
                className="sr-only peer"
              />
              {/* track */}
              <div className="w-11 h-6 rounded-full bg-[#E5E7EB] peer-checked:bg-[#D50032] transition-colors"></div>
              {/* knob */}
              <div className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white shadow
                              transition-transform peer-checked:translate-x-5"></div>
            </div>
          </label>
        </div>

        {/* === CONFIGURATION SECTION === */}
        {!isConfiguring ? (
          <div className="flex flex-col items-center justify-center h-[140px] text-gray-500">
            <button
              onClick={() => setIsConfiguring(true)}
              className="w-full bg-white border border-[#E5E7EB] text-[#111827] px-3 py-2 rounded text-sm font-medium transition
                         hover:bg-[#FEF2F2] hover:border-[#D50032] focus:outline-none focus:ring-2 focus:ring-[#D50032] focus:ring-offset-2 focus:ring-offset-[#FAFAF9]"
            >
              Configure
            </button>
          </div>
        ) : (
          <>
            <div className="border-t border-[#E5E7EB] pt-3">
              <h5 className="text-xs text-gray-600 mb-2 font-semibold">
                LAYER CONFIGURATION
              </h5>

              <div className="space-y-1 mb-3">
                <label htmlFor="gserverUrl" className="block text-gray-700 text-xs">
                  GeoServer URL:
                </label>
                <input
                  id="gserverUrl"
                  type="text"
                  value={gserverUrl}
                  onChange={(e) => setGserverUrl(e.target.value)}
                  placeholder="http://your-geoserver/geoserver/gwc/service/wmts"
                  className="w-full bg-white text-[#111827] border border-[#E5E7EB] rounded px-2 py-1.5 text-xs
                             focus:outline-none focus:border-[#D50032] focus:ring-2 focus:ring-[#D50032]/30"
                />
              </div>

              <div className="space-y-1 mb-3">
                <label htmlFor="layerName" className="block text-gray-700 text-xs">
                  Layer Name:
                </label>
                <input
                  id="layerName"
                  type="text"
                  value={layerName}
                  onChange={(e) => setLayerName(e.target.value)}
                  placeholder="workspace:layername"
                  className="w-full bg-white text-[#111827] border border-[#E5E7EB] rounded px-2 py-1.5 text-xs
                             focus:outline-none focus:border-[#D50032] focus:ring-2 focus:ring-[#D50032]/30"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setIsConfiguring(false)}
                className="flex items-center gap-2 border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]
                           px-3 py-1 rounded text-xs font-medium transition focus:outline-none
                           focus:ring-2 focus:ring-[#D50032]/30"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !gserverUrl || !layerName}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition focus:outline-none
                  ${
                    loading || !gserverUrl || !layerName
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#D50032] text-[#FAFAF9] hover:bg-[#B22234] focus:ring-2 focus:ring-[#D50032]/40"
                  }`}
              >
                <Save size={14} />
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrthophotoPanel;
