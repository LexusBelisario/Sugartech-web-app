import React, { useState, useEffect, useRef } from "react";
import { ApiService } from "../../api"; // ✅ use ApiService for auth-aware calls
import "./SchemaSelector.css";
import { useSchema } from "../SchemaContext";

const SchemaSelector = () => {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
        const data = await ApiService.get("/list-schemas");
        console.log("🔍 Raw schemas response:", data);

        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data?.schemas) {
          list = data.schemas;
        } else if (data?.data) {
          list = data.data;
        }

        const exclude = [
          "pg_catalog",
          "information_schema",
          "extensions",
          "pgbouncer",
          "realtime",
          "vault",
          "graphql",
          "graphql_public",
          "auth",
          "storage"
        ];

        list = list.filter(
          (schema) =>
            !schema.startsWith("pg_") &&
            !schema.startsWith("pg_toast") &&
            !exclude.includes(schema)
        );

        console.log("✅ Filtered schemas:", list);
        setSchemas(list);
      } catch (err) {
        console.error("❌ Failed to load schemas:", err);
      }
    };

    loadSchemas();
  }, []);

  const handleSchemaChange = (e) => {
    const schema = e.target.value;
    setSelectedSchema(schema);
    setSchema(schema); // ✅ update global schema context
  };

  return (
    <div className="schema-selector-container" ref={containerRef}>
      <button
        className="schema-toggle-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Select Mun/City"
      >
        📁
      </button>

      {isOpen && (
        <div className="schema-panel">
          <h4>Select Municipality / City</h4>
          <ul>
            {schemas.map((schema) => (
              <li key={schema}>
                <label>
                  <input
                    type="radio"
                    value={schema}
                    checked={selectedSchema === schema}
                    onChange={handleSchemaChange}
                  />
                  {schema}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SchemaSelector;
