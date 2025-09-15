// SearchResults.jsx
import API from "../../api.js"; // ✅ CHANGED from api_service to api.js
import React from "react";

// Displays the list of matched parcel PINs after a property search
// Also handles click behavior to highlight and zoom to a selected result

const SearchResults = ({
  pins = [],
  noInput = false,
  selectedPin,
  setSelectedPin,
}) => {
  // Called when a user clicks on a result
  const handleResultClick = async (pin) => {
    // Find the matching parcel by its PIN
    const match = window.parcelLayers?.find(
      ({ feature }) => feature.properties.pin === pin
    );
    if (!match) return;

    // Reset the previously selected parcel (if any) to lime highlight
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

    // Update selected pin
    setSelectedPin(pin);

    // Highlight the clicked result in yellow
    match.layer.setStyle({
      color: "yellow",
      weight: 3,
      fillColor: "yellow",
      fillOpacity: 0.3,
    });

    // Zoom the map to the bounds of the selected parcel
    window.map?.fitBounds(match.layer.getBounds(), { maxZoom: 19 });

    // Show parcel info in the info popup (if supported)
    // Optional: you can show a loader or disable clicks while this runs
    const schema = match.feature.properties.source_schema;

    try {
      const url = `${API}/parcel-info?schema=${schema}&pin=${pin}`;

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
      if (json.status === "success" && json.data) {
        window.populateParcelInfo(json.data);
      } else {
        console.warn("Parcel info not found for", pin);
      }
    } catch (err) {
      console.error("Error loading parcel info:", err);
    }
  };

  // === No input warning ===
  if (noInput) {
    return (
      <div className="search-results">
        <p style={{ color: "#000", fontStyle: "italic" }}>
          Please enter at least one search field.
        </p>
      </div>
    );
  }

  // === Main results UI ===
  return (
    <div className="search-results">
      {pins.length === 0 ? (
        // No matches found
        <>
          <p>
            <b>Results:</b> 0
          </p>
          <p style={{ color: "#555", fontStyle: "italic" }}>
            No matches found.
          </p>
        </>
      ) : (
        // Display matched PINs as clickable list items
        <>
          <p>
            <b>Results:</b> {pins.length}
          </p>
          <ul>
            {pins.map((pin, idx) => (
              <li
                key={idx}
                className={selectedPin === pin ? "selected" : ""} // Highlight if selected
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
