//======================================
// src\runtime\Portfolio\PortfolioAI.ts
//======================================

export interface PortfolioAIResult {
    convictionScore: number;
    confidence: number;
    recommendation: string;
}

export class PortfolioAI {

    static select(
        rankedSymbols: string[],
        count = 5
    ): string[] {

        return rankedSymbols.slice(0, count);

    }

}

