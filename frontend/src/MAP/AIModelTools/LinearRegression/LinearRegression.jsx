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

  // === Handle upload (either .zip or .shp/.dbf/.shx/.prj) ===
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    // 🧹 Reset previous state
    setFiles([]);
    setFields([]);
    setIndependentVars([]);
    setDependentVar("");
    setResult(null);

    setFiles(selectedFiles);

    try {
      // === Check for file type mix (ZIP + shapefile components)
      const hasZip = selectedFiles.some((f) => f.name.toLowerCase().endsWith(".zip"));
      const hasShapefileParts = selectedFiles.some((f) =>
        [".shp", ".dbf", ".shx", ".prj"].some((ext) => f.name.toLowerCase().endsWith(ext))
      );

      if (hasZip && hasShapefileParts) {
        alert("Multiple file types detected. Please select only a single ZIP file or a complete set of shapefile components.");
        return;
      }

      // === Case 1: Single ZIP upload ===
      if (hasZip) {
        if (selectedFiles.length > 1) {
          alert("Multiple ZIP files detected. Please upload only one ZIP file.");
          return;
        }

        const formData = new FormData();
        formData.append("zip_file", selectedFiles[0]);
        const res = await fetch(`${API}/linear-regression/fields-zip`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.fields) {
          setFields(data.fields);
        } else {
          alert(data.error || "Unable to extract fields from ZIP file.");
        }
        return;
      }

      // === Case 2: Individual shapefile components ===
      const validExts = [".shp", ".dbf", ".shx", ".prj"];
      const fileMap = {};

      selectedFiles.forEach((f) => {
        const name = f.name.toLowerCase();
        const ext = name.substring(name.lastIndexOf("."));
        const base = name.replace(ext, "");
        if (validExts.includes(ext)) {
          if (!fileMap[base]) fileMap[base] = [];
          fileMap[base].push(ext);
        }
      });

      const baseNames = Object.keys(fileMap);
      if (baseNames.length === 0) {
        alert("No shapefile components detected.");
        return;
      }
      if (baseNames.length > 1) {
        alert("Multiple shapefile base names detected. Please upload only one complete shapefile set.");
        return;
      }

      const requiredExts = [".shp", ".dbf", ".shx", ".prj"];
      const uploadedExts = fileMap[baseNames[0]];
      const missing = requiredExts.filter((ext) => !uploadedExts.includes(ext));
      if (missing.length > 0) {
        alert(`Incomplete shapefile. Missing: ${missing.join(", ")}`);
        return;
      }

      for (const ext of requiredExts) {
        const duplicates = selectedFiles.filter((f) => f.name.toLowerCase().endsWith(ext));
        if (duplicates.length > 1) {
          alert(`Duplicate ${ext} files detected. Please upload only one of each shapefile component.`);
          return;
        }
      }

      // === Fetch fields ===
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("shapefiles", f));
      const res = await fetch(`${API}/linear-regression/fields`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.fields) {
        setFields(data.fields);
      } else {
        alert(data.error || "Unable to extract fields from shapefile components.");
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

    // Handle ZIP vs multiple files
    if (files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
      formData.append("zip_file", files[0]);
      formData.append("independent_vars", JSON.stringify(independentVars));
      formData.append("dependent_var", dependentVar);
      var endpoint = `${API}/linear-regression/train-zip`;
    } else {
      files.forEach((f) => formData.append("shapefiles", f));
      formData.append("independent_vars", JSON.stringify(independentVars));
      formData.append("dependent_var", dependentVar);
      var endpoint = `${API}/linear-regression/train`;
    }

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
      alert("Failed to connect to backend. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // === Run Saved Model ===
  const handleRunSavedModel = async () => {
    try {
      // Step 1: Select PKL file
      const pklInput = document.createElement("input");
      pklInput.type = "file";
      pklInput.accept = ".pkl";
      pklInput.click();

      pklInput.onchange = async (e) => {
        const pklFile = e.target.files[0];
        if (!pklFile) return alert("Please select a .pkl file.");

        // Step 2: Select Shapefile or ZIP
        const shpInput = document.createElement("input");
        shpInput.type = "file";
        shpInput.accept = ".zip,.shp,.dbf,.shx,.prj";
        shpInput.multiple = true;
        shpInput.click();

        shpInput.onchange = async (e2) => {
          const selectedFiles = Array.from(e2.target.files);
          if (selectedFiles.length === 0) return;

          // Validation
          const hasZip = selectedFiles.some((f) => f.name.toLowerCase().endsWith(".zip"));
          const hasParts = selectedFiles.some((f) =>
            [".shp", ".dbf", ".shx", ".prj"].some((ext) => f.name.toLowerCase().endsWith(ext))
          );
          if (hasZip && hasParts) {
            alert("Multiple file types detected. Please select only a ZIP or a complete shapefile set.");
            return;
          }
          if (hasZip && selectedFiles.length > 1) {
            alert("Multiple ZIP files detected. Please upload only one ZIP file.");
            return;
          }

          // Build FormData
          const formData = new FormData();
          formData.append("model_file", pklFile);

          if (hasZip) {
            formData.append("zip_file", selectedFiles[0]);
          } else {
            // Validate shapefile set
            const validExts = [".shp", ".dbf", ".shx", ".prj"];
            const fileMap = {};
            selectedFiles.forEach((f) => {
              const name = f.name.toLowerCase();
              const ext = name.substring(name.lastIndexOf("."));
              const base = name.replace(ext, "");
              if (validExts.includes(ext)) {
                if (!fileMap[base]) fileMap[base] = [];
                fileMap[base].push(ext);
              }
            });
            const baseNames = Object.keys(fileMap);
            if (baseNames.length === 0) {
              alert("No shapefile components detected.");
              return;
            }
            if (baseNames.length > 1) {
              alert("Multiple shapefile base names detected. Please upload only one shapefile set.");
              return;
            }
            const requiredExts = [".shp", ".dbf", ".shx", ".prj"];
            const uploadedExts = fileMap[baseNames[0]];
            const missing = requiredExts.filter((ext) => !uploadedExts.includes(ext));
            if (missing.length > 0) {
              alert(`Incomplete shapefile. Missing: ${missing.join(", ")}`);
              return;
            }
            selectedFiles.forEach((f) => formData.append("shapefiles", f));
          }

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
            } else {
              setResult(data);
            }
          } catch (err) {
            console.error("Run Model Fetch Error:", err);
            alert("Failed to connect to backend. Check console for details.");
          } finally {
            setLoading(false);
          }
        };
      };
    } catch (err) {
      console.error("Run Saved Model Error:", err);
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
          <label>Upload Shapefile (.shp, .dbf, .shx, .prj) or a ZIP containing them</label>
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
            {fields.length > 0 ? (
              fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))
            ) : (
              <option disabled>No fields loaded yet</option>
            )}
          </select>

          <div className="lr-buttons">
            <button className="run-btn" onClick={handleTrainModel} disabled={loading}>
              {loading ? "Training..." : "Train Model"}
            </button>
            <button className="run-btn secondary" onClick={handleRunSavedModel} disabled={loading}>
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
                  {result.metrics && (
                    <pre>{JSON.stringify(result.metrics, null, 2)}</pre>
                  )}
                  {result.record_count && (
                    <p><strong>Records processed:</strong> {result.record_count}</p>
                  )}
                  {result.downloads && (
                    <div className="download-links">
                      <h4>Downloads</h4>
                      <ul>
                        {result.downloads.model && (
                          <li>
                            <a href={result.downloads.model} target="_blank" rel="noopener noreferrer">
                              📦 Download Model (.pkl)
                            </a>
                          </li>
                        )}
                        {result.downloads.report && (
                          <li>
                            <a href={result.downloads.report} target="_blank" rel="noopener noreferrer">
                              📄 Download PDF Report
                            </a>
                          </li>
                        )}
                        {result.downloads.shapefile && (
                          <li>
                            <a href={result.downloads.shapefile} target="_blank" rel="noopener noreferrer">
                              🗺️ Download Predicted Shapefile (.zip)
                            </a>
                          </li>
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
    </div>
  );
};

export default LinearRegression;
