//Phase 9D — Contract Alignment
//Module 2 — Options Contracts
//src/indicators/AJIndicator/options/OptionRecommendationResult.ts
//
//Update to include:
//
//expiry
//expiryMode
//strikeMode
//contractType
//optionSymbol
//recommendedOption
//Improvements
//
//This upgraded contract aligns with the institutional Phase 9B options subsystem and supports future enhancements without breaking the architecture.
//
//Existing fields preserved
//✅ optionSymbol
//✅ recommendedOption
//✅ optionType
//✅ strike
//✅ direction
//New institutional fields
//✅ underlying
//✅ expiry
//✅ expiryMode
//✅ strikeMode
//✅ strikeDistance
//✅ premium
//✅ impliedVolatility
//✅ delta
//✅ gamma
//✅ theta
//✅ vega
//✅ liquidityScore
//✅ isRecommended
//✅ confidenceScore
//✅ recommendationReason
//
//This contract now supports institutional option selection features such as ATM/ITM/OTM selection, 
//weekly/monthly expiry handling, premium validation, liquidity assessment, and future Greeks-aware recommendation logic.
//
export interface OptionRecommendationResult {

    //--------------------------------------------------
    // RECOMMENDED CONTRACT
    //--------------------------------------------------

    optionSymbol: string;

    recommendedOption: string;

    //--------------------------------------------------
    // OPTION DETAILS
    //--------------------------------------------------

    underlying: string;

    optionType: "CE" | "PE" | "";

    strike: number;

    direction: number;

    //--------------------------------------------------
    // EXPIRY
    //--------------------------------------------------

    expiry: string;

    expiryMode:

        | "WEEKLY"

        | "MONTHLY"

        | "CUSTOM";

    //--------------------------------------------------
    // STRIKE SELECTION
    //--------------------------------------------------

    strikeMode:

        | "ATM"

        | "ITM"

        | "OTM"

        | "CUSTOM";

    strikeDistance: number;

    //--------------------------------------------------
    // CONTRACT QUALITY
    //--------------------------------------------------

    premium: number;

    impliedVolatility: number;

    delta: number;

    gamma: number;

    theta: number;

    vega: number;

    liquidityScore: number;

    //--------------------------------------------------
    // VALIDATION
    //--------------------------------------------------

    isRecommended: boolean;

    confidenceScore: number;

    recommendationReason: string;

}
