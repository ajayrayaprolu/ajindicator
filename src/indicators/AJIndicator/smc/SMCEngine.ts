//======================================================
// src/indicators/AJIndicator/smc/SMCEngine.ts
// Pine SMC Router
//
// RV-SMC-01
// Previously required ALL 6 confirmations true
// simultaneously per direction (bos+choch+fvg+sweep+
// displacement+breakFollow). Under our smoothed/synthetic
// CVD-driven structure signals (see RV-CVD-01) this
// virtually never fires - matches the same "never confirms"
// failure mode BTC's old CVD raw-diff had. Switched to a
// count-based threshold, scaled by smcProfile - matching
// Pine's own stated intent (SAFE = strict/high-quality,
// SWING = balanced, SCALPER = fast/looser) without
// requiring literal all-6 alignment.
//======================================================
import type {SMCInputs} from "./SMCTypes";
import type {SMCResult} from "./SMCResult";

type SMCProfile = "SAFE" | "SWING" | "SCALPER";

const PROFILE_MIN_CONFIRMATIONS: Record<SMCProfile, number> = {
    SAFE: 5,
    SWING: 3,
    SCALPER: 2
};

export class SMCEngine {

    evaluate(
        input: SMCInputs & {
            smcProfile?: SMCProfile;
            tradeDirectionFinal?: number;
        }
    ): SMCResult {

        const profile: SMCProfile =
            input.smcProfile ?? "SCALPER";

        const minConfirmations =
            PROFILE_MIN_CONFIRMATIONS[profile];

        const longConfirmations = [
            input.smcBosBull,
            input.smcChochBull,
            input.smcBullFvgRetest,
            input.smcSweepLow,
            input.aiBullDisplacement,
            input.aiBreakFollowLong
        ].filter(Boolean).length;

        const shortConfirmations = [
            input.smcBosBear,
            input.smcChochBear,
            input.smcBearFvgRetest,
            input.smcSweepHigh,
            input.aiBearDisplacement,
            input.aiBreakFollowShort
        ].filter(Boolean).length;

        const longPass =
            longConfirmations >= minConfirmations;

        const shortPass =
            shortConfirmations >= minConfirmations;

        const requestedDirection =
            input.tradeDirectionFinal ?? 0;

        const smcLong =
            requestedDirection < 0
                ? false
                : longPass;

        const smcShort =
            requestedDirection > 0
                ? false
                : shortPass;

        const smcCorePass =
            requestedDirection > 0
                ? smcLong
                : requestedDirection < 0
                    ? smcShort
                    : smcLong || smcShort;

        let smcReason = "WAIT";

        if (smcLong) {
            smcReason =
                `LONG (${longConfirmations}/${minConfirmations} ${profile})`;
        }
        else if (smcShort) {
            smcReason =
                `SHORT (${shortConfirmations}/${minConfirmations} ${profile})`;
        }
        else {
            smcReason =
                `WAIT (best ${Math.max(
                    longConfirmations,
                    shortConfirmations
                )}/${minConfirmations} ${profile})`;
        }

        return {
            smcLong,
            smcShort,
            smcCorePass,
            smcReason
        };
    }
}