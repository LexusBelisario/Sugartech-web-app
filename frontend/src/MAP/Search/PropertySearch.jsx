import React, { useState, useEffect } from "react";
import API from "../../api";
import { useSchema } from "../SchemaContext";
import SearchResults from "./SearchResults";
import { clearParcelHighlights } from "./SearchHelpers";
import "./Search.css";

const PropertySearch = () => {
  const { schema } = useSchema();
  const [attributeData, setAttributeData] = useState([]);
  const [filters, setFilters] = useState({
    province: "",
    municipal: "",
    barangay: "",
    section: "",
    parcel: "",
    pin: "",
    arpn: "",
    octtct: "",
    td: "",
    cct: "",
    survey: "",
    cad: "",
    name: "",
    block: "",
    lot: ""
  });

  const [dropdowns, setDropdowns] = useState({
    provinces: [],
    municipals: [],
    barangays: [],
    sections: []
  });

  const [searchResults, setSearchResults] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [noInputMessage, setNoInputMessage] = useState(false);

  // ============================================================
  // 🧭 Load JoinedTable when schema changes
  // ============================================================
  useEffect(() => {
    if (!schema) return;
    const fetchJoinedTable = async () => {
      try {
        const res = await fetch(`${API}/attribute-table?schema=${schema}`);
        const json = await res.json();
        if (json.status === "success") {
          console.log(`✅ Loaded JoinedTable for ${schema}: ${json.data.length} records`);
          setAttributeData(json.data);
        } else {
          console.warn("⚠️ Failed to load JoinedTable:", json.message);
        }
      } catch (err) {
        console.error("❌ Error fetching JoinedTable:", err);
      }
    };
    fetchJoinedTable();
  }, [schema]);

  // ============================================================
  // 🧩 Populate hierarchical dropdowns
  // ============================================================
  useEffect(() => {
    const provinces = new Set();
    const municipals = new Set();
    const barangays = new Set();
    const sections = new Set();

    attributeData.forEach((p) => {
      if (p.province) provinces.add(p.province);

      if (!filters.province || p.province === filters.province) {
        if (p.municipal) municipals.add(p.municipal);
      }

      if (
        (!filters.province || p.province === filters.province) &&
        (!filters.municipal || p.municipal === filters.municipal)
      ) {
        if (p.barangay) barangays.add(p.barangay);
      }

      if (
        (!filters.province || p.province === filters.province) &&
        (!filters.municipal || p.municipal === filters.municipal) &&
        (!filters.barangay || p.barangay === filters.barangay)
      ) {
        if (p.section) sections.add(p.section);
      }
    });

    setDropdowns({
      provinces: [...provinces].sort(),
      municipals: [...municipals].sort(),
      barangays: [...barangays].sort(),
      sections: [...sections].sort()
    });
  }, [attributeData, filters.province, filters.municipal, filters.barangay]);

  // ============================================================
  // ✏️ Helpers
  // ============================================================
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearForm = () => {
    setFilters(Object.fromEntries(Object.keys(filters).map((k) => [k, ""])));
    setSearchResults([]);
    setSelectedPin(null);
    setSearchTriggered(false);
    setNoInputMessage(false);
    clearParcelHighlights();
  };

  // ============================================================
  // 🔍 Search Logic
  // ============================================================
  const handlePropertySearch = () => {
    const hasInput = Object.values(filters).some((v) => v.trim() !== "");
    if (!hasInput) {
      setNoInputMessage(true);
      setSearchResults([]);
      setSearchTriggered(true);
      return;
    }

    setSearchTriggered(true);
    setNoInputMessage(false);
    setSelectedPin(null);
    clearParcelHighlights();

    // === Perform local filtering ===
    const results = attributeData.filter((p) => {
      return (
        (!filters.province || p.province === filters.province) &&
        (!filters.municipal || p.municipal === filters.municipal) &&
        (!filters.barangay || p.barangay === filters.barangay) &&
        (!filters.section || p.section === filters.section) &&
        (!filters.parcel || (p.parcel && p.parcel.toLowerCase().includes(filters.parcel.toLowerCase()))) &&
        (!filters.pin || (p.pin && p.pin.toLowerCase().includes(filters.pin.toLowerCase()))) &&
        (!filters.arpn || (p.arpn && p.arpn.toLowerCase().includes(filters.arpn.toLowerCase()))) &&
        (!filters.octtct || (p.octtct && p.octtct.toLowerCase().includes(filters.octtct.toLowerCase()))) &&
        (!filters.td || (p.td && p.td.toLowerCase().includes(filters.td.toLowerCase()))) &&
        (!filters.cct || (p.cct && p.cct.toLowerCase().includes(filters.cct.toLowerCase()))) &&
        (!filters.survey || (p.survey && p.survey.toLowerCase().includes(filters.survey.toLowerCase()))) &&
        (!filters.cad || (p.cad_no && p.cad_no.toLowerCase().includes(filters.cad.toLowerCase()))) &&
        (!filters.name ||
          (p.l_lastname && p.l_lastname.toLowerCase().includes(filters.name.toLowerCase())) ||
          (p.l_frstname && p.l_frstname.toLowerCase().includes(filters.name.toLowerCase()))) &&
        (!filters.block || (p.blk_no && p.blk_no.toLowerCase().includes(filters.block.toLowerCase()))) &&
        (!filters.lot || (p.lot_no && p.lot_no.toLowerCase().includes(filters.lot.toLowerCase())))
      );
    });

    // === Extract unique sorted PINs ===
    const pins = results
      .map((r) => r.pin)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();

    // === Highlight on map ===
    (window.parcelLayers || []).forEach(({ feature, layer }) => {
      if (pins.includes(feature.properties.pin)) {
        layer.setStyle({ color: "black", weight: 2, fillColor: "lime", fillOpacity: 0.2 });
      } else {
        layer.setStyle({ color: "black", weight: 1, fillColor: "black", fillOpacity: 0.1 });
      }
    });

    setSearchResults(pins);
  };

  // ============================================================
  // 🧱 UI
  // ============================================================
  return (
    <div className="tab-content">
      {/* === Input Fields === */}
      <div className="field-grid">
        {["province", "municipal", "barangay", "section"].map((key) => (
          <div className="field-cell" key={key}>
            <label>{key}</label>
            <select value={filters[key]} onChange={(e) => updateFilter(key, e.target.value)}>
              <option value="">- Select -</option>
              {dropdowns[`${key}s`].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
        ))}

        {["parcel", "pin", "arpn", "octtct", "td", "cct", "survey", "cad", "name", "block", "lot"].map((key) => (
          <div className="field-cell" key={key}>
            <label>{key.toUpperCase()}</label>
            <input value={filters[key]} onChange={(e) => updateFilter(key, e.target.value)} />
          </div>
        ))}
      </div>

      {/* === Buttons === */}
      <div className="button-row">
        <button className="search-btn" onClick={handlePropertySearch}>
          Search
        </button>
        <button className="clear-btn" onClick={clearForm}>
          Clear
        </button>
      </div>

      {/* === Results === */}
      {searchTriggered && (
        <SearchResults
          pins={searchResults}
          noInput={noInputMessage}
          selectedPin={selectedPin}
          setSelectedPin={setSelectedPin}
        />
      )}
    </div>
  );
};

export default PropertySearch;
