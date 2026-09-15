export interface InstitutionalRank {

  score: number;

  grade:
    | "A+"
    | "A"
    | "B"
    | "C"
    | "D";
}

export class InstitutionalRanking {

  static rank(
    score: number
  ): InstitutionalRank {

    if (score >= 90)
      return {
        score,
        grade: "A+"
      };

    if (score >= 80)
      return {
        score,
        grade: "A"
      };

    if (score >= 70)
      return {
        score,
        grade: "B"
      };

    if (score >= 60)
      return {
        score,
        grade: "C"
      };

    return {
      score,
      grade: "D"
    };
  }
}
