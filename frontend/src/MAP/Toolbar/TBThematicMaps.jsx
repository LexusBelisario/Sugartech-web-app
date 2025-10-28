// src/components/TBThematicMaps.jsx
import React from "react";
import { 
  Map,
  MapPin,
  Trees,
  Mountain,
  Triangle,
  Network,
  Waves,
  Layers,
  AlertTriangle,
  AlertOctagon,
  CloudRain,
  Droplets
} from "lucide-react";
import "./toolbar.css";
import Thematic from "../Thematic/Thematic.jsx";

const TBThematicMaps = () => {
  const hazardsRisks = [
    {
      id: "landslide",
      icon: AlertTriangle,
      label: "Landslide Hazard",
      title: "Toggle on and off Landslide Hazard Map",
      onClick: () => window.toggleLandslide?.()
    },
    {
      id: "landsliderisk",
      icon: AlertOctagon,
      label: "Landslide Risk",
      title: "Toggle on and off Landslide Risk Map",
      onClick: () => window.toggleLandslideRisk?.()
    },
    {
      id: "floodhazard",
      icon: CloudRain,
      label: "Flood Hazard",
      title: "Toggle on and off Flood Hazard Map",
      onClick: () => window.toggleFloodHazard?.()
    },
    {
      id: "floodrisk",
      icon: Droplets,
      label: "Flood Risk",
      title: "Toggle on and off Flood Risk Map",
      onClick: () => window.toggleFloodRisk?.()
    }
  ];

  const landThematics = [
    {
      id: "landclass",
      icon: Map,
      label: "Land Class",
      title: "Toggle thematic map for Land Classification",
      onClick: () => window.toggleLandClassLayer?.()
    },
    {
      id: "landcover",
      icon: Trees,
      label: "Land Cover",
      title: "Toggle thematic map based on Land Cover",
      onClick: () => window.toggleLandCoverLayer?.()
    },
    {
      id: "landuse",
      icon: MapPin,
      label: "CLUP",
      title: "Toggle thematic map for Land Use",
      onClick: () => window.toggleLandUseLayer?.()
    },
    {
      id: "soiltype",
      icon: Layers,
      label: "Soil Type",
      title: "Toggle thematic map based on Soil Type",
      onClick: () => window.toggleSoilType?.()
    }
  ];

  const roadThematics = [
    {
      id: "roadnetwork",
      icon: Network,
      label: "Road Network",
      title: "Toggle thematic map based on Road Network",
      onClick: () => window.toggleRoadNetwork?.()
    },
    {
      id: "elevation",
      icon: Mountain,
      label: "Elevation Map",
      title: "Toggle thematic map based on Elevation",
      onClick: () => window.toggleElevationLayer?.()
    },
    {
      id: "slope",
      icon: Triangle,
      label: "Slope Map",
      title: "Toggle thematic map based on Slope",
      onClick: () => window.toggleSlopeLayer?.()
    },
    {
      id: "surfacewater",
      icon: Waves,
      label: "Surface Water",
      title: "Toggle thematic map based on Surface Water",
      onClick: () => window.toggleSurfaceWater?.()
    }
  ];

  return (
    <>
      {/* Hazards/Risks Label */}
      <div className="toolbar-category-label">Hazards/Risks:</div>
      
      {/* Hazards/Risks Buttons */}
      {hazardsRisks.map(({ id, icon: Icon, label, title, onClick }) => (
        <button
          key={id}
          className="tool-button"
          id={`btn${id.charAt(0).toUpperCase() + id.slice(1)}`}
          onClick={onClick}
          title={title}
        >
          <Icon size={24} strokeWidth={2.5} />
          <span>{label}</span>
        </button>
      ))}

      {/* Land Thematics Label */}
      <div className="toolbar-category-label">Land Thematics:</div>
      
      {/* Land Thematics Buttons */}
      {landThematics.map(({ id, icon: Icon, label, title, onClick }) => (
        <button
          key={id}
          className="tool-button"
          id={`btn${id.charAt(0).toUpperCase() + id.slice(1)}`}
          onClick={onClick}
          title={title}
        >
          <Icon size={24} strokeWidth={2.5} />
          <span>{label}</span>
        </button>
      ))}

      {/* Road Thematics Label */}
      <div className="toolbar-category-label">Road Thematics:</div>
      
      {/* Road Thematics Buttons */}
      {roadThematics.map(({ id, icon: Icon, label, title, onClick }) => (
        <button
          key={id}
          className="tool-button"
          id={`btn${id.charAt(0).toUpperCase() + id.slice(1)}`}
          onClick={onClick}
          title={title}
        >
          <Icon size={24} strokeWidth={2.5} />
          <span>{label}</span>
        </button>
      ))}

      <Thematic map={window.map} />
    </>
  );
};

export default TBThematicMaps;