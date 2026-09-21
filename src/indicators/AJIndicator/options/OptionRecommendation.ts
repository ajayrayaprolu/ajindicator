//===========================================================
// src/indicators/AJIndicator/options/OptionRecommendation.ts
//===========================================================
import {
    OptionRecommendationEngine
}
from "./OptionRecommendationEngine";

import type {
    OptionRecommendationResult
}
from "./OptionRecommendationResult";

export class OptionRecommendation {

    //--------------------------------------------------
    // BUILD
    //--------------------------------------------------

    static evaluate(

        underlying: string,

        strike: number,

        direction: number

    ): OptionRecommendationResult {

        return OptionRecommendationEngine.build(

            underlying,

            strike,

            direction

        );

    }

}

