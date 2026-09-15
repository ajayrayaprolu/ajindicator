//======================================================
// src/indicators/AJIndicator/AJOptionsEngine.ts
// Institutional Option Pipeline
//======================================================

import {OptionValidationEngine} from "./options/OptionValidationEngine";
import {OptionRecommendationEngine} from "./options/OptionRecommendationEngine";
import type {OptionValidationInput} from "./options/OptionValidationTypes";

//======================================================

export class AJOptionsEngine {

    //--------------------------------------------------
    // OPTION PIPELINE
    //--------------------------------------------------
    evaluate(
        optionInputs: OptionValidationInput,
        underlying: string,
        _strike: number,
        direction: number
    ) {
        //--------------------------------------------------
        // VALIDATION
        //--------------------------------------------------
        const validation =
            OptionValidationEngine.calculate(
                optionInputs
            );

        //--------------------------------------------------
        // RECOMMENDATION
        //--------------------------------------------------
        const recommendation =
            OptionRecommendationEngine.build(
                underlying,
                optionInputs.spotPrice,
                direction,
                {
                    strikeStep:
                        optionInputs.strikeStep,
                    strikeMode:
                        "ATM",
                    expiryMode:
                        "WEEKLY"
                }
            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------
        return {
            ...validation,
            ...recommendation,
            underlying,

            //--------------------------------------------------
            // RESOLVED STRIKE
            //--------------------------------------------------
            strike:
                _strike,

            //--------------------------------------------------
            // INDEX DIRECTION
            //--------------------------------------------------
            direction,
			
            //--------------------------------------------------
            // OPTION TRADE SIDE
            // Pine rule:
            // CE buy or PE buy only
            //--------------------------------------------------
            optionTradeDirection:1,
            optionSide:"BUY"
        };
    }
}