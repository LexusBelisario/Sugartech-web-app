// SearchResults.jsx
import API from "../../api.js";
import React from "react";
import L from "leaflet";

// Displays the list of matched parcel PINs after a property search
// Also handles click behavior to highlight and zoom to a selected result

const SearchResults = ({
  pins = [],
  noInput = false,
  selectedPin,
  setSelectedPin,
}) => {
  // === Handle click on a search result ===
  const handleResultClick = async (pin) => {
    const match = window.parcelLayers?.find(
      ({ feature }) => feature.properties.pin === pin
    );
    if (!match) {
      console.warn("⚠️ No parcel layer found for PIN:", pin);
      return;
    }

    // Reset previous selected parcel to lime highlight
    window.parcelLayers?.forEach(({ feature, layer }) => {
      if (feature.properties.pin === selectedPin) {
        layer.setStyle({
          color: "black",
          weight: 2,
          fillColor: "lime",
          fillOpacity: 0.2,
        });
      }
    });

    // Highlight the newly selected parcel
    setSelectedPin(pin);
    match.layer.setStyle({
      color: "yellow",
      weight: 3,
      fillColor: "yellow",
      fillOpacity: 0.3,
    });

    // ✅ Guaranteed zoom logic (always works even if layer lacks getBounds)
    try {
      if (window.map && match.feature?.geometry) {
        const geo = L.geoJSON(match.feature.geometry);
        const bounds = geo.getBounds();
        if (bounds.isValid()) {
          window.map.fitBounds(bounds, { maxZoom: 19 });
        } else {
          console.warn("⚠️ Invalid geometry bounds for PIN:", pin);
        }
      } else {
        console.warn("⚠️ Missing map or geometry for zoom.");
      }
    } catch (err) {
      console.error("❌ Error zooming to parcel:", err);
    }

    // === Fetch parcel info for InfoTool (safe guarded)
    const schema = match.feature.properties.source_schema;
    try {
      const url = `${API}/parcel-info?schema=${schema}&pin=${pin}`;
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken");

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

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
      if (json.status === "success" && json.data) {
        if (typeof window.populateParcelInfo === "function") {
          window.populateParcelInfo(json.data);
        } else {
          console.warn("⚠️ populateParcelInfo not defined; skipping info panel.");
        }
      } else {
        console.warn("Parcel info not found for", pin);
      }
    } catch (err) {
      console.error("Error loading parcel info:", err);
    }
  };

  // === UI when no input ===
  if (noInput) {
    return (
      <div className="search-results">
        <p style={{ color: "#000", fontStyle: "italic" }}>
          Please enter at least one search field.
        </p>
      </div>
    );
  }

  // === Main results list ===
  return (
    <div className="search-results">
      {pins.length === 0 ? (
        <>
          <p>
            <b>Results:</b> 0
          </p>
          <p style={{ color: "#555", fontStyle: "italic" }}>No matches found.</p>
        </>
      ) : (
        <>
          <p>
            <b>Results:</b> {pins.length}
          </p>
          <ul>
            {pins.map((pin, idx) => (
              <li
                key={idx}
                className={selectedPin === pin ? "selected" : ""}
                onClick={() => handleResultClick(pin)}
              >
                {pin}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SearchResults;
