import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import { ApiService } from "../../api_service";
import { useSchema } from "../SchemaContext";

function Orthophoto() {
  const map = useMap();
  const { schema } = useSchema();

  const [orthoData, setOrthoData] = useState({ Gsrvr_URL: "", Layer_Name: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================================
  // 🧭 Load configuration when schema changes
  // ==========================================================
  useEffect(() => {
    if (!schema) {
      setOrthoData({ Gsrvr_URL: "", Layer_Name: "" });
      setMessage("");
      return;
    }

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
  const handleSave = async (data) => {
    if (!schema || !data.Gsrvr_URL || !data.Layer_Name) {
      setMessage("Please fill in both fields before saving.");
      return { success: false, message: "Please fill in both fields." };
    }

    try {
      setLoading(true);
      setMessage("Saving...");
      const payload = { schema, ...data };
      const res = await ApiService.post("/orthophoto-config", payload);
      
      if (res.status === "success") {
        setMessage("Configuration saved successfully!");
        setOrthoData(data);
        return { success: true, message: "Configuration saved successfully!" };
      } else {
        setMessage("Error saving configuration.");
        return { success: false, message: "Error saving configuration." };
      }
    } catch (err) {
      console.error("Save failed:", err);
      setMessage("Save failed.");
      return { success: false, message: "Save failed." };
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // ✅ Expose state and handlers to window for UI panel
  // ==========================================================
  useEffect(() => {
    window._orthophotoData = {
      Gsrvr_URL: orthoData.Gsrvr_URL,
      Layer_Name: orthoData.Layer_Name,
      loading,
      message,
      schema,
    };
  }, [orthoData, loading, message, schema]);

  useEffect(() => {
    window._handleOrthophotoSave = handleSave;
    return () => {
      delete window._handleOrthophotoSave;
      delete window._orthophotoData;
    };
  }, [schema]);

  return null; // No UI, logic only
}

export default Orthophoto;