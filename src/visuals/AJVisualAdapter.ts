//================================
// src/visuals/AJVisualAdapter.ts
//================================

import {
  ChartOverlayManager
} from "./ChartOverlayManager";

import type {
  Overlay,
  Zone
} from "./OverlayTypes";

export class AJVisualAdapter {

  static drawEntry(
    price: number
  ): void {

    const overlay: Overlay = {

      id: `ENTRY-${Date.now()}`,

      kind: "line",

      price,

      color: "#FFD700",

      text: "ENTRY"
    };

    ChartOverlayManager.draw(
      overlay
    );
  }

  static drawStopLoss(
    price: number
  ): void {

    const overlay: Overlay = {

      id: `SL-${Date.now()}`,

      kind: "line",

      price,

      color: "#FF0000",

      text: "SL"
    };

    ChartOverlayManager.draw(
      overlay
    );
  }

  static drawTarget(
    price: number,
    label: string
  ): void {

    const overlay: Overlay = {

      id: `${label}-${Date.now()}`,

      kind: "line",

      price,

      color: "#00FF00",

      text: label
    };

    ChartOverlayManager.draw(
      overlay
    );
  }

  static drawTriangle(
    direction: "LONG" | "SHORT",
    price: number
  ): void {

    const overlay: Overlay = {

      id: `TRI-${Date.now()}`,

      kind: "triangle",

      price,

      text: direction,

      color:
        direction === "LONG"
          ? "#00FF00"
          : "#FF0000"
    };

    ChartOverlayManager.draw(
      overlay
    );
  }

  static drawZone(
    high: number,
    low: number,
    label: string
  ): void {

    const zone: Zone = {

      id: `ZONE-${Date.now()}`,

      high,

      low,

      label,

      color: "#2196F3"
    };

    ChartOverlayManager.drawZone(
      zone
    );
  }

  static cleanup(): void {

    ChartOverlayManager.clear();

    ChartOverlayManager.clearZones();
  }
}
