import type {
  Overlay,
  Zone
} from "./OverlayTypes";

export class DrawingEngine {

  private static overlays =
    new Map<string, Overlay>();

  private static zones =
    new Map<string, Zone>();

  static add(
    overlay: Overlay
  ): void {

    this.overlays.set(
      overlay.id,
      overlay
    );
  }

  static remove(
    id: string
  ): void {

    this.overlays.delete(
      id
    );
  }

  static clear(): void {

    this.overlays.clear();
  }

  static getAll(): Overlay[] {

    return [
      ...this.overlays.values()
    ];
  }

  static addZone(
    zone: Zone
  ): void {

    this.zones.set(
      zone.id,
      zone
    );
  }

  static removeZone(
    id: string
  ): void {

    this.zones.delete(
      id
    );
  }

  static getZones(): Zone[] {

    return [
      ...this.zones.values()
    ];
  }

  static clearZones(): void {

    this.zones.clear();
  }
}
