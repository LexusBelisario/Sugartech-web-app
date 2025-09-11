import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import L from "leaflet";
import "leaflet-geometryutil";

const AddLine = forwardRef(({
  map,
  activeTab,
  drawing,
  setDrawing,
  error,
  selectedParcel,
  locked,
  handleUndo,
  handleSubdivide,
  handleCancel,
  lines,
  setLines,
  allPoints,
  setAllPoints,
  renderParcelControls,
  handleExportPoints,
  pointMarkers,
  suggestedPins,
  setSuggestedPins
}, ref) => {
  const ghostLine = useRef(null);
  const currentPoints = useRef([]);
  const drawnLayers = useRef([]);

  // Expose cleanup method to parent
  useImperativeHandle(ref, () => ({
    clearDrawnLines: () => {
      drawnLayers.current.forEach(line => {
        if (map.hasLayer(line)) map.removeLayer(line);
      });
      drawnLayers.current = [];

      pointMarkers.current.forEach(marker => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
      pointMarkers.current = [];

      setLines([]);
      setAllPoints([]);
    }
  }));

  useEffect(() => {
    if (!map || !drawing || !selectedParcel || activeTab !== "line") return;

    currentPoints.current = [];
    const ghost = L.polyline([], { color: "gray", dashArray: "5,5" }).addTo(map);
    ghostLine.current = ghost;

    const onClick = (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      currentPoints.current.push([lng, lat]);
      ghost.setLatLngs(currentPoints.current.map(([lng, lat]) => [lat, lng]));

      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        color: "red",
        fillColor: "red",
        fillOpacity: 0.9
      }).addTo(map);
      pointMarkers.current.push(marker);
    };

    const onMouseMove = (e) => {
      if (currentPoints.current.length === 0) return;
      const temp = [...currentPoints.current, [e.latlng.lng, e.latlng.lat]];
      ghost.setLatLngs(temp.map(([lng, lat]) => [lat, lng]));
    };

    const onRightClick = (e) => {
      e.originalEvent.preventDefault();
      if (currentPoints.current.length > 1) {
        const finalLine = [...currentPoints.current];
        const poly = L.polyline(finalLine.map(([lng, lat]) => [lat, lng]), {
          color: "blue",
          weight: 2,
          dashArray: "4, 6"
        }).addTo(map);

        drawnLayers.current.push(poly);
        setLines(prev => [...prev, finalLine]);
        setAllPoints(prev => [...prev, ...finalLine]);
      }

      ghost.remove();
      ghostLine.current = null;
      currentPoints.current = [];
      setDrawing(false);

      map.off("click", onClick);
      map.off("mousemove", onMouseMove);
      map.off("contextmenu", onRightClick);
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);
    map.on("contextmenu", onRightClick);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMouseMove);
      map.off("contextmenu", onRightClick);
      if (ghostLine.current) ghostLine.current.remove();
    };
  }, [drawing, map, selectedParcel, activeTab]);

  return (
    <>
      <div className="subdivide-instructions">
        <p><strong>1.</strong> Click a parcel on the map to select it.</p>
        <p><strong>2.</strong> Click <strong>Choose This Parcel</strong> to choose the parcel for subdividing.</p>
        <p><strong>3.</strong> Press <strong>Add a Line</strong> to start drawing lines.</p>
        <p><strong>4.</strong> Left-click to add points, right-click to finish a line.</p>
        <p><strong>5.</strong> Assign PINs and click <strong>Subdivide and Save</strong> to finish.</p>
      </div>

      {error && <div style={{ color: "red", fontSize: "13px" }}>{error}</div>}

      {renderParcelControls()}

      <div className="subdivide-controls-grid">
        <button className="subdivide-btn" onClick={() => setDrawing(true)} disabled={!selectedParcel || !locked}>
          Add a Line
        </button>
        <button className="subdivide-btn" onClick={handleUndo} disabled={lines.length === 0}>
          Undo Last Line
        </button>
        <button className="subdivide-btn" onClick={handleCancel}>
          Cancel and Discard
        </button>
      </div>

      {allPoints.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <button className="subdivide-btn" onClick={() => handleExportPoints("txt")} style={{ marginBottom: "8px" }}>
            Export Points (.txt)
          </button>
          <button className="subdivide-btn" onClick={() => handleExportPoints("csv")}>
            Export Points (.csv)
          </button>
        </div>
      )}

      {allPoints.length > 0 && (
        <ul className="subdivide-pin-list" style={{ marginTop: "12px" }}>
          {allPoints.map(([lng, lat], idx) => (
            <li key={idx} className="manual-point-item">
              {`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`}
            </li>
          ))}
        </ul>
      )}

      {suggestedPins.length > 0 && (
        <div style={{ marginTop: "16px", padding: "0 12px" }}>
          <h4>Assign PINs to Subdivided Parcels</h4>
          {suggestedPins.map((pin, idx) => (
            <div key={idx} style={{ marginBottom: "8px" }}>
              <label style={{ fontWeight: "bold" }}>PIN #{idx + 1}:</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => {
                  const updated = [...suggestedPins];
                  updated[idx] = e.target.value;
                  setSuggestedPins(updated);
                }}
                style={{ marginLeft: "8px", padding: "4px", width: "75%" }}
              />
            </div>
          ))}
          <button
            className="subdivide-btn"
            onClick={handleSubdivide}
            disabled={suggestedPins.some(pin => !pin)}
            style={{ marginTop: "12px" }}
          >
            Subdivide and Save
          </button>
        </div>
      )}
    </>
  );
});

export default AddLine;
