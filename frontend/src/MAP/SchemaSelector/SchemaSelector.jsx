import { useState, useEffect } from "react";
import { ApiService } from "../../api_service.js";
import { useSchema } from "../SchemaContext";
import { useMap } from "react-leaflet";

const SchemaSelector = () => {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState("");
  const [loading, setLoading] = useState(true);
  const [userAccess, setUserAccess] = useState(null);
  const [error, setError] = useState(null);
  const { setSchema } = useSchema();
  const map = useMap();

  // ======================================================
  // 🔹 Helper: Fetch and zoom to provincial bounds
  // ======================================================
  const fetchProvincialBoundsAndZoom = async () => {
    try {
      const res = await ApiService.get("/province/provincial-bounds");
      if (res?.status === "success" && Array.isArray(res.bounds) && res.bounds.length === 4) {
        const [xmin, ymin, xmax, ymax] = res.bounds;
        const bounds = [
          [ymin, xmin],
          [ymax, xmax]
        ];
        console.log(`🗺️ Smooth zoom to provincial bounds (${res.prov_code}):`, bounds);

        const center = [(ymin + ymax) / 2, (xmin + xmax) / 2];
        const zoom = map.getBoundsZoom(bounds, false);
        map.flyTo(center, zoom, { animate: true, duration: 1.5 });
      } else {
        console.warn("⚠️ Invalid or missing provincial bounds:", res);
      }
    } catch (err) {
      console.error("❌ Failed to fetch provincial bounds:", err);
    }
  };

  // ======================================================
  // 🔹 Load schemas from backend
  // ======================================================
  useEffect(() => {
    const loadSchemas = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await ApiService.get("/list-schemas");
        console.log("🔍 Schemas response:", data);

        if (data?.schemas) {
          setSchemas(data.schemas);
          setUserAccess(data.user_access);

          // ✅ Provincial-level zoom happens automatically if multiple schemas
          if (data.schemas.length > 1) {
            await fetchProvincialBoundsAndZoom();
          }

          // ✅ If only one schema → automatically select & zoom to municipal bounds
          if (data.schemas.length === 1) {
            const singleSchema = data.schemas[0];
            setSelectedSchema(singleSchema);
            setSchema(singleSchema);
          }

          // 🚫 Handle empty schema list
          if (data.schemas.length === 0 && data.user_access?.provincial_access) {
            setError(
              `You have access to ${data.user_access.provincial_access} but no municipal access assigned.`
            );
          }
        }
      } catch (err) {
        console.error("❌ Failed to load schemas:", err);
        if (err.response?.status === 403) {
          setError(err.response?.data?.detail || "Access pending admin approval");
        } else {
          setError("Failed to load schemas. Please try again.");
        }
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchemas();
  }, [setSchema, map]);

  // ======================================================
  // 🔹 Handle schema change (user selection)
  // ======================================================
  const handleSchemaChange = (schema) => {
    setSelectedSchema(schema);
    setSchema(schema);
  };

  // ======================================================
  // 🔹 Zoom to municipal bounds when schema changes
  // ======================================================
  useEffect(() => {
    if (!selectedSchema) return;

    const fetchBoundsAndZoom = async () => {
      try {
        const res = await ApiService.get(`/municipal-bounds?schema=${selectedSchema}`);
        if (res?.status === "success" && Array.isArray(res.bounds) && res.bounds.length === 4) {
          const [xmin, ymin, xmax, ymax] = res.bounds;
          const bounds = [
            [ymin, xmin],
            [ymax, xmax]
          ];
          console.log(`📦 Smooth zoom to bounds of ${selectedSchema}:`, bounds);

          const center = [(ymin + ymax) / 2, (xmin + xmax) / 2];
          const zoom = map.getBoundsZoom(bounds, false);
          map.flyTo(center, zoom, { animate: true, duration: 1.5 });
        } else {
          console.warn("⚠️ Bounds not found or invalid:", res);
        }
      } catch (err) {
        console.error("❌ Failed to fetch bounds:", err);
      }
    };

    fetchBoundsAndZoom();
  }, [selectedSchema, map]);

  // ✅ Expose state and handler to window for UI panel
  useEffect(() => {
    window._schemaSelectorData = {
      schemas,
      selectedSchema,
      loading,
      error,
      userAccess,
    };
  }, [schemas, selectedSchema, loading, error, userAccess]);

  useEffect(() => {
    window._handleSchemaChange = handleSchemaChange;
    return () => {
      delete window._handleSchemaChange;
      delete window._schemaSelectorData;
    };
  }, [selectedSchema]);

  return null; // No UI, logic only
};

export default SchemaSelector;