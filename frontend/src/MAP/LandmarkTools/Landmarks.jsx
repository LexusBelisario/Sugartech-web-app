import React, { useState, useMemo, useCallback, useEffect } from "react";
import API from "../../api";
import ShowLandmarks from "./ShowLandmarks.jsx";
import RemoveLandmark from "./RemoveLandmark.jsx";
import LandmarkInfotool from "./LandmarkInfotool.jsx";
import AddLandmark from "./AddLandmarks.jsx"; // ✅ new import
import { useSchema } from "../SchemaContext";

const Landmarks = ({ activeTool, setActiveTool, setLandmarksVisible }) => {
  const { schema } = useSchema();

  const showLandmarksVisible =
    activeTool === "showLandmarks" ||
    activeTool === "removeLandmark" ||
    activeTool === "landmarkInfo" ||
    activeTool === "updateLandmark" ||
    activeTool === "addLandmark"; // ✅ show layer when adding

  const [landmarksOnScreen, setLandmarksOnScreen] = useState(false);
  const [removalList, setRemovalList] = useState([]);
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // 🔑 used to trigger refresh

  useEffect(() => {
    setLandmarksVisible?.(landmarksOnScreen);
  }, [landmarksOnScreen, setLandmarksVisible]);

  // === REMOVE LANDMARK TOOL ===
  const handleMark = useCallback((feature) => {
    const { id, name, type, barangay } = feature.properties || {};
    if (!id) {
      console.warn("⚠️ Missing landmark ID, cannot mark for removal.");
      return;
    }

    setRemovalList((prev) => {
      if (prev.some((item) => item.id === id)) return prev;
      return [...prev, { id, name, type, barangay }];
    });
  }, []);

  const handleUnmark = (id) => {
    setRemovalList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCancel = () => {
    setRemovalList([]);
    if (activeTool === "removeLandmark") {
      setActiveTool(null);
    }
  };

  const handleRemoveSelected = () => {
    const payload = {
      schema,
      ids: removalList.map((l) => l.id),
    };

    if (!payload.ids.length) return;

    fetch(`${API}/landmarks/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Deletion result:", data);

        setRemovalList([]);
        setRefreshKey((k) => k + 1); // 🔄 trigger refresh of ShowLandmarks
      })
      .catch((err) => {
        console.error("❌ Failed to remove landmarks:", err);
      });
  };

  // === INFO TOOL ===
  const onClickFeature = useMemo(() => {
    if (activeTool === "removeLandmark") return handleMark;
    if (activeTool === "landmarkInfo") {
      return (feature) => setSelectedLandmark(feature);
    }
    return null;
  }, [activeTool, handleMark]);

  return (
    <>
      <ShowLandmarks
        schema={schema}
        visible={showLandmarksVisible}
        onClickFeature={onClickFeature}
        onVisibleChange={setLandmarksOnScreen}
        refreshKey={refreshKey} // 🔑 pass refresh trigger
      />

      {/* === Add Landmark Panel === */}
      <AddLandmark
        visible={activeTool === "addLandmark"}
        onClose={() => setActiveTool(null)}
        onAdded={() => setRefreshKey((k) => k + 1)} // 🔄 refresh landmarks after add
      />

      <RemoveLandmark
        visible={activeTool === "removeLandmark"}
        removalList={removalList}
        onUnmark={handleUnmark}
        onCancel={handleCancel}
        onRemoveSelected={handleRemoveSelected}
      />

      <LandmarkInfotool
        key={activeTool}
        visible={activeTool === "landmarkInfo" || activeTool === "updateLandmark"}
        data={selectedLandmark}
        schema={schema}
        startEditable={activeTool === "updateLandmark"}
        onClose={() => setActiveTool(null)}
      />
    </>
  );
};

export default Landmarks;
