import React, { useState } from "react";
import "./LinearRegression.css";
import API from "../../../api.js"; // ✅ Unified backend endpoint

const LinearRegression = ({ onClose }) => {
  const [files, setFiles] = useState([]);
  const [fields, setFields] = useState([]);
  const [independentVars, setIndependentVars] = useState([]);
  const [dependentVar, setDependentVar] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showRunModal, setShowRunModal] = useState(false);
  const [modelFile, setModelFile] = useState(null);
  const [runFiles, setRunFiles] = useState([]);

  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [selectedGraph, setSelectedGraph] = useState(null);

  // === Handle file upload ===
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    setFields([]);
    setIndependentVars([]);
    setDependentVar("");
    setResult(null);

    try {
      const hasZip = selectedFiles.some((f) => f.name.toLowerCase().endsWith(".zip"));
      const hasParts = selectedFiles.some((f) =>
        [".shp", ".dbf", ".shx", ".prj"].some((ext) => f.name.toLowerCase().endsWith(ext))
      );

      if (hasZip && hasParts) {
        alert("Please select only a single ZIP file or a complete shapefile set.");
        return;
      }

      const formData = new FormData();
      let endpoint;
      if (hasZip) {
        if (selectedFiles.length > 1) {
          alert("Multiple ZIP files detected. Please upload only one ZIP file.");
          return;
        }
        formData.append("zip_file", selectedFiles[0]);
        endpoint = `${API}/linear-regression/fields-zip`;
      } else {
        selectedFiles.forEach((f) => formData.append("shapefiles", f));
        endpoint = `${API}/linear-regression/fields`;
      }

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.fields) setFields(data.fields);
      else alert(data.error || "Unable to extract fields.");
    } catch (err) {
      console.error("Error reading shapefile fields:", err);
      alert("Error reading shapefile fields. See console for details.");
    }
  };

  // === Toggle independent variable ===
  const toggleIndependentVar = (field) => {
    setIndependentVars((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  // === Train model ===
  const handleTrainModel = async () => {
    if (files.length === 0) return alert("Please upload your shapefile or ZIP.");
    if (independentVars.length === 0) return alert("Select independent variables.");
    if (!dependentVar) return alert("Select dependent variable.");

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    let endpoint;

    if (files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
      formData.append("zip_file", files[0]);
      endpoint = `${API}/linear-regression/train-zip`;
    } else {
      files.forEach((f) => formData.append("shapefiles", f));
      endpoint = `${API}/linear-regression/train`;
    }

    formData.append("independent_vars", JSON.stringify(independentVars));
    formData.append("dependent_var", dependentVar);

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        console.error("Training error:", data);
        alert(`Error: ${data.error || res.statusText}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Training fetch error:", err);
      alert("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // === Run saved model ===
  const handleRunModel = async () => {
    if (!modelFile) return alert("Please select a .pkl model file.");
    if (runFiles.length === 0) return alert("Please upload a shapefile or ZIP.");

    const hasZip = runFiles.some((f) => f.name.toLowerCase().endsWith(".zip"));
    const hasParts = runFiles.some((f) =>
      [".shp", ".dbf", ".shx", ".prj"].some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (hasZip && hasParts) {
      alert("Multiple file types detected. Please select only a ZIP or shapefile set.");
      return;
    }

    const formData = new FormData();
    formData.append("model_file", modelFile);
    if (hasZip) formData.append("zip_file", runFiles[0]);
    else runFiles.forEach((f) => formData.append("shapefiles", f));

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API}/linear-regression/run-saved-model`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Run Model Error:", data);
        alert(`Error: ${data.error || res.statusText}`);
      } else setResult(data);
    } catch (err) {
      console.error("Run Model Fetch Error:", err);
      alert("Failed to connect to backend.");
    } finally {
      setLoading(false);
      setShowRunModal(false);
      setModelFile(null);
      setRunFiles([]);
    }
  };

  return (
    <div className="lr-overlay">
      <div className="lr-panel">
        <div className="lr-header">
          <h3>Linear Regression Tool</h3>
          <button className="lr-close" onClick={onClose}>✕</button>
        </div>

        <div className="lr-content">
          {/* === File upload === */}
          <label>Upload Shapefile (.shp, .dbf, .shx, .prj) or ZIP</label>
          <div className="file-upload">
            <input
              type="file"
              id="shpInput"
              accept=".shp,.dbf,.shx,.prj,.zip"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              className="choose-file-btn"
              onClick={() => document.getElementById("shpInput").click()}
            >
              Choose Files
            </button>
            <span className="file-name">
              {files.length > 0
                ? files.map((f) => f.name).join(", ")
                : "No files chosen"}
            </span>
          </div>

          <hr className="divider" />

          {/* === Variable selectors === */}
          <label>Independent Variables (Select multiple)</label>
          <div className="checkbox-list">
            {fields.length > 0 ? (
              fields.map((field) => (
                <label key={field} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={independentVars.includes(field)}
                    onChange={() => toggleIndependentVar(field)}
                  />
                  {field}
                </label>
              ))
            ) : (
              <p className="placeholder-text">No fields loaded yet.</p>
            )}
          </div>

          <label>Dependent Variable (Select one)</label>
          <select
            value={dependentVar}
            onChange={(e) => setDependentVar(e.target.value)}
          >
            <option value="">-- Select --</option>
            {fields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <div className="lr-buttons">
            <button className="run-btn" onClick={handleTrainModel} disabled={loading}>
              {loading ? "Training..." : "Train Model"}
            </button>
            <button
              className="run-btn secondary"
              onClick={() => setShowRunModal(true)}
              disabled={loading}
            >
              {loading ? "Processing..." : "Run Saved Model"}
            </button>
          </div>

          {/* === Model Summary === */}
          {result && (
            <div className="model-summary-box">
              <h3 className="summary-title">🧠 Model Summary</h3>
              <p className="summary-sub">
                Dependent Variable: <span>{result.dependent_var}</span>
              </p>

              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.metrics || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="coef-header">Regression Coefficients</h4>
              <table className="coef-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Coefficient</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.coefficients || {}).map(
                    ([varName, coef]) => (
                      <tr key={varName}>
                        <td>{varName}</td>
                        <td>{coef.toFixed(6)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              <p className="intercept-line">
                Intercept: {result.intercept.toFixed(6)}
              </p>

              {/* === Downloads === */}
              <div className="download-links">
                <h4>Downloads</h4>
                <ul>
                  <li><a href={result.downloads.model} target="_blank" rel="noreferrer">📦 Model (.pkl)</a></li>
                  <li><a href={result.downloads.report} target="_blank" rel="noreferrer">📄 PDF Report</a></li>
                  <li><a href={result.downloads.shapefile} target="_blank" rel="noreferrer">🗺️ Predicted Shapefile (.zip)</a></li>
                </ul>
              </div>

              <div className="graphs-button-container">
                <button
                  className="show-graphs-btn"
                  onClick={() => setShowResultsPanel(!showResultsPanel)}
                >
                  {showResultsPanel ? "Hide Graphs & Tables" : "Show Graphs & Tables"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === Graphs Modal === */}
      {showResultsPanel && result && (
        <div className="graphs-modal">
          <div className="graphs-modal-content">
            <button className="graphs-close" onClick={() => setShowResultsPanel(false)}>✕</button>

            <h2 className="graphs-title">📊 Linear Regression Results</h2>
            <p className="graphs-subtitle">
              Model performance overview, feature importance, and data diagnostics
            </p>

            {/* === Graphs Grid === */}
            <div className="graphs-grid">
              {result.plots ? (
                Object.entries(result.plots).map(([key, value]) => (
                  <div
                    key={key}
                    className="graph-card"
                    onClick={() => setSelectedGraph({ title: key.replace(/_/g, " "), src: value })}
                  >
                    <h4>{key.replace(/_/g, " ")}</h4>
                    <img src={value} alt={key} loading="lazy" />
                  </div>
                ))
              ) : (
                <p className="placeholder-text">
                  No graph data available. Please train a model first.
                </p>
              )}
            </div>

            {/* === CAMA TABLE PREVIEW === */}
            {result.cama_preview && (
              <div className="cama-preview-modal">
                <h3 className="cama-header-modal">🏠 CAMA Attribute Table (Preview)</h3>
                <p className="graphs-subtitle">
                  Below is a sample (first 10 rows). Click any column name to see its data distribution.
                </p>

                <div className="cama-table-wrapper-modal">
                  <table className="cama-table-modal">
                    <thead>
                      <tr>
                        {Object.keys(result.cama_preview[0] || {}).map((col) => (
                          <th
                            key={col}
                            className={col === "prediction" ? "prediction-col" : ""}
                            onClick={() => {
                              if (result.distributions && result.distributions[col]) {
                                setSelectedGraph({
                                  title: `Distribution of ${col}`,
                                  src: result.distributions[col],
                                });
                              }
                            }}
                            style={{
                              cursor:
                                result.distributions && result.distributions[col]
                                  ? "pointer"
                                  : "default",
                            }}
                          >
                            {col}
                            {result.distributions && result.distributions[col] && (
                              <span style={{ fontSize: "12px", color: "#00ff9d" }}>
                                &nbsp;📊
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.cama_preview.map((row, i) => (
                        <tr key={i}>
                          {Object.entries(row).map(([col, val], j) => (
                            <td
                              key={j}
                              className={col === "prediction" ? "prediction-col" : ""}
                            >
                              {val !== "" ? val : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ✅ Download CSV Button */}
                <div className="cama-download-container">
                  <a
                    className="download-csv-btn"
                    href={result.downloads.cama_csv}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ⬇️ Download Full CAMA Table ({result.lgu_name || "CSV"})
                  </a>
                </div>
              </div>
            )}

            {/* === Fullscreen Graph Viewer === */}
            {selectedGraph && (
              <div className="graph-viewer-overlay" onClick={() => setSelectedGraph(null)}>
                <div className="graph-viewer-box" onClick={(e) => e.stopPropagation()}>
                  <button className="graph-viewer-close" onClick={() => setSelectedGraph(null)}>✕</button>
                  <h3>{selectedGraph.title}</h3>
                  <img src={selectedGraph.src} alt={selectedGraph.title} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Run Saved Model Modal === */}
      {showRunModal && (
        <div className="lr-modal">
          <div className="lr-modal-content">
            <h4>Run Saved Model</h4>
            <label>Upload Model (.pkl)</label>
            <input type="file" accept=".pkl" onChange={(e) => setModelFile(e.target.files[0])} />

            <label>Upload Shapefile (.zip or .shp/.dbf/.shx/.prj)</label>
            <input
              type="file"
              accept=".zip,.shp,.dbf,.shx,.prj"
              multiple
              onChange={(e) => setRunFiles(Array.from(e.target.files))}
            />

            <div className="lr-modal-buttons">
              <button onClick={handleRunModel} disabled={loading}>
                {loading ? "Running..." : "Run"}
              </button>
              <button className="cancel-btn" onClick={() => setShowRunModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinearRegression;
