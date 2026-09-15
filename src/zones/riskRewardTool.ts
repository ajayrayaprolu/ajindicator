export interface RiskRewardResult {

  riskPoints: number;

  rewardPoints: number;

  rrRatio: number;

  riskPercent: number;

  rewardPercent: number;
}

export function calculateRiskReward(
  entry: number,
  sl: number,
  tp3: number
): RiskRewardResult {

  const risk =
    Math.abs(entry - sl);

  const reward =
    Math.abs(tp3 - entry);

  return {

    riskPoints: risk,

    rewardPoints: reward,

    rrRatio:
      risk > 0
        ? reward / risk
        : 0,

    riskPercent:
      (risk / entry) * 100,

    rewardPercent:
      (reward / entry) * 100
  };
}
