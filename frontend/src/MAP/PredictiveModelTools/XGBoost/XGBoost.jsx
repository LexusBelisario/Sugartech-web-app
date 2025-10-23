import React, { useState } from "react";
import Plot from "react-plotly.js";
import API from "../../../api.js";
import PredictedMapModal from "../PredictedMapModal.jsx";

const XGBoost = ({ onClose }) => {
  const [files, setFiles] = useState([]);
  const [fields, setFields] = useState([]);
  const [independentVars, setIndependentVars] = useState([]);
  const [dependentVar, setDependentVar] = useState("");
  const [scaler, setScaler] = useState("None");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [modelFile, setModelFile] = useState(null);
  const [runFiles, setRunFiles] = useState([]);
  const [showPredictedMap, setShowPredictedMap] = useState(false);
  const [previewPath, setPreviewPath] = useState(null);
  const [showGraphs, setShowGraphs] = useState(false);

  // ==========================================================
  // 📂 Load shapefile fields
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

      const res = await fetch(`${API}/xgb/fields`, { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok && data.fields) setFields(data.fields);
      else alert(data.error || "Unable to extract fields.");
    } catch (err) {
      console.error("Error reading shapefile fields:", err);
      alert("Error reading shapefile fields. See console for details.");
    }
  };

  // ==========================================================
  // ⚙️ Train model
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
      formData.append("scaler_choice", scaler);

      const res = await fetch(`${API}/xgb/train`, { method: "POST", body: formData });
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
    if (runFiles.length === 0) return alert("Please upload a shapefile to predict.");

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("model_file", modelFile);
      runFiles.forEach((f) => formData.append("shapefiles", f));

      const res = await fetch(`${API}/xgb/run-saved-model`, { method: "POST", body: formData });
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

  const plotConfig = (filename) => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: { format: "png", filename },
  });

  const plotLayout = {
    paper_bgcolor: "#0d0d0d",
    plot_bgcolor: "#0d0d0d",
    font: { color: "#fff" },
    hoverlabel: { bgcolor: "#1e1e1e", bordercolor: "#00bcd4", font: { color: "#fff" } },
    margin: { l: 60, r: 30, t: 60, b: 60 },
  };

  // ==========================================================
  // 🖼️ UI
  // ==========================================================
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-2">
      <div className="bg-[#111]/95 text-white w-full max-w-[480px] rounded-2xl p-6 shadow-[0_0_25px_#1ad4ff50] border border-[#1ad4ff30] relative overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-cyan-400">⚙️ XGBoost Regression</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-cyan-400 transition">
            ✕
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">
            Upload Shapefile (.shp, .dbf, .shx, .prj)
          </label>
          <div className="flex items-center gap-3">
            <button
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg text-sm transition"
              onClick={() => document.getElementById("xgbShpInput").click()}
            >
              📂 Select Files
            </button>
            <input
              id="xgbShpInput"
              type="file"
              multiple
              accept=".shp,.dbf,.shx,.prj"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <span className="text-xs text-gray-400 truncate">
              {files.length > 0 ? files.map((f) => f.name).join(", ") : "No files selected"}
            </span>
          </div>
        </div>

        <hr className="border-gray-700 my-3" />

        {/* Variable Selection */}
        <label className="block text-sm text-gray-300 mb-1">Independent Variables</label>
        <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-2 max-h-40 overflow-y-auto mb-3">
          {fields.length > 0 ? (
            fields.map((f) => (
              <label
                key={f}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-800 transition text-sm"
              >
                <input
                  type="checkbox"
                  checked={independentVars.includes(f)}
                  onChange={() => toggleIndependentVar(f)}
                  className="accent-emerald-400 scale-110"
                />
                {f}
              </label>
            ))
          ) : (
            <p className="text-gray-500 text-xs italic text-center py-2">
              No fields loaded yet.
            </p>
          )}
        </div>

        <label className="block text-sm text-gray-300 mb-1">Dependent Variable</label>
        <select
          value={dependentVar}
          onChange={(e) => setDependentVar(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg p-2 mb-3 focus:ring-2 focus:ring-cyan-400"
        >
          <option value="">-- Select --</option>
          {fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Scaler */}
        <label className="block text-sm text-gray-300 mb-1">Scaler</label>
        <select
          value={scaler}
          onChange={(e) => setScaler(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg p-2 mb-3 focus:ring-2 focus:ring-cyan-400"
        >
          <option>None</option>
          <option>Standard</option>
          <option>MinMax</option>
        </select>

        {/* Buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={handleTrainModel}
            disabled={loading}
            className="flex-1 mr-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg py-2 text-sm transition disabled:opacity-50"
          >
            {loading ? "Training..." : "Train Model"}
          </button>
          <button
            onClick={() => setShowRunModal(true)}
            disabled={loading}
            className="flex-1 ml-2 bg-gray-600 hover:bg-gray-500 rounded-lg py-2 text-sm transition disabled:opacity-50"
          >
            Run Saved Model
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-5 bg-[#1a1a1a]/70 rounded-xl border border-gray-700 p-3 text-sm">
            <h4 className="text-cyan-400 font-semibold mb-2">Model Results</h4>

            {result.metrics && (
              <table className="w-full text-left border border-gray-700 rounded-lg text-xs">
                <thead>
                  <tr className="bg-gray-800 text-cyan-400">
                    <th className="p-1.5">Metric</th>
                    <th className="p-1.5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.metrics).map(([k, v]) => (
                    <tr key={k} className="border-t border-gray-700">
                      <td className="p-1.5">{k}</td>
                      <td className="p-1.5 text-right">{v.toFixed ? v.toFixed(4) : v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Downloads */}
            {result.downloads && (
              <div className="mt-4">
                <h5 className="text-emerald-400 font-medium mb-1">Downloads</h5>
                <ul className="space-y-1">
                  {Object.entries(result.downloads).map(([k, url]) => (
                    <li key={k}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300 hover:underline"
                      >
                        📄 {k.toUpperCase()}
                      </a>
                    </li>
                  ))}
                </ul>

                {/* Map Button (Run Mode Only) */}
                {result.isRunMode && result.downloads?.shapefile && (
                  <button
                    className="mt-3 w-full bg-cyan-500 hover:bg-cyan-400 rounded-lg py-2 text-sm text-white transition"
                    onClick={() => {
                      setPreviewPath(result.downloads.shapefile);
                      setShowPredictedMap(true);
                    }}
                  >
                    Show Predicted Values in the Map
                  </button>
                )}

                {/* Graph Toggle */}
                {result.metrics && (
                  <button
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 text-sm text-white transition"
                    onClick={() => setShowGraphs(true)}
                  >
                    Show Graphs & Tables
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* === Graph Modal === */}
      {showGraphs && result && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-4" onClick={() => setShowGraphs(false)}>
          <div className="bg-[#121212] text-white rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-4 text-xl text-gray-300 hover:text-cyan-400" onClick={() => setShowGraphs(false)}>✕</button>
            <h2 className="text-cyan-400 text-xl font-semibold text-center mb-1">📊 XGBoost Model Results</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Interactive model performance & diagnostics</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature Importance */}
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 shadow-inner">
                <h4 className="text-emerald-400 mb-2 text-center">Feature Importance</h4>
                <Plot
                  data={[
                    {
                      type: "bar",
                      x: result.features || [],
                      y: result.importance || [],
                      marker: { color: "#00bcd4" },
                    },
                  ]}
                  layout={{ ...plotLayout, title: "" }}
                  config={plotConfig("feature_importance")}
                  useResizeHandler
                  style={{ width: "100%", height: "300px" }}
                />
              </div>

              {/* Actual vs Predicted */}
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 shadow-inner">
                <h4 className="text-emerald-400 mb-2 text-center">Actual vs Predicted</h4>
                <Plot
                  data={[
                    {
                      x: result.y_test || [],
                      y: result.preds || [],
                      mode: "markers",
                      type: "scatter",
                      marker: { color: "#00ff9d", size: 8, opacity: 0.8 },
                    },
                    {
                      x: result.y_test || [],
                      y: result.y_test || [],
                      mode: "lines",
                      line: { color: "gray", dash: "dash" },
                    },
                  ]}
                  layout={{ ...plotLayout, title: "" }}
                  config={plotConfig("actual_vs_pred")}
                  useResizeHandler
                  style={{ width: "100%", height: "300px" }}
                />
              </div>

              {/* Residual Distribution */}
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 shadow-inner md:col-span-2">
                <h4 className="text-emerald-400 mb-2 text-center">Residual Distribution</h4>
                <Plot
                  data={[
                    {
                      type: "bar",
                      x: result.residual_bins || [],
                      y: result.residual_counts || [],
                      marker: { color: "#00bcd4", opacity: 0.85 },
                    },
                  ]}
                  layout={{ ...plotLayout, title: "" }}
                  config={plotConfig("residual_distribution")}
                  useResizeHandler
                  style={{ width: "100%", height: "300px" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Run Model Modal === */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]" onClick={() => setShowRunModal(false)}>
          <div className="bg-[#111] text-white rounded-xl p-6 w-[400px] border border-gray-700 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-cyan-400 mb-3 font-semibold">Run Saved XGBoost Model</h4>
            <label className="block text-sm mb-1">Upload Model (.pkl)</label>
            <input type="file" accept=".pkl" onChange={(e) => setModelFile(e.target.files[0])} className="bg-[#1a1a1a] border border-gray-700 w-full rounded-lg text-sm p-2 mb-3" />
            <label className="block text-sm mb-1">Upload Shapefile</label>
            <input type="file" multiple accept=".shp,.dbf,.shx,.prj" onChange={(e) => setRunFiles(Array.from(e.target.files))} className="bg-[#1a1a1a] border border-gray-700 w-full rounded-lg text-sm p-2 mb-3" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRunModal(false)} className="bg-gray-600 hover:bg-gray-500 rounded-lg px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button onClick={handleRunModel} disabled={loading} className="bg-emerald-500 hover:bg-emerald-400 rounded-lg px-3 py-1.5 text-sm">
                {loading ? "Running..." : "Run Model"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Predicted Map Modal */}
      {showPredictedMap && (
        <PredictedMapModal
          onClose={() => setShowPredictedMap(false)}
          geojsonUrl={`${API}/xgb/preview-geojson?file_path=${encodeURIComponent(previewPath)}`}
        />
      )}
    </div>
  );
};

export default XGBoost;
