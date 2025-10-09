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

function Map() {
  return (
    <SchemaProvider>
      <MapContainer
        center={[12.8797, 121.7740]} // Philippines default
        zoom={6}
        style={{ height: "100vh", width: "100%" }}
      >
        <BaseMapSelector />
        <SchemaSelector />
        <AdminBoundaries />
        <Orthophoto />
        <ParcelLoader />
        <LoadingHandler />
        <Toolbar />
      </MapContainer>
    </SchemaProvider>
  );
}

export default Map;