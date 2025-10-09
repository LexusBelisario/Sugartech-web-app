import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Orthophoto.css";
import { ApiService } from "../../api_service";
import { useSchema } from "../SchemaContext";

function Orthophoto() {
  const map = useMap();
  const { schema } = useSchema();

  const [orthoData, setOrthoData] = useState({ Gsrvr_URL: "", Layer_Name: "" });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================================
  // 🧭 Load configuration when schema changes
  // ==========================================================
  useEffect(() => {
    if (!schema) return;

    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await ApiService.get(`/orthophoto-config?schema=${schema}`);
        if (res.status === "success") {
          setOrthoData({
            Gsrvr_URL: res.Gsrvr_URL || "",
            Layer_Name: res.Layer_Name || "",
          });
          setMessage("Loaded orthophoto configuration.");
        } else {
          setOrthoData({ Gsrvr_URL: "", Layer_Name: "" });
          setMessage("No configuration found. Please set one.");
        }
      } catch {
        setMessage("Failed to load configuration.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [schema]);

  // ==========================================================
  // 💾 Save configuration to backend
  // ==========================================================
  const handleSave = async () => {
    if (!schema || !orthoData.Gsrvr_URL || !orthoData.Layer_Name) {
      alert("Please fill in both fields before saving.");
      return;
    }

    try {
      setLoading(true);
      const payload = { schema, ...orthoData };
      const res = await ApiService.post("/orthophoto-config", payload);
      if (res.status === "success") setMessage("Configuration saved successfully!");
      else setMessage("Error saving configuration.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // 🛰️ Create Leaflet control (bottom-right, above AdminBoundaries)
  // ==========================================================
  useEffect(() => {
    if (!map) return;

    const container = L.DomUtil.create("div", "leaflet-bar ortho-control");
    container.style.marginBottom = "70px"; // move above AdminBoundaries
    container.style.marginRight = "0px";

    const button = L.DomUtil.create("button", "ortho-toggle-button", container);
    button.innerHTML = "🛰️";
    button.title = "Orthophoto Configuration";

    L.DomEvent.on(button, "click", (e) => {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      setIsOpen((prev) => !prev);
    });

    const control = L.control({ position: "bottomright" });
    control.onAdd = () => container;
    control.addTo(map);

    return () => map.removeControl(control);
  }, [map]);

  // ==========================================================
  // 🧩 Configuration Panel
  // ==========================================================
  if (!isOpen) return null;

  return (
    <div
      className="ortho-panel"
      style={{
        position: "absolute",
        bottom: "120px", // place panel slightly above control
        right: "10px",
        zIndex: 9999,
      }}
    >
      <h4>Orthophoto Configuration</h4>

      <label>GeoServer URL</label>
      <input
        type="text"
        value={orthoData.Gsrvr_URL}
        onChange={(e) =>
          setOrthoData({ ...orthoData, Gsrvr_URL: e.target.value })
        }
        placeholder="http://your-geoserver/geoserver/gwc/service/wmts"
      />

      <label>Layer Name</label>
      <input
        type="text"
        value={orthoData.Layer_Name}
        onChange={(e) =>
          setOrthoData({ ...orthoData, Layer_Name: e.target.value })
        }
        placeholder="workspace:layername"
      />

      <button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </button>

      {message && <p className="ortho-message">{message}</p>}
    </div>
  );
}

export default Orthophoto;
