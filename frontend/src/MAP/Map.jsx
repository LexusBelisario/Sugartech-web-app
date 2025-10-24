// MapView.jsx
import { useState } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import BaseMapSelector from "./BasemapSelector/BaseMapSelector.jsx";
import SchemaSelector from "./SchemaSelector/SchemaSelector";
import AdminBoundaries from "./AdminBoundaries/AdminBoundaries.jsx";
import Orthophoto from "./Orthophoto/Orthophoto.jsx";
import ParcelLoader from "./ParcelLoader";
import LoadingHandler from "./LoadingHandler";
import Toolbar from "./Toolbar/toolbar.jsx";
import { SchemaProvider } from "./SchemaContext.jsx";
import CoordinatesDisplay from "./CoordinatesDisplay/CoordinatesDisplay.jsx";
import MapRefRegisterer from "./MapRefRegister.jsx";
import RightControls from "./RightSideControls.jsx";

function MapView() {
  const [activeTool, setActiveTool] = useState(null);

  return (
    <SchemaProvider>
      <MapContainer
        center={[12.8797, 121.774]}
        zoom={6}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100vh", width: "100%", position: "relative", zIndex: 0 }}
        className="leaflet-map-container"
      >
        {/* 🌍 Base Layers + Map registration */}
        <BaseMapSelector side="left" />   {/* ⬅️ moved to LEFT */}
        <MapRefRegisterer />
        <ParcelLoader />
        <LoadingHandler />
        <CoordinatesDisplay />

        {/* 🧭 GIS Tools — now on the RIGHT */}
        <Toolbar side="right" />

        {/* 🧩 Zoom + tool toggles — now on the LEFT */}
        <RightControls side="left" activeTool={activeTool} setActiveTool={setActiveTool} />

        {/* 🔘 Tool Panels — also render on the LEFT to match controls */}
        <SchemaSelector
          side="left"
          isVisible={activeTool === "schema"}
          onClose={() => setActiveTool(null)}
        />
        <Orthophoto
          side="left"
          isVisible={activeTool === "ortho"}
          onClose={() => setActiveTool(null)}
        />
        <AdminBoundaries
          side="left"
          isVisible={activeTool === "admin"}
          onClose={() => setActiveTool(null)}
        />
      </MapContainer>
    </SchemaProvider>
  );
}

export default MapView;
