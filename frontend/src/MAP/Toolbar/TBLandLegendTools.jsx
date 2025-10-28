// src/components/TBLandLegendTools.jsx
import React from "react";
import {
  DollarSign,
  Users,
  Shield,
  Layers,
  CreditCard,
  AlertTriangle,
  Clock,
  Building,
} from "lucide-react";
import "./toolbar.css";
import LandLegendTools from "../LandLegend/LandLegendTools.jsx";

const LAND_TOOLS = {
  VALUATION: "landvaluation",
  OWNERSHIP: "landownership",
  TAXABILITY: "taxability",
  ACTUAL_USE: "actualuse",
  PAYMENT: "payment",
  DELINQ_AMOUNT: "delinqamount",
  DELINQ_AGING: "delinqaging",
  DELINQ_USE: "delinquse",
};

const TBLandLegendTools = ({ activeTool, setActiveTool }) => {
  const toggleTool = (tool, callback) => {
    const newTool = activeTool === tool ? null : tool;
    setActiveTool(newTool);
    callback?.();
  };

  const landLegendTools = [
    {
      id: LAND_TOOLS.VALUATION,
      icon: DollarSign,
      label: "Unit Value",
      title: "Toggle thematic map for Land Valuation",
      onClick: () =>
        toggleTool(LAND_TOOLS.VALUATION, () =>
          window.toggleLandValuationLayer?.()
        ),
      hasActive: true,
    },
    {
      id: LAND_TOOLS.OWNERSHIP,
      icon: Users,
      label: "Ownership",
      title: "Toggle thematic map for Land Ownership",
      onClick: () =>
        toggleTool(LAND_TOOLS.OWNERSHIP, () =>
          window.toggleLandOwnershipLayer?.()
        ),
      hasActive: true,
    },
    {
      id: LAND_TOOLS.TAXABILITY,
      icon: Shield,
      label: "Taxability",
      title: "Toggle layer for Land Parcel Taxability",
      onClick: () =>
        toggleTool(LAND_TOOLS.TAXABILITY, () =>
          window.toggleTaxabilityLayer?.()
        ),
      hasActive: true,
    },
    {
      id: LAND_TOOLS.ACTUAL_USE,
      icon: Layers,
      label: "Actual Use",
      title: "Toggle layer for Land Parcel Actual Use",
      onClick: () =>
        toggleTool(LAND_TOOLS.ACTUAL_USE, () =>
          window.toggleActualUseLayer?.()
        ),
      hasActive: true,
    },
    {
      id: LAND_TOOLS.PAYMENT,
      icon: CreditCard,
      label: "Payment",
      title: "Toggle layer for Land Parcel Payment",
      onClick: () => window.togglePaymentLayer?.(),
      hasActive: false,
    },
  ];

  const delinquencyTools = [
    {
      id: LAND_TOOLS.DELINQ_AMOUNT,
      icon: AlertTriangle,
      label: "Amount",
      title: "Toggle layer for Delinquency Amount",
      onClick: () =>
        toggleTool(LAND_TOOLS.DELINQ_AMOUNT, () =>
          window.toggleDelinqAmountLayer?.()
        ),
      hasActive: true,
    },
    {
      id: LAND_TOOLS.DELINQ_AGING,
      icon: Clock,
      label: "Aging",
      title: "Toggle layer for Delinquency Aging",
      onClick: () => window.toggleDelinqAgingLayer?.(),
      hasActive: false,
    },
    {
      id: LAND_TOOLS.DELINQ_USE,
      icon: Building,
      label: "Actual Use",
      title: "Toggle layer for Delinquency Actual Use",
      onClick: () => window.toggleDelinqUseLayer?.(),
      hasActive: false,
    },
  ];

  return (
    <>
      {/* Land Legends Label */}
      <div className="toolbar-category-label">Land Legends:</div>

      {/* Land Legends Buttons */}
      {landLegendTools.map(
        ({ id, icon: Icon, label, title, onClick, hasActive }) => (
          <button
            key={id}
            className={`tool-button ${hasActive && activeTool === id ? "active" : ""}`}
            onClick={onClick}
            title={title}
          >
            <Icon size={24} strokeWidth={2.5} />
            <span>{label}</span>
          </button>
        )
      )}

      {/* Delinquency Label */}
      <div className="toolbar-category-label">Delinquency:</div>

      {/* Delinquency Buttons */}
      {delinquencyTools.map(
        ({ id, icon: Icon, label, title, onClick, hasActive }) => (
          <button
            key={id}
            className={`tool-button ${hasActive && activeTool === id ? "active" : ""}`}
            onClick={onClick}
            title={title}
          >
            <Icon size={24} strokeWidth={2.5} />
            <span>{label}</span>
          </button>
        )
      )}

      <LandLegendTools />
    </>
  );
};

export default TBLandLegendTools;
