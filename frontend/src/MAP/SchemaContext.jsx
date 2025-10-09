import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../api.js";

const SchemaContext = createContext();

export const SchemaProvider = ({ children }) => {
  // ============================================================
  // 🔹 Core State
  // ============================================================
  const [schema, setSchema] = useState(null);             // Active municipal schema (e.g. PH0403406_Calauan)
  const [attributeData, setAttributeData] = useState([]); // Cached JoinedTable
  const [attributeStatus, setAttributeStatus] = useState("idle"); // idle | loading | success | error

  // ============================================================
  // 🧠 Automatically fetch JoinedTable when schema changes
  // ============================================================
  useEffect(() => {
    if (!schema) {
      setAttributeData([]);
      setAttributeStatus("idle");
      return;
    }

    const fetchJoinedTable = async () => {
      console.log(`📡 Fetching JoinedTable for schema: ${schema}`);
      setAttributeStatus("loading");

      try {
        const res = await fetch(`${API}/attribute-table?schema=${schema}`);
        const json = await res.json();

        if (json.status === "success" && Array.isArray(json.data)) {
          setAttributeData(json.data);
          setAttributeStatus("success");
          console.log(`✅ JoinedTable loaded successfully (${json.data.length} records)`);
        } else {
          console.warn(`⚠️ Failed to load JoinedTable for ${schema}`);
          setAttributeStatus("error");
        }
      } catch (err) {
        console.error(`❌ Error fetching JoinedTable for ${schema}:`, err);
        setAttributeStatus("error");
      }
    };

    fetchJoinedTable();
  }, [schema]);

  // ============================================================
  // 🔄 Manual reload function (optional use by other components)
  // ============================================================
  const reloadAttributeData = async () => {
    if (!schema) return;
    console.log(`🔁 Reloading JoinedTable for schema: ${schema}`);
    setAttributeStatus("loading");

    try {
      const res = await fetch(`${API}/attribute-table?schema=${schema}`);
      const json = await res.json();

      if (json.status === "success" && Array.isArray(json.data)) {
        setAttributeData(json.data);
        setAttributeStatus("success");
        console.log(`✅ JoinedTable reloaded (${json.data.length} records)`);
      } else {
        setAttributeStatus("error");
      }
    } catch (err) {
      console.error("❌ Reload error:", err);
      setAttributeStatus("error");
    }
  };

  // ============================================================
  // 🧩 Provide values globally
  // ============================================================
  return (
    <SchemaContext.Provider
      value={{
        schema,
        setSchema,
        attributeData,
        attributeStatus,
        reloadAttributeData,
      }}
    >
      {children}
    </SchemaContext.Provider>
  );
};

// Hook for any component to access the schema and attribute table
export const useSchema = () => useContext(SchemaContext);
