/****************************************************************************************
 * File:
 * ConfidenceEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Confidence/ConfidenceEngine.ts
 *
 * Purpose:
 * Canonical Institutional Confidence Engine.
 *
 * Responsibilities:
 * -----------------
 * • Replaces the legacy Score Engine.
 * • Aggregates confidence from every completed AJ engine.
 * • Produces:
 *      - Confidence %
 *      - Trade Grade
 *      - Confidence Class
 *      - Positive Factors
 *      - Negative Factors
 *      - Weighted Evidence
 *
 * This engine DOES NOT:
 * ---------------------
 * • Generate BUY / SELL decisions
 * • Perform execution
 * • Calculate SL / TP
 * • Size positions
 *
 * AJ Architecture
 *
 * Trend
 * Momentum
 * Structure
 * Liquidity
 * Order Flow
 * Price Action
 * Volatility
 * Multi Timeframe
 * Risk Qualification
 *          │
 *          ▼
 *     ConfidenceEngine
 *          │
 *          ▼
 *     AuthorityDecision
 ****************************************************************************************/

import type {ConfidenceInput} from "./ConfidenceTypes";
import type {ConfidenceResult} from "./ConfidenceResult";
import type {ConfidenceEvidence} from "./ConfidenceEvidence";

import {
    ConfidenceWeights,
    confidenceToGrade,
    confidenceToClass
} from "./ConfidenceFactors";
import { AJRuntimeParameters } from "@/indicators/AJIndicator/config/AJRuntimeParameters";
import { AJLoggingGate } from "../../debug/AJLoggingGate";

//======================================================
// CONFIDENCE ENGINE
//======================================================

export class ConfidenceEngine {

    //--------------------------------------------------
    // MAX SCORE
    //--------------------------------------------------

    private static readonly MAX_SCORE = 100;
	
	//--------------------------------------------------
	// DEFAULT CONFIDENCE THRESHOLD
	// Production default.
	//
	// May be overridden at runtime using:
	//
	// globalThis.__AJ_RUNTIME_CALIBRATION__
	//
	// Example:
	//
	// globalThis.__AJ_RUNTIME_CALIBRATION__ = {
	//     confidenceThreshold: 45
	// };
	//
	// No override = production behaviour.
	// For maximum sensitivity during testing, use 5.
	//--------------------------------------------------
	
	private static get minConfidenceScore(): number {
	
		return AJRuntimeParameters.confidenceThreshold;
	
	}

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(
        input: ConfidenceInput
    ): ConfidenceResult {

	//--------------------------------------------------
	// RV-07 ENTRY
	//--------------------------------------------------
	
	AJLoggingGate.group("[RV-07] ConfidenceEngine.evaluate()");
	AJLoggingGate.log("Symbol:",input.symbol ?? "<Unknown>");
	AJLoggingGate.log("Timeframe:",input.timeframe ?? "<Unknown>");
	AJLoggingGate.log("Trade Direction:",input.tradeDirection);
	AJLoggingGate.log("Authority Decision:",input.authorityDecision);
	AJLoggingGate.groupEnd();
	
	//--------------------------------------------------
	// INPUT VALIDATION
	//--------------------------------------------------
	
	AJLoggingGate.group("[RV-07] Input Validation");
	
	// Trend
	if (input.trend.direction == null)
		AJLoggingGate.warn("trend.direction is missing");
	
	if (Number.isNaN(input.trend.strength))
		AJLoggingGate.warn("trend.strength is NaN");
	
	// Momentum
	if (input.momentum.direction == null)
		AJLoggingGate.warn("momentum.direction is missing");
	
	if (Number.isNaN(input.momentum.strength))
		AJLoggingGate.warn("momentum.strength is NaN");
	
	// Market Structure
	if (!input.marketStructure)
		AJLoggingGate.warn("marketStructure is missing");
	
	// Order Flow
	if (!input.orderFlow)
		AJLoggingGate.warn("orderFlow is missing");
	else {
	
		if (input.orderFlow.direction == null)
			AJLoggingGate.warn("orderFlow.direction is missing");
	
		if (Number.isNaN(input.orderFlow.strength))
			AJLoggingGate.warn("orderFlow.strength is NaN");
	}
	
	// Risk Qualification
	if (!input.riskQualification)
		AJLoggingGate.warn("riskQualification is missing");
	
	AJLoggingGate.groupEnd();

	//--------------------------------------------------
	// INITIAL SCORE
	//--------------------------------------------------

        let confidenceScore = 0;

        //--------------------------------------------------
        // POSITIVE
        //--------------------------------------------------

        const positiveFactors: string[] = [];

        //--------------------------------------------------
        // NEGATIVE
        //--------------------------------------------------

        const negativeFactors: string[] = [];

        //--------------------------------------------------
        // EVIDENCE
        //--------------------------------------------------

        const evidence: ConfidenceEvidence[] = [];

        //--------------------------------------------------
        // VALIDATION
        //--------------------------------------------------

		if (
			input.tradeDirection === 0 ||
			input.authorityDecision === "WAIT"
		) {
		
			AJLoggingGate.warn(
				"[RV-07] ConfidenceEngine EARLY RETURN",
				{
					tradeDirection: input.tradeDirection,
					authorityDecision: input.authorityDecision
				}
			);
		
			return {
			
				confidence: 0,
				aiConfidence: 0,
				confidenceClass: "NONE",
				tradeGrade: "F",
				confidenceGrade: "F",
				positiveFactors: [],
				negativeFactors: [],
				evidence: [],
				evidenceWeight: 0,
				
				evidenceSummary: {
					totalEvidence: 0,
					positiveEvidence: 0,
					negativeEvidence: 0
				},
				
				tradeQualified: false,
				institutionalGrade: false,
				
				recommendation: "NO_TRADE",
		
				diagnostics: {
					confidence:0,
					aiConfidence:0,
					confidenceGrade:"F",
					recommendation:"NO_TRADE",
					normalizedScore: 0,
					rawScore: 0,
					maximumScore: 0
				
				}
			};
        }

        //--------------------------------------------------
        // TREND
        //--------------------------------------------------
		//--------------------------------------------------
        // TREND CONFIDENCE
        //--------------------------------------------------

        if (
            input.trend.direction ===
            input.tradeDirection
        ) {
            const weight =
                ConfidenceWeights.TREND;
            const score =
                Math.min(
                    weight,
                    (
                        input.trend.strength /
                        100
                    ) * weight
                );
            confidenceScore += score;
            positiveFactors.push(
                "Trend aligned"
            );
			evidence.push({
				id: "TREND",
				title: "Trend aligned",
				category: "TREND",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: score,
				description:
					"Primary trend agrees with trade direction"
			});
        }
        else {
            const penalty =
                ConfidenceWeights.TREND;
            confidenceScore -=
                penalty * 0.50;
            negativeFactors.push(
                "Trend conflict"
            );
			evidence.push({
				id: "TREND",
				title: "Trend conflict",
				category: "TREND",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.50),
				description:
					"Trend opposes trade direction"
			});

        }

        //--------------------------------------------------
        // TREND QUALITY
        //--------------------------------------------------

        if (
            (input.trend.quality ?? 0) >= 80
        ) {

            const weight =
                ConfidenceWeights.TREND_QUALITY;
            confidenceScore += weight;
            positiveFactors.push(
                "Strong trend quality"
            );

			evidence.push({
				id: "TREND_QUALITY",
				title: "Strong trend quality",
				category: "TREND",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Trend quality above institutional threshold"
			});

        }

        //--------------------------------------------------
        // MOMENTUM
        //--------------------------------------------------

        if (
            input.momentum.direction ===
            input.tradeDirection
        ) {

            const weight =
                ConfidenceWeights.MOMENTUM;
            const score =
                Math.min(
                    weight,
                    (
                        input.momentum.strength /
                        100
                    ) * weight
                );

            confidenceScore += score;
            positiveFactors.push(
                "Momentum confirmed"
            );

			evidence.push({
				id: "MOMENTUM",
				title: "Momentum confirmed",
				category: "MOMENTUM",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: score,
				description:
					"Momentum agrees with trend"
			});
        }
        else {
            const penalty =
                ConfidenceWeights.MOMENTUM;
            confidenceScore -=
                penalty * 0.50;
            negativeFactors.push(
                "Weak momentum"
            );
			evidence.push({
				id: "MOMENTUM",
				title: "Momentum conflict",
				category: "MOMENTUM",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.50),
				description:
					"Momentum disagrees with trade direction"
			});

        }

        //--------------------------------------------------
        // IMPULSE
        //--------------------------------------------------

        if (
            (input.momentum.impulseStrength ?? 0) >= 75
        ) {
            const weight =
                ConfidenceWeights.IMPULSE;
            confidenceScore += weight;
            positiveFactors.push(
                "Strong impulse"
            );
			evidence.push({
				id: "IMPULSE",
				title: "Strong impulse",
				category: "MOMENTUM",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Strong impulsive move detected"
			});

        }

        //--------------------------------------------------
        // BREAKOUT
        //--------------------------------------------------

        if (
            (input.momentum.breakoutStrength ?? 0) >= 70
        ) {
            const weight =
                ConfidenceWeights.BREAKOUT;
            confidenceScore += weight;
            positiveFactors.push(
                "Confirmed breakout"
            );
			evidence.push({
				id: "BREAKOUT",
				title: "Confirmed breakout",
				category: "MOMENTUM",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Breakout strength exceeds confirmation threshold"
			});

        }

        //--------------------------------------------------
        // MARKET STRUCTURE
        //--------------------------------------------------

        if (
            input.marketStructure.bosDirection ===
            input.tradeDirection
        ) {
            const weight =
                ConfidenceWeights.BOS;
            confidenceScore += weight;
            positiveFactors.push(
                "Strong BOS"
            );
			evidence.push({
				id: "BOS",
				title: "Strong BOS",
				category: "MARKET_STRUCTURE",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Break of Structure confirms trend continuation"
			});
        }

        else if (
            input.marketStructure.bosDirection !== 0
        ) {
            const penalty =
                ConfidenceWeights.BOS;
            confidenceScore -=
                penalty * 0.60;
            negativeFactors.push(
                "Opposite BOS"
            );
			evidence.push({
				id: "BOS",
				title: "Opposite BOS",
				category: "MARKET_STRUCTURE",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.60),
				description:
					"Break of Structure opposes current trade"
			});
        }

        //--------------------------------------------------
        // CHOCH
        //--------------------------------------------------

        if (
            input.marketStructure.chochDirection ===
            input.tradeDirection
        ) {

            const weight =
                ConfidenceWeights.CHOCH;
            confidenceScore += weight;
            positiveFactors.push(
                "CHOCH confirmation"
            );
			evidence.push({
				id: "CHOCH",
				title: "CHOCH confirmation",
				category: "MARKET_STRUCTURE",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Change of Character supports trade"
			});

        }
        else if (
            input.marketStructure.chochDirection !== 0
        ) {
            const penalty =
                ConfidenceWeights.CHOCH;
            confidenceScore -=
                penalty * 0.50;
            negativeFactors.push(
                "Opposite CHOCH"
            );
			evidence.push({
				id: "CHOCH",
				title: "Opposite CHOCH",
				category: "MARKET_STRUCTURE",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.50),
				description:
					"CHOCH detected against trade"
			});

        }

        //--------------------------------------------------
        // ORDER BLOCK
        //--------------------------------------------------

        if (
            input.marketStructure.orderBlockAligned
        ) {
            const weight =
                ConfidenceWeights.ORDER_BLOCK;
            confidenceScore += weight;
            positiveFactors.push(
                "Institutional Order Block"
            );
			evidence.push({
				id: "ORDER_BLOCK",
				title: "Institutional Order Block",
				category: "ORDER_BLOCK",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Entry aligns with institutional Order Block"
			});

        }

		else {
		
			negativeFactors.push("No Order Block");
		
			evidence.push({
				id: "ORDER_BLOCK",
				title: "No Order Block",
				category: "ORDER_BLOCK",
				polarity: "NEGATIVE",
				passed: false,
				weight: ConfidenceWeights.ORDER_BLOCK,
				contribution: 0,
				description: "No institutional order block detected."
			});
		
		}

        //--------------------------------------------------
        // FAIR VALUE GAP
        //--------------------------------------------------

        if (
            input.marketStructure.fvgAligned
        ) {
            const weight =
                ConfidenceWeights.FVG;
            confidenceScore += weight;
            positiveFactors.push(
                "Bull/Bear FVG"
            );
			evidence.push({
				id: "FVG",
				title: "Bull/Bear FVG",
				category: "ORDER_BLOCK",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Fair Value Gap alignment confirmed"
			});
        }

        else {
            negativeFactors.push(
                "No valid FVG"
            );
        }

        //--------------------------------------------------
        // LIQUIDITY SWEEP
        //--------------------------------------------------

        if (
            input.marketStructure.liquiditySweepConfirmed
        ) {

            const weight =
                ConfidenceWeights.LIQUIDITY_SWEEP;
            confidenceScore += weight;
            positiveFactors.push(
                "Liquidity Sweep"
            );
			evidence.push({
				id: "LIQUIDITY_SWEEP",
				title: "Liquidity Sweep",
				category: "LIQUIDITY",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Institutional liquidity sweep confirmed"
			});
        }

        else {
            negativeFactors.push(
                "No Liquidity Sweep"
            );
        }

        //--------------------------------------------------
        // MARKET STRUCTURE QUALITY
        //--------------------------------------------------

        if (
            (input.marketStructure.structureQuality ?? 0) >= 80
        ) {
            const weight =
                ConfidenceWeights.STRUCTURE_QUALITY;
            confidenceScore += weight;
            positiveFactors.push(
                "High structure quality"

            );
			evidence.push({
				id: "STRUCTURE_QUALITY",
				title: "High structure quality",
				category: "MARKET_STRUCTURE",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Institutional structure quality is high"
			});

        }

        //--------------------------------------------------
        // ORDER FLOW
        //--------------------------------------------------

        if (
            input.orderFlow.direction ===
            input.tradeDirection
        ) {
            const weight =
                ConfidenceWeights.ORDER_FLOW;
            const score =
                Math.min(
                    weight,
                    (
                        input.orderFlow.strength /
                        100
                    ) * weight

                );

            confidenceScore += score;
            positiveFactors.push(
                "Institutional Order Flow"
            );
			evidence.push({
				id: "ORDER_FLOW",
				title: "Institutional Order Flow",
				category: "ORDER_FLOW",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: score,
				description:
					"Order flow supports trade direction"
			});
        }
        else {
            const penalty =
                ConfidenceWeights.ORDER_FLOW;
            confidenceScore -=
                penalty * 0.50;
            negativeFactors.push(
                "Opposing Order Flow"
            );
			evidence.push({
				id: "ORDER_FLOW",
				title: "Opposing Order Flow",
				category: "ORDER_FLOW",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.50),
				description:
					"Order flow opposes trade"
			});

        }

        //--------------------------------------------------
        // CVD
        //--------------------------------------------------

        if (
            input.orderFlow.cvdConfirmed
        ) {

            const weight =
                ConfidenceWeights.CVD;
            confidenceScore += weight;
            positiveFactors.push(
                "Positive CVD"
            );
			evidence.push({
				id: "CVD",
				title: "Positive CVD",
				category: "ORDER_FLOW",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Cumulative Volume Delta confirms buyers/sellers"
			});
        }

        else {
            negativeFactors.push(
                "Weak CVD"
            );
        }

        //--------------------------------------------------
        // VOLUME
        //--------------------------------------------------

        if (
            (input.orderFlow.volumeStrength ?? 0) >= 70
        ) {
            const weight =
                ConfidenceWeights.VOLUME;
            confidenceScore += weight;
            positiveFactors.push(
                "Strong Volume"
            );
			evidence.push({
				id: "VOLUME",
				title: "Strong Volume",
				category: "ORDER_FLOW",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Institutional participation detected"
			});

        }
        else {
            negativeFactors.push(
                "Low Volume"
            );
        }

        //--------------------------------------------------
        // ORDER FLOW QUALITY
        //--------------------------------------------------

        if (
            (input.orderFlow.quality ?? 0) >= 80
        ) {
            const weight =
                ConfidenceWeights.ORDER_FLOW_QUALITY;
            confidenceScore += weight;
            positiveFactors.push(
                "High Order Flow Quality"
            );
			evidence.push({
				id: "ORDER_FLOW_QUALITY",
				title: "High Order Flow Quality",
				category: "ORDER_FLOW",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Institutional order-flow quality is high"
			});
        }

        //--------------------------------------------------
        // VOLATILITY
        //--------------------------------------------------

        if (
            input.volatility.acceptable
        ) {

            const weight =
                ConfidenceWeights.VOLATILITY;
            confidenceScore += weight;
            positiveFactors.push(
                "Healthy Volatility"

            );
			evidence.push({
				id: "VOLATILITY",
				title: "Healthy Volatility",
				category: "VOLATILITY",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Volatility within institutional limits"
			});
        }
        else {
            const penalty =
                ConfidenceWeights.VOLATILITY;
            confidenceScore -=
                penalty * 0.50;
            negativeFactors.push(
                "High Volatility"
            );
			evidence.push({
				id: "VOLATILITY",
				title: "High Volatility",
				category: "VOLATILITY",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.50),
				description:
					"Volatility exceeds acceptable threshold"
			});

        }

        //--------------------------------------------------
        // ATR QUALITY
        //--------------------------------------------------

        if (
            (input.volatility.atrQuality ?? 0) >= 70
        ) {

            const weight =
                ConfidenceWeights.ATR;
            confidenceScore += weight;
            positiveFactors.push(
                "Stable ATR"
            );
			evidence.push({
				id: "ATR",
				title: "Stable ATR",
				category: "VOLATILITY",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"ATR supports controlled risk"
			});

        }

        //--------------------------------------------------
        // VOLATILITY REGIME
        //--------------------------------------------------

        if (

            input.volatility.regime ===
            "TRENDING"

        ) {

            const weight =
                ConfidenceWeights.VOLATILITY_REGIME;
            confidenceScore += weight;
            positiveFactors.push(
                "Trending Market"
            );
			evidence.push({
				id: "VOLATILITY_REGIME",
				title: "Trending Market",
				category: "VOLATILITY",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Current volatility regime favors trend continuation"
			});

        }
        else if (
            input.volatility.regime ===
            "CHOPPY"
        ) {
            const penalty =
                ConfidenceWeights.VOLATILITY_REGIME;
            confidenceScore -=
                penalty * 0.60;
            negativeFactors.push(
                "Choppy Market"
            );
			evidence.push({
				id: "VOLATILITY_REGIME",
				title: "Choppy Market",
				category: "VOLATILITY",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.60),
				description:
					"Market regime is choppy"
			});

        }

        //--------------------------------------------------
        // MULTI-TIMEFRAME
        //--------------------------------------------------

        if (
            input.multiTimeframe.aligned
        ) {
            const weight =
                ConfidenceWeights.MULTI_TIMEFRAME;
            const alignment =
                Math.max(
                    0,
                    Math.min(
                        100,
                        input.multiTimeframe.alignment
                    )
                );
            const score =
                (alignment / 100) *
                weight;
            confidenceScore += score;
            positiveFactors.push(
                "Multi-Timeframe Alignment"
            );
			evidence.push({
				id: "MULTI_TIMEFRAME",
				title: "Multi-Timeframe Alignment",
				category: "MULTI_TIMEFRAME",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: score,
				description:
					"Higher timeframe agrees with execution timeframe"
			});
        }
        else {
            const penalty =
                ConfidenceWeights.MULTI_TIMEFRAME;
            confidenceScore -=
                penalty * 0.60;
            negativeFactors.push(
                "MTF Conflict"
            );
			evidence.push({
				id: "MULTI_TIMEFRAME",
				title: "MTF Conflict",
				category: "MULTI_TIMEFRAME",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.60),
				description:
					"Higher timeframe conflicts with trade direction"
			});

        }

        //--------------------------------------------------
        // DOMINANT TIMEFRAME
        //--------------------------------------------------
        if (
            input.multiTimeframe.dominantAligned
        ) {
            const weight =
                ConfidenceWeights.DOMINANT_TIMEFRAME;
            confidenceScore += weight;
            positiveFactors.push(
                "Dominant TF Confirmed"
            );
			evidence.push({
				id: "DOMINANT_TIMEFRAME",
				title: "Dominant TF Confirmed",
				category: "MULTI_TIMEFRAME",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Dominant timeframe supports the setup"
			});
        }

        //--------------------------------------------------
        // HIGHER TIMEFRAME TREND
        //--------------------------------------------------

        if (
            input.multiTimeframe.higherTrendConfirmed
        ) {
            const weight =
                ConfidenceWeights.HTF_TREND;
            confidenceScore += weight;
            positiveFactors.push(
                "HTF Trend"
            );
			evidence.push({
				id: "HTF_TREND",
				title: "HTF Trend",
				category: "MULTI_TIMEFRAME",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Higher timeframe trend confirms direction"
			});

        }

        //--------------------------------------------------
        // INSTITUTIONAL ALIGNMENT
        //--------------------------------------------------

        if (
            input.multiTimeframe.institutionalAlignment >= 80
        ) {
            const weight =
                ConfidenceWeights.INSTITUTIONAL_ALIGNMENT;
            confidenceScore += weight;
            positiveFactors.push(
                "Institutional Alignment"
            );
			evidence.push({
				id: "INSTITUTIONAL_ALIGNMENT",
				title: "Institutional Alignment",
				category: "MULTI_TIMEFRAME",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Institutional multi-timeframe agreement is strong"
			});
        }

        //--------------------------------------------------
        // RISK QUALIFICATION
        //--------------------------------------------------

        if (
            input.riskQualification.tradeAllowed
        ) {
            const weight =
                ConfidenceWeights.RISK_QUALIFICATION;
            confidenceScore += weight;
            positiveFactors.push(
                "Risk Qualified"
            );
			evidence.push({
				id: "RISK_QUALIFICATION",
				title: "Risk Qualified",
				category: "RISK",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Risk Qualification approved the trade"
			});
        }
        else {
            const penalty =
                ConfidenceWeights.RISK_QUALIFICATION;
            confidenceScore -=
                penalty;
            negativeFactors.push(
                "Risk Qualification Failed"
            );
			evidence.push({
				id: "RISK_QUALIFICATION",
				title: "Risk Qualification Failed",
				category: "RISK",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -penalty,
				description:
					"Trade rejected by Risk Qualification"
			});
        }

        //--------------------------------------------------
        // RISK SCORE
        //--------------------------------------------------

        if (
            input.riskQualification.riskScore >= 80
        ) {
            const weight =
                ConfidenceWeights.RISK_SCORE;
            confidenceScore += weight;
            positiveFactors.push(
                "High Risk Score"
            );
			evidence.push({
				id: "RISK_SCORE",
				title: "High Risk Score",
				category: "RISK",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"Risk quality exceeds institutional threshold"
			});
        }
        else if (
            input.riskQualification.riskScore < 50
        ) {
            const penalty =
                ConfidenceWeights.RISK_SCORE;

            confidenceScore -=
                penalty * 0.50;
            negativeFactors.push(
                "Weak Risk Profile"
            );
			evidence.push({
				id: "RISK_SCORE",
				title: "Weak Risk Profile",
				category: "RISK",
				polarity: "NEGATIVE",
				passed: false,
				weight: penalty,
				contribution: -(penalty * 0.50),
				description:
					"Weak institutional risk profile"
			});

        }

        //--------------------------------------------------
        // INSTITUTIONAL CONFLUENCE
        //--------------------------------------------------
		const trendAligned =
			input.trend.direction === input.tradeDirection;
		
        const institutionalConfluence =
            trendAligned &&
            input.marketStructure.bosDirection === input.tradeDirection &&
            input.marketStructure.orderBlockAligned &&
            input.marketStructure.fvgAligned &&
            input.marketStructure.liquiditySweepConfirmed &&
            input.orderFlow.cvdConfirmed &&
            input.multiTimeframe.aligned &&
            input.riskQualification.tradeAllowed;
        if (
            institutionalConfluence
        ) {
            const weight =
                ConfidenceWeights.INSTITUTIONAL_CONFLUENCE;
            confidenceScore += weight;
            positiveFactors.push(
                "Institutional Confluence"
            );
			evidence.push({
				id: "INSTITUTIONAL_CONFLUENCE",
				title: "Institutional Confluence",
				category: "OTHER",
				polarity: "POSITIVE",
				passed: true,
				weight,
				contribution: weight,
				description:
					"All institutional engines agree"
			});
        }

        //--------------------------------------------------
        // EVIDENCE AGGREGATION
        //--------------------------------------------------

        const evidenceWeight =
            evidence.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Math.abs(
                        item.weight
                    ),
                0
            );

		//--------------------------------------------------
		// RAW SCORE
		//--------------------------------------------------
		
		const rawScore = confidenceScore;
		
		//--------------------------------------------------
		// RV-07E CONFIDENCE SCORE BREAKDOWN (TEMPORARY)
		//--------------------------------------------------
		
		AJLoggingGate.group("[RV-07E CONFIDENCE BREAKDOWN]");
		
		AJLoggingGate.table(
			evidence.map(item => ({
				id: item.id,
				category: item.category,
				passed: item.passed,
				polarity: item.polarity,
				weight: item.weight,
				contribution: item.contribution
			}))
		);
		
		const positiveContribution =
			evidence
				.filter(e => e.contribution > 0)
				.reduce((sum, e) => sum + e.contribution, 0);
		
		const negativeContribution =
			evidence
				.filter(e => e.contribution < 0)
				.reduce((sum, e) => sum + e.contribution, 0);
		
		AJLoggingGate.table({
			totals: {
				positiveContribution,
				negativeContribution,
				rawScore,
				maximumScore: this.MAX_SCORE
			}
		});
		
		AJLoggingGate.groupEnd();
		
		//--------------------------------------------------
		// NORMALIZE
		//--------------------------------------------------
		
		confidenceScore =
			Math.max(
				0,
				Math.min(
					this.MAX_SCORE,
					rawScore
				)
			);
		
		AJLoggingGate.log("[RV-07E] Normalized Confidence:", confidenceScore);

        //--------------------------------------------------
        // POSITIVE COUNT
        //--------------------------------------------------

        const positiveEvidence =
            evidence.filter(
                x =>
                    x.polarity === "POSITIVE"
            );

        //--------------------------------------------------
        // NEGATIVE COUNT
        //--------------------------------------------------

        const negativeEvidence =
            evidence.filter(
                x =>
                    x.polarity === "NEGATIVE"
            );

        //--------------------------------------------------
        // SORT POSITIVE
        //--------------------------------------------------

		positiveEvidence.sort(
			(a, b) =>
				b.contribution -
				a.contribution
		);

        //--------------------------------------------------
        // SORT NEGATIVE
        //--------------------------------------------------

		negativeEvidence.sort(
			(a, b) =>
				Math.abs(b.contribution) -
				Math.abs(a.contribution)
		);

        //--------------------------------------------------
        // REMOVE DUPLICATES
        //--------------------------------------------------

        const uniquePositive =
            Array.from(
                new Set(
                    positiveFactors
                )
            );

        const uniqueNegative =
            Array.from(
                new Set(
                    negativeFactors
                )
            );

        //--------------------------------------------------
        // TRADE GRADE
        //--------------------------------------------------

		const tradeGrade = confidenceToGrade(
			confidenceScore
		);

        //--------------------------------------------------
        // CONFIDENCE CLASS
        //--------------------------------------------------

		const confidenceClass = confidenceToClass(
			confidenceScore
		);

		const aiConfidence = confidenceScore;
		
        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

        const diagnostics = {
			aiConfidence,
            normalizedScore: confidenceScore,
            rawScore,
            maximumScore: this.MAX_SCORE,
            evidenceCount: evidence.length,
            positiveCount: positiveEvidence.length,
            negativeCount: negativeEvidence.length,
            positiveWeight:
                positiveEvidence.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        item.weight,
                    0
                ),

            negativeWeight:
                negativeEvidence.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Math.abs(
                            item.weight
                        ),
                    0
                )
        };

        //--------------------------------------------------
        // FINAL RESULT
        //--------------------------------------------------

        const result: ConfidenceResult = {

            //--------------------------------------------------
            // CORE
            //--------------------------------------------------

			confidence:
				Math.round(confidenceScore),
			
			aiConfidence,
			
			tradeGrade,
			
			confidenceGrade: tradeGrade,
			
			recommendation:
				confidenceScore >= ConfidenceEngine.minConfidenceScore
					? "TRADE"
					: "NO_TRADE",
			
			confidenceClass,

            //--------------------------------------------------
            // FACTORS
            //--------------------------------------------------

            positiveFactors: uniquePositive,
            negativeFactors: uniqueNegative,

            //--------------------------------------------------
            // EVIDENCE
            //--------------------------------------------------

            evidence,
            evidenceWeight,

            //--------------------------------------------------
            // SUMMARY
            //--------------------------------------------------

            evidenceSummary: {
                totalEvidence: evidence.length,
                positiveEvidence: positiveEvidence.length,
                negativeEvidence: negativeEvidence.length
            },

            //--------------------------------------------------
            // TOP FACTORS
            //--------------------------------------------------

            strongestPositive:

                positiveEvidence.length > 0
                    ? positiveEvidence[0]
                    : undefined,

            strongestNegative:
                negativeEvidence.length > 0
                    ? negativeEvidence[0]
                    : undefined,

            //--------------------------------------------------
            // FLAGS
            //--------------------------------------------------

			tradeQualified:
				confidenceScore >= ConfidenceEngine.minConfidenceScore,

            institutionalGrade:
                tradeGrade === "A" ||
                tradeGrade === "B",

            //--------------------------------------------------
            // DIAGNOSTICS
            //--------------------------------------------------

            diagnostics
        };
		
		//--------------------------------------------------
		// RV-07 RUNTIME DIAGNOSTIC
		//--------------------------------------------------
		
		AJLoggingGate.group("[CONFIDENCE RESULT]");
		
		AJLoggingGate.log("Symbol:", input.symbol ?? "<Unknown>");
		AJLoggingGate.log("Timeframe:", input.timeframe ?? "<Unknown>");
		
		//
		// TREND
		//
		
		AJLoggingGate.table({
			trend: {
				direction: input.trend.direction,
				strength: input.trend.strength,
				quality: input.trend.quality ?? 0,
				contribution:
					evidence.find(e => e.id === "TREND")?.contribution ?? 0,
				passed:
					evidence.find(e => e.id === "TREND")?.passed ?? false
			}
		});
		
		//
		// MARKET STRUCTURE
		//
		
		AJLoggingGate.table({
			structure: {
				bosDirection: input.marketStructure.bosDirection,
				chochDirection: input.marketStructure.chochDirection,
				structureQuality: input.marketStructure.structureQuality ?? 0,
				contribution:
					evidence.find(e => e.id === "BOS")?.contribution ?? 0,
				passed:
					evidence.find(e => e.id === "BOS")?.passed ?? false
			}
		});
		
		//
		// LIQUIDITY
		//
		
		AJLoggingGate.table({
			liquidity: {
				liquiditySweep:
					input.marketStructure.liquiditySweepConfirmed,
		
				orderBlock:
					input.marketStructure.orderBlockAligned,
		
				fvg:
					input.marketStructure.fvgAligned,
		
				contribution:
					evidence.find(e => e.id === "LIQUIDITY_SWEEP")?.contribution ?? 0,
		
				passed:
					evidence.find(e => e.id === "LIQUIDITY_SWEEP")?.passed ?? false
			}
		});
		
		//
		// ORDER FLOW
		//
		
		AJLoggingGate.table({
			orderFlow: {
				direction: input.orderFlow.direction,
				strength: input.orderFlow.strength,
				cvdConfirmed: input.orderFlow.cvdConfirmed,
				volumeStrength: input.orderFlow.volumeStrength ?? 0,
				contribution:
					evidence.find(e => e.id === "ORDER_FLOW")?.contribution ?? 0,
				passed:
					evidence.find(e => e.id === "ORDER_FLOW")?.passed ?? false
			}
		});
		
		//
		// MOMENTUM
		//
		
		AJLoggingGate.table({
			momentum: {
				direction: input.momentum.direction,
				strength: input.momentum.strength,
				breakoutStrength: input.momentum.breakoutStrength ?? 0,
				impulseStrength: input.momentum.impulseStrength ?? 0,
				contribution:
					evidence.find(e => e.id === "MOMENTUM")?.contribution ?? 0,
				passed:
					evidence.find(e => e.id === "MOMENTUM")?.passed ?? false
			}
		});
		
		//
		// INSTITUTIONAL
		//
		
		AJLoggingGate.table({
			institutional: {
				mtfAlignment: input.multiTimeframe.alignment,
				institutionalAlignment:	input.multiTimeframe.institutionalAlignment,
				riskScore: input.riskQualification.riskScore,
				tradeAllowed: input.riskQualification.tradeAllowed,
				institutionalConfluence,
				passed: institutionalConfluence
			}
		});
		
		//----------------------------------------
		// FINAL LOGGING TABLE
		//----------------------------------------
		
		AJLoggingGate.table({
			final: {
		
				threshold:
					ConfidenceEngine.minConfidenceScore,
		
				executionReadiness:
					result.tradeQualified,
		
				overallConfidence:
					result.confidence,
		
				confidenceGrade:
					result.confidenceGrade,
		
				evidenceCount:
					result.evidence.length,
		
				recommendation:
					result.recommendation
			}
		});
		
		AJLoggingGate.log(
			"Diagnostics:",
			result.diagnostics
		);
		
		AJLoggingGate.log(
			"Validation:",
			result.confidence >= 0 &&
			result.confidence <= 100
				? "PASS"
				: "FAIL"
		);
		
		AJLoggingGate.groupEnd();
		return result;

    }
}
		