//=====================================================================================
// src/dashboard/DashboardFormatter.ts
// AJ Institutional Dashboard Formatter - Metric Variables are Pine Compatible Contract
//                 OPTIONS PREMIUM
//                       │
//             ┌─────────┴─────────┐
//             │                   │
//          CE PREMIUM          PE PREMIUM
//             │                   │
//          LONG/BUY             LONG/BUY
//             │                   │
//          CE-BUY              PE-BUY
//LONG + CE → CE-BUY
//LONG + PE → PE-BUY
//SHORT      → -
//====================================================================================
//=====================================================================================
// src/dashboard/DashboardFormatter.ts
// AJ Institutional Dashboard Formatter
// Options BUY / LONG compatible
// Human-readable option symbol formatter
//=====================================================================================

export interface DashboardRuntime {

    engineState?: string;
    tradeMode?: string;
    bias?: string;
    direction?: string | number;
    tradeScore?: number;
    confidence?: number;
    executionAllowed?: boolean;

    optionSymbol?: string;

    entryPrice?: number | null;
    stopLoss?: number | null;
    tp1?: number | null;
    tp2?: number | null;
    tp3?: number | null;

    reEntryPrice?: number | null;
    reEntryStopLoss?: number | null;

    regime?: string;

    atmSymbol?: string;
    itmSymbol?: string;
    otmSymbol?: string;
}

//======================================================
// DASHBOARD VIEW
//======================================================

export interface DashboardView {

    engineState: string;
    position: string;
    direction: string;
    tradeScore: string;
    confidence: string;
    regime: string;
    execution: string;
    option: string;
    entry: string;
    stop: string;
    tp1: string;
    tp2: string;
    tp3: string;
    reEntry: string;
    reEntrySL: string;
}

//======================================================
// FORMATTER
//======================================================

export class DashboardFormatter {

    //==================================================
    // HUMAN READABLE OPTION SYMBOL
    //
    // Examples:
    //
    // NSE:NIFTY26AUG24150CE
    //        ↓
    // NIFTY 26 AUG 24150 CE
    //
    // NSE:NIFTY26AUG24150PE
    //        ↓
    // NIFTY 26 AUG 24150 PE
    //
    //==================================================

    private static formatOptionSymbol(
        symbol?: string
    ): string {

        if (!symbol) {
            return "-";
        }

        const raw = symbol.trim();

        if (!raw) {
            return "-";
        }

        // ------------------------------------------------
        // Remove exchange prefix
        //
        // NSE:NIFTY26AUG24150CE
        //        ↓
        // NIFTY26AUG24150CE
        // ------------------------------------------------

        const withoutExchange = raw
            .replace(/^[A-Z]+:/i, "")
            .trim();

        // ------------------------------------------------
        // NIFTY option format
        //
        // NIFTY26AUG24150CE
        //
        // Groups:
        // 1 = NIFTY
        // 2 = 26
        // 3 = AUG
        // 4 = 24150
        // 5 = CE / PE
        // ------------------------------------------------

        const niftyMatch = withoutExchange.match(
            /^NIFTY(\d{2})([A-Z]{3})(\d{4,6})(CE|PE)$/i
        );

        if (niftyMatch) {

            const expiryDay =
                niftyMatch[1];

            const expiryMonth =
                niftyMatch[2].toUpperCase();

            const strike =
                niftyMatch[3];

            const optionType =
                niftyMatch[4].toUpperCase();

            return (
                `NIFTY ${expiryDay} ` +
                `${expiryMonth} ` +
                `${strike} ` +
                `${optionType}`
            );
        }

        // ------------------------------------------------
        // BANKNIFTY support
        //
        // BANKNIFTY26AUG51000CE
        //        ↓
        // BANKNIFTY 26 AUG 51000 CE
        // ------------------------------------------------

        const bankNiftyMatch = withoutExchange.match(
            /^BANKNIFTY(\d{2})([A-Z]{3})(\d{4,6})(CE|PE)$/i
        );

        if (bankNiftyMatch) {

            const expiryDay =
                bankNiftyMatch[1];

            const expiryMonth =
                bankNiftyMatch[2].toUpperCase();

            const strike =
                bankNiftyMatch[3];

            const optionType =
                bankNiftyMatch[4].toUpperCase();

            return (
                `BANKNIFTY ${expiryDay} ` +
                `${expiryMonth} ` +
                `${strike} ` +
                `${optionType}`
            );
        }

        // ------------------------------------------------
        // FINNIFTY support
        // ------------------------------------------------

        const finniftyMatch = withoutExchange.match(
            /^FINNIFTY(\d{2})([A-Z]{3})(\d{4,6})(CE|PE)$/i
        );

        if (finniftyMatch) {

            const expiryDay =
                finniftyMatch[1];

            const expiryMonth =
                finniftyMatch[2].toUpperCase();

            const strike =
                finniftyMatch[3];

            const optionType =
                finniftyMatch[4].toUpperCase();

            return (
                `FINNIFTY ${expiryDay} ` +
                `${expiryMonth} ` +
                `${strike} ` +
                `${optionType}`
            );
        }

        // ------------------------------------------------
        // MIDCPNIFTY support
        // ------------------------------------------------

        const midcpMatch = withoutExchange.match(
            /^MIDCPNIFTY(\d{2})([A-Z]{3})(\d{4,6})(CE|PE)$/i
        );

        if (midcpMatch) {

            const expiryDay =
                midcpMatch[1];

            const expiryMonth =
                midcpMatch[2].toUpperCase();

            const strike =
                midcpMatch[3];

            const optionType =
                midcpMatch[4].toUpperCase();

            return (
                `MIDCPNIFTY ${expiryDay} ` +
                `${expiryMonth} ` +
                `${strike} ` +
                `${optionType}`
            );
        }

        // ------------------------------------------------
        // Generic option parser
        //
        // Used if the symbol isn't NIFTY/BANKNIFTY/etc.
        // ------------------------------------------------

        const genericMatch = withoutExchange.match(
            /^([A-Z]+)(\d{2})([A-Z]{3})(\d{4,6})(CE|PE)$/i
        );

        if (genericMatch) {

            const underlying =
                genericMatch[1].toUpperCase();

            const expiryDay =
                genericMatch[2];

            const expiryMonth =
                genericMatch[3].toUpperCase();

            const strike =
                genericMatch[4];

            const optionType =
                genericMatch[5].toUpperCase();

            return (
                `${underlying} ` +
                `${expiryDay} ` +
                `${expiryMonth} ` +
                `${strike} ` +
                `${optionType}`
            );
        }

        // ------------------------------------------------
        // If the symbol doesn't match any known pattern,
        // return the original symbol rather than breaking
        // the dashboard.
        // ------------------------------------------------

        return raw;
    }

    //==================================================
    // DETECT CE / PE
    //
    // Important for OPTIONS BUYING.
    //
    // LONG CE → CE-BUY
    // LONG PE → PE-BUY
    //
    // We do NOT use SHORT = PE anymore.
    //==================================================

    private static getOptionType(
        symbol?: string
    ): string {

        if (!symbol) {
            return "";
        }

        const upper =
            symbol.toUpperCase();

        if (upper.includes("CE")) {
            return "CE";
        }

        if (upper.includes("PE")) {
            return "PE";
        }

        return "";
    }

    //==================================================
    // FORMAT
    //==================================================

    static format(
        runtime: DashboardRuntime
    ): DashboardView {

        //================================================
        // ENGINE STATE
        //================================================

        const engineState =
            runtime.engineState === "MANAGED"
                ? "MANAGE"
                : runtime.engineState ?? "SCAN";


        //================================================
        // OPTION TYPE
        //================================================

        const optionType =
            DashboardFormatter.getOptionType(
                runtime.optionSymbol
            );


        //================================================
        // DIRECTION
        //
        // Options-buying model: once a real option contract
        // (CE or PE) is loaded, the dashboard direction is
        // ALWAYS "LONG" - we are buying premium, never
        // selling it. Index bias only decides WHICH contract
        // (CE vs PE) is correct; it must never flip this
        // display to SHORT.
        //
        // Index/stock charts (no optionType) keep mirroring
        // their own real bias direction as before.
        //================================================

        const direction =
            (optionType === "CE" || optionType === "PE")
                ? "LONG"
                : runtime.direction === 1 ||
                  runtime.direction === "LONG"
                    ? "LONG"
                    : runtime.direction === -1 ||
                      runtime.direction === "SHORT"
                        ? "SHORT"
                        : "NONE";


        //================================================
        // OPTIONS BUY POSITION
        //
        // IMPORTANT:
        //
        // CE premium BUY:
        // LONG + CE → CE-BUY
        //
        // PE premium BUY:
        // LONG + PE → PE-BUY
        //
        // We no longer interpret SHORT as PE-BUY.
        //================================================


        let position = "-";

        if (
            engineState === "CONFIRMED" ||
            engineState === "EXECUTED" ||
            engineState === "MANAGE"
        ) {

            if (optionType === "CE" || optionType === "PE") {

                // Options-buying model: once a real option
                // contract is selected, position is always a
                // BUY on that contract - regardless of whether
                // LONG or SHORT bias produced the recommendation.
                // There is no PE-SELL or CE-SELL in this
                // strategy.

                position = optionType + "-BUY";

            }
            else if (direction === "LONG") {

                // Equity / Index chart - recommend buying a CE.

                position = "CE-BUY";

            }
            else if (direction === "SHORT") {

                // Equity / Index chart - recommend buying a PE.

                position = "PE-BUY";

            }
        }


        //================================================
        // HUMAN READABLE OPTION
        //================================================

        const formattedOption =
            DashboardFormatter.formatOptionSymbol(
                runtime.optionSymbol
            );


        //================================================
        // RETURN DASHBOARD MODEL
        //================================================

        return {

            //================================================
            // ENGINE
            //================================================

            engineState,

            //================================================
            // POSITION
            //================================================

            position,

            //================================================
            // DIRECTION
            //================================================

            direction,

            //================================================
            // SCORE
            //================================================

            tradeScore:
                String(
                    runtime.tradeScore ?? 0
                ),

            //================================================
            // CONFIDENCE
            //================================================

            confidence:
                String(
                    runtime.confidence ?? 0
                ),

            //================================================
            // REGIME
            //================================================

            regime:
                runtime.regime ??
                "-",

            //================================================
            // EXECUTION
            //================================================

            execution:
                runtime.executionAllowed
                    ? "YES"
                    : "NO",

            //================================================
            // OPTION
            //================================================

            option:
                formattedOption,

            //================================================
            // ENTRY
            //================================================

            entry:
                runtime.entryPrice != null
                    ? runtime.entryPrice.toFixed(2)
                    : "-",

            //================================================
            // STOP LOSS
            //================================================

            stop:
                runtime.stopLoss != null
                    ? runtime.stopLoss.toFixed(2)
                    : "-",

            //================================================
            // TP1
            //================================================

            tp1:
                runtime.tp1 != null
                    ? runtime.tp1.toFixed(2)
                    : "-",

            //================================================
            // TP2
            //================================================

            tp2:
                runtime.tp2 != null
                    ? runtime.tp2.toFixed(2)
                    : "-",

            //================================================
            // TP3
            //================================================

            tp3:
                runtime.tp3 != null
                    ? runtime.tp3.toFixed(2)
                    : "-",

            //================================================
            // RE-ENTRY
            //================================================

            reEntry:
                runtime.reEntryPrice != null
                    ? runtime.reEntryPrice.toFixed(2)
                    : "-",

            //================================================
            // RE-ENTRY STOP LOSS
            //================================================

            reEntrySL:
                runtime.reEntryStopLoss != null
                    ? runtime.reEntryStopLoss.toFixed(2)
                    : "-"
        };
    }
}