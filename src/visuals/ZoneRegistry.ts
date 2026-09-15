//=======================================
// \src\visuals\ZoneRegistry.ts
//========================================
import type { Zone } from "./OverlayTypes";

export class ZoneRegistry {

  private static zones =
    new Map<string, Zone>();

  static add(
    zone: Zone
  ): void {

    this.zones.set(
      zone.id,
      zone
    );
  }

  static getAll(): Zone[] {

    return Array.from(
      this.zones.values()
    );
  }

  static clear(): void {

    this.zones.clear();
  }
}
