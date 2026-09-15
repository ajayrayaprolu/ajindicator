/****************************************************************************************
 * File:
 * MultiTimeframeEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MultiTimeframe/MultiTimeframeEngine.ts
 *
 * Purpose:
 * Canonical Multi-Timeframe Engine for AJ v2.
 *
 * Responsibilities
 * ----------------
 * • 1m evaluation
 * • 5m evaluation
 * • 15m evaluation
 * • 1h evaluation
 * • 4h evaluation
 * • Daily evaluation
 * • HTF agreement
 * • Trend voting
 * • Alignment %
 * • Conflict detection
 * • Institutional alignment
 *
 * This engine produces only reusable market context.
 * It never performs trade execution, confidence scoring
 * or authority decisions.
 ****************************************************************************************/

import type {
    MultiTimeframeInput,
    TimeframeVote,
    DominantTrend,
    AgreementLevel
} from "./MultiTimeframeTypes";

import type {
    MultiTimeframeResult
} from "./MultiTimeframeResult";

export class MultiTimeframeEngine {

    //==================================================
    // ANALYZE
    //==================================================

    static analyze(
        input: MultiTimeframeInput
    ): MultiTimeframeResult {

        //--------------------------------------------------
        // TIMEFRAME COLLECTION
        //--------------------------------------------------

        const frames: TimeframeVote[] = [

            input.tf1m,
            input.tf5m,
            input.tf15m,
            input.tf1h,
            input.tf4h,
            input.tf1d

        ];

        //--------------------------------------------------
        // VOTES
        //--------------------------------------------------

        const bullVotes =
            frames.filter(f => f.direction === 1).length;

        const bearVotes =
            frames.filter(f => f.direction === -1).length;

        const neutralVotes =
            frames.filter(f => f.direction === 0).length;

        //--------------------------------------------------
        // DOMINANT TREND
        //--------------------------------------------------

        let dominantTrend: DominantTrend =
            "NEUTRAL";

        if (bullVotes > bearVotes)
            dominantTrend = "BULLISH";

        if (bearVotes > bullVotes)
            dominantTrend = "BEARISH";

        //--------------------------------------------------
        // ALIGNMENT
        //--------------------------------------------------

        const agreement =
            Math.round(
                (
                    Math.max(
                        bullVotes,
                        bearVotes
                    ) /
                    frames.length
                ) * 100
            );

        //--------------------------------------------------
        // AGREEMENT LEVEL
        //--------------------------------------------------

        let agreementLevel: AgreementLevel =
            "LOW";

        if (agreement >= 90)
            agreementLevel = "VERY_HIGH";
        else if (agreement >= 75)
            agreementLevel = "HIGH";
        else if (agreement >= 60)
            agreementLevel = "MEDIUM";

        //--------------------------------------------------
        // HTF AGREEMENT
        //--------------------------------------------------

        const higherTimeframeAgreement =

            input.tf1h.direction ===
            input.tf4h.direction &&

            input.tf4h.direction ===
            input.tf1d.direction;

        //--------------------------------------------------
        // LOWER TF AGREEMENT
        //--------------------------------------------------

        const lowerTimeframeAgreement =

            input.tf1m.direction ===
            input.tf5m.direction &&

            input.tf5m.direction ===
            input.tf15m.direction;

        //--------------------------------------------------
        // CONFLICT
        //--------------------------------------------------

        const conflictingTimeframes =

            !higherTimeframeAgreement ||

            !lowerTimeframeAgreement;

        //--------------------------------------------------
        // INSTITUTIONAL ALIGNMENT
        //--------------------------------------------------

        const institutionalAlignment =

            higherTimeframeAgreement &&

            agreement >= 75;

        //--------------------------------------------------
        // DOMINANT TF
        //--------------------------------------------------

        let dominantTimeframe =
            "15m";

        if (input.tf1d.strength >= 80)
            dominantTimeframe = "1D";
        else if (input.tf4h.strength >= 80)
            dominantTimeframe = "4H";
        else if (input.tf1h.strength >= 80)
            dominantTimeframe = "1H";

        //--------------------------------------------------
        // CONFIDENCE
        //--------------------------------------------------

        const alignmentScore =

            Math.min(
                100,
                agreement
            );

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // RAW TIMEFRAMES
            //--------------------------------------------------

            tf1m: input.tf1m,

            tf5m: input.tf5m,

            tf15m: input.tf15m,

            tf1h: input.tf1h,

            tf4h: input.tf4h,

            tf1d: input.tf1d,

            //--------------------------------------------------
            // VOTING
            //--------------------------------------------------

            bullVotes,

            bearVotes,

            neutralVotes,

            //--------------------------------------------------
            // ALIGNMENT
            //--------------------------------------------------

            alignmentPercent:
                agreement,

            agreementLevel,

            //--------------------------------------------------
            // TREND
            //--------------------------------------------------

            dominantTrend,

            dominantTimeframe,

            //--------------------------------------------------
            // AGREEMENT
            //--------------------------------------------------

            higherTimeframeAgreement,

            lowerTimeframeAgreement,

            overallAgreement:

                higherTimeframeAgreement &&

                lowerTimeframeAgreement,

            //--------------------------------------------------
            // CONFLICT
            //--------------------------------------------------

            conflictingTimeframes,

            //--------------------------------------------------
            // QUALITY
            //--------------------------------------------------

            institutionalAlignment,

            alignmentScore,

            //--------------------------------------------------
            // SUMMARY FLAGS
            //--------------------------------------------------

            bullishAlignment:

                dominantTrend === "BULLISH",

            bearishAlignment:

                dominantTrend === "BEARISH",

            neutralAlignment:

                dominantTrend === "NEUTRAL"

        };

    }

}