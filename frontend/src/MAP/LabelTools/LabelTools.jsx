import React, { useEffect, useState } from "react";
import StreetLabel from "./StreetLabel.jsx";
import Multilabel from "./Multilabel.jsx";
import LandmarkLabel from "./LandmarkLabel.jsx";

const LabelTools = ({ map, activeSchemas }) => {
  const [showStreetLabel, setShowStreetLabel] = useState(false);
  const [showMultiLabel, setShowMultiLabel] = useState(false);
  const [showLandmarkLabel, setShowLandmarkLabel] = useState(false);

  useEffect(() => {
    // Setup global toggle functions
    window.toggleStreetLabel = () => {
      setShowStreetLabel(prev => {
        const next = !prev;
        document.getElementById("btnStreetLabel")?.classList.toggle("active", next);
        return next;
      });
    };

    window.toggleBrgyLabel = () => {
      setShowMultiLabel(prev => {
        const next = !prev;
        document.getElementById("btnBrgyLabel")?.classList.toggle("active", next);
        return next;
      });
    };

    window.toggleLandmarkLabel = () => {
      setShowLandmarkLabel(prev => {
        const next = !prev;
        document.getElementById("btnLandmarkLabel")?.classList.toggle("active", next);
        return next;
      });
    };

    return () => {
      delete window.toggleStreetLabel;
      delete window.toggleBrgyLabel;
      delete window.toggleLandmarkLabel;
    };
  }, []);

  return (
    <>
      {showStreetLabel && <StreetLabel map={map} activeSchemas={activeSchemas} />}
      {showMultiLabel && <Multilabel map={map} activeSchemas={activeSchemas} />}
      {showLandmarkLabel && <LandmarkLabel map={map} />}
    </>
  );
};

export default LabelTools;
