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
  userAccess,
}) => {
  const containerRef = useRef(null);
  const scrollableRef = useRef(null);

  // Allow scrolling inside; block map scroll under
  useEffect(() => {
    if (!containerRef.current) return;
    const handleWheel = (e) => {
      if (scrollableRef.current && scrollableRef.current.contains(e.target)) {
        e.stopPropagation();
      } else {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const stopEvent = (e) => e.stopPropagation();
    const el = containerRef.current;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("dblclick", stopEvent);
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("dblclick", stopEvent);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 left-14 w-[260px] z-[9999]
                 bg-[#FAFAF9] text-[#111827] rounded-r-xl border border-[#B22234]
                 shadow-[0_10px_24px_rgba(0,0,0,0.18),0_0_0_1px_rgba(178,34,52,0.18)]
                 animate-slideIn"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#A50034] text-[#FAFAF9] font-semibold px-4 py-2 rounded-tr-xl">
        <span>Select Municipality / City</span>
        <button className="text-[#FAFAF9]/90 hover:opacity-80 transition" onClick={onClose}>
          {/* flip chevron to point left by rotating */}
          <ChevronRight size={20} className="-rotate-180" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 text-sm space-y-3">
        {loading && <p className="text-gray-500">Loading schemas...</p>}
        {error && <p className="text-[#b91c1c]">{error}</p>}

        {!loading && !error && schemas.length > 0 && (
          <>
            {userAccess && (
              <div className="text-xs text-gray-600 mb-2">
                Access Level:{" "}
                <span className="text-[#111827] font-semibold">
                  {userAccess.description || "Full Municipal Access"}
                </span>
              </div>
            )}

            <ul
              ref={scrollableRef}
              className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"
            >
              {schemas.map((schema) => (
                <li
                  key={schema}
                  className="transition cursor-pointer hover:text-[#D50032]"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={schema}
                      checked={selectedSchema === schema}
                      onChange={(e) => onSchemaChange(e.target.value)}
                      className="accent-[#D50032]"
                    />
                    <span className="schema-name">{schema}</span>
                  </label>
                </li>
              ))}
            </ul>

            {selectedSchema && (
              <div className="text-xs text-gray-600 border-t border-[#E5E7EB] pt-2 mt-2">
                Current:{" "}
                <span className="font-semibold text-[#D50032]">{selectedSchema}</span>
              </div>
            )}
          </>
        )}

        {!loading && !error && schemas.length === 0 && (
          <div className="text-gray-500 text-center py-4">
            <p>No schemas available</p>
          </div>
        )}
      </div>

      {/* ✅ keep style block, no jsx attr */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D50032; }
          .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #e5e7eb #f3f4f6; }
        `}
      </style>
    </div>
  );
};

export default SchemaSelectorPanel;
