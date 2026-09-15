export interface WalkForwardResult {

  trainStart: number;

  trainEnd: number;

  testStart: number;

  testEnd: number;

  score: number;

}

export class WalkForward {

  static evaluate(

    scores: number[]

  ): WalkForwardResult[] {

    return scores.map(

      (

        score,

        index

      ) => ({

        trainStart:
          index,

        trainEnd:
          index + 1,

        testStart:
          index + 1,

        testEnd:
          index + 2,

        score

      })

    );

  }

}

