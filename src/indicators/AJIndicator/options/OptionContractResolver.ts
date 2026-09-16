//==============================================================
// src/indicators/AJIndicator/options/OptionContractResolver.ts
//===============================================================
//The original resolver was essentially a one-line wrapper around OptionSymbolBuilder. This version turns it into the central contract-selection engine by adding:
//✅ ATM / ITM / OTM strike resolution //✅ Configurable strike intervals (50, 100, etc.) //✅ Weekly expiry calculation //✅ Monthly expiry calculation (last Thursday)
//✅ Centralized contract resolution //✅ Structured OptionContractResult //✅ Delegation to OptionSymbolBuilder only for symbol formatting
//================================================================
//==============================================================
// src/indicators/AJIndicator/options/OptionContractResolver.ts
// Pine Compatible NSE Option Contract Resolver
//==============================================================

import {OptionSymbolBuilder} from "./OptionSymbolBuilder";

export interface OptionContractConfig {

    strikeStep?:number;

    strikeMode?:
        "ATM" |
        "ITM" |
        "OTM";

    expiryMode?:
        "WEEKLY" |
        "MONTHLY";

    expiry?:Date;

}

export interface OptionContractResult {

    symbol:string;
    atmSymbol:string;
    itmSymbol:string;
    otmSymbol:string;
    underlying:string;
    strike:number;
    atmStrike:number;
    itmStrike:number;
    otmStrike:number;
    optionType:string;
    expiry:Date;
    strikeMode:string;
    expiryMode:string;

}

//==============================================================

export class OptionContractResolver {

    //--------------------------------------------------
    // STRIKE STEP
    //--------------------------------------------------

    private static strikeStep(

        symbol:string

    ):number {

        const s =
            symbol.toUpperCase();

        if(
            s.includes("BANKNIFTY") ||
            s.includes("SENSEX") ||
            s.includes("BANKEX")
        ){
            return 100;
        }

        return 50;
    }

    //--------------------------------------------------
    // ROUND
    //--------------------------------------------------

    private static round(
        price:number,
        step:number

    ){
        return (
            Math.round(
                price / step
            )
            *
            step
        );
    }

    //--------------------------------------------------
    // NSE EXPIRY ENGINE
    //--------------------------------------------------

    private static weeklyExpiry(

        symbol:string

    ):Date {

        const expiry =
            new Date();
        const s =
            symbol.toUpperCase();

        //--------------------------------------------------
        // WEEKLY EXPIRY (PINE PARITY)
        //--------------------------------------------------

        let day = 4;

        //--------------------------------------------------
        // IMPORTANT:
        // BANKNIFTY before NIFTY
        //--------------------------------------------------

        if(
            s.includes("BANKNIFTY")
        ){
            day = 4;
        }

        else if(
            s.includes("BANKEX")
        ){
            day = 4;
        }

        else if(
            s.includes("SENSEX")
        ){
            day = 4;
        }

        else if(
            s.includes("FINNIFTY")
        ){
            day = 2;
        }

        else if(
            s.includes("NIFTY")
        ){
            day = 2;
        }

        while(
            expiry.getDay() !== day
        ){
            expiry.setDate(
                expiry.getDate()+1
            );
        }

        //--------------------------------------------------
        // If expiry is today but already expired,
        // move to next week's expiry.
        //--------------------------------------------------

        const now = new Date();

        if(
            expiry.toDateString() === now.toDateString() &&
            now.getHours() >= 15 &&
            now.getMinutes() >= 30
        ){
            expiry.setDate(
                expiry.getDate()+7
            );
        }

        return expiry;
    }

        //--------------------------------------------------
        // NSE EQUITY MONTHLY EXPIRY
        //--------------------------------------------------

        private static monthlyExpiry(
            _symbol:string
        ):Date{

            const expiry =
                new Date();

            expiry.setMonth(
                expiry.getMonth()+1,
                0
            );

            while(
                expiry.getDay()!==2
            ){
                expiry.setDate(
                    expiry.getDate()-1
                );
            }

            return expiry;

        }
	
    //--------------------------------------------------
    // RESOLVE
    //--------------------------------------------------

    static resolve(

        underlying:string,
        spot:number,
        direction:number,
        config?:OptionContractConfig
    ):OptionContractResult {

        const step =
            config?.strikeStep ??
            this.strikeStep(
                underlying
            );

        const atm =
            this.round(
                spot,
                step
            );

        //--------------------------------------------------
        // Pine parity
        //--------------------------------------------------

        const optionType =
            direction > 0
                ? "CE"
                : "PE";

        const itm =
            optionType === "CE"
                ? atm - step
                : atm + step;

        const otm =
            optionType === "CE"
                ? atm + step
                : atm - step;

        const mode =
            config?.strikeMode ??
            "ATM";

        const strike =
            mode === "ITM"
                ? itm
                : mode === "OTM"
                    ? otm
                    : atm;

        const normalizedUnderlying =
            String(underlying ?? "")
                .trim()
                .toUpperCase();

        const isIndexOption =
            normalizedUnderlying === "NIFTY" ||
            normalizedUnderlying === "BANKNIFTY" ||
            normalizedUnderlying === "FINNIFTY" ||
            normalizedUnderlying === "MIDCPNIFTY" ||
            normalizedUnderlying === "SENSEX" ||
            normalizedUnderlying === "BANKEX";

        const expiry =

            config?.expiry ??

            (
                config?.expiryMode === "MONTHLY" ||
                !isIndexOption

                    ? this.monthlyExpiry(
                        normalizedUnderlying
                    )

                    : this.weeklyExpiry(
                        normalizedUnderlying
                    )
            );

        return {

            symbol:
                OptionSymbolBuilder.build(
                    underlying,
                    strike,
                    optionType,
                    expiry
                ),

            atmSymbol:
                OptionSymbolBuilder.build(
                    underlying,
                    atm,
                    optionType,
                    expiry
                ),

            itmSymbol:
                OptionSymbolBuilder.build(
                    underlying,
                    itm,
                    optionType,
                    expiry
                ),

            otmSymbol:
                OptionSymbolBuilder.build(
                    underlying,
                    otm,
                    optionType,
                    expiry
                ),

            underlying,
            strike,
            atmStrike:atm,
            itmStrike:itm,
            otmStrike:otm,
            optionType,
            expiry,
            strikeMode:mode,
            expiryMode:
                config?.expiryMode ??
                "WEEKLY"
        };

    }

}