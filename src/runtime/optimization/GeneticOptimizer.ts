//This is the final optimization engine in Phase 14. Unlike GridSearchEngine, which performs deterministic evaluation, 
//GeneticOptimizer refines parameter candidates through selection and mutation. For now, it implements a lightweight 
//evolutionary strategy that is deterministic and compile-safe. In later phases, it can be extended with historical 
//backtesting, crossover, and multi-generation evolution.

//======================================================
// GeneticOptimizer.ts
// Part 1
// Phase 14
// Evolutionary Parameter Optimization Engine
//======================================================

import type { ResearchParameterCandidate } from "./ResearchParameterOptimizer";

//======================================================
// RESULT
//======================================================

export interface GeneticOptimizationResult {

    bestCandidate: ResearchParameterCandidate;

    evolvedPopulation: ResearchParameterCandidate[];

    generations: number;

    improvementScore: number;

}

//======================================================
// GENETIC OPTIMIZER
//======================================================

export class GeneticOptimizer {

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
    // MUTATION
    //--------------------------------------------------

    private static mutate(
        candidate: ResearchParameterCandidate
    ): ResearchParameterCandidate {

        return {

            executionThreshold:
                this.clamp(
                    candidate.executionThreshold + 2,
                    50,
                    80
                ),

            minimumConfidence:
                this.clamp(
                    candidate.minimumConfidence + 2,
                    50,
                    80
                ),

            positionMultiplier:
                this.clamp(
                    candidate.positionMultiplier * 1.02,
                    0.50,
                    2.00
                ),

            atrMultiplier:
                this.clamp(
                    candidate.atrMultiplier * 0.98,
                    0.50,
                    2.00
                ),

            riskReward:
                this.clamp(
                    candidate.riskReward + 0.10,
                    1,
                    5
                ),

            score:
                candidate.score

        };

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // OPTIMIZE
    //--------------------------------------------------

    static optimize(
        population: ResearchParameterCandidate[],
        generations = 5
    ): GeneticOptimizationResult {

        //--------------------------------------------------
        // INITIAL POPULATION
        //--------------------------------------------------

        let evolvedPopulation =
            [...population];

        //--------------------------------------------------
        // EVOLUTION LOOP
        //--------------------------------------------------

        for (let i = 0; i < generations; i++) {

            evolvedPopulation =
                evolvedPopulation
                    .sort((a, b) => b.score - a.score)
                    .slice(
                        0,
                        Math.max(
                            2,
                            Math.ceil(evolvedPopulation.length / 2)
                        )
                    )
                    .map(candidate =>
                        this.mutate(candidate)
                    );

        }

        //--------------------------------------------------
        // FINAL SORT
        //--------------------------------------------------

        evolvedPopulation.sort(
            (a, b) => b.score - a.score
        );

        const bestCandidate =
            evolvedPopulation[0];

        //--------------------------------------------------
        // IMPROVEMENT
        //--------------------------------------------------

        const originalBest =
            Math.max(
                ...population.map(p => p.score)
            );

        const improvementScore =
            Math.max(
                0,
                bestCandidate.score - originalBest
            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            bestCandidate,

            evolvedPopulation,

            generations,

            improvementScore

        };

    }

}
