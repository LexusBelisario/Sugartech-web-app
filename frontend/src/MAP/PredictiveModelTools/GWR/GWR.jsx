import React, { useState } from "react";
import "../LinearRegression/LinearRegression.css"; // ✅ Reuse same styling
import API from "../../../api.js";
import Plot from "react-plotly.js";
import PredictedMapModal from "../PredictedMapModal.jsx";

const GWR = ({ onClose }) => {
  const [files, setFiles] = useState([]);
  const [fields, setFields] = useState([]);
  const [independentVars, setIndependentVars] = useState([]);
  const [dependentVar, setDependentVar] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [modelFile, setModelFile] = useState(null);
  const [runFiles, setRunFiles] = useState([]);
  const [showPredictedMap, setShowPredictedMap] = useState(false);
  const [previewPath, setPreviewPath] = useState(null);
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [fullscreenGraph, setFullscreenGraph] = useState(null);

  // ==========================================================
  // 🗂️ Handle shapefile field extraction
  // ==========================================================
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    setFields([]);
    setIndependentVars([]);
    setDependentVar("");
    setResult(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("shapefiles", f));

      const res = await fetch(`${API}/gwr/fields`, { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok && data.fields) setFields(data.fields);
      else alert(data.error || "Unable to extract fields.");
    } catch (err) {
      console.error("Error reading shapefile fields:", err);
      alert("Error reading shapefile fields. See console for details.");
    }
  };

  // ==========================================================
  // ⚙️ Train Model
  // ==========================================================
  const handleTrainModel = async () => {
    if (files.length === 0) return alert("Please upload a shapefile.");
    if (independentVars.length === 0) return alert("Select independent variables.");
    if (!dependentVar) return alert("Select dependent variable.");

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("shapefiles", f));
      formData.append("independent_vars", JSON.stringify(independentVars));
      formData.append("dependent_var", dependentVar);

      const res = await fetch(`${API}/gwr/train`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        console.error("Training error:", data);
        alert(`Error: ${data.error || res.statusText}`);
      } else {
        setResult(data);
        alert("✅ GWR model training completed!");
      }
    } catch (err) {
      console.error("Training fetch error:", err);
      alert("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // 🧠 Run Saved Model
  // ==========================================================
  const handleRunModel = async () => {
    if (!modelFile) return alert("Please select a saved model (.joblib)");
    if (runFiles.length === 0) return alert("Please upload a shapefile to predict.");

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("model_file", modelFile);
      runFiles.forEach((f) => formData.append("shapefiles", f));

      const res = await fetch(`${API}/gwr/run-saved-model`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        console.error("Run Model Error:", data);
        alert(`Error: ${data.error || res.statusText}`);
      } else {
        setResult(data);
        alert("✅ Prediction completed!");
      }
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

  const toggleIndependentVar = (field) => {
    setIndependentVars((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // ==========================================================
  // 🎨 Plot Layout Configs
  // ==========================================================
  const plotConfig = (filename) => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    scrollZoom: true,
    toImageButtonOptions: { format: "png", filename },
    modeBarButtonsToRemove: ["select2d", "lasso2d"],
  });

  const plotLayoutBase = {
    paper_bgcolor: "#000",
    plot_bgcolor: "#000",
    font: { color: "white" },
    hoverlabel: { bgcolor: "#111", bordercolor: "#00ff9d", font: { color: "white" } },
    margin: { l: 60, r: 30, t: 60, b: 60 },
  };

  return (
    <div className="lr-overlay">
      <div className="lr-panel">
        <div className="lr-header">
          <h3>Geographically Weighted Regression (GWR)</h3>
          <button className="lr-close" onClick={onClose}>✕</button>
        </div>

        <div className="lr-content">
          {/* === File Upload === */}
          <label>Upload Shapefile (.shp, .dbf, .shx, .prj)</label>
          <div className="file-upload">
            <input
              type="file"
              id="gwrShpInput"
              accept=".shp,.dbf,.shx,.prj,.zip"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              className="choose-file-btn"
              onClick={() => document.getElementById("gwrShpInput").click()}
            >
              📂 Select Files
            </button>

            <span className="file-name">
              {files.length > 0
                ? files.map((f) => f.name).join(", ")
                : "No files selected"}
            </span>
          </div>

          <hr className="divider" />

          {/* === Variable Selection === */}
          <label>Independent Variables</label>
          <div className="checkbox-list">
            {fields.length > 0 ? (
              fields.map((f) => (
                <label key={f} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={independentVars.includes(f)}
                    onChange={() => toggleIndependentVar(f)}
                  />
                  {f}
                </label>
              ))
            ) : (
              <p className="placeholder-text">No fields loaded yet.</p>
            )}
          </div>

          <label>Dependent Variable</label>
          <select value={dependentVar} onChange={(e) => setDependentVar(e.target.value)}>
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
              Run Saved Model
            </button>
          </div>

          {/* === Model Results === */}
          {result && (
            <div className="model-summary-box">
              <h3 className="summary-title">🧠 Model Summary</h3>
              {result.metrics && (
                <table className="summary-table">
                  <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                  <tbody>
                    {Object.entries(result.metrics).map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v.toFixed ? v.toFixed(6) : v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h4>Dropped Variables</h4>
              <ul>
                {result.dropped_vars?.length > 0
                  ? result.dropped_vars.map((v) => <li key={v}>{v}</li>)
                  : <li>None</li>}
              </ul>

              {/* === Download Links === */}
              <div className="download-links">
                <h4>Downloads</h4>
                <ul>
                  {result.downloads?.model && (
                    <li><a href={result.downloads.model} download target="_blank" rel="noreferrer">📦 Model (.joblib)</a></li>
                  )}
                  {result.downloads?.report && (
                    <li><a href={result.downloads.report} download target="_blank" rel="noreferrer">📄 PDF Report</a></li>
                  )}
                  {result.downloads?.shapefile && (
                    <li><a href={result.downloads.shapefile} download target="_blank" rel="noreferrer">🗺️ Predicted Shapefile (.zip)</a></li>
                  )}
                </ul>
              </div>

              {/* === Show Graphs Button === */}
              <div className="graphs-button-container">
                <button
                  className="show-graphs-btn"
                  onClick={() => setShowResultsPanel(!showResultsPanel)}
                >
                  {showResultsPanel ? "Hide Graphs & Tables" : "Show Graphs & Tables"}
                </button>
              </div>

              {result.downloads?.shapefile && (
                <button
                  className="show-graphs-btn"
                  style={{ backgroundColor: "#00bcd4", marginTop: "10px" }}
                  onClick={() => {
                    setPreviewPath(
                      `${API}/gwr/preview-geojson?file_path=${encodeURIComponent(result.downloads.shapefile)}`
                    );
                    setShowPredictedMap(true);
                  }}
                >
                  Show Predicted Values in the Map
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === Graphs Modal === */}
      {showResultsPanel && result && (
        <div className="graphs-modal">
          <div className="graphs-modal-content">
            <button className="graphs-close" onClick={() => setShowResultsPanel(false)}>✕</button>
            <h2 className="graphs-title">📊 GWR Diagnostics</h2>
            <p className="graphs-subtitle">Coefficient Distribution & Residual Analysis</p>

            <div className="graphs-grid">
              {result.params && (
                <div className="graph-card" onClick={() => setFullscreenGraph("coefficients")}>
                  <h4>Coefficient Magnitudes</h4>
                  <Plot
                    data={[
                      { x: Object.keys(result.params),
                        y: Object.values(result.params),
                        type: "bar", marker: { color: "#00ff9d" } },
                    ]}
                    layout={{ ...plotLayoutBase, title: "Variable Coefficients" }}
                    config={plotConfig("coefficients")}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Fullscreen Chart === */}
      {fullscreenGraph && (
        <div className="graph-viewer-overlay" onClick={() => setFullscreenGraph(null)}>
          <div className="graph-viewer-box" onClick={(e) => e.stopPropagation()}>
            <button className="graph-viewer-close" onClick={() => setFullscreenGraph(null)}>✕</button>
            <h3 style={{ color: "#00ff9d" }}>Variable Coefficients</h3>
            <Plot
              data={[
                { x: Object.keys(result.params),
                  y: Object.values(result.params),
                  type: "bar", marker: { color: "#00ff9d" } },
              ]}
              layout={{ ...plotLayoutBase, title: "Variable Coefficients (Fullscreen)" }}
              config={plotConfig("coefficients_full")}
              useResizeHandler
              style={{ width: "100%", height: "80vh" }}
            />
          </div>
        </div>
      )}

      {/* === Run Model Modal === */}
        {showRunModal && (
        <div className="lr-modal" onClick={() => setShowRunModal(false)}>
            <div className="lr-modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Run Saved GWR Model</h4>

            <label>Upload Model (.joblib)</label>
            <input
                type="file"
                accept=".joblib"
                onChange={(e) => setModelFile(e.target.files[0])}
            />

            <label>Upload Shapefile (.shp/.dbf/.shx/.prj)</label>
            <input
                type="file"
                multiple
                accept=".shp,.dbf,.shx,.prj"
                onChange={(e) => setRunFiles(Array.from(e.target.files))}
            />

            <div className="lr-modal-buttons">
                <button onClick={handleRunModel} disabled={loading}>
                {loading ? "Running..." : "Run Model"}
                </button>
                <button className="cancel-btn" onClick={() => setShowRunModal(false)}>
                Cancel
                </button>
            </div>

            {/* ✅ Show results below after running */}
            {result && result.downloads && (
                <div className="run-results-box">
                <h4>Downloads</h4>
                <ul>
                    <li>
                    <a
                        href={result.downloads.shapefile}
                        download
                        target="_blank"
                        rel="noreferrer"
                    >
                        🗺️ Predicted Shapefile (.zip)
                    </a>
                    </li>
                </ul>

                <button
                    className="show-graphs-btn"
                    style={{ backgroundColor: "#00bcd4", marginTop: "10px" }}
                    onClick={() => {
                    setPreviewPath(result.downloads.preview);
                    setShowPredictedMap(true);
                    }}
                >
                    Show Predicted Values in the Map
                </button>
                </div>
            )}
            </div>
        </div>
        )}

      {showPredictedMap && (
        <PredictedMapModal
          onClose={() => setShowPredictedMap(false)}
          geojsonUrl={previewPath}
        />
      )}
    </div>
  );
};

export default GWR;
