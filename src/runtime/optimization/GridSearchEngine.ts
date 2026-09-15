//======================================================
// GridSearchEngine.ts
// Part 1  GridSearchEngine → performs exhaustive/local parameter search.
// Phase 14
// Exhaustive Parameter Search Engine
//======================================================

import type { ResearchParameterCandidate } from "./ResearchParameterOptimizer";

//======================================================
// GRID SEARCH RESULT
//======================================================

export interface GridSearchResult {

    bestCandidate: ResearchParameterCandidate;

    bestScore: number;

    totalEvaluated: number;

    rankedCandidates: ResearchParameterCandidate[];

}

//======================================================
// GRID SEARCH ENGINE
//======================================================

export class GridSearchEngine {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    private static clamp(
        value: number,
        min: number,
        max: number
    ): number {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }

    //--------------------------------------------------
    // EVALUATION FUNCTION
    //--------------------------------------------------

    private static evaluateCandidate(
        candidate: ResearchParameterCandidate
    ): number {

        let score = 50;

        //--------------------------------------------------
        // EXECUTION THRESHOLD
        //--------------------------------------------------

        score +=
            (70 - Math.abs(candidate.executionThreshold - 60));

        //--------------------------------------------------
        // CONFIDENCE
        //--------------------------------------------------

        score +=
            (70 - Math.abs(candidate.minimumConfidence - 60));

        //--------------------------------------------------
        // POSITION SIZE
        //--------------------------------------------------

        score +=
            20 -
            Math.abs(candidate.positionMultiplier - 1) * 20;

        //--------------------------------------------------
        // ATR
        //--------------------------------------------------

        score +=
            20 -
            Math.abs(candidate.atrMultiplier - 1) * 20;

        //--------------------------------------------------
        // RISK REWARD
        //--------------------------------------------------

        score +=
            candidate.riskReward * 10;

        return this.clamp(
            Math.round(score / 2),
            0,
            100
        );

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	    //--------------------------------------------------
    // SEARCH
    //--------------------------------------------------

    static optimize(
        candidates: ResearchParameterCandidate[]
    ): GridSearchResult {

        //--------------------------------------------------
        // SCORE ALL CANDIDATES
        //--------------------------------------------------

        const rankedCandidates =
            candidates.map(candidate => ({

                ...candidate,

                score:
                    this.evaluateCandidate(candidate)

            }));

        //--------------------------------------------------
        // SORT
        //--------------------------------------------------

        rankedCandidates.sort(
            (a, b) => b.score - a.score
        );

        //--------------------------------------------------
        // BEST
        //--------------------------------------------------

        const bestCandidate =
            rankedCandidates[0];

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            bestCandidate,

            bestScore:
                bestCandidate.score,

            totalEvaluated:
                rankedCandidates.length,

            rankedCandidates

        };

    }

}
