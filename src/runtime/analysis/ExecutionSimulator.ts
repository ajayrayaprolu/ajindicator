export class ExecutionSimulator {

  static fillPrice(

    price: number,

    slippagePct = 0.05

  ) {

    return (

      price *

      (1 + slippagePct/100)

    );

  }

}

