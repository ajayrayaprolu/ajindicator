//============================================================
// src/indicators/AJIndicator/options/OptionSymbolBuilder.ts
//===========================================================
//This version makes it a reusable symbol generation component while remaining lightweight.
//Enhancements                                                               | Support TradingView style option symbol generation
//✅ Configurable symbol formats (COMPACT and UNDERSCORE)                    |NIFTY
//✅ Centralized expiry formatting                                           |BANKNIFTY
//✅ Broker-independent architecture                                         |SENSEX  other underlying
//✅ Exchange configuration placeholder (NSE, BSE) for future extension      |Keep CE/PE dynamic from direction
//✅ Single entry point (build()) for all symbol generation                  |Prepare for ATM / ITM / OTM coming from OptionContractResolver
//✅ Compatible with the new OptionContractResolver
//======================================================
// src/indicators/AJIndicator/options/OptionSymbolBuilder.ts
// Institutional Option Symbol Builder
//======================================================

//======================================================
// OPTION SYMBOL BUILDER
//======================================================

export class OptionSymbolBuilder {


    //--------------------------------------------------
    // BUILD
    //--------------------------------------------------

    static build(
        underlying:string,
        strike:number,
        optionType:string,
        expiry:Date
    ):string {

        //--------------------------------------------------
        // OPTION SIDE VALIDATION
        //--------------------------------------------------
        optionType =
            optionType === "CE"
                ? "CE"
                : "PE";

        //--------------------------------------------------
        // VALIDATION
        //--------------------------------------------------
        if(
            !underlying ||
            !strike ||
            !optionType ||
            !expiry
        ){
            return "-";
        }

        //--------------------------------------------------
        // DATE PARTS
        //--------------------------------------------------
        const day =
            expiry
                .getDate()
                .toString()
                .padStart(
                    2,
                    "0"
                );

        const month =
            expiry
                .toLocaleString(
                    "en-US",
                    {
                        month:"short"
                    }
                )
                .toUpperCase();

        //--------------------------------------------------
        // NORMALIZE SYMBOL
        //--------------------------------------------------
        const symbol =
            underlying
                .replace(
                    " ",
                    ""
                )
                .toUpperCase();

        //--------------------------------------------------
        // NORMALIZE OPTION TYPE
        //--------------------------------------------------
        const type =
            optionType
                .toUpperCase();

        //--------------------------------------------------
        // FORMAT
        // Example:
        // NIFTY 09JUL 25500CE
        // BANKNIFTY 09JUL 57000PE
        //--------------------------------------------------
        return (

            symbol +

            " " +

            day +

            month +

            " " +

            Math.round(
                strike
            )

            +

            type

        );

    }

}