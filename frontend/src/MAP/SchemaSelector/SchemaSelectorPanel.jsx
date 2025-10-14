import React, { useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";

const SchemaSelectorPanel = ({ 
  isVisible, 
  onClose, 
  schemas, 
  selectedSchema, 
  onSchemaChange, 
  loading, 
  error, 
  userAccess 
}) => {
  const containerRef = useRef(null);

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

  // 🧭 Text formatting helper
  const formatSchemaName = (schema) => {
    if (schema.includes(", ")) return schema;
    const parts = schema.split("_");
    if (parts.length >= 2) {
      const municipality = parts.slice(0, -1).join(" ");
      const province = parts[parts.length - 1];
      return `${
        municipality.charAt(0).toUpperCase() + municipality.slice(1)
      }, ${province.charAt(0).toUpperCase() + province.slice(1)}`;
    }
    return schema;
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 right-14 w-[260px] bg-[#151922] text-white rounded-l-lg shadow-xl border border-[#2A2E35] animate-slideIn z-[9999]"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#F7C800] text-black font-semibold px-4 py-2 rounded-tl-lg">
        <span>Select Municipality / City</span>
        <button
          className="text-black hover:opacity-70 transition"
          onClick={onClose}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 text-sm space-y-3">
        {loading && <p className="text-gray-400">Loading schemas...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && schemas.length > 0 && (
          <>
            {userAccess && (
              <div className="text-xs text-gray-300 mb-2">
                Access Level:{" "}
                <span className="text-white font-semibold">
                  {userAccess.description || "Full Municipal Access"}
                </span>
              </div>
            )}

            <ul
              className="space-y-2 max-h-[200px] overflow-y-auto pr-1"
              onWheel={(e) => e.stopPropagation()}
            >
              {schemas.map((schema) => (
                <li
                  key={schema}
                  className="hover:text-[#F7C800] transition cursor-pointer"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={schema}
                      checked={selectedSchema === schema}
                      onChange={(e) => onSchemaChange(e.target.value)}
                      className="accent-[#F7C800]"
                    />
                    <span className="schema-name">
                      {formatSchemaName(schema)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {selectedSchema && (
              <div className="text-xs text-gray-300 border-t border-[#2A2E35] pt-2 mt-2">
                Current:{" "}
                <span className="font-semibold text-[#F7C800]">
                  {formatSchemaName(selectedSchema)}
                </span>
              </div>
            )}
          </>
        )}

        {!loading && !error && schemas.length === 0 && (
          <div className="text-gray-400 text-center py-4">
            <p>No schemas available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaSelectorPanel;