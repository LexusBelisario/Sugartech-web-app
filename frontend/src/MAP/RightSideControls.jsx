import { useMap } from "react-leaflet";
import { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Folder,
  Satellite,
  MapPinned,
  ArrowUpDown,
} from "lucide-react";
import { useSchema } from "./SchemaContext.jsx";
import AdminBoundariesPanel from "./AdminBoundaries/AdminBoundariesPanel.jsx";
import SchemaSelectorPanel from "./SchemaSelector/SchemaSelectorPanel.jsx";
import OrthophotoPanel from "./Orthophoto/OrthophotoPanel.jsx";
import JoinedTableSyncPanel from "./JoinedTableSync/JoinedTableSyncPanel.jsx";

function RightControls({ activeTool, setActiveTool }) {
  const map = useMap();
  const { selectedSchemaBounds } = useSchema();

  // Schema selector data
  const [schemaData, setSchemaData] = useState({
    schemas: [],
    selectedSchema: "",
    loading: true,
    error: null,
    userAccess: null,
  });

  // Orthophoto data
  const [orthophotoData, setOrthophotoData] = useState({
    Gsrvr_URL: "",
    Layer_Name: "",
    loading: false,
    message: "",
    schema: null,
  });

  // ✅ Sync schema selector data
  useEffect(() => {
    const syncData = () => {
      if (window._schemaSelectorData) setSchemaData({ ...window._schemaSelectorData });
    };
    syncData();
    const i = setInterval(syncData, 100);
    return () => clearInterval(i);
  }, []);

  // ✅ Sync orthophoto data
  useEffect(() => {
    const syncOrthoData = () => {
      if (window._orthophotoData) setOrthophotoData({ ...window._orthophotoData });
    };
    syncOrthoData();
    const i = setInterval(syncOrthoData, 100);
    return () => clearInterval(i);
  }, []);

  // === MAP CONTROLS ===
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleCenter = () => {
    if (selectedSchemaBounds) {
      const [[minx, miny, maxx, maxy]] = [selectedSchemaBounds];
      map.fitBounds([[miny, minx], [maxy, maxx]]);
    } else {
      map.setView([12.8797, 121.774], 6);
    }
  };

  // === TOOL HANDLERS ===
  const toggleTool = (toolName) => setActiveTool((prev) => (prev === toolName ? null : toolName));
  const handleSchemaChange = (schema) => window._handleSchemaChange?.(schema);
  const handleOrthophotoSave = async (data) =>
    window._handleOrthophotoSave ? await window._handleOrthophotoSave(data) : { success: false, message: "Save handler not available" };

  // === STYLING (left side) ===
  // Panel: near-white bg, red border, subtle shadow
  const panelClass =
    "bg-[#FAFAF9]/95 border border-[#B22234] rounded-r-xl py-2 w-11 shadow-[0_6px_18px_rgba(213,0,50,.18),0_0_0_1px_rgba(178,34,52,.12)] " +
    "backdrop-blur-sm flex flex-col items-center";

  // Buttons: default maroon text; focus ring; smooth transitions
  const buttonBase =
    "relative w-8 h-8 flex items-center justify-center rounded text-[#A50034] transition " +
    "focus:outline-none focus:ring-2 focus:ring-[#D50032]/40 group";

  // Tooltip (kept dark for contrast)
  const Tooltip = ({ text }) => (
    <span
      className="absolute left-[115%] top-1/2 -translate-y-1/2 bg-[#1E1E1EE6] text-[#FAFAF9] text-[11px]
                 px-2 py-[3px] rounded-md shadow-md opacity-0 -translate-x-1
                 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out
                 pointer-events-none whitespace-nowrap font-[Inter] tracking-wide
                 after:content-[''] after:absolute after:left-[-5px] after:top-1/2 after:-translate-y-1/2
                 after:border-4 after:border-transparent after:border-r-[#1E1E1EE6]"
    >
      {text}
    </span>
  );

  // Palette: hover gets a soft maroon wash; active is solid maroon with light icon
  const hoverColor = "hover:bg-[#D5003220]"; // ~12.5% alpha
  const activeColor = "bg-[#D50032] text-[#FAFAF9]";

  return (
    <>
      {/* 🎛️ Left Side Button Stack */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col items-center gap-3 z-[1000] select-none">


        {/* 🧩 Tool Buttons */}
        <div className={panelClass}>
          <button
            onClick={() => toggleTool("schema")}
            className={`${buttonBase} ${activeTool === "schema" ? activeColor : hoverColor}`}
          >
            <Folder size={18} />
            <Tooltip text="Municipality/City" />
          </button>

          <button
            onClick={() => toggleTool("ortho")}
            className={`${buttonBase} ${activeTool === "ortho" ? activeColor : hoverColor}`}
          >
            <Satellite size={18} />
            <Tooltip text="Orthophoto" />
          </button>

          <button
            onClick={() => toggleTool("admin")}
            className={`${buttonBase} ${activeTool === "admin" ? activeColor : hoverColor}`}
          >
            <MapPinned size={18} />
            <Tooltip text="Admin Boundaries" />
          </button>

          <button
            onClick={() => toggleTool("sync")}
            className={`${buttonBase} ${activeTool === "sync" ? activeColor : hoverColor}`}
          >
            <ArrowUpDown size={18} />
            <Tooltip text="RPT-GIS Sync Tool" />
          </button>
        </div>
      </div>

      {/* 🧭 Tool Panels — slide out from LEFT */}
      <SchemaSelectorPanel
        isVisible={activeTool === "schema"}
        onClose={() => setActiveTool(null)}
        schemas={schemaData.schemas}
        selectedSchema={schemaData.selectedSchema}
        onSchemaChange={handleSchemaChange}
        loading={schemaData.loading}
        error={schemaData.error}
        userAccess={schemaData.userAccess}
      />

      <OrthophotoPanel
        isVisible={activeTool === "ortho"}
        onClose={() => setActiveTool(null)}
        initialData={orthophotoData}
        onSave={handleOrthophotoSave}
      />

      <AdminBoundariesPanel
        isVisible={activeTool === "admin"}
        onClose={() => setActiveTool(null)}
      />

      <JoinedTableSyncPanel
        isVisible={activeTool === "sync"}
        onClose={() => setActiveTool(null)}
      />
    </>
  );
}

export default RightControls;
