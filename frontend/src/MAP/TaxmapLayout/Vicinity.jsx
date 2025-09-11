import React, { useEffect, useState } from "react";
import Form from "./Form.jsx";
import VicinityPreview from "./VicinityPreview.jsx";
import "./Vicinity.css";

const Vicinity = ({ map, selectedSchema }) => {
  const [sectionLayerData, setSectionLayerData] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [parcelOptions, setParcelOptions] = useState([]);
  const [allTables, setAllTables] = useState([]);
  const [selectedOtherLayer, setSelectedOtherLayer] = useState("");
  const [otherLayers, setOtherLayers] = useState(["RoadNetwork"]);

  const [formData, setFormData] = useState({
    barangay: "",
    section: "",
    parcel: "",
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

  const [showModal, setShowModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const brgySet = new Set();
    window.parcelLayers?.forEach(({ feature }) => {
      const brgy = feature?.properties?.barangay;
      if (brgy) brgySet.add(brgy);
    });
    setBarangayOptions([...brgySet].sort());
  }, []);

  useEffect(() => {
    if (!selectedSchema) return;

    fetch(`http://127.0.0.1:8000/tables-in-schema?schema=${selectedSchema}`)
      .then(res => res.json())
      .then(data => {
        const tables = data.data || [];
        setAllTables(tables);

        const section = tables.find(t => /section/i.test(t));
        if (section) {
          fetch(`http://127.0.0.1:8000/single-table?schema=${selectedSchema}&table=${section}`)
            .then(res => res.json())
            .then(data => {
              setSectionLayerData(data.features || []);
            });
        }
      });
  }, [selectedSchema]);

  useEffect(() => {
    if (!formData.barangay) {
      setSectionOptions([]);
      return;
    }

    const sections = new Set();
    sectionLayerData.forEach(f => {
      if (f.properties?.barangay === formData.barangay && f.properties?.section) {
        sections.add(f.properties.section);
      }
    });

    setSectionOptions([...sections].sort());
  }, [formData.barangay, sectionLayerData]);

  useEffect(() => {
    if (!formData.barangay || !formData.section) {
      setParcelOptions([]);
      return;
    }

    const matching = window.parcelLayers
      .filter(({ feature }) =>
        feature?.properties?.barangay === formData.barangay &&
        feature?.properties?.section === formData.section &&
        feature?.properties?.parcel
      )
      .map(({ feature }) => feature.properties.parcel);

    setParcelOptions([...new Set(matching)].sort());
  }, [formData.barangay, formData.section]);

  const addOtherLayer = () => {
    if (selectedOtherLayer && !otherLayers.includes(selectedOtherLayer)) {
      setOtherLayers([...otherLayers, selectedOtherLayer]);
      setSelectedOtherLayer("");
    }
  };

  const removeOtherLayer = (layer) => {
    setOtherLayers(otherLayers.filter(t => t !== layer));
  };

  const availableOtherLayers = allTables.filter(
    t => !/parcel/i.test(t) && !otherLayers.includes(t)
  );

  return (
    <>
      <div className="vicinity-map-tab">
        {selectedSchema && (
          <>
            <label>Barangay:</label>
            <select
              value={formData.barangay}
              onChange={(e) =>
                setFormData({ ...formData, barangay: e.target.value, section: "", parcel: "" })
              }
            >
              <option value="">-- Select Barangay --</option>
              {barangayOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <label>Section:</label>
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value, parcel: "" })}
              disabled={!formData.barangay}
            >
              <option value="">-- Select Section --</option>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label>Other Layers:</label>
            <div className="layer-add-row">
              <select
                value={selectedOtherLayer}
                onChange={e => setSelectedOtherLayer(e.target.value)}
              >
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

            {formData.barangay && formData.section && (
              <button
                style={{ marginTop: "1.5rem" }}
                onClick={() => setShowModal(true)}
              >
                Next
              </button>
            )}
          </>
        )}
      </div>

      {showModal && (
        <Form
          mode="vicinity"
          layoutBarangay={formData.barangay}
          layoutBarangayOptions={barangayOptions}
          sectionOptions={sectionOptions}
          selectedSection={formData.section}
          selectedParcel={formData.parcel}
          parcelOptions={parcelOptions}
          showSectionField={true}
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
        <VicinityPreview
          background={formData.background}
          barangay={formData.barangay}
          section={formData.section}
          parcel={formData.parcel}
          otherLayers={otherLayers}
          onClose={() => setShowOverlay(false)}
        />
      )}
    </>
  );
};

export default Vicinity;
