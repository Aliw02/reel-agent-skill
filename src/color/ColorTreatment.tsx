import React from "react";
import { AbsoluteFill } from "remotion";
import { ColorGradeConfig } from "../types/schema";

interface ColorTreatmentProps {
  config?: ColorGradeConfig;
}

export const ColorTreatment: React.FC<ColorTreatmentProps> = ({ config }) => {
  if (!config) return null;

  const {
    preset = "modern_tech",
    contrast = 1.08,
    saturation = 1.10,
    vignette = true,
    vignetteIntensity = 0.7,
  } = config;

  let tintStyle: React.CSSProperties = {};

  switch (preset) {
    case "modern_tech":
      tintStyle = {
        background:
          "linear-gradient(180deg, rgba(0, 150, 255, 0.04) 0%, rgba(255, 230, 0, 0.02) 100%)",
        mixBlendMode: "overlay",
      };
      break;
    case "warm_creator":
      tintStyle = {
        background:
          "linear-gradient(180deg, rgba(255, 120, 0, 0.06) 0%, rgba(255, 200, 50, 0.03) 100%)",
        mixBlendMode: "soft-light",
      };
      break;
    case "cinematic_soft":
      tintStyle = {
        background:
          "linear-gradient(180deg, rgba(30, 40, 60, 0.08) 0%, rgba(0, 0, 0, 0.1) 100%)",
        mixBlendMode: "color-burn",
      };
      break;
    case "high_energy_social":
      tintStyle = {
        background:
          "linear-gradient(135deg, rgba(255, 0, 128, 0.05) 0%, rgba(0, 255, 204, 0.05) 100%)",
        mixBlendMode: "screen",
      };
      break;
    default:
      break;
  }

  return (
    <>
      {/* 1. Global Contrast & Saturation Filter */}
      <AbsoluteFill
        style={{
          backdropFilter: `contrast(${contrast}) saturate(${saturation})`,
          pointerEvents: "none",
          zIndex: 60,
        }}
      />

      {/* 2. Creative Preset Tint */}
      {preset !== "none" && (
        <AbsoluteFill
          style={{
            ...tintStyle,
            pointerEvents: "none",
            zIndex: 61,
          }}
        />
      )}

      {/* 3. Cinematic Contrast Vignette */}
      {vignette && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
            pointerEvents: "none",
            zIndex: 62,
          }}
        />
      )}
    </>
  );
};
