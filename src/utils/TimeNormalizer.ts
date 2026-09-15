//======================================================
// src/utils/TimeNormalizer.ts
// TradingView compatible candle time normalizer
//======================================================

export class TimeNormalizer {

    static normalize(
        timestamp:number
    ):number {

        //--------------------------------------------------
        // lightweight-chart expects UNIX seconds
        // Binance gives milliseconds
        //--------------------------------------------------

        if(
            timestamp >
            9999999999
        ){

            return Math.floor(
                timestamp / 1000
            );

        }

        return timestamp;

    }


    static istLabel(
        timestamp:number
    ):string {

        return new Date(
            this.normalize(timestamp) * 1000
        ).toLocaleString(

            "en-IN",

            {

                timeZone:
                    "Asia/Kolkata"

            }

        );

    }

}