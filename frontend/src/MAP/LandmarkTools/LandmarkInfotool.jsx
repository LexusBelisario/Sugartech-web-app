import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import API from "../../api";
import "./LandmarkInfotool.css";
import { useSchema } from "../SchemaContext";

const LandmarkInfoTool = ({ visible, data, onClose, startEditable = false }) => {
  const { schema } = useSchema();
  const [formData, setFormData] = useState({ name: "", type: "", barangay: "", descr: "" });
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.properties?.name || "",
        type: data.properties?.type || "",
        barangay: data.properties?.barangay || "",
        descr: data.properties?.descr || "",
      });
      setEditable(startEditable); // ✅ same as your old working code
    }
  }, [data, schema, visible, startEditable]);

  if (!visible || !data) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!data || !data.properties?.id) {
      alert("No landmark ID found.");
      return;
    }
    if (!schema) {
      alert("No schema selected.");
      return;
    }

    const payload = {
      schema,
      id: data.properties.id,
      updated: { ...formData },
    };

    try {
      const res = await fetch(`${API}/landmarks/update-by-fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(`Update failed (${res.status}): ${JSON.stringify(result)}`);
        return;
      }

      if (result.status === "success") {
        alert("Landmark updated successfully.");
        setEditable(false);
      } else {
        alert(result.message || "Update failed.");
      }
    } catch (err) {
      console.error("💥 Fetch error:", err);
      alert("Error updating landmark.");
    }
  };

  const landmarkTypes = [
    "Commercial Entities",
    "Educational Entities",
    "Financial Entities",
    "Fire Station",
    "Gas Station",
    "Government Entities",
    "Industrial Entities",
    "Medical Entities",
    "Police Station",
    "Recreational Entities",
    "Religious Entities",
    "Subdivision",
    "Telecommunication Entities",
    "Transportation Entities",
  ];

  const panel = (
    <div className="landmark-info-panel leaflet-top leaflet-right">
      <div className="landmark-info-header">
        <h3 className="landmark-info-title">
          {editable ? "Update Landmark" : "Landmark Information"}
        </h3>
        <button onClick={onClose} className="landmark-info-close">Close</button>
      </div>

      <div className="landmark-info-section">
        <label className="landmark-info-label">Name</label>
        {editable ? (
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="landmark-info-input"
          />
        ) : (
          <div className="landmark-info-value">{formData.name}</div>
        )}
      </div>

      <div className="landmark-info-section">
        <label className="landmark-info-label">Type</label>
        {editable ? (
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="landmark-info-input"
          >
            <option value="">Select Type</option>
            {landmarkTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        ) : (
          <div className="landmark-info-value">{formData.type}</div>
        )}
      </div>

      <div className="landmark-info-section">
        <label className="landmark-info-label">Barangay</label>
        {editable ? (
          <input
            name="barangay"
            value={formData.barangay}
            onChange={handleChange}
            className="landmark-info-input"
          />
        ) : (
          <div className="landmark-info-value">{formData.barangay}</div>
        )}
      </div>

      <div className="landmark-info-section">
        <label className="landmark-info-label">Description</label>
        {editable ? (
          <textarea
            name="descr"
            value={formData.descr}
            onChange={handleChange}
            rows={3}
            className="landmark-info-input"
          />
        ) : (
          <div className="landmark-info-value">{formData.descr}</div>
        )}
      </div>

      <div className="landmark-info-footer">
        {editable ? (
          <>
            <button onClick={handleSave} className="landmark-info-save">Save</button>
            <button onClick={() => setEditable(false)} className="landmark-info-cancel">Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditable(true)} className="landmark-info-edit">Edit</button>
        )}
      </div>
    </div>
  );

  // ✅ Render outside toolbar
  return ReactDOM.createPortal(panel, document.body);
};

export default LandmarkInfoTool;
