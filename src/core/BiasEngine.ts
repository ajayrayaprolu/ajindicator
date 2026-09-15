export class BiasEngine {

    static getBias(
        bullish: boolean,
        bearish: boolean
    ): number {

        if (bullish) return 1;

        if (bearish) return -1;

        return 0;
    }
}
