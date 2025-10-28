// src/components/TBLabelTools.jsx
import React from "react";
import { 
  Signpost,
  MapPin
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
    }
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