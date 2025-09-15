import React, { useEffect, useState } from "react";
import SearchResults from "./SearchResults";
import { clearParcelHighlights } from "./SearchHelpers";
import API from "../../api.js";

const PropertySearch = ({ schema }) => {
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
    lot: "",
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    provinces: [],
    municipals: [],
    barangays: [],
    sections: [],
  });

  const [searchResults, setSearchResults] = useState([]);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [noInputMessage, setNoInputMessage] = useState(false);

  // === Load JoinedTable on mount
  useEffect(() => {
    const loadJoinedTable = async () => {
      try {
        const url = `${API}/attribute-table?schema=${schema}`;

        // ✅ ADD AUTH HEADERS
        const token =
          localStorage.getItem("access_token") ||
          localStorage.getItem("accessToken");
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        // ✅ CHECK RESPONSE STATUS
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            console.error("❌ Authentication error");
            localStorage.removeItem("access_token");
            localStorage.removeItem("accessToken");
            window.location.href = "/login";
            return;
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        if (json.status === "success") setAttributeData(json.data || []);
      } catch (err) {
        console.error("❌ Failed to load JoinedTable:", err);
        setAttributeData([]);
      }
    };

    if (schema) loadJoinedTable();
  }, [schema]);

  // === Dropdown population
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

    setDropdownOptions({
      provinces: [...provinces].sort(),
      municipals: [...municipals].sort(),
      barangays: [...barangays].sort(),
      sections: [...sections].sort(),
    });
  }, [attributeData, filters.province, filters.municipal, filters.barangay]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearForm = () => {
    setFilters(Object.fromEntries(Object.keys(filters).map((k) => [k, ""])));
    setSearchResults([]);
    setSearchTriggered(false);
    setSelectedPin(null);
    setNoInputMessage(false);
    clearParcelHighlights();
  };

  const handlePropertySearch = () => {
    const hasInput = Object.values(filters).some((val) => val.trim() !== "");
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

    const matches = attributeData.filter((p) => {
      return (
        (!filters.province || p.province === filters.province) &&
        (!filters.municipal || p.municipal === filters.municipal) &&
        (!filters.barangay || p.barangay === filters.barangay) &&
        (!filters.section || p.section === filters.section) &&
        (!filters.parcel ||
          (p.parcel && p.parcel.toLowerCase().includes(filters.parcel))) &&
        (!filters.pin ||
          (p.pin && p.pin.toLowerCase().includes(filters.pin))) &&
        (!filters.arpn ||
          (p.arpn && p.arpn.toLowerCase().includes(filters.arpn))) &&
        (!filters.octtct ||
          (p.octtct && p.octtct.toLowerCase().includes(filters.octtct))) &&
        (!filters.td || (p.td && p.td.toLowerCase().includes(filters.td))) &&
        (!filters.cct ||
          (p.cct && p.cct.toLowerCase().includes(filters.cct))) &&
        (!filters.survey ||
          (p.survey && p.survey.toLowerCase().includes(filters.survey))) &&
        (!filters.cad ||
          (p.cad_no && p.cad_no.toLowerCase().includes(filters.cad))) &&
        (!filters.name ||
          (p.l_lastname && p.l_lastname.toLowerCase().includes(filters.name)) ||
          (p.l_frstname &&
            p.l_frstname.toLowerCase().includes(filters.name))) &&
        (!filters.block ||
          (p.blk_no && p.blk_no.toLowerCase().includes(filters.block))) &&
        (!filters.lot ||
          (p.lot_no && p.lot_no.toLowerCase().includes(filters.lot)))
      );
    });

    const pins = matches
      .map((m) => m.pin)
      .filter((pin) => !!pin)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => {
        const parse = (pin) => {
          const parts = pin.split("-");
          if (parts.length < 5) return 0;
          return parseInt(parts[3] + parts[4], 10) || 0;
        };
        return parse(a) - parse(b);
      });

    setSearchResults(pins);

    // Highlight on map
    for (const { feature, layer } of window.parcelLayers || []) {
      if (pins.includes(feature.properties.pin)) {
        layer.setStyle({
          color: "black",
          weight: 2,
          fillColor: "lime",
          fillOpacity: 0.2,
        });
      } else {
        layer.setStyle({
          color: "black",
          weight: 1,
          fillColor: "black",
          fillOpacity: 0.1,
        });
      }
    }
  };

  return (
    <div className="tab-content">
      <div className="field-grid">
        {["province", "municipal", "barangay", "section"].map((field) => (
          <div className="field-cell" key={field}>
            <label>{field}</label>
            <select
              value={filters[field]}
              onChange={(e) => updateFilter(field, e.target.value)}
            >
              <option value="">- Select -</option>
              {dropdownOptions[`${field}s`]?.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
        ))}

        {[
          "parcel",
          "pin",
          "arpn",
          "octtct",
          "td",
          "cct",
          "survey",
          "cad",
          "name",
          "block",
          "lot",
        ].map((field) => (
          <div className="field-cell" key={field}>
            <label>{field.toUpperCase()}</label>
            <input
              value={filters[field]}
              onChange={(e) => updateFilter(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="button-row">
        <button className="search-btn" onClick={handlePropertySearch}>
          Search
        </button>
        <button className="clear-btn" onClick={clearForm}>
          Clear
        </button>
      </div>

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
