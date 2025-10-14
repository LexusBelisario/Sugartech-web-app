import { useMap } from "react-leaflet";
import {
  Plus,
  Minus,
  Crosshair,
  Folder,
  Satellite,
  MapPinned,
  Paintbrush,
} from "lucide-react";
import { useSchema } from "./SchemaContext.jsx";
import AdminBoundariesPanel from "./AdminBoundaries/AdminBoundariesPanel.jsx";

function RightControls({ activeTool, setActiveTool }) {
  const map = useMap();
  const { selectedSchemaBounds } = useSchema();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleCenter = () => {
    if (selectedSchemaBounds) {
      const [[minx, miny, maxx, maxy]] = [selectedSchemaBounds];
      map.fitBounds([
        [miny, minx],
        [maxy, maxx],
      ]);
    } else {
      map.setView([12.8797, 121.774], 6);
    }
  };

  const toggleTool = (toolName) => {
    setActiveTool((prev) => (prev === toolName ? null : toolName));
  };

  const panelClass =
    "bg-[#151922E6] rounded-l-lg py-2 w-10 shadow-md backdrop-blur-sm flex flex-col items-center";
  const buttonBase =
    "relative w-8 h-8 flex items-center justify-center rounded transition text-white group";

  const Tooltip = ({ text }) => (
    <span
      className="absolute right-[115%] top-1/2 -translate-y-1/2 bg-[#1E1E1EE6] text-white text-[11px]
                 px-2 py-[3px] rounded-md shadow-md opacity-0 translate-x-1
                 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out
                 pointer-events-none whitespace-nowrap font-[Inter] tracking-wide
                 after:content-[''] after:absolute after:right-[-5px] after:top-1/2 after:-translate-y-1/2
                 after:border-4 after:border-transparent after:border-l-[#1E1E1EE6]"
    >
      {text}
    </span>
  );

  const hoverColor = "hover:bg-[#F7C80033]";
  const activeColor = "bg-[#F7C800]";

  return (
    <>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 flex flex-col items-center gap-3 z-[1000] select-none">
        {/* 🔍 Zoom + Center */}
        <div className={panelClass}>
          <button onClick={handleZoomIn} className={`${buttonBase} ${hoverColor}`}>
            <Plus size={18} />
            <Tooltip text="Zoom In" />
          </button>
          <button onClick={handleZoomOut} className={`${buttonBase} ${hoverColor}`}>
            <Minus size={18} />
            <Tooltip text="Zoom Out" />
          </button>
          <button onClick={handleCenter} className={`${buttonBase} ${hoverColor}`}>
            <Crosshair size={18} />
            <Tooltip text="Center Map" />
          </button>
        </div>

        {/* 🗂️ Tool Buttons */}
        <div className={panelClass}>
          <button
            onClick={() => toggleTool("schema")}
            className={`${buttonBase} ${
              activeTool === "schema" ? activeColor : hoverColor
            }`}
          >
            <Folder size={18} />
            <Tooltip text="Municipality/City" />
          </button>

          <button
            onClick={() => toggleTool("ortho")}
            className={`${buttonBase} ${
              activeTool === "ortho" ? activeColor : hoverColor
            }`}
          >
            <Satellite size={18} />
            <Tooltip text="Orthophoto" />
          </button>

          <button
            onClick={() => toggleTool("admin")}
            className={`${buttonBase} ${
              activeTool === "admin" ? activeColor : hoverColor
            }`}
          >
            <MapPinned size={18} />
            <Tooltip text="Admin Boundaries" />
          </button>

          <button
            onClick={() => toggleTool("parcel")}
            className={`${buttonBase} ${
              activeTool === "parcel" ? activeColor : hoverColor
            }`}
          >
            <Paintbrush size={18} />
            <Tooltip text="Parcel Styling" />
          </button>
        </div>
      </div>

      {/* 🗺️ Admin Boundaries Panel */}
      <AdminBoundariesPanel
        isVisible={activeTool === "admin"}
        onClose={() => setActiveTool(null)}
      />
    </>
  );
}

export default RightControls;