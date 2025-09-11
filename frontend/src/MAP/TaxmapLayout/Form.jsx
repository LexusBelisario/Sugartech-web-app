import React from "react";
import "./form.css";

const SectionMapForm = ({
  mode,
  layoutBarangay,
  layoutBarangayOptions,
  sectionOptions,
  selectedSection,
  paperSize,
  preparedBy,
  verifiedBy,
  recommendingApproval,
  approvedBy,
  provCode,
  munDist,
  barangayOverride,
  sectionOverride,
  scale,
  parcelOptions,           // NEW PROP for VICINITY mode
  selectedParcel,          // NEW PROP for VICINITY mode
  onChange,
  onApply,
  onCancel
}) => {
  const update = (field, value) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="taxmap-modal">
      <div className="modal-content">
        <h4 className="modal-title">
          {mode === "propertyid"
            ? "Property ID Map"
            : mode === "vicinity"
            ? "Vicinity Map"
            : "Section Map"}
        </h4>

        {mode === "vicinity" && (
          <div className="form-group">
            <label>Parcel:</label>
            <select
              value={selectedParcel}
              onChange={(e) => update("parcel", e.target.value)}
            >
              <option value="">-- Select Parcel --</option>
              {parcelOptions?.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "propertyid" && (
          <div className="form-group">
            <label>Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => update("section", e.target.value)}
            >
              <option value="">-- Select Section --</option>
              {sectionOptions.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "section" && (
          <div className="form-group">
            <label>Barangay: </label>
            <select
              value={layoutBarangay}
              onChange={e => update("barangay", e.target.value)}
            >
              <option value="">-- Select --</option>
              {layoutBarangayOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}

        {/* Paper Size */}
        <div className="form-group">
          <label>Paper Size: </label>
          <select value={paperSize} onChange={e => update("paperSize", e.target.value)}>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="A3">A3</option>
            <option value="A4">A4</option>
          </select>
        </div>

        {/* Scale */}
        <div className="form-group">
          <label>Scale: </label>
          <input
            type="number"
            value={scale}
            onChange={e => update("scale", e.target.value)}
            placeholder="Enter scale value"
          />
        </div>

        {/* Signatories */}
        <div className="form-group"><label>Prepared By:</label>
          <input type="text" value={preparedBy} onChange={e => update("preparedBy", e.target.value)} />
        </div>
        <div className="form-group"><label>Verified By:</label>
          <input type="text" value={verifiedBy} onChange={e => update("verifiedBy", e.target.value)} />
        </div>
        <div className="form-group"><label>Recommending Approval:</label>
          <input type="text" value={recommendingApproval} onChange={e => update("recommendingApproval", e.target.value)} />
        </div>
        <div className="form-group"><label>Approved By:</label>
          <input type="text" value={approvedBy} onChange={e => update("approvedBy", e.target.value)} />
        </div>

        {/* Metadata */}
        <div className="quad-row">
          <div className="form-group">
            <label>Prov. Code</label>
            <input type="text" value={provCode} onChange={e => update("provCode", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Mun./Dist. Code</label>
            <input type="text" value={munDist} onChange={e => update("munDist", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Barangay Code</label>
            <input type="text" value={barangayOverride} onChange={e => update("barangayOverride", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Section Code</label>
            <input type="text" value={sectionOverride} onChange={e => update("sectionOverride", e.target.value)} />
          </div>
        </div>

        {/* Buttons */}
        <div className="form-buttons">
          <button onClick={onApply}>APPLY</button>
          <button onClick={onCancel} style={{ marginLeft: "10px" }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
};

export default SectionMapForm;
