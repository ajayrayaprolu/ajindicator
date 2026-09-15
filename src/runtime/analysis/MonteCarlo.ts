export class MonteCarlo {

  static simulate(

    returns: number[],

    runs = 1000

  ) {

    const results: number[] = [];

    for (

      let i=0;

      i<runs;

      i++

    ) {

      let equity = 0;

      const shuffled =

        [...returns]

        .sort(

          ()=>Math.random()-0.5

        );

      for (

        const r

        of shuffled

      ) {

        equity += r;

      }

      results.push(
        equity
      );

    }

    return results;

  }

}

