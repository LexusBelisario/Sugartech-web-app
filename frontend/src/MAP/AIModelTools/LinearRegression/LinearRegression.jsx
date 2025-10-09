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

  // === Modal states ===
  const [showRunModal, setShowRunModal] = useState(false);
  const [modelFile, setModelFile] = useState(null);
  const [runFiles, setRunFiles] = useState([]);

  // === Handle upload (either .zip or .shp/.dbf/.shx/.prj) ===
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
      if (hasZip) {
        if (selectedFiles.length > 1) {
          alert("Multiple ZIP files detected. Please upload only one ZIP file.");
          return;
        }
        formData.append("zip_file", selectedFiles[0]);
        var endpoint = `${API}/linear-regression/fields-zip`;
      } else {
        selectedFiles.forEach((f) => formData.append("shapefiles", f));
        var endpoint = `${API}/linear-regression/fields`;
      }

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.fields) {
        setFields(data.fields);
      } else {
        alert(data.error || "Unable to extract fields.");
      }
    } catch (err) {
      console.error("Error reading shapefile fields:", err);
      alert("Error reading shapefile fields. See console for details.");
    }
  };

  // === Toggle independent variable selection ===
  const toggleIndependentVar = (field) => {
    setIndependentVars((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  // === Train Model ===
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
      } else setResult(data);
    } catch (err) {
      console.error("Training fetch error:", err);
      alert("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // === Run Saved Model ===
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
            <button className="choose-file-btn" onClick={() => document.getElementById("shpInput").click()}>
              Choose Files
            </button>
            <span className="file-name">
              {files.length > 0 ? files.map((f) => f.name).join(", ") : "No files chosen"}
            </span>
          </div>

          <hr className="divider" />

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
            <button className="run-btn secondary" onClick={() => setShowRunModal(true)} disabled={loading}>
              {loading ? "Processing..." : "Run Saved Model"}
            </button>
          </div>

          {result && (
            <div className="lr-results">
              <h4>Results</h4>
              {result.error ? (
                <p style={{ color: "red" }}>{result.error}</p>
              ) : (
                <>
                  {result.metrics && <pre>{JSON.stringify(result.metrics, null, 2)}</pre>}
                  {result.record_count && <p><strong>Records processed:</strong> {result.record_count}</p>}
                  {result.downloads && (
                    <div className="download-links">
                      <h4>Downloads</h4>
                      <ul>
                        {result.downloads.model && (
                          <li><a href={result.downloads.model} target="_blank">📦 Model (.pkl)</a></li>
                        )}
                        {result.downloads.report && (
                          <li><a href={result.downloads.report} target="_blank">📄 PDF Report</a></li>
                        )}
                        {result.downloads.shapefile && (
                          <li><a href={result.downloads.shapefile} target="_blank">🗺️ Predicted Shapefile (.zip)</a></li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
