import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminBoundaries.css";
import BoundaryLayers from "./BoundaryLayers";

function AdminBoundaries() {
  const map = useMap();
  const [showBarangay, setShowBarangay] = useState(true);
  const [showSection, setShowSection] = useState(true);

  useEffect(() => {
    if (!map) return;

    // --- Municipal boundary (WMS)
    const municipalBoundary = L.tileLayer.wms(
      "http://104.199.142.35:8080/geoserver/MapBoundaries/wms",
      {
        layers: "MapBoundaries:PH_MunicipalMap",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        crs: L.CRS.EPSG4326,
      }
    );

    // --- Zoom thresholds ---
    const municipalMin = 4;
    const municipalMax = 14;
    const sectionParcelMinZoom = 16;
    const sectionParcelMaxZoom = 25;

    // --- Parcel outline color ---
    window.parcelOutlineColor = window.parcelOutlineColor || "black";

    const hiddenStyle = { opacity: 0, fillOpacity: 0 };

    // ✅ Function to get current parcel style (dynamic color)
    const getParcelVisibleStyle = () => ({
      color: window.parcelOutlineColor,
      weight: 1.2,
      opacity: 1,
      fillColor: "black",
      fillOpacity: 0.1,
    });

    const sectionVisibleStyle = {
      color: "#202020",
      weight: 0.8,
      opacity: 0.8,
      fillOpacity: 0.1,
    };

    // --- Bind parcel click (once only) ---
    function bindParcelClick(feature, layer) {
      layer.off("click");
      layer.on("click", () => {
        // Reset all parcel styles with current color
        const currentStyle = getParcelVisibleStyle();
        if (window.parcelLayers && Array.isArray(window.parcelLayers)) {
          window.parcelLayers.forEach(({ layer: l }) => {
            if (l && l.setStyle) {
              try {
                l.setStyle(currentStyle);
              } catch (e) {
                console.warn("Error resetting parcel style:", e);
              }
            }
          });
        }
        // Highlight selected parcel
        layer.setStyle({
          fillColor: "white",
          color: window.parcelOutlineColor,
          weight: 2.5,
          fillOpacity: 0.5,
        });
        // Show info popup
        if (document.getElementById("infoPopup") && window.populateParcelInfo) {
          window.populateParcelInfo(feature.properties);
        }
      });
    }

    // --- Maintain layer order ---
    function enforceLayerOrder() {
      // Sections to back
      if (window.sectionLayers && Array.isArray(window.sectionLayers)) {
        window.sectionLayers.forEach(({ layer }) => {
          if (layer && layer.bringToBack) {
            try {
              layer.bringToBack();
            } catch (e) {}
          }
        });
      }
      
      // Parcels to front
      if (window.parcelLayers && Array.isArray(window.parcelLayers)) {
        window.parcelLayers.forEach(({ layer }) => {
          if (layer && layer.bringToFront) {
            try {
              layer.bringToFront();
            } catch (e) {}
          }
        });
      }
      
      // Municipal boundary
      if (map.hasLayer(municipalBoundary)) {
        municipalBoundary.bringToFront();
      }
      
      // Barangay to front
      if (window.barangayLayers && Array.isArray(window.barangayLayers)) {
        window.barangayLayers.forEach(({ layer }) => {
          if (layer && layer.bringToFront) {
            try {
              layer.bringToFront();
            } catch (e) {}
          }
        });
      }
    }

    // --- Optimized visibility logic ---
    function updateVisibility(forceRefresh = false) {
      const zoom = map.getZoom();

      // Municipal visibility
      const municipalCheckbox = document.getElementById("municipal");
      const municipalVisible =
        zoom >= municipalMin &&
        zoom <= municipalMax &&
        (municipalCheckbox?.checked ?? true);

      if (municipalVisible) {
        if (!map.hasLayer(municipalBoundary)) map.addLayer(municipalBoundary);
      } else if (map.hasLayer(municipalBoundary)) {
        map.removeLayer(municipalBoundary);
      }

      const sectionCheckbox = document.getElementById("section");
      const parcelCheckbox = document.getElementById("parcels");
      const visible = zoom >= sectionParcelMinZoom && zoom <= sectionParcelMaxZoom;

      // --- Section visibility (from window.sectionLayers, not BoundaryLayers) ---
      if (window.sectionLayers && Array.isArray(window.sectionLayers)) {
        const show = visible && (sectionCheckbox?.checked ?? true);
        window.sectionLayers.forEach(({ layer }) => {
          if (!layer || !layer.setStyle) return;
          try {
            if (forceRefresh || layer._lastVisible !== show) {
              layer._lastVisible = show;
              layer.setStyle(show ? sectionVisibleStyle : hiddenStyle);
            }
          } catch (e) {
            console.warn("Error updating section style:", e);
          }
        });
      }

      // --- Parcel visibility ---
      if (window.parcelLayers && Array.isArray(window.parcelLayers)) {
        const show = visible && (parcelCheckbox?.checked ?? true);
        const currentStyle = getParcelVisibleStyle();
        
        window.parcelLayers.forEach(({ feature, layer }) => {
          if (!layer || !layer.setStyle) return;
          
          try {
            if (forceRefresh || layer._lastVisible !== show) {
              layer._lastVisible = show;
              if (show) {
                layer.setStyle(currentStyle);
                bindParcelClick(feature, layer);
              } else {
                layer.setStyle(hiddenStyle);
                layer.off("click");
              }
            } else if (show && forceRefresh) {
              // Update color even if already visible
              layer.setStyle(currentStyle);
            }
          } catch (e) {
            console.warn("Error updating parcel:", e);
          }
        });
      }

      enforceLayerOrder();
    }

    // --- Event listeners ---
    const handleZoomEnd = () => updateVisibility(false);
    map.on("zoomend", handleZoomEnd);
    window.onParcelsLoaded = () => updateVisibility(false);

    // ✅ Expose functions for external UI
    window._updateBoundaryVisibility = (forceRefresh = false) => updateVisibility(forceRefresh);
    window._setShowBarangay = setShowBarangay;
    window._setShowSection = setShowSection;

    // --- Initial run ---
    updateVisibility(false);

    window._boundaryLayers = { municipalBoundary };

    return () => {
      map.off("zoomend", handleZoomEnd);
      if (map.hasLayer(municipalBoundary)) map.removeLayer(municipalBoundary);
      delete window._boundaryLayers;
      delete window.onParcelsLoaded;
      delete window._updateBoundaryVisibility;
      delete window._setShowBarangay;
      delete window._setShowSection;
    };
  }, [map, setShowBarangay, setShowSection]);

  // ✅ Smooth zoom animation
  useEffect(() => {
    if (!map) return;

    let lastZoom = map.getZoom();
    let isUserZoom = false;

    const handleUserZoom = () => {
      isUserZoom = true;
    };

    const handleZoom = () => {
      const targetZoom = map.getZoom();
      if (!isUserZoom && targetZoom !== lastZoom) {
        const currentCenter = map.getCenter();
        map.flyTo(currentCenter, targetZoom, {
          animate: true,
          duration: 0.6,
          easeLinearity: 0.25,
        });
      }
      lastZoom = targetZoom;
      isUserZoom = false;
    };

    map.on("zoomstart", handleUserZoom);
    map.on("zoomend", handleZoom);

    return () => {
      map.off("zoomstart", handleUserZoom);
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  // ✅ Inject schema-based Barangay + Section boundaries
  return <BoundaryLayers showBarangay={showBarangay} showSection={showSection} />;
}

export default AdminBoundaries;