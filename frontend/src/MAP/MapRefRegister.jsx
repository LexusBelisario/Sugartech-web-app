import { useMap } from "react-leaflet";
import { useEffect } from "react";

export default function MapRefRegisterer() {
  const map = useMap();

  useEffect(() => {
    window.map = map; // ✅ Register the global reference
    console.log("✅ Leaflet map registered to window.map");
  }, [map]);

  return null;
}

// This file was created to make the map reference available globally so the tools that need to reference the map can do map operations
// in use by Searchresults.jsx