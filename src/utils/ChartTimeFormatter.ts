//======================================================
// src/utils/ChartTimeFormatter.ts
// TradingView Time Formatter
//======================================================

export class ChartTimeFormatter {

    static format(
        unixSeconds:number
    ):string{

        return new Intl.DateTimeFormat(

            "en-IN",

            {

                timeZone:"Asia/Kolkata",

                hour:"2-digit",
                minute:"2-digit",

                hour12:false

            }

        ).format(

            new Date(
                unixSeconds*1000
            )

        );

    }

}