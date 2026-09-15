//Improvements
//✅ Existing API preserved (calculate() remains unchanged).
//✅ Existing return fields (optionMode, greekPass, validationPassed) are preserved.
//✅ Adds strike validation.
//✅ Adds premium validation.
//✅ Adds IV validation.
//✅ Adds liquidity validation (Open Interest + Volume).
//✅ Adds expiry validation.
//✅ Adds institutional validation score (0–100).
//✅ Uses (input as any) for future-ready fields so it won't break until you expand OptionValidationTypes.ts

import type {
    OptionValidationInput
}
from "./OptionValidationTypes";

import type {
    OptionValidationResult
}
from "./OptionValidationResult";

export class OptionValidationEngine {

    //--------------------------------------------------
    // DEFAULTS
    //--------------------------------------------------

    private static readonly DEFAULT_MIN_PREMIUM = 5;

    private static readonly DEFAULT_MAX_PREMIUM = 1000;

    private static readonly DEFAULT_MIN_IV = 10;

    private static readonly DEFAULT_MAX_IV = 70;

    //--------------------------------------------------
    // STRIKE VALIDATION
    //--------------------------------------------------

    private static strikeValid(

        strike: number

    ): boolean {

        return strike > 0;

    }

    //--------------------------------------------------
    // PREMIUM VALIDATION
    //--------------------------------------------------

    private static premiumValid(

        premium: number | undefined,

        minPremium: number,

        maxPremium: number

    ): boolean {

        if (

            premium === undefined

        ) {

            return true;

        }

        return (

            premium >= minPremium &&

            premium <= maxPremium

        );

    }

    //--------------------------------------------------
    // IV VALIDATION
    //--------------------------------------------------

    private static ivValid(

        iv: number | undefined,

        minIV: number,

        maxIV: number

    ): boolean {

        if (

            iv === undefined

        ) {

            return true;

        }

        return (

            iv >= minIV &&

            iv <= maxIV

        );

    }

    //--------------------------------------------------
    // LIQUIDITY VALIDATION
    //--------------------------------------------------

    private static liquidityValid(

        oi: number | undefined,

        volume: number | undefined

    ): boolean {

        if (

            oi === undefined ||

            volume === undefined

        ) {

            return true;

        }

        return (

            oi > 0 &&

            volume > 0

        );

    }

    //--------------------------------------------------
    // MAIN
    //--------------------------------------------------

    static calculate(

        input: OptionValidationInput

    ): OptionValidationResult {

        //--------------------------------------------------
        // OPTION MODE
        //--------------------------------------------------

        const optionMode =

            input.isOptionsMode &&

            input.isOptionChart;

        //--------------------------------------------------
        // GREEKS
        //--------------------------------------------------

        const greekPass =

            !input.greekOptionMode ||

            input.greekExecOk;

        //--------------------------------------------------
        // STRIKE
        //--------------------------------------------------

        const strike =

            input.smartStrike > 0

                ? input.smartStrike

                : input.strikeFromSymbol;

        const strikeValid =

            this.strikeValid(

                strike

            );

        //--------------------------------------------------
        // TYPE
        //--------------------------------------------------

        const optionTypeValid =

            input.currentOptionType === "CE" ||

            input.currentOptionType === "PE";

        //--------------------------------------------------
        // PREMIUM
        //--------------------------------------------------

        const premiumOk =

            this.premiumValid(

                (input as any).premium,

                (input as any).minPremium ??

                    this.DEFAULT_MIN_PREMIUM,

                (input as any).maxPremium ??

                    this.DEFAULT_MAX_PREMIUM

            );

        //--------------------------------------------------
        // IV
        //--------------------------------------------------

        const ivOk =

            this.ivValid(

                (input as any).iv,

                (input as any).minIV ??

                    this.DEFAULT_MIN_IV,

                (input as any).maxIV ??

                    this.DEFAULT_MAX_IV

            );

        //--------------------------------------------------
        // LIQUIDITY
        //--------------------------------------------------

        const liquidityOk =

            this.liquidityValid(

                (input as any).openInterest,

                (input as any).volume

            );

        //--------------------------------------------------
        // EXPIRY
        //--------------------------------------------------

        const expiryValid =

            !(input as any).expiryExpired;

        //--------------------------------------------------
        // VALIDATION SCORE
        //--------------------------------------------------

        let validationScore = 0;

        if (greekPass) validationScore += 15;

        if (strikeValid) validationScore += 20;

        if (optionTypeValid) validationScore += 15;

        if (premiumOk) validationScore += 15;

        if (ivOk) validationScore += 15;

        if (liquidityOk) validationScore += 10;

        if (expiryValid) validationScore += 10;

        //--------------------------------------------------
        // FINAL
        //--------------------------------------------------

        const validationPassed =

            !optionMode ||

            (

                greekPass &&

                strikeValid &&

                optionTypeValid &&

                premiumOk &&

                ivOk &&

                liquidityOk &&

                expiryValid

            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            optionMode,

            greekPass,

            validationPassed,

            ...( {

                strikeValid,

                optionTypeValid,

                premiumOk,

                ivOk,

                liquidityOk,

                expiryValid,

                validationScore

            } as any )

        };

    }

}
