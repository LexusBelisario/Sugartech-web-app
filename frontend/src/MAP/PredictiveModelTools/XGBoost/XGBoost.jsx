import React, { useState } from "react";
import Plot from "react-plotly.js";
import API from "../../../api.js";
import PredictedMapModal from "../PredictedMapModal.jsx";

const XGBoost = ({ onClose }) => {
  const [files, setFiles] = useState([]);
  const [zipFile, setZipFile] = useState(null);
  const [uploadMode, setUploadMode] = useState("shapefile");
  const [fields, setFields] = useState([]);
  const [independentVars, setIndependentVars] = useState([]);
  const [dependentVar, setDependentVar] = useState("");
  const [scaler, setScaler] = useState("None");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [modelFile, setModelFile] = useState(null);
  const [runFiles, setRunFiles] = useState([]);
  const [runZipFile, setRunZipFile] = useState(null);
  const [runUploadMode, setRunUploadMode] = useState("shapefile");
  const [showPredictedMap, setShowPredictedMap] = useState(false);
  const [previewPath, setPreviewPath] = useState(null);
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [fullscreenGraph, setFullscreenGraph] = useState(null);

  // ==========================================================
  // 📂 Load shapefile fields
  // ==========================================================
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    setFiles(selectedFiles);
    setZipFile(null);
    setFields([]);
    setIndependentVars([]);
    setDependentVar("");
    setResult(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("shapefiles", f));

      const res = await fetch(`${API}/xgb/fields`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.fields) setFields(data.fields);
      else alert(data.error || "Unable to extract fields.");
    } catch (err) {
      console.error("Error reading shapefile fields:", err);
      alert("Error reading shapefile fields. See console for details.");
    }
  };

  const handleZipChange = async (e) => {
    const selectedZip = e.target.files[0];
    if (!selectedZip) return;
    setZipFile(selectedZip);
    setFiles([]);
    setFields([]);
    setIndependentVars([]);
    setDependentVar("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("zip_file", selectedZip);

      const res = await fetch(`${API}/xgb/fields`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.fields) setFields(data.fields);
      else alert(data.error || "Unable to extract fields from ZIP.");
    } catch (err) {
      console.error("Error reading ZIP fields:", err);
      alert("Error reading ZIP fields. See console for details.");
    }
  };

  // ==========================================================
  // ⚙️ Train model
  // ==========================================================
  const handleTrainModel = async () => {
    if (files.length === 0 && !zipFile)
      return alert("Please upload a shapefile or ZIP.");
    if (independentVars.length === 0)
      return alert("Select independent variables.");
    if (!dependentVar) return alert("Select dependent variable.");

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      let endpoint = `${API}/xgb/train`;
      if (zipFile) {
        endpoint = `${API}/xgb/train-zip`;
        formData.append("zip_file", zipFile);
      } else {
        files.forEach((f) => formData.append("shapefiles", f));
      }

      formData.append("independent_vars", JSON.stringify(independentVars));
      formData.append("dependent_var", dependentVar);
      formData.append("scaler_choice", scaler);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        console.error("Training error:", data);
        alert(`Error: ${data.error || res.statusText}`);
      } else {
        setResult(data);
        alert("✅ XGBoost model training completed!");
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
    if (!modelFile) return alert("Please select a saved model (.pkl)");
    if (runFiles.length === 0 && !runZipFile)
      return alert("Please upload a shapefile or ZIP to predict.");

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("model_file", modelFile);

      if (runZipFile) {
        formData.append("zip_file", runZipFile);
      } else {
        runFiles.forEach((f) => formData.append("shapefiles", f));
      }

      const res = await fetch(`${API}/xgb/run-saved-model`, {
        method: "POST",
        body: formData,
      });
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
      setRunZipFile(null);
    }
  };

  const toggleIndependentVar = (field) => {
    setIndependentVars((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

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
    hoverlabel: {
      bgcolor: "#111",
      bordercolor: "#00ff9d",
      font: { color: "white" },
    },
    margin: { l: 60, r: 30, t: 60, b: 60 },
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white w-full max-w-md rounded-2xl shadow-2xl border border-green-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            ⚙️ XGBoost Regression
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:rotate-90 transition-all duration-300 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Upload Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">
              Upload Method
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setUploadMode("shapefile");
                  setZipFile(null);
                  setFields([]);
                  setIndependentVars([]);
                  setDependentVar("");
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  uploadMode === "shapefile"
                    ? "bg-green-600 text-white shadow-lg shadow-green-500/50"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                📄 Shapefile
              </button>
              <button
                onClick={() => {
                  setUploadMode("zip");
                  setFiles([]);
                  setFields([]);
                  setIndependentVars([]);
                  setDependentVar("");
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  uploadMode === "zip"
                    ? "bg-green-600 text-white shadow-lg shadow-green-500/50"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                📦 ZIP File
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">
              {uploadMode === "shapefile"
                ? "Upload Shapefile (.shp, .dbf, .shx, .prj)"
                : "Upload ZIP File"}
            </label>
            <div className="flex items-center gap-3">
              {uploadMode === "shapefile" ? (
                <>
                  <input
                    type="file"
                    id="xgbShpInput"
                    multiple
                    accept=".shp,.dbf,.shx,.prj"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() =>
                      document.getElementById("xgbShpInput").click()
                    }
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-green-500/50"
                  >
                    📂 Select Files
                  </button>
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {files.length > 0
                      ? files.map((f) => f.name).join(", ")
                      : "No files selected"}
                  </span>
                </>
              ) : (
                <>
                  <input
                    id="xgbZipInput"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleZipChange}
                  />
                  <button
                    onClick={() =>
                      document.getElementById("xgbZipInput").click()
                    }
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-green-500/50"
                  >
                    📦 Select ZIP
                  </button>
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {zipFile ? zipFile.name : "No ZIP selected"}
                  </span>
                </>
              )}
            </div>
          </div>

          <hr className="border-gray-700/50" />

          {/* Variable Selection */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">
              Independent Variables
            </label>
            <div className="bg-black/40 border border-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
              {fields.length > 0 ? (
                fields.map((f) => (
                  <label
                    key={f}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 transition cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={independentVars.includes(f)}
                      onChange={() => toggleIndependentVar(f)}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-sm">{f}</span>
                  </label>
                ))
              ) : (
                <p className="text-gray-500 text-xs italic text-center py-2">
                  No fields loaded yet.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">
              Dependent Variable
            </label>
            <select
              value={dependentVar}
              onChange={(e) => setDependentVar(e.target.value)}
              className="w-full bg-black/40 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            >
              <option value="">-- Select --</option>
              {fields.map((f) => (
                <option key={f} value={f} className="bg-gray-900">
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Scaler */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">
              Scaler
            </label>
            <select
              value={scaler}
              onChange={(e) => setScaler(e.target.value)}
              className="w-full bg-black/40 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            >
              <option className="bg-gray-900">None</option>
              <option className="bg-gray-900">Standard</option>
              <option className="bg-gray-900">MinMax</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTrainModel}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Training..." : "Train Model"}
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run Saved Model
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 bg-gradient-to-br from-gray-800/50 to-black/50 rounded-xl border border-green-500/30 p-4 space-y-4">
              {result.metrics ? (
                /* Training Mode */
                <>
                  <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    🧠 XGBoost Model Summary
                  </h3>
                  <p className="text-sm text-gray-300">
                    Dependent Variable:{" "}
                    <span className="text-green-400 font-semibold">
                      {result.dependent_var}
                    </span>
                  </p>

                  {/* Metrics Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-600/20 border-b border-green-500/30">
                          <th className="text-left p-2 text-green-400 font-semibold">
                            Metric
                          </th>
                          <th className="text-right p-2 text-green-400 font-semibold">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result.metrics || {}).map(([k, v]) => (
                          <tr
                            key={k}
                            className="border-b border-gray-700/50 hover:bg-gray-800/30"
                          >
                            <td className="p-2">{k}</td>
                            <td className="text-right p-2 font-mono text-green-300">
                              {typeof v === "number" ? v.toFixed(6) : v}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Feature Importance Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-green-400 mb-2">
                      Feature Importance
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-green-600/20 border-b border-green-500/30">
                            <th className="text-left p-2 text-green-400 font-semibold">
                              Feature
                            </th>
                            <th className="text-right p-2 text-green-400 font-semibold">
                              Importance
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.features?.map((feat, idx) => (
                            <tr
                              key={feat}
                              className="border-b border-gray-700/50 hover:bg-gray-800/30"
                            >
                              <td className="p-2">{feat}</td>
                              <td className="text-right p-2 font-mono text-green-300">
                                {result.importance[idx]?.toFixed(6) || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Downloads */}
                  <div>
                    <h4 className="text-sm font-semibold text-green-400 mb-2">
                      Downloads
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <a
                          href={result.downloads.model}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline transition"
                        >
                          📦 Model (.pkl)
                        </a>
                      </li>
                      <li>
                        <a
                          href={result.downloads.report}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline transition"
                        >
                          📄 PDF Report
                        </a>
                      </li>
                      <li>
                        <a
                          href={result.downloads.shapefile}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline transition"
                        >
                          🗺️ Predicted Shapefile (.zip)
                        </a>
                      </li>
                      <li>
                        <a
                          href={result.downloads.cama_csv}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline transition"
                        >
                          📊 Full CAMA Table (CSV)
                        </a>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setShowResultsPanel(!showResultsPanel)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 rounded-lg transition- all duration-200 shadow-lg hover:shadow-green-500/50"
                  >
                    {showResultsPanel
                      ? "Hide Graphs & Tables"
                      : "Show Graphs & Tables"}
                  </button>
                </>
              ) : (
                /* Run Mode */
                <>
                  {result.downloads && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-400 mb-2">
                        Downloads
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {result.downloads.shapefile && (
                          <li>
                            <a
                              href={result.downloads.shapefile}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline transition"
                            >
                              🗺️ Predicted Shapefile (.zip)
                            </a>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const geojsonLink = result.downloads?.shapefile
                        ? `${API}/xgb/preview-geojson?file_path=${encodeURIComponent(result.downloads.shapefile)}`
                        : null;

                      if (geojsonLink) {
                        setPreviewPath(geojsonLink);
                        setShowPredictedMap(true);
                      } else {
                        alert("No predicted map data available.");
                      }
                    }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/50"
                  >
                    🗺️ Show Predicted Values in the Map
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === Graphs Modal === */}
      {showResultsPanel && result && result.metrics && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white rounded-2xl shadow-2xl border border-green-500/30 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold">📊 XGBoost Model Results</h2>
                <p className="text-sm text-green-100 mt-1">
                  Interactive model performance & diagnostics dashboard
                </p>
              </div>
              <button
                onClick={() => setShowResultsPanel(false)}
                className="text-white/80 hover:text-white hover:rotate-90 transition-all duration-300 text-3xl"
              >
                ✕
              </button>
            </div>

            {/* Graph Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: "importance", title: "Feature Importance" },
                { key: "residuals", title: "Residual Distribution" },
                { key: "actual_pred", title: "Actual vs Predicted" },
                { key: "resid_pred", title: "Residuals vs Predicted" },
              ].map((g) => (
                <div
                  key={g.key}
                  onClick={() => setFullscreenGraph(g.key)}
                  className="bg-black/40 border border-green-500/30 rounded-xl p-4 cursor-pointer hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 group"
                >
                  <h4 className="text-green-400 font-semibold mb-3 group-hover:text-green-300 transition">
                    {g.title}
                  </h4>

                  {g.key === "importance" && (
                    <Plot
                      data={[
                        {
                          x: result.features || [],
                          y: result.importance || [],
                          type: "bar",
                          marker: { color: "#00ff9d" },
                          showlegend: false,
                        },
                      ]}
                      layout={{
                        ...plotLayoutBase,
                        title: "",
                        xaxis: {
                          title: "",
                          color: "#ccc",
                          showticklabels: false,
                        },
                        yaxis: { title: "", color: "#ccc" },
                        margin: { l: 40, r: 20, t: 20, b: 30 },
                      }}
                      config={plotConfig(g.key)}
                      useResizeHandler
                      style={{ width: "100%", height: "250px" }}
                    />
                  )}

                  {g.key === "residuals" && (
                    <Plot
                      data={[
                        {
                          type: "bar",
                          x: result.residual_bins,
                          y: result.residual_counts,
                          marker: {
                            color: "#00ff9d",
                            opacity: 0.85,
                            line: { color: "#0f0f0f", width: 1.2 },
                          },
                          showlegend: false,
                        },
                      ]}
                      layout={{
                        ...plotLayoutBase,
                        title: "",
                        xaxis: { title: "", color: "#ccc" },
                        yaxis: { title: "", color: "#ccc" },
                        margin: { l: 40, r: 20, t: 20, b: 30 },
                      }}
                      config={plotConfig("residual_distribution")}
                      useResizeHandler
                      style={{ width: "100%", height: "250px" }}
                    />
                  )}

                  {g.key === "actual_pred" && (
                    <Plot
                      data={[
                        {
                          x: result.y_test,
                          y: result.preds,
                          mode: "markers",
                          type: "scatter",
                          name: "Predicted Values",
                          marker: {
                            color: "#00ff9d",
                            size: 6,
                            opacity: 0.7,
                          },
                        },
                        {
                          x: result.y_test,
                          y: result.y_test,
                          mode: "lines",
                          name: "Actual Values",
                          line: { color: "#ffff00", dash: "dash", width: 1.5 },
                        },
                      ]}
                      layout={{
                        ...plotLayoutBase,
                        title: "",
                        xaxis: { title: "", color: "#ccc" },
                        yaxis: { title: "", color: "#ccc" },
                        margin: { l: 40, r: 20, t: 20, b: 30 },
                        showlegend: false,
                      }}
                      config={plotConfig(g.key)}
                      useResizeHandler
                      style={{ width: "100%", height: "250px" }}
                    />
                  )}

                  {g.key === "resid_pred" && (
                    <Plot
                      data={[
                        {
                          x: result.preds,
                          y: result.residuals,
                          mode: "markers",
                          type: "scatter",
                          name: "Residuals",
                          marker: { color: "#ff6363", size: 6, opacity: 0.7 },
                        },
                        {
                          x: result.preds,
                          y: Array(result.preds?.length).fill(0),
                          mode: "lines",
                          name: "Zero Line",
                          line: { color: "#ffff00", dash: "dash", width: 1.5 },
                        },
                      ]}
                      layout={{
                        ...plotLayoutBase,
                        title: "",
                        xaxis: { title: "", color: "#ccc" },
                        yaxis: { title: "", color: "#ccc" },
                        margin: { l: 40, r: 20, t: 20, b: 30 },
                        showlegend: false,
                      }}
                      config={plotConfig(g.key)}
                      useResizeHandler
                      style={{ width: "100%", height: "250px" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === Fullscreen Chart === */}
      {fullscreenGraph && result && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[10001] p-4"
          onClick={() => setFullscreenGraph(null)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl shadow-2xl border border-green-500/50 w-full max-w-6xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {fullscreenGraph === "importance" && "Feature Importance"}
                {fullscreenGraph === "residuals" && "Residual Distribution"}
                {fullscreenGraph === "actual_pred" && "Actual vs Predicted"}
                {fullscreenGraph === "resid_pred" && "Residuals vs Predicted"}
              </h3>
              <button
                onClick={() => setFullscreenGraph(null)}
                className="text-white/80 hover:text-white hover:rotate-90 transition-all duration-300 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <Plot
                data={
                  fullscreenGraph === "importance"
                    ? [
                        {
                          x: result.features,
                          y: result.importance,
                          type: "bar",
                          name: "Importance Score",
                          marker: { color: "#00ff9d" },
                        },
                      ]
                    : fullscreenGraph === "residuals"
                      ? [
                          {
                            type: "bar",
                            x: result.residual_bins,
                            y: result.residual_counts,
                            name: "Frequency",
                            marker: {
                              color: "#00ff9d",
                              opacity: 0.85,
                              line: { color: "#0f0f0f", width: 1.2 },
                            },
                            width:
                              0.6 *
                              ((Math.max(...result.residual_bins) -
                                Math.min(...result.residual_bins)) /
                                result.residual_bins.length),
                          },
                        ]
                      : fullscreenGraph === "actual_pred"
                        ? [
                            {
                              x: result.y_test,
                              y: result.preds,
                              mode: "markers",
                              type: "scatter",
                              name: "Predicted Values",
                              marker: {
                                color: "#00ff9d",
                                size: 10,
                                opacity: 0.8,
                                line: { color: "#fff", width: 0.5 },
                              },
                            },
                            {
                              x: result.y_test,
                              y: result.y_test,
                              mode: "lines",
                              name: "Actual Values (y=x)",
                              line: {
                                color: "#ffff00",
                                dash: "dash",
                                width: 3,
                              },
                            },
                          ]
                        : [
                            {
                              x: result.preds,
                              y: result.residuals,
                              mode: "markers",
                              type: "scatter",
                              name: "Residuals",
                              marker: {
                                color: "#ff6363",
                                size: 10,
                                opacity: 0.8,
                                line: { color: "#fff", width: 0.5 },
                              },
                            },
                            {
                              x: result.preds,
                              y: Array(result.preds?.length).fill(0),
                              mode: "lines",
                              name: "Zero Line (Perfect Model)",
                              line: {
                                color: "#ffff00",
                                dash: "dash",
                                width: 3,
                              },
                            },
                          ]
                }
                layout={{
                  ...plotLayoutBase,
                  title: "",
                  xaxis: {
                    title: {
                      text:
                        fullscreenGraph === "importance"
                          ? "Features"
                          : fullscreenGraph === "residuals"
                            ? "Residual Value"
                            : fullscreenGraph === "actual_pred"
                              ? "Actual Values (Observed)"
                              : "Predicted Values (Model Output)",
                      font: {
                        color:
                          fullscreenGraph === "resid_pred"
                            ? "#ff6363"
                            : "#00ff9d",
                        size: 16,
                        weight: "bold",
                      },
                    },
                    color: "#ccc",
                    gridcolor: "#333",
                  },
                  yaxis: {
                    title: {
                      text:
                        fullscreenGraph === "importance"
                          ? "Importance (Gain)"
                          : fullscreenGraph === "residuals"
                            ? "Frequency"
                            : fullscreenGraph === "actual_pred"
                              ? "Predicted Values (Model Output)"
                              : "Residuals (Actual - Predicted)",
                      font: {
                        color:
                          fullscreenGraph === "resid_pred"
                            ? "#ff6363"
                            : "#00ff9d",
                        size: 16,
                        weight: "bold",
                      },
                    },
                    color: "#ccc",
                    gridcolor: "#333",
                  },
                  legend: {
                    x: 0.05,
                    y: 0.95,
                    xanchor: "left",
                    yanchor: "top",
                    bgcolor: "rgba(0,0,0,0.8)",
                    bordercolor:
                      fullscreenGraph === "resid_pred" ? "#ff6363" : "#00ff9d",
                    borderwidth: 2,
                    font: { color: "#fff", size: 14 },
                  },
                  annotations:
                    fullscreenGraph === "actual_pred"
                      ? [
                          {
                            text: "Points closer to the line = Better predictions",
                            xref: "paper",
                            yref: "paper",
                            x: 0.5,
                            y: -0.12,
                            showarrow: false,
                            font: {
                              color: "#00ff9d",
                              size: 13,
                              style: "italic",
                            },
                            xanchor: "center",
                          },
                        ]
                      : fullscreenGraph === "resid_pred"
                        ? [
                            {
                              text: "Random scatter around zero = Good model fit",
                              xref: "paper",
                              yref: "paper",
                              x: 0.5,
                              y: -0.12,
                              showarrow: false,
                              font: {
                                color: "#ff6363",
                                size: 13,
                                style: "italic",
                              },
                              xanchor: "center",
                            },
                          ]
                        : [],
                }}
                config={plotConfig(`${fullscreenGraph}_full`)}
                useResizeHandler
                style={{ width: "100%", height: "75vh" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* === Run Model Modal === */}
      {showRunModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000]"
          onClick={() => setShowRunModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white rounded-2xl shadow-2xl border border-green-500/30 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-xl font-bold text-green-400 mb-4">
              Run Saved XGBoost Model
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">
                  Upload Model (.pkl)
                </label>
                <input
                  type="file"
                  accept=".pkl"
                  onChange={(e) => setModelFile(e.target.files[0])}
                  className="w-full bg-black/40 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-600 file:text-white file:cursor-pointer hover:file:bg-green-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">
                  Data Upload Method
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRunUploadMode("shapefile");
                      setRunZipFile(null);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      runUploadMode === "shapefile"
                        ? "bg-green-600 text-white shadow-lg shadow-green-500/50"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    📄 Shapefile
                  </button>
                  <button
                    onClick={() => {
                      setRunUploadMode("zip");
                      setRunFiles([]);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      runUploadMode === "zip"
                        ? "bg-green-600 text-white shadow-lg shadow-green-500/50"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    📦 ZIP
                  </button>
                </div>
              </div>

              {runUploadMode === "shapefile" ? (
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">
                    Upload Shapefile
                  </label>
                  <input
                    type="file"
                    id="runShpInput"
                    multiple
                    accept=".shp,.dbf,.shx,.prj"
                    className="hidden"
                    onChange={(e) => setRunFiles(Array.from(e.target.files))}
                  />
                  <button
                    onClick={() =>
                      document.getElementById("runShpInput").click()
                    }
                    className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    📂 Select Files
                  </button>
                  {runFiles.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      {runFiles.length} file(s) selected
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2 ">
                    Upload ZIP File
                  </label>
                  <input
                    type="file"
                    id="runZipInput"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => setRunZipFile(e.target.files[0])}
                  />
                  <button
                    onClick={() =>
                      document.getElementById("runZipInput").click()
                    }
                    className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    📦 Select ZIP
                  </button>
                  {runZipFile && (
                    <p className="text-xs text-gray-400 mt-2">
                      {runZipFile.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRunModel}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Running..." : "Run"}
                </button>
                <button
                  onClick={() => {
                    setShowRunModal(false);
                    setModelFile(null);
                    setRunFiles([]);
                    setRunZipFile(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predicted Map Modal */}
      {showPredictedMap && (
        <PredictedMapModal
          onClose={() => setShowPredictedMap(false)}
          geojsonUrl={previewPath}
        />
      )}
    </div>
  );
};

export default XGBoost;
