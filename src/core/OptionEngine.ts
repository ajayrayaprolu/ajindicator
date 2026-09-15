export interface OptionStrike {

    atm: number;

    itm: number;

    otm: number;
}

export class OptionEngine {

    static classify(
        strike: number,
        atm: number,
        step: number
    ): string {

        if (Math.abs(strike - atm) <= step * 0.3)
            return "ATM";

        if (strike < atm)
            return "ITM";

        return "OTM";
    }
}
