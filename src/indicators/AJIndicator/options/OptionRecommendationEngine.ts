//==================================================================
// src/indicators/AJIndicator/options/OptionRecommendationEngine.ts
//=================================================================
//This version upgrades the recommendation engine from a simple string builder to an institutional recommendation engine.
// Added capabilities: //✅ ATM strike selection //✅ ITM strike selection //✅ OTM strike selection //✅ Configurable strike interval (50/100/etc.)
//✅ Dynamic strike rounding //✅ Delegates contract generation to OptionContractResolver //✅ Supports configurable expiry
//✅ Includes moneyness metadata (ATM/ITM/OTM) //✅ Preserves backward compatibility with the existing OptionRecommendationResult
//==============================================================
// OptionRecommendationEngine.ts
// Pine Style Option Recommendation
//==============================================================
import {OptionContractResolver, type OptionContractConfig} from "./OptionContractResolver";
import type {OptionRecommendationResult} from "./OptionRecommendationResult";

//==============================================================

export class OptionRecommendationEngine {

    static build(

        underlying:string,
        spot:number,
        direction:number,
        config?:OptionContractConfig
    ):OptionRecommendationResult {
        const contract =
            OptionContractResolver.resolve(
                underlying,
                spot,
                direction,
                config
            );

        return {
            optionSymbol: contract.symbol,
            recommendedOption: contract.symbol,

            underlying,

            optionType:
				contract.optionType === "CE" ||
				contract.optionType === "PE"
					? contract.optionType
					: "",
            strike: contract.strike,

            direction,

            expiry: contract.expiry.toISOString().slice(0, 10),

            expiryMode: "CUSTOM",
            strikeMode: "CUSTOM",
            strikeDistance: 0,

            premium: 0,
            impliedVolatility: 0,
            delta: 0,
            gamma: 0,
            theta: 0,
            vega: 0,

            liquidityScore: 0,

            isRecommended: true,
            confidenceScore: 0,

            recommendationReason:
                "Canonical option contract resolved.",

            atmStrike: contract.atmStrike,
            itmStrike: contract.itmStrike,
            otmStrike: contract.otmStrike,

            atmSymbol: contract.atmSymbol,
            itmSymbol: contract.itmSymbol,
            otmSymbol: contract.otmSymbol,
        };
    }
}