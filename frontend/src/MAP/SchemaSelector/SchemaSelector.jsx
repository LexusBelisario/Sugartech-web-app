import React, { useState, useEffect, useRef } from "react";
import { ApiService } from "../../api_service.js";
import "./SchemaSelector.css";
import { useSchema } from "../SchemaContext";
import { useMap } from "react-leaflet";   // ✅ import Leaflet map hook

const SchemaSelector = () => {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAccess, setUserAccess] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const { setSchema } = useSchema();
  const map = useMap();   // ✅ get Leaflet map instance

  useEffect(() => {
    // 🔑 Prevent Leaflet map zoom/pan when interacting with selector
    if (containerRef.current) {
      containerRef.current.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      containerRef.current.addEventListener("wheel", (e) => {
        e.stopPropagation();
      });
    }
  }, []);

  useEffect(() => {
    const loadSchemas = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await ApiService.get("/list-schemas");
        console.log("🔍 Schemas response:", data);

        // Handle the new response structure
        if (data?.schemas) {
          setSchemas(data.schemas);
          setUserAccess(data.user_access);

          if (
            data.schemas.length === 0 &&
            data.user_access?.provincial_access
          ) {
            setError(
              `You have access to ${data.user_access.provincial_access} but no municipal access assigned.`
            );
          } else if (data.schemas.length === 1) {
            const singleSchema = data.schemas[0];
            setSelectedSchema(singleSchema);
            setSchema(singleSchema);
          }
        }
      } catch (err) {
        console.error("❌ Failed to load schemas:", err);

        if (err.response?.status === 403) {
          setError(
            err.response?.data?.detail || "Access pending admin approval"
          );
        } else {
          setError("Failed to load schemas. Please try again.");
        }
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchemas();
  }, [setSchema]);

  const handleSchemaChange = (e) => {
    const schema = e.target.value;
    setSelectedSchema(schema);
    setSchema(schema);
  };

  // ✅ Zoom effect: runs whenever a schema is selected
  useEffect(() => {
    if (!selectedSchema) return;

    const fetchCentroidAndZoom = async () => {
      try {
        const res = await ApiService.get(
          `/municipal-centroid?schema=${selectedSchema}`
        );
        if (res?.status === "success") {
          const { x, y } = res;
          console.log(`📍 Zooming to centroid of ${selectedSchema}: [${y}, ${x}]`);
          map.flyTo([y, x], 12.5); // zoom level 13, adjust if needed
        } else {
          console.warn("⚠️ Centroid not found:", res);
        }
      } catch (err) {
        console.error("❌ Failed to fetch centroid:", err);
      }
    };

    fetchCentroidAndZoom();
  }, [selectedSchema, map]);

  const getButtonTitle = () => {
    if (error) return "No access";
    if (loading) return "Loading...";
    if (selectedSchema) return selectedSchema;
    return "Select Mun/City";
  };

  const formatSchemaName = (schema) => {
    if (schema.includes(", ")) {
      return schema;
    }

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

  return (
    <div className="schema-selector-container" ref={containerRef}>
      <button
        className={`schema-toggle-button ${error ? "error" : ""} ${
          selectedSchema ? "has-selection" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!error && !loading && schemas.length > 0) {
            setIsOpen((prev) => !prev);
          }
        }}
        title={getButtonTitle()}
        disabled={loading || error || schemas.length === 0}
      >
        {loading ? "⏳" : error ? "⚠️" : "📁"}
      </button>

      {isOpen && (
        <div className="schema-panel">
          <div className="schema-header">
            <h4>Select Municipality / City</h4>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {userAccess && (
            <div className="user-access-info">
              <small>
                <strong>Access Level:</strong> {userAccess.description}
              </small>
            </div>
          )}

          {schemas.length > 0 ? (
            <ul className="schema-list">
              {schemas.map((schema) => (
                <li key={schema}>
                  <label>
                    <input
                      type="radio"
                      value={schema}
                      checked={selectedSchema === schema}
                      onChange={handleSchemaChange}
                    />
                    <span className="schema-name">
                      {formatSchemaName(schema)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-schemas-message">
              <p>{error || "No schemas available"}</p>
            </div>
          )}

          {selectedSchema && (
            <div className="current-selection">
              <small>
                Current: <strong>{formatSchemaName(selectedSchema)}</strong>
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaSelector;
