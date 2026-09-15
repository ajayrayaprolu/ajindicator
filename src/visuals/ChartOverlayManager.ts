//====================================
// \src\visuals\ChartOverlayManager.ts
//=====================================
import type {
  Overlay,
  Zone
} from "./OverlayTypes";

import { DrawingEngine }
  from "./DrawingEngine";

export class ChartOverlayManager {

  static draw(
    overlay: Overlay
  ): void {

    DrawingEngine.add(
      overlay
    );
  }

  static remove(
    id: string
  ): void {

    DrawingEngine.remove(
      id
    );
  }

  static clear(): void {

    DrawingEngine.clear();
  }

  static drawZone(
    zone: Zone
  ): void {

    DrawingEngine.addZone(
      zone
    );
  }

  static clearZones(): void {

    DrawingEngine.clearZones();
  }
}
