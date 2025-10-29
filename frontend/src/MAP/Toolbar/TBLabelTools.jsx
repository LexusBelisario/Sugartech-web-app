// src/components/TBLabelTools.jsx
import React from "react";
import { 
  Signpost,
  MapPin,
    Tags,
  Building2,
  Wrench,
} from "lucide-react";
import LabelTools from "../LabelTools/LabelTools.jsx";
import "./toolbar.css";

const TBLabelTools = () => {
  const labelTools = [
    {
      id: "streetlabel",
      icon: Signpost,
      label: "Street Label",
      title: "Toggle Street Label",
      onClick: () => window.toggleStreetLabel?.()
    },
    {
      id: "landmarklabel",
      icon: MapPin,
      label: "Landmark Label",
      title: "Toggle Landmark Labels",
      onClick: () => window.toggleLandmarkLabel?.()
    },
    {
      id: "brgylabel",
      icon: Tags,
      label: "Land Parcel Multi-label",
      title: "Toggle Barangay, Section, Parcel labels",
      onClick: () => window.toggleBrgyLabel?.()
    },
    {
      id: "bldglabel",
      icon: Building2,
      label: "Bldg Count Label",
      title: "Toggle Building Labels",
      onClick: () => window.toggleBldgLabel?.()
    },
    {
      id: "machlabel",
      icon: Wrench,
      label: "Mach. Count Label",
      title: "Toggle Machinery Labels",
      onClick: () => window.toggleMachLabel?.()
    },
  ];

  return (
    <>
      {labelTools.map(({ id, icon: Icon, label, title, onClick }) => (
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

      <LabelTools />
    </>
  );
};

export default TBLabelTools;