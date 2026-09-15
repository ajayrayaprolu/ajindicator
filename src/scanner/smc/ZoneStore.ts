export interface Zone {

  symbol: string;

  type: string;

  high: number;

  low: number;

  timestamp: number;

}

export class ZoneStore {

  private static zones:
    Zone[] = [];

  static add(
    zone: Zone
  ) {

    this.zones.push(
      zone
    );

  }

  static getAll() {

    return this.zones;

  }

  static getBySymbol(
    symbol: string
  ) {

    return this.zones.filter(
      z =>
        z.symbol === symbol
    );

  }

  static clear() {

    this.zones = [];

  }

}
