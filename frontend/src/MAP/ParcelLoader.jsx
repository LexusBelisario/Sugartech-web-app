import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "../MAP/view.js"; // makes window.loadAllGeoTables available
import { useSchema } from "./SchemaContext.jsx"; // ✅ import context

function ParcelLoader() {
  const { schema } = useSchema(); // ✅ get current schema
  const map = useMap();

  useEffect(() => {
    if (schema && window.loadAllGeoTables) {
      window.loadAllGeoTables(map, [schema]); // ✅ load vector layers for schema
    }
  }, [map, schema]);

  return null;
}

export default ParcelLoader;
