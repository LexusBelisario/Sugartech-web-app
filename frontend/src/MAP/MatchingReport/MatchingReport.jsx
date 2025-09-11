import React, { useState, useEffect } from "react";

const ExactMismatchChecker = ({ onClose }) => {
  const [schemas, setSchemas] = useState([]);
  const [sourceSchema, setSourceSchema] = useState("");
  const [targetSchema, setTargetSchema] = useState("");
  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [sourceTable, setSourceTable] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [columns, setColumns] = useState(["barangay", "section"]);
  const [columnInput, setColumnInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/schemas-ui")
      .then((res) => res.json())
      .then(setSchemas)
      .catch((err) => {
        console.error("❌ Failed to load schemas:", err);
        setSchemas([]);
      });
  }, []);

  useEffect(() => {
    if (sourceSchema) {
      fetch(`http://localhost:8000/tables?schema=${encodeURIComponent(sourceSchema)}`)
        .then((res) => res.json())
        .then(setSourceTables)
        .catch((err) => {
          console.error("❌ Failed to load source tables:", err);
          setSourceTables([]);
        });
    }
  }, [sourceSchema]);

  useEffect(() => {
    if (targetSchema) {
      fetch(`http://localhost:8000/tables?schema=${encodeURIComponent(targetSchema)}`)
        .then((res) => res.json())
        .then(setTargetTables)
        .catch((err) => {
          console.error("❌ Failed to load target tables:", err);
          setTargetTables([]);
        });
    }
  }, [targetSchema]);

  const fetchMismatches = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        schema: sourceSchema,
        source_table: sourceTable,
        target_table: targetTable,
      });
      columns.forEach(col => query.append("columns", col));

      const res = await fetch(`http://localhost:8000/exact-mismatch?${query.toString()}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Failed to fetch mismatches:", error);
      setResults([]);
    }
    setLoading(false);
  };

  const addColumn = () => {
    const clean = columnInput.trim();
    if (clean && !columns.includes(clean)) {
      setColumns([...columns, clean]);
    }
    setColumnInput("");
  };

  const removeColumn = (col) => {
    setColumns(columns.filter((c) => c !== col));
  };

  const downloadCSV = () => {
    const csvHeader = ["PIN", "Mismatched Fields", "Source Values", "Target Values"];
    const csvRows = results.map((row) => [
      row.pin,
      row.mismatched_fields.join(", "),
      JSON.stringify(row.source_values),
      JSON.stringify(row.target_values),
    ]);
    const csv = [csvHeader, ...csvRows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mismatches.csv";
    link.click();
  };

  return (
    <div className="tmcr-sidebar">
      <div className="tabs">
        <h2>Matching Report</h2>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>

      <div className="tmcr-content">
        <p>Mismatches found: <strong>{results.length}</strong></p>

        <div className="form-row">
          <select value={sourceSchema} onChange={(e) => { setSourceSchema(e.target.value); setSourceTable(""); }}>
            <option value="">-- Source Schema --</option>
            {schemas.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={sourceTable} onChange={(e) => setSourceTable(e.target.value)} disabled={!sourceSchema}>
            <option value="">-- Source Table --</option>
            {sourceTables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-row">
          <select value={targetSchema} onChange={(e) => { setTargetSchema(e.target.value); setTargetTable(""); }}>
            <option value="">-- Target Schema --</option>
            {schemas.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={targetTable} onChange={(e) => setTargetTable(e.target.value)} disabled={!targetSchema}>
            <option value="">-- Target Table --</option>
            {targetTables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="dropdown-row">
          <label>Columns to Compare:</label><br />
          <input
            value={columnInput}
            onChange={(e) => setColumnInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
            placeholder="Type column name and press Enter"
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              width: "100%",
              marginBottom: "10px",
              fontSize: "14px",
            }}
          />
          <div>
            {columns.map((col) => (
              <span key={col} style={{
                backgroundColor: "#e0e0e0",
                borderRadius: "20px",
                padding: "5px 10px",
                marginRight: "6px",
                marginBottom: "4px",
                display: "inline-flex",
                alignItems: "center"
              }}>
                <code>{col}</code>
                <button onClick={() => removeColumn(col)} style={{
                  background: "none",
                  border: "none",
                  marginLeft: "6px",
                  cursor: "pointer",
                  color: "#900"
                }}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-row">
          <button className="set-table-btn" onClick={fetchMismatches}>
            Mismatch Check
          </button>
          {results.length > 0 && (
            <button className="set-table-btn" style={{ backgroundColor: "#1c87c9" }} onClick={downloadCSV}>
              Download CSV
            </button>
          )}
        </div>

        {loading ? (
          <p>⏳ Loading...</p>
        ) : results.length > 0 ? (
          <table style={{ marginTop: "10px", borderCollapse: "collapse", width: "100%", fontSize: "14px" }}>
            <thead style={{ backgroundColor: "#f4f4f4" }}>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>PIN</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Mismatched Fields</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Source Values</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Target Values</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ border: "1px solid #ccc", padding: "6px" }}>{r.pin}</td>
                  <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                    {r.target_values && Object.values(r.target_values).every(v => v === null)
                      ? "Missing in target"
                      : r.mismatched_fields.join(", ")}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "6px", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(r.source_values, null, 2)}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "6px", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(r.target_values, null, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <p>No mismatches found.</p>
        )}
      </div>
    </div>
  );
};

export default ExactMismatchChecker;
