import { useEffect } from "react";
import API from "../api_service";
import { useSchema } from "./SchemaContext";

const ParcelClickHandler = ({
  activeTool,
  setInfoProps,
  setInfoVisible,
  setAttributeEditMode,
  setEditHeader,
  onConsolidateSelect, // callback for consolidate
}) => {
  const { schema } = useSchema();

  useEffect(() => {
    // === Deactivate mode: unbind and reset styles ===
    if (!["info", "edit", "consolidate"].includes(activeTool)) {
      console.log("⛔ ParcelClickHandler inactive:", activeTool);

      // ✅ Apply zoom-based style logic from AdminBoundaries
      const map = window.map;
      const zoom = map?.getZoom?.() ?? 0;
      const visible = zoom >= 16; // match AdminBoundaries parcel threshold

      if (window.parcelLayers?.length) {
        window.parcelLayers.forEach(({ layer }) => {
          layer.off("click");

          if (visible) {
            // Parcels are allowed to be seen at this zoom
            layer.setStyle?.({
              stroke: true,
              color: "black",
              weight: 1,
              opacity: 1,
              fill: true,
              fillColor: "white",
              fillOpacity: 0.1,
            });
          } else {
            // 🔒 Keep parcels fully hidden when zoom < 16
            layer.setStyle?.({
              stroke: true,
              color: "black",
              weight: 1,
              opacity: 0,
              fill: true,
              fillColor: "white",
              fillOpacity: 0,
            });
          }
        });
      }

      // ✅ Re-enforce AdminBoundaries visibility + order
      if (window.onParcelsLoaded) window.onParcelsLoaded();
      if (window.enforceLayerOrder) window.enforceLayerOrder();

      return;
    }

    // ============================================================
    // ✅ Active tools: info, edit, consolidate
    // ============================================================
    const bindClicks = () => {
      if (!window.parcelLayers?.length) {
        console.log("⏳ Waiting for parcel layers to load...");
        setTimeout(bindClicks, 500);
        return;
      }

      console.log(
        `✅ Binding clicks for tool: ${activeTool} on`,
        window.parcelLayers.length,
        "layers"
      );

      window.parcelLayers.forEach(({ feature, layer }) => {
        layer.off("click");

        layer.on("click", async () => {
          const pin = feature.properties?.pin;
          if (!pin || !schema) return;

          // === Consolidate Mode ===
          if (activeTool === "consolidate") {
            console.log("🔵 Consolidate click:", pin);

            const isSelected = layer.options.fillColor === "blue";
            if (isSelected) {
              layer.setStyle({
                stroke: true,
                color: "black",
                weight: 1,
                opacity: 1,
                fill: true,
                fillColor: "white",
                fillOpacity: 0.2,
              });
              if (onConsolidateSelect) onConsolidateSelect(pin, feature, false);
            } else {
              layer.setStyle({
                stroke: true,
                color: "blue",
                weight: 3,
                opacity: 1,
                fill: true,
                fillColor: "blue",
                fillOpacity: 0.4,
              });
              layer.bringToFront();
              if (onConsolidateSelect) onConsolidateSelect(pin, feature, true);
            }
            return;
          }

          // === Info/Edit Mode ===
          if (activeTool === "info" || activeTool === "edit") {
            console.log("🟡 Info/Edit click:", pin);

            try {
              const res = await fetch(
                `${API}/parcel-info?pin=${encodeURIComponent(
                  pin
                )}&schema=${schema}`
              );
              const json = await res.json();

              if (json.status === "success") {
                // Reset all highlights first
                window.parcelLayers.forEach(({ layer }) => {
                  layer.setStyle?.({
                    stroke: true,
                    color: "black",
                    weight: 1,
                    opacity: 1,
                    fill: true,
                    fillColor: "white",
                    fillOpacity: 0.1,
                  });
                });

                // Highlight selected parcel
                layer.setStyle?.({
                  stroke: true,
                  color: "black",
                  weight: 2,
                  opacity: 1,
                  fill: true,
                  fillColor: "yellow",
                  fillOpacity: 0.4,
                });
                layer.bringToFront();

                const parcelData = {
                  ...json.data,
                  pin,
                  source_table:
                    feature.properties?.source_table || "LandParcels",
                  source_schema: schema,
                };

                setInfoProps(parcelData);
                setInfoVisible(true);
                setAttributeEditMode(activeTool === "edit");
                setEditHeader(
                  activeTool === "edit"
                    ? "Parcel Attribute Editing Tool"
                    : "Land Parcel Information"
                );
                window.currentParcelLayer = layer;
              } else {
                console.error("❌ Parcel not found:", json.message);
              }
            } catch (err) {
              console.error("❌ Fetch error:", err);
            }
          }
        });
      });
    };

    bindClicks();
  }, [activeTool, schema]);

  return null;
};

export default ParcelClickHandler;
