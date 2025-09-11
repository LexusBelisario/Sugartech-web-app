import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import L from "leaflet";
import domtoimage from "dom-to-image-more";
import * as turf from "@turf/turf";
import "./SectionPreview.css";
import "leaflet-textpath";

const paperDimensions = {
  a4: { width: 595, height: 842, orientation: "portrait" },
  a3: { width: 1191, height: 842, orientation: "landscape" },
  a2: { width: 1684, height: 1191, orientation: "landscape" },
  a1: { width: 2384, height: 1684, orientation: "landscape" }
};

const TMLpreview = ({
  sectionLayerData,
  barangay,
  schema,
  paperSize,
  preparedBy,
  verifiedBy,
  recommendingApproval,
  approvedBy,
  provCode,
  munDist,
  barangayOverride,
  sectionOverride,
  sectionTable,
  otherLayers,
  scale,
  onClose,
  background
}) => {


  const [computedScale, setComputedScale] = useState(scale);
  const [otherLayerData, setOtherLayerData] = useState([]);

  const paper = paperSize.toLowerCase();
  const paperDims = paperDimensions[paper];

  useEffect(() => {
    const fetchOtherLayers = async () => {
      const results = await Promise.all(
        otherLayers.map(table =>
          fetch(`http://127.0.0.1:8000/single-table?schema=${schema}&table=${table}`)
            .then(res => res.json())
            .then(data => ({ table, features: data.features || [] }))
        )
      );
      setOtherLayerData(results);
    };
    fetchOtherLayers();
  }, [otherLayers, schema]);

  useEffect(() => {
    const mapDiv = document.getElementById("mapCanvas");
    if (!mapDiv) return;

    if (mapDiv._leaflet_id) {
      mapDiv._leaflet_id = null;
      mapDiv.innerHTML = "";
    }

    const map = L.map(mapDiv, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true
    });

    let tileLayer;

    if (background === "osm") {
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 22
      });
    } else if (background === "satellite") {
      tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "&copy; Esri, Maxar, Earthstar Geographics",
        maxZoom: 22
      });
    } else {
      tileLayer = L.tileLayer("", { attribution: "" });
    }

    tileLayer.addTo(map);
    mapDiv._leaflet_map = map;

    const scaleZoomMap = {
      22: 100, 21: 200, 20: 250, 19: 400, 18: 500,
      17: 1000, 16: 1500, 15: 2000, 14: 3000,
      13: 4000, 12: 5000, 11: 10000, 10: 20000
    };

    const reverseMap = Object.fromEntries(Object.entries(scaleZoomMap).map(([z, s]) => [z, s]));
    const targetScale = parseInt(scale);
    const zoomFromScale = Object.entries(scaleZoomMap).find(([z, s]) => s === targetScale);
    if (zoomFromScale) {
      const zoomLevel = parseInt(zoomFromScale[0]);
      map.setZoom(zoomLevel);
      setComputedScale(targetScale);
    } else {
      map.setZoom(17); // fallback default
      setComputedScale(scaleZoomMap[17]);
    }


    const sectionFeatures = barangay
      ? sectionLayerData.filter(f => f.properties?.barangay === barangay)
      : sectionLayerData;

    const geoJson = L.geoJSON(sectionFeatures, {
      style: {
        color: "black",
        weight: 2,
        fillOpacity: 0.2
      }
    }).addTo(map);

if (zoomFromScale) {
  const zoomLevel = parseInt(zoomFromScale[0]);
  map.setZoom(zoomLevel);
  map.panTo(geoJson.getBounds().getCenter()); // center view, don’t zoom
  setComputedScale(targetScale);
} else {
  map.fitBounds(geoJson.getBounds(), { padding: [20, 20] }); // fallback if input scale doesn't match known zoom levels
}


map.on("zoomend", () => {
  const actualZoom = map.getZoom();
  const updatedScale = scaleZoomMap[actualZoom];
  setComputedScale(updatedScale);
});

setTimeout(() => {
  map.invalidateSize(true);
}, 200);


map.on("zoomend", () => {
  const zoom = map.getZoom();
  const scaleMap = {
    22: 100, 21: 200, 20: 250, 19: 400, 18: 500,
    17: 1000, 16: 1500, 15: 2000, 14: 3000,
    13: 4000, 12: 5000, 11: 10000, 10: 20000
  };
  const updatedScale = scaleMap[zoom];
  if (updatedScale) setComputedScale(updatedScale);
});



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

    geoJson.eachLayer(l => {
      const label = l.feature?.properties?.section;
      if (label) {
        const center = l.getCenter?.() ?? l.getBounds().getCenter();
        addLabel(center, label);
      }
    });

otherLayerData.forEach(({ table, features }) => {
  if (!features.length) return;

  const isBrgy = /barangay/i.test(table);
  const isRoad = /roadnetwork/i.test(table);

  if (isRoad) return; // ✅ skip rendering road lines entirely

  const layer = L.geoJSON(features, {
    style: {
      color: isBrgy ? "#222" : "#666",
      weight: isBrgy ? 2.5 : 1,
      dashArray: isBrgy ? "8,6" : "",
      fillOpacity: 0
    }
  }).addTo(map);

  // 🧾 Label only barangays
  if (isBrgy) {
    const seen = new Set();
    const bounds = map.getBounds();
    const mapCenter = map.getCenter();

    layer.eachLayer(l => {
      const name = l.feature?.properties?.barangay;
      if (!name || seen.has(name)) return;
      if (name === barangay || name === barangayOverride) return;

      const poly = l.feature.geometry;
      const polyBounds = l.getBounds();
      const center = l.getCenter?.() ?? polyBounds.getCenter();
      let bestPoint = center;

      if (bounds.intersects(polyBounds)) {
        const steps = [0.9, 0.7, 0.5, 0.3];
        for (let step of steps) {
          const shifted = L.latLng(
            center.lat + (mapCenter.lat - center.lat) * step,
            center.lng + (mapCenter.lng - center.lng) * step
          );

          const turfPoint = turf.point([shifted.lng, shifted.lat]);
          const turfPolygon = turf.polygon(
            poly.type === "MultiPolygon" ? poly.coordinates[0] : poly.coordinates
          );

          if (turf.booleanPointInPolygon(turfPoint, turfPolygon)) {
            bestPoint = shifted;
            break;
          }
        }
      }

      addLabel(bestPoint, name);
      seen.add(name);
    });
  }
});


// === Render road names without lines ===
// === Render road names along lines using leaflet-textpath ===
const roadLabelLayer = L.layerGroup().addTo(map);

otherLayerData.forEach(({ table, features }) => {
  if (!/roadnetwork/i.test(table) || !features.length) return;

features.forEach(f => {
  const type = f.geometry?.type;
  let coords = f.geometry?.coordinates;

  const name =
    f.properties?.road_name ||
    f.properties?.name ||
    f.properties?.label ||
    f.properties?.roadlabel;

  if (!coords || !name) return;
  if (type === "MultiLineString") coords = coords[0];
  if (!coords || coords.length < 2) return;

  // === Determine line direction
  const dx = coords[coords.length - 1][0] - coords[0][0];
  const dy = coords[coords.length - 1][1] - coords[0][1];
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // === Flip if upside down
  if (angle > 90 || angle < -90) coords.reverse();

  const latlngs = coords.map(([lng, lat]) => [lat, lng]);

  const polyline = L.polyline(latlngs, {
    color: "transparent"
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


    return () => map.remove();
  }, [sectionLayerData, barangay, otherLayerData, scale, background]);

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
        <div id="mapCanvas" className="map-canvas" />

          <div className="index-overlay">
          <img
            src="/NorthArrow.png"
            alt="North Arrow"
            className="index-overlay-logo"
          />

          <div className="info-header">
            <div>SECTION</div>
            <div>INDEX MAP</div>
          </div>
          
          <div className="info-scale">
            <span className="scale-label" style={{ borderBottom: "none" }}>Scale 1:</span>
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
              <div className="loc-value">{sectionOverride || '\u00A0'}</div>
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

export default TMLpreview;
