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
            optionType: contract.optionType,
            strike: contract.strike,
            atmStrike: contract.atmStrike,
            itmStrike: contract.itmStrike,
            otmStrike: contract.otmStrike,
            direction,
            ...( {
                atmSymbol: contract.atmSymbol,
                itmSymbol: contract.itmSymbol,
                otmSymbol: contract.otmSymbol,
                expiry: contract.expiry
            } as any )
        };
    }
}