import React, { useState, useEffect, useRef } from "react";
import { ApiService } from "../../api";
import "./SchemaSelector.css";
import { useSchema } from "../SchemaContext";

const SchemaSelector = () => {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAccess, setUserAccess] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const { setSchema } = useSchema();

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

          // If user has access but no schemas (municipal_access is NULL)
          if (
            data.schemas.length === 0 &&
            data.user_access?.provincial_access
          ) {
            setError(
              `You have access to ${data.user_access.provincial_access} but no municipal access assigned.`
            );
          }

          // If user only has access to one schema, auto-select it
          else if (data.schemas.length === 1) {
            const singleSchema = data.schemas[0];
            setSelectedSchema(singleSchema);
            setSchema(singleSchema);
          }
        }
      } catch (err) {
        console.error("❌ Failed to load schemas:", err);

        // Handle 403 forbidden (pending approval)
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

  const getButtonTitle = () => {
    if (error) return "No access";
    if (loading) return "Loading...";
    if (selectedSchema) return selectedSchema;
    return "Select Mun/City";
  };

  const formatSchemaName = (schema) => {
    // Handle comma format (already formatted)
    if (schema.includes(", ")) {
      return schema;
    }

    // Convert underscore format to comma format
    // e.g., "calauan_laguna" -> "Calauan, Laguna"
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

          {/* Show user access info */}
          {userAccess && (
            <div className="user-access-info">
              <small>
                <strong>Access Level:</strong> {userAccess.description}
              </small>
            </div>
          )}

          {/* Show schemas list or message */}
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

          {/* Show current selection */}
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
