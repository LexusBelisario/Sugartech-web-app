import React, { useEffect, useState } from "react";
import L from "leaflet";
import domtoimage from "dom-to-image-more";
import * as turf from "@turf/turf";
import "leaflet-textpath";
import "./PropertyIDpreview.css";

const PropertyIDPreview = ({
  otherLayers,
  background = "osm",
  onClose,
  parcelLayerData,
  sectionLayerData,
  barangay,
  selectedSection,
  preparedBy,
  verifiedBy,
  recommendingApproval,
  approvedBy,
  provCode,
  munDist,
  barangayOverride,
  sectionOverride,
}) => {
  const [computedScale, setComputedScale] = useState(2000); // default scale display

  useEffect(() => {
    const mapDiv = document.getElementById("mapCanvas");
    if (!mapDiv) return;

    if (mapDiv._leaflet_id) {
      mapDiv._leaflet_id = null;
      mapDiv.innerHTML = "";
    }

    const map = L.map(mapDiv, {
      center: [10.3157, 123.8854],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    let tileLayer;
    if (background === "satellite") {
      tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "&copy; Esri, Maxar, Earthstar Geographics", maxZoom: 22
      });
    } else if (background === "blank") {
      tileLayer = L.tileLayer("", { attribution: "" });
    } else {
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors", maxZoom: 22
      });
    }

    tileLayer.addTo(map);
    const sectionInOther = otherLayers.some(l =>
      typeof l.table === "string" && /section/i.test(l.table)
    );

if (sectionInOther && Array.isArray(sectionLayerData) && sectionLayerData.length > 0) {
  const filteredSections = sectionLayerData.filter(f => {
    const brgy = f.properties?.barangay;
    const name = f.properties?.section;
    return (
      (brgy === barangay || brgy === barangayOverride) &&
      name !== sectionOverride
    );
  });

  L.geoJSON(filteredSections, {
    style: {
      color: "#444",
      weight: 2.5,
      dashArray: null,
      fillOpacity: 0
    }
  }).addTo(map);
}


const pointMarkers = L.layerGroup().addTo(map);
const sectionMarkers = L.layerGroup().addTo(map);
const parcelMarkers = L.layerGroup().addTo(map);

const seen = new Set();
const mapCenter = map.getCenter();

sectionLayerData.forEach(f => {
  const name = f.properties?.section;
if (!name || seen.has(name)) return;
if (f.properties?.barangay !== barangay) return;


  const geo = L.geoJSON(f);
  const bounds = geo.getBounds();
  const center = bounds.getCenter();
  let bestPoint = center;

  const steps = [0.9, 0.7, 0.5, 0.3];
  for (let step of steps) {
    const shifted = L.latLng(
      center.lat + (mapCenter.lat - center.lat) * step,
      center.lng + (mapCenter.lng - center.lng) * step
    );

    const turfPoint = turf.point([shifted.lng, shifted.lat]);
    const turfPolygon = turf.polygon(
      f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates[0]
        : f.geometry.coordinates
    );

    if (turf.booleanPointInPolygon(turfPoint, turfPolygon)) {
      bestPoint = shifted;
      break;
    }
  }

  L.marker(bestPoint, {
    icon: L.divIcon({
      className: "engraved-label",
      html: name,
      iconSize: null
    }),
    interactive: false
  }).addTo(map);

  seen.add(name);
});


    mapDiv._leaflet_map = map;

if (Array.isArray(parcelLayerData) && parcelLayerData.length > 0) {
  const filtered = parcelLayerData.filter(f =>
    (!barangay || f.properties?.barangay === barangay) &&
    (!selectedSection || f.properties?.section === selectedSection)
  );

  const parcelLayer = L.geoJSON(filtered, {
    style: {
      color: "black",
      weight: 1.5,
      fillOpacity: 0.3
    }
  }).addTo(map);
const roadLabelLayer = L.layerGroup().addTo(map);
const mapCenter = map.getBounds().getCenter();
const labelLayer = L.layerGroup().addTo(map);
const addLabel = (latlng, text) => {
  L.marker(latlng, {
    icon: L.divIcon({
      className: "engraved-label",
      html: text,
      iconSize: null
    }),
    interactive: false
  }).addTo(labelLayer);
};

otherLayers?.forEach(({ table, features }) => {
  if (!/barangay/i.test(table) || !features?.length) return;

  const seen = new Set();

features.forEach(f => {
  const name = f.properties?.barangay;
  if (!name || seen.has(name)) return;
  if (name === barangay || name === barangayOverride) return;

  const geom = f.geometry;
  if (!geom || !geom.coordinates) return;

  const coords = geom.type === "MultiPolygon"
    ? geom.coordinates[0]
    : geom.coordinates;

  const turfPolygon = turf.polygon(coords);
  const center = turf.centerOfMass(turfPolygon).geometry.coordinates;
  let shifted = [...center]; // [lng, lat]

  const mapCenter = map.getBounds().getCenter();
  const target = [mapCenter.lng, mapCenter.lat];

  const steps = [0.2, 0.4, 0.6, 0.8, 1.0];
  let bestPoint = turf.point(shifted);

  for (let step of steps) {
    shifted = [
      center[0] + (target[0] - center[0]) * step,
      center[1] + (target[1] - center[1]) * step, 
    ];
    const testPoint = turf.point(shifted);
    if (turf.booleanPointInPolygon(testPoint, turfPolygon)) {
      bestPoint = testPoint;
      break;
    }
  }     

  const [lng, lat] = bestPoint.geometry.coordinates;

  addLabel([lat, lng], name);
  seen.add(name);
});
});

otherLayers?.forEach(({ table, features }) => {
if (!/barangay/i.test(table) || !Array.isArray(features) || !features.length) return;

const filtered = features.filter(f => {
  const name = f.properties?.barangay;
  return name && name !== barangay && name !== barangayOverride;
});

const layer = L.geoJSON(filtered, {
  style: {
    color: "#222",
    weight: 2.5,
    dashArray: "8,6",
    fillOpacity: 0
  }
}).addTo(map);

const seen = new Set();
const mapCenter = map.getBounds().getCenter();


sectionLayerData.forEach(f => {
  const name = f.properties?.section;
  const brgy = f.properties?.barangay;

  if (!name || seen.has(name)) return;
  if (brgy !== barangay && brgy !== barangayOverride) return;
  if (name === sectionOverride) return;

  seen.add(name);

  L.geoJSON(f, {
    style: {
      color: "#444",
      weight: 2.5,
      fillOpacity: 0,
      dashArray: null
    }
  }).addTo(map);

  const poly = f.geometry;
  const bounds = L.geoJSON(f).getBounds();
  const center = bounds.getCenter();
  let bestPoint = center;

  const steps = [0.9, 0.7, 0.5, 0.3];
  for (let step of steps) {
    const shifted = L.latLng(
      center.lat + (mapCenter.lat - center.lat) * step,
      center.lng + (mapCenter.lng - center.lng) * step
    );

    const turfPoint = turf.point([shifted.lng, shifted.lat]);

    let coords = [];

    if (
      poly?.type === "MultiPolygon" &&
      Array.isArray(poly.coordinates) &&
      Array.isArray(poly.coordinates[0])
    ) {
      coords = poly.coordinates[0];
    } else if (
      poly?.type === "Polygon" &&
      Array.isArray(poly.coordinates)
    ) {
      coords = poly.coordinates;
    }

    if (coords.length > 0) {
      const turfPolygon = turf.polygon(coords);
      if (turf.booleanPointInPolygon(turfPoint, turfPolygon)) {
        bestPoint = shifted;
        break;
      }
    }
  }

  L.marker(bestPoint, {
    icon: L.divIcon({
      className: "engraved-label",
      html: name,
      iconSize: null
    }),
    interactive: false
  }).addTo(map);
});
});


otherLayers?.forEach(({ table, features }) => {
  if (!/roadnetwork/i.test(table) || !Array.isArray(features) || !features.length) return;

  features.forEach(f => {
    const name =
      f.properties?.road_name ||
      f.properties?.name ||
      f.properties?.label ||
      f.properties?.roadlabel;

    let coords = f.geometry?.coordinates;
    if (!coords || !name) return;

    const type = f.geometry?.type;
    if (type === "MultiLineString") coords = coords[0];
    if (!coords || coords.length < 2) return;

    const dx = coords[coords.length - 1][0] - coords[0][0];
    const dy = coords[coords.length - 1][1] - coords[0][1];
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle > 90 || angle < -90) coords.reverse();

    const latlngs = coords.map(([lng, lat]) => [lat, lng]);

const polyline = L.polyline(latlngs, {
  color: "transparent",
  weight: 0.1,
  opacity: 0
}).addTo(roadLabelLayer);

  polyline.setText(name, {
    repeat: false,
    center: true,
    offset: 0,
    attributes: {
      fill: "#222",
      "font-weight": "bold",
      "font-size": "12px"
    }
  });
  });
});




// Add parcel labels on top of features
filtered.forEach(f => {
  const center = L.geoJSON(f).getBounds().getCenter();
  const label = f.properties?.parcel || "—";
  L.marker(center, {
    icon: L.divIcon({
      className: "engraved-label",
      html: label,
      iconSize: null
    }),
    interactive: false
  }).addTo(map);
});

map.whenReady(() => {
  const bounds = parcelLayer.getBounds();

    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds);
    }
  });
}


    map.on("zoomend", () => {
      const zoom = map.getZoom();
      const zoomScaleMap = {
        22: 100, 21: 200, 20: 250, 19: 400, 18: 500,
        17: 1000, 16: 1500, 15: 2000, 14: 3000,
        13: 4000, 12: 5000, 11: 10000, 10: 20000
      };
      if (zoomScaleMap[zoom]) {
        setComputedScale(zoomScaleMap[zoom]);
      }
    });

    return () => map.remove();
  }, [background]);

  const handlePrint = () => {
    const layout = document.getElementById("layoutPreview");
    if (!layout) return;

    domtoimage.toPng(layout).then(dataUrl => {
      const win = window.open("", "_blank");

      win.document.write(`
        <html>
          <head>
            <title>Print</title>
            <style>
              @page {
                size: A3 landscape;
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
              }
              body {
                position: relative;
              }
              #fixed-image {
                position: absolute;
                top: 1cm;
                left: 5cm;
                width: calc(42cm - 6cm);
                height: calc(29.7cm - 2cm);
                background: white;
              }
            </style>
          </head>
          <body>
            <img id="fixed-image" src="${dataUrl}" />
          </body>
        </html>
      `);

      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 800);
    });
  };

  return (
    <div className="layout-overlay">
      <div className="layout-toolbar">
        <button onClick={handlePrint}>Print</button>
        <button onClick={onClose}>Close</button>
      </div>

      <div
        id="layoutPreview"
        className="print-layout"
        style={{
          width: "1000px",
          height: "707px",
          transformOrigin: "center",
          backgroundColor: "white",
          overflow: "hidden",
          position: "relative",
          boxSizing: "border-box"
        }}
      >
        <div className="layout-border" />
        <div id="mapCanvas" className="map-canvas"></div>

          <div className="index-overlay">
            <img
              src="/NorthArrow.png"
              alt="North Arrow"
              className="index-overlay-logo"
            />
            <div className="info-header">PROPERTY IDENTIFICATION MAP</div>

          <div className="info-scale">
            <span className="scale-label">Scale 1:</span>
            <span className="scale-value">{computedScale}</span>
          </div>


          {[{ label: "Prepared by:", value: preparedBy, role: "Tax Mapper" },
            { label: "Verified by:", value: verifiedBy, role: "Chief, Tax Mapping Division" },
            { label: "Recommending Approval:", value: recommendingApproval, role: "Municipal Assessor" },
            { label: "Approved by:", value: approvedBy, role: "Provincial/City Assessor" }
          ].map((item, idx) => (
            <div className="sig-block" key={idx}>
              <div className="sig-row">
                <span className="sig-label">{item.label}</span>
                <div style={{ flexGrow: 1 }}>
                  <div className="sig-line">{item.value || '\u00A0'}</div>
                  <div className="sig-title">{item.role}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="loc-cross-table">
            <div className="loc-cell">
              <div className="loc-value">{provCode || '\u00A0'}</div>
              <div className="loc-label">Province/City</div>
            </div>
            <div className="loc-cell">
              <div className="loc-value">{munDist || '\u00A0'}</div>
              <div className="loc-label">Municipality/Dist.</div>
            </div>
            <div className="loc-cell">
              <div className="loc-value">{barangayOverride || '\u00A0'}</div>
              <div className="loc-label">Barangay</div>
            </div>
            <div className="loc-cell">
              <div className="loc-value">{sectionOverride || selectedSection || '\u00A0'}</div>
              <div className="loc-label">Section</div>
            </div>
          </div>

          <div className="layout-disclaimer-box">
            This map is prepared for taxation purposes only and shall not be considered as evidence for settling boundary disputes.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyIDPreview;
