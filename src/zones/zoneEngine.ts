export interface Zone {

  top: number;

  bottom: number;

  type:
    | "DEMAND"
    | "SUPPLY"
    | "NEUTRAL";
}

export function createDemandZone(
  high: number,
  low: number
): Zone {

  return {
    type: "DEMAND",

    top:
      low +
      (high - low) * 0.5,

    bottom: low
  };
}

export function createSupplyZone(
  high: number,
  low: number
): Zone {

  return {
    type: "SUPPLY",

    top: high,

    bottom:
      high -
      (high - low) * 0.5
  };
}

export function createNeutralZone(
  mid: number,
  atr: number
): Zone {

  return {
    type: "NEUTRAL",

    top:
      mid +
      atr * 0.25,

    bottom:
      mid -
      atr * 0.25
  };
}
