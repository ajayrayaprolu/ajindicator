export interface ScannerProfile {

  name: string;

  enabledSignals: string[];

  minimumScore: number;

}

export const ScannerProfiles = {

  ALL: {

    name: "ALL",

    enabledSignals: [],

    minimumScore: 0

  },

  SMC: {

    name: "SMC",

    enabledSignals: [

      "ORDER_BLOCK",
      "FVG",
      "MITIGATION",
      "BOS",
      "CHOCH",
      "LIQUIDITY"

    ],

    minimumScore: 100

  },

  INSTITUTIONAL: {

    name: "INSTITUTIONAL",

    enabledSignals: [

      "ORDER_BLOCK",
      "FVG",
      "MITIGATION"

    ],

    minimumScore: 200

  }

};
