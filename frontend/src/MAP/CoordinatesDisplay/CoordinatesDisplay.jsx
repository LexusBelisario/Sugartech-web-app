import { useMapEvents } from "react-leaflet";
import { useState } from "react";

function CoordinatesDisplay() {
  const [position, setPosition] = useState(null);
  const [scale, setScale] = useState(null);

  useMapEvents({
    mousemove: (e) => setPosition(e.latlng),
    mouseout: () => setPosition(null),
    zoomend: (e) => {
      const map = e.target;
      const zoom = map.getZoom();
      const center = map.getCenter();
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) /
        Math.pow(2, zoom + 8);
      const scaleDenominator = Math.round(metersPerPixel * (96 / 0.0254));
      setScale(`1:${scaleDenominator.toLocaleString()}`);
    },
    moveend: (e) => {
      const map = e.target;
      const zoom = map.getZoom();
      const center = map.getCenter();
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) /
        Math.pow(2, zoom + 8);
      const scaleDenominator = Math.round(metersPerPixel * (96 / 0.0254));
      setScale(`1:${scaleDenominator.toLocaleString()}`);
    },
  });

  if (!position) return null;

  const latDir = position.lat >= 0 ? "" : "S";
  const lngDir = position.lng >= 0 ? "" : "W";

  return (
    <div
      className="absolute bottom-3 right-32 z-[1000]
                 px-3 py-1.5 rounded-lg border border-[#B22234]
                 bg-[#FAFAF9]/95 text-[#111827] shadow-[0_8px_18px_rgba(213,0,50,0.15),0_0_0_1px_rgba(178,34,52,0.12)]
                 font-mono text-[11px] select-none"
      style={{ pointerEvents: "none" }}
    >
      <span className="font-semibold text-[#A50034]">Latitude:</span>{" "}
      {Math.abs(position.lat).toFixed(4)} {latDir}
      <span className="font-semibold text-[#A50034] ml-2">Longitude:</span>{" "}
      {Math.abs(position.lng).toFixed(4)} {lngDir}
      {scale && (
        <>
          <span className="mx-2 text-[#B22234]">|</span>
          <span className="font-semibold text-[#A50034]">Scale:</span> {scale}
        </>
      )}
    </div>
  );
}

export default CoordinatesDisplay;
