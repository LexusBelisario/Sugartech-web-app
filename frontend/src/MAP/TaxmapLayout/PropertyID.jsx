import React, { useEffect, useState } from "react";
import Form from "./Form.jsx";
import PropertyIDPreview from "./PropertyIDpreview.jsx";
import "./PropertyID.css";

const PropertyID = ({ map, selectedSchema }) => {
  const [allTables, setAllTables] = useState([]);
  const [sectionLayerName, setSectionLayerName] = useState("");
  const [parcelLayerData, setParcelLayerData] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [sectionLayerData, setSectionLayerData] = useState([]);
  const [layoutBarangayOptions, setLayoutBarangayOptions] = useState([]);
  const [layoutSectionOptions, setLayoutSectionOptions] = useState([]);
  const [otherLayers, setOtherLayers] = useState([]);
  const [otherLayerData, setOtherLayerData] = useState([]);
  const [selectedOtherLayer, setSelectedOtherLayer] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const [formData, setFormData] = useState({
    barangay: "",
    section: "",
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
    setAllTables([]);
    setSectionLayerName("");
    setOtherLayers([]);
    setSelectedOtherLayer("");
    setParcelLayerData([]);
    setSectionLayerData([]);

    fetch(`http://127.0.0.1:8000/tables-in-schema?schema=${selectedSchema}`)
      .then(res => res.json())
      .then(data => {
        const tables = data.data || [];
        setAllTables(tables);


        // Auto-detect section boundary
        const section = tables.find(t => /section/i.test(t));
        if (section) setSectionLayerName(section);

        const defaultOther = [section, "RoadNetwork", "SurfaceWater"].filter(t => tables.includes(t));
        setOtherLayers(defaultOther);
      });
  }, [selectedSchema]);

useEffect(() => {
  const barangaySet = new Set();
  window.parcelLayers?.forEach(({ feature }) => {
    const brgy = feature?.properties?.barangay;
    if (brgy) barangaySet.add(brgy);
  });
  setBarangayOptions([...barangaySet].sort());
}, []);

useEffect(() => {
  if (!formData.barangay) return;

  const filtered = window.parcelLayers
    .filter(({ feature }) => feature.properties?.barangay === formData.barangay)
    .map(p => p.feature);

  setParcelLayerData(filtered);
}, [formData.barangay]);


  useEffect(() => {
    if (!sectionLayerName) return;

    fetch(`http://127.0.0.1:8000/single-table?schema=${selectedSchema}&table=${sectionLayerName}`)
      .then(res => res.json())
      .then(data => {
        setSectionLayerData(data.features || []);
        const sectionSet = new Set();
        data.features.forEach(f => {
          if (f.properties?.section) sectionSet.add(f.properties.section);
        });
        setLayoutSectionOptions([...sectionSet].sort());
      });
  }, [sectionLayerName]);

  const addOtherLayer = () => {
    if (
    selectedOtherLayer &&
    !otherLayers.includes(selectedOtherLayer)
    ) {

      setOtherLayers([...otherLayers, selectedOtherLayer]);
      setSelectedOtherLayer("");
    }
  };

  const removeOtherLayer = (layer) => {
    setOtherLayers(otherLayers.filter(t => t !== layer));
  };

  useEffect(() => {
  if (!selectedSchema || otherLayers.length === 0) {
    setOtherLayerData([]);
    return;
  }

  Promise.all(
    otherLayers.map(table =>
      fetch(`http://127.0.0.1:8000/single-table?schema=${selectedSchema}&table=${table}`)
        .then(res => res.json())
        .then(data => ({ table, features: data.features || [] }))
    )
  ).then(setOtherLayerData);
}, [selectedSchema, otherLayers]);


    const availableOtherLayers = allTables.filter(
    t => !/parcel/i.test(t) && !otherLayers.includes(t)
    );


  return (
    <>
      <div className="property-id-tab">
        {selectedSchema && (
          <>
            <label>Barangay:</label>
            <select
                value={formData.barangay}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                >
                <option value="">-- Select Barangay --</option>
                {barangayOptions.map(b => (
                    <option key={b} value={b}>{b}</option>
                ))}
            </select>



            <label>Other Layers:</label>
            <div className="layer-add-row">
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

                {formData.barangay && (
                <button style={{ marginTop: "1.5rem" }} onClick={() => setShowModal(true)}>
                Next
              </button>
            )}
          </>
        )}
      </div>

      {showModal && (
        <Form
            mode="propertyid"
            layoutBarangay={formData.barangay}
            layoutBarangayOptions={layoutBarangayOptions}
            sectionOptions={layoutSectionOptions.filter(s =>
                sectionLayerData.some(f =>
                f.properties?.section === s &&
                f.properties?.barangay === formData.barangay
                )
            )}
          selectedSection={formData.section}
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
      <PropertyIDPreview
        parcelLayerData={parcelLayerData}
        sectionLayerData={sectionLayerData}
        selectedSection={formData.section}
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
        otherLayers={otherLayerData}
        background={formData.background}
        onClose={() => setShowOverlay(false)}
      />
      )}
    </>
  );
};

export default PropertyID;
