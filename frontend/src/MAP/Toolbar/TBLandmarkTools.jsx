// src/components/TBLandmarkTools.jsx
import React, { useState } from "react";
import { Eye, MapPinPlus, Info, Edit3, Trash2 } from "lucide-react";
import "./toolbar.css";
import Landmarks from "../LandmarkTools/Landmarks.jsx";

const TBLandmarkTools = () => {
  const [activeTool, setActiveTool] = useState(null);
  const [landmarksVisible, setLandmarksVisible] = useState(false);

  const landmarkTools = [
    {
      id: "showLandmarks",
      icon: Eye,
      label: "Show Landmarks",
      title: "Click to show all landmarks.",
      onClick: () =>
        setActiveTool(activeTool === "showLandmarks" ? null : "showLandmarks"),
    },
    {
      id: "landmarkInfo",
      icon: Info,
      label: "Landmark Info Tool",
      title: "Click on any landmark and see its information",
      onClick: () =>
        setActiveTool(activeTool === "landmarkInfo" ? null : "landmarkInfo"),
    },
    {
      id: "updateLandmark",
      icon: Edit3,
      label: "Update Landmark",
      title: "Updates the attributes' values of a Landmark",
      onClick: () =>
        setActiveTool(
          activeTool === "updateLandmark" ? null : "updateLandmark"
        ),
    },
    {
      id: "addLandmark",
      icon: MapPinPlus,
      label: "Add Landmark",
      title: "Click on any part of the map to add landmark",
      onClick: () =>
        setActiveTool(activeTool === "addLandmark" ? null : "addLandmark"),
    },
    {
      id: "removeLandmark",
      icon: Trash2,
      label: "Remove Landmark",
      title: "Mark landmarks for deletion by clicking them",
      onClick: () =>
        setActiveTool(
          activeTool === "removeLandmark" ? null : "removeLandmark"
        ),
    },
  ];

  return (
    <>
      {landmarkTools.map(({ id, icon: Icon, label, title, onClick }) => (
        <button
          key={id}
          className={`tool-button ${activeTool === id ? "active" : ""}`}
          id={`btn${id.charAt(0).toUpperCase() + id.slice(1)}`}
          onClick={onClick}
          title={title}
        >
          <Icon size={24} strokeWidth={2.5} />
          <span>{label}</span>
        </button>
      ))}

      <Landmarks
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        setLandmarksVisible={setLandmarksVisible}
      />
    </>
  );
};

export default TBLandmarkTools;
