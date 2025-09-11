import React, { useState, useEffect } from "react";
import TMCRReport from "./TMCRadditional.jsx"; // Adjust path if needed
import "./TMCR.css";

function BarangaySectionTable({ onClose }) {
  const [selectedSchema, setSelectedSchema] = useState("");
  const [table, setTable] = useState("");
  const [barangays, setBarangays] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [parcels, setParcels] = useState([]);
  const [availableSchemas, setAvailableSchemas] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    fetchAvailableSchemas();
    return () => {
    };
  }, []);

  useEffect(() => {
    const toolbar = document.getElementById("mainToolbar");
    if (toolbar) toolbar.style.display = "none";
    return () => {
      if (toolbar) toolbar.style.display = "block";
    };
  }, []);

  const fetchAvailableSchemas = async () => {
    try {
      const res = await fetch("http://localhost:8000/available-tables");
      const result = await res.json();
      if (result.status === "success") {
        const schemas = [...new Set(result.data.map(tbl => tbl.split(".")[0]))];
        setAvailableSchemas(schemas);
        setAvailableTables(result.data);
      } else {
        console.error("⛔ Error fetching tables:", result.message);
      }
    } catch (err) {
      console.error("❌ Failed to fetch tables:", err);
    }
  };

  const handleSetTable = async () => {
    if (!selectedSchema || !table) {
      alert("Please select both schema and table.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/set-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: selectedSchema, tableName: table }),
      });
      const result = await res.json();

      if (result.status === "success") {
        console.log("✅ Table set:", `${selectedSchema}.${table}`);
        fetchBarangays();
        setSelectedBarangay("");
        setSelectedSection("");
        setParcels([]);
      } else {
        console.error("⛔ Error:", result.message);
      }
    } catch (err) {
      console.error("❌ Failed to set table:", err);
    }
  };

  const fetchBarangays = async () => {
    try {
      const res = await fetch("http://localhost:8000/unique-values?column=barangay");
      const result = await res.json();

      if (result.status === "success") {
        setBarangays(result.data);
      } else {
        console.error("⛔ Error fetching barangays:", result.message);
      }
    } catch (err) {
      console.error("❌ Fetch barangays failed:", err);
    }
  };

  useEffect(() => {
    if (!selectedBarangay) return;

    const fetchSections = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/sections-by-barangay?barangay=${encodeURIComponent(selectedBarangay)}`
        );
        const result = await res.json();

        if (result.status === "success") {
          setSections(result.data);
        } else {
          console.error("⛔ Error fetching sections:", result.message);
        }
      } catch (err) {
        console.error("❌ Fetch sections failed:", err);
      }
    };

    fetchSections();
  }, [selectedBarangay]);

  useEffect(() => {
    if (!selectedBarangay || !selectedSection) return;

    const fetchParcels = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/parcels?barangay=${encodeURIComponent(selectedBarangay)}&section=${encodeURIComponent(selectedSection)}`
        );
        const result = await res.json();

        if (result.status === "success") {
          console.log("📦 Received Parcels:", result.data);
          setParcels(result.data);
        } else {
          console.error("⛔ Error fetching parcels:", result.message);
        }
      } catch (err) {
        console.error("❌ Fetch parcels failed:", err);
      }
    };

    fetchParcels();
  }, [selectedBarangay, selectedSection]);

  const filteredTables = availableTables
    .filter(tbl => tbl.startsWith(selectedSchema + "."))
    .map(tbl => tbl.split(".")[1]);

  const province = parcels[0]?.province || "";
  const municipal = parcels[0]?.municipal || "";

  return (
    <div className="tmcr-sidebar">
  <div className="tabs">
    <span className="tabs-title"><h2>TMCR Report</h2></span>
    <button className="close-btn" onClick={onClose}>CLOSE</button>
  </div>

  <div className="tmcr-content">
    
    {/* Schema & Table Select + Button Row */}
    <div className="form-row">
      <select
        value={selectedSchema}
        onChange={(e) => {
          setSelectedSchema(e.target.value);
          setTable("");
        }}
      >
        <option value="">Select schema...</option>
        {availableSchemas.map((schema, idx) => (
          <option key={idx} value={schema}>{schema}</option>
        ))}
      </select>

      <select
        value={table}
        onChange={(e) => setTable(e.target.value)}
        disabled={!selectedSchema}
      >
        <option value="">Select table...</option>
        {filteredTables.map((tbl, idx) => (
          <option key={idx} value={tbl}>{tbl}</option>
        ))}
      </select>

      <button
        className="set-table-btn"
        onClick={handleSetTable}
      >
        Set Table
      </button>
    </div>

    {/* Barangay Dropdown */}
    {barangays.length > 0 && (
      <div className="dropdown-row">
        <select
          value={selectedBarangay}
          onChange={(e) => setSelectedBarangay(e.target.value)}
        >
          <option value="">Select Barangay</option>
          {barangays.map((brgy, idx) => (
            <option key={idx} value={brgy}>{brgy}</option>
          ))}
        </select>
      </div>
    )}

    {/* Section Dropdown */}
    {sections.length > 0 && (
      <div className="dropdown-row">
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
        >
          <option value="">Select Section</option>
          {sections.map((sec, idx) => (
            <option key={idx} value={sec}>{sec}</option>
          ))}
        </select>
      </div>
    )}

    {/* TMCR Report */}
    {parcels.length > 0 && (
      <TMCRReport tableRows={parcels} />
    )}

  </div>
</div>
  );
};

export default BarangaySectionTable;
