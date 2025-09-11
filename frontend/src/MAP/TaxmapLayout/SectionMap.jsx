import React, { useEffect, useState } from "react";
import SectionMapForm from "./Form.jsx";
import TMLpreview from "./SectionPreview.jsx";
import "./SectionMap.css";

const SectionMap = ({ map, selectedSchema }) => {
  const [allTables, setAllTables] = useState([]);
  const [sectionTable, setSectionTable] = useState("");
  const [sectionLayerData, setSectionLayerData] = useState([]);
  const [layoutBarangayOptions, setLayoutBarangayOptions] = useState([]);
  const [otherLayers, setOtherLayers] = useState([]);
  const [selectedOtherLayer, setSelectedOtherLayer] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const [formData, setFormData] = useState({
    barangay: "",
    paperSize: "A4",
    scale: "",
    preparedBy: "",
    verifiedBy: "",
    recommendingApproval: "",
    approvedBy: "",
    provCode: "",
    munDist: "",
    barangayOverride: "",
    sectionOverride: "",
    background: "blank"
  });

  useEffect(() => {
    if (!selectedSchema) return;
    setSectionTable("");
    setOtherLayers([]);
    setSelectedOtherLayer("");
    setAllTables([]);
    setSectionLayerData([]);

    fetch(`http://127.0.0.1:8000/tables-in-schema?schema=${selectedSchema}`)
      .then(res => res.json())
      .then(data => {
        const tables = data.data || [];
        setAllTables(tables);

        // Auto-select section layer
        const section = tables.find(t => /section/i.test(t));
        if (section) setSectionTable(section);

        // Auto-select other layers if they exist
        const defaults = ["barangay boundary", "RoadNetwork", "SurfaceWater"];
        const availableDefaults = defaults.filter(t => tables.includes(t));
        setOtherLayers(availableDefaults);
      });
  }, [selectedSchema]);

  useEffect(() => {
    if (!sectionTable) return;
    fetch(`http://127.0.0.1:8000/single-table?schema=${selectedSchema}&table=${sectionTable}`)
      .then(res => res.json())
      .then(data => {
        setSectionLayerData(data.features || []);
        const brgySet = new Set();
        data.features.forEach(f => {
          if (f.properties?.barangay) {
            brgySet.add(f.properties.barangay);
          }
        });
        setLayoutBarangayOptions([...brgySet].sort());
      });
  }, [sectionTable]);

  const addOtherLayer = () => {
    if (
      selectedOtherLayer &&
      !otherLayers.includes(selectedOtherLayer) &&
      selectedOtherLayer !== sectionTable
    ) {
      setOtherLayers([...otherLayers, selectedOtherLayer]);
      setSelectedOtherLayer("");
    }
  };

  const removeOtherLayer = (layer) => {
    setOtherLayers(otherLayers.filter(t => t !== layer));
  };

  const availableOtherLayers = allTables.filter(
    t => !/section/i.test(t) && !otherLayers.includes(t) && t !== sectionTable
  );

  return (
    <>
      <div className="section-map-tab">
        {selectedSchema && (
          <>
            <label>Section Layer:</label>
            <input type="text" value={sectionTable} disabled style={{ background: "#f0f0f0", color: "#555" }} />

            <label>Other Layers:</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select value={selectedOtherLayer} onChange={e => setSelectedOtherLayer(e.target.value)}>
                <option value="">-- Select Table --</option>
                {availableOtherLayers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button onClick={addOtherLayer}>➕</button>
            </div>

            {otherLayers.length > 0 && (
              <div className="other-layers-box">
                <div className="other-layers-list">
                  {otherLayers.map(t => (
                    <div key={t} className="other-layer-item">
                      <span>{t}</span>
                      <button onClick={() => removeOtherLayer(t)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label>Basemap:</label>
            <select
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
            >
              <option value="blank">None</option>
              <option value="osm">OpenStreetMap</option>
              <option value="satellite">Satellite</option>
            </select>

            {sectionTable && (
              <button style={{ marginTop: "1.5rem" }} onClick={() => setShowModal(true)}>
                Next
              </button>
            )}
          </>
        )}
      </div>

      {showModal && (
        <SectionMapForm
          layoutBarangay={formData.barangay}
          layoutBarangayOptions={layoutBarangayOptions}
          paperSize={formData.paperSize}
          scale={formData.scale}
          preparedBy={formData.preparedBy}
          verifiedBy={formData.verifiedBy}
          recommendingApproval={formData.recommendingApproval}
          approvedBy={formData.approvedBy}
          provCode={formData.provCode}
          munDist={formData.munDist}
          barangayOverride={formData.barangayOverride}
          sectionOverride={formData.sectionOverride}
          onChange={setFormData}
          onApply={() => {
            setShowModal(false);
            setShowOverlay(true);
          }}
          onCancel={() => setShowModal(false)}
        />
      )}

      {showOverlay && (
        <TMLpreview
          sectionLayerData={sectionLayerData}
          barangay={formData.barangay}
          schema={selectedSchema}
          paperSize={formData.paperSize}
          scale={formData.scale}
          preparedBy={formData.preparedBy}
          verifiedBy={formData.verifiedBy}
          recommendingApproval={formData.recommendingApproval}
          approvedBy={formData.approvedBy}
          provCode={formData.provCode}
          munDist={formData.munDist}
          barangayOverride={formData.barangayOverride}
          sectionOverride={formData.sectionOverride}
          sectionTable={sectionTable}
          otherLayers={otherLayers}
          background={formData.background}
          onClose={() => setShowOverlay(false)}
        />
      )}
    </>
  );
};

export default SectionMap;
