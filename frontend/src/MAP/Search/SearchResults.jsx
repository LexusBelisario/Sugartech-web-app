// SearchResults.jsx
import API from "../../api";
import React from "react";

// Displays the list of matched parcel PINs after a property search
// Also handles click behavior to highlight and zoom to a selected result

const SearchResults = ({ pins = [], noInput = false, selectedPin, setSelectedPin }) => {

  // Called when a user clicks on a result
  const handleResultClick = (pin) => {
    // Find the matching parcel by its PIN
    const match = window.parcelLayers?.find(({ feature }) => feature.properties.pin === pin);
    if (!match) return;

    // Reset the previously selected parcel (if any) to lime highlight
    window.parcelLayers?.forEach(({ feature, layer }) => {
      if (feature.properties.pin === selectedPin) {
        layer.setStyle({
          color: "black",
          weight: 2,
          fillColor: "lime",
          fillOpacity: 0.2
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
      fillOpacity: 0.3
    });

    // Zoom the map to the bounds of the selected parcel
    window.map?.fitBounds(match.layer.getBounds(), { maxZoom: 19 });

    // Show parcel info in the info popup (if supported)
    // Optional: you can show a loader or disable clicks while this runs
const schema = match.feature.properties.source_schema;

fetch(`${API}/parcel-info?schema=${schema}&pin=${pin}`)
  .then(res => res.json())
  .then(json => {
    if (json.status === "success" && json.data) {
      window.populateParcelInfo(json.data);
    } else {
      console.warn("Parcel info not found for", pin);
    }
  })
  .catch(err => console.error("Error loading parcel info:", err));

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
          <p><b>Results:</b> 0</p>
          <p style={{ color: "#555", fontStyle: "italic" }}>No matches found.</p>
        </>
      ) : (
        // Display matched PINs as clickable list items
        <>
          <p><b>Results:</b> {pins.length}</p>
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
