export interface IndicatorSettings {

  ema: boolean;

  vwap: boolean;

  rsi: boolean;

  atr: boolean;

  adx: boolean;

  ajindicator: boolean;

}

export const DEFAULT_INDICATORS: IndicatorSettings = {

  ema: true,

  vwap: true,

  rsi: false,

  atr: false,

  adx: false,

  ajindicator: false

};

export class WorkspaceIndicatorStore {

  private static settings =
    DEFAULT_INDICATORS;

  static get() {

    return this.settings;

  }

  static set(
    settings: IndicatorSettings
  ) {

    this.settings =
      settings;

  }

}
