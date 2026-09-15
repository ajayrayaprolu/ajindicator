/****************************************************************************************
 * File:
 * ExecutionAuthority.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/ExecutionAuthority.ts
 *
 * Purpose:
 * Canonical Institutional Execution Authority.
 *
 * Responsibilities:
 * -----------------
 * â€¢ Consumes the outputs of every upstream engine.
 * â€¢ Performs the final execution authorization.
 * â€¢ Produces only:
 *
 *      BUY
 *      SELL
 *      WAIT
 *
 * This engine DOES NOT:
 * ---------------------
 * â€¢ Calculate Stop Loss
 * â€¢ Calculate Take Profit
 * â€¢ Calculate Position Size
 * â€¢ Execute Trades
 *
 * AJ Architecture
 *
 * Trend
 * Momentum
 * Market Structure
 * Liquidity
 * Order Flow
 * Volatility
 * Multi-Timeframe
 * Risk Qualification
 * Confidence
 *          â”‚
 *          â–¼
 *   ExecutionAuthority
 *          â”‚
 *          â–¼
 *   Execution Engine
 ****************************************************************************************/

import type { ExecutionAuthorityInputs } from "./ExecutionAuthorityTypes";
import type { ExecutionAuthorityResult } from "./ExecutionAuthorityResult";
import { AJRuntimeParameters } from "@/indicators/AJIndicator/config/AJRuntimeParameters";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
import { EngineDiagnosticBuilder } from "@/indicators/AJIndicator/debug/EngineDiagnostic";

//======================================================
// EXECUTION AUTHORITY
//======================================================

export class ExecutionAuthority {

	//--------------------------------------------------
	// Authority thresholds.
	//
	// These are temporary compatibility defaults.
	//
	// RuntimeParameters will become the canonical
	// threshold owner.
	//--------------------------------------------------
	
	//--------------------------------------------------
	// RV-12
	// TEST MODE. Production: MIN_CONFIDENCE = 70.
	// Lowered to match ConfidenceEngine.ts's own test
	// threshold (MIN_CONFIDENCE_SCORE = 10) so the two
	// engines agree on what "qualified" means.
	// MIN_RISK_SCORE only affects diagnostics/approvalRatio
	// display, not the actual gate below â€” lowered for
	// consistency, not required for trades to flow.
	//--------------------------------------------------
	private static get minConfidence(): number {
	
		return AJRuntimeParameters.authorityConfidenceThreshold;
	
	}
	
	private static get minRiskScore(): number {
	
		return AJRuntimeParameters.riskThreshold;
	
	}

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    evaluate(
        input: ExecutionAuthorityInputs
    ): ExecutionAuthorityResult {

        //--------------------------------------------------
        // DEFAULT DECISION
        //--------------------------------------------------

        let authorityDecision:

            "BUY"
            | "SELL"
            | "WAIT" =
            "WAIT";

        //--------------------------------------------------
        // REASONS
        //--------------------------------------------------

        const approvalReasons: string[] = [];
        const rejectionReasons: string[] = [];

        //--------------------------------------------------
        // VALIDATION
        //--------------------------------------------------

        if (
            input.tradeDirection === 0
        ) {
            rejectionReasons.push(
                "No trade direction"
            );

		return {
		
			//--------------------------------------------------
			// DECISION
			//--------------------------------------------------
		
			authorityDecision,
			authorityApproved: false,
			executionAllowed: false,
			authorityText: "WAIT",
		
			//--------------------------------------------------
			// SUMMARY
			//--------------------------------------------------
		
			approvalReasons,
			rejectionReasons,
		
			//--------------------------------------------------
			// CHECKS
			//--------------------------------------------------
		
			passedChecks: 0,
			failedChecks: 1,
		
			//--------------------------------------------------
			// FLAGS
			//--------------------------------------------------
		
			trendAligned: false,
			momentumAligned: false,
			structureAligned: false,
			institutionalConfluence: false,
		
        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

		diagnostics: {
			confidence: 0,
			riskScore: 0,
			passedChecks: 0,
			failedChecks: 1,
			approvalRatio: 0,
			trendAligned: false,
			momentumAligned: false,
			structureAligned: false,
			institutionalConfluence: false
		},

        diagnostic:
            EngineDiagnosticBuilder.create({
                engine: "ExecutionAuthority",
                status: "FAILED",
                decision: "WAIT",
                score: 0,
                threshold: ExecutionAuthority.minConfidence,
                reasons: rejectionReasons,

                metrics: {
                    confidence: 0,
                    riskScore: 0,
                    passedChecks: 0,
                    failedChecks: 1,
                    approvalRatio: 0,
                    trendAligned: false,
                    momentumAligned: false,
                    institutionalConfluence: false
                }

            })
		};
    }

        //--------------------------------------------------
        // COUNTERS
        //--------------------------------------------------

        let passedChecks = 0;
        let failedChecks = 0;

        //--------------------------------------------------
        // TREND
        //--------------------------------------------------
        const trendAligned =
            input.trend.direction ===
            input.tradeDirection;
        if (
            trendAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Trend aligned"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Trend conflict"
            );
        }

        //--------------------------------------------------
        // TREND STRENGTH
        //--------------------------------------------------

        if (
            (input.trend.strength ?? 0) >= 70
        ) {
            passedChecks++;
            approvalReasons.push(
                "Strong trend"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Weak trend"
            );
        }

        //--------------------------------------------------
        // MOMENTUM
        //--------------------------------------------------

        const momentumAligned =
            input.momentum.direction ===
            input.tradeDirection;
        if (
            momentumAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Momentum confirmed"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Momentum conflict"
            );
        }

        //--------------------------------------------------
        // MOMENTUM STRENGTH
        //--------------------------------------------------

        if (
            (input.momentum.strength ?? 0) >= 65
        ) {
            passedChecks++;
            approvalReasons.push(
                "Strong momentum"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Weak momentum"
            );
        }

        //--------------------------------------------------
        // BREAK OF STRUCTURE
        //--------------------------------------------------

        const bosAligned =
            input.marketStructure.bosDirection ===
            input.tradeDirection;
        if (
            bosAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Break of Structure"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Opposite BOS"
            );
        }

        //--------------------------------------------------
        // CHOCH
        //--------------------------------------------------

        const chochAligned =
            input.marketStructure.chochDirection ===
            input.tradeDirection;
        if (
            chochAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "CHOCH confirmed"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "CHOCH conflict"
            );
        }

        //--------------------------------------------------
        // STRUCTURE QUALITY
        //--------------------------------------------------

        if (
            (input.marketStructure.structureQuality ?? 0) >= 70
        ) {
            passedChecks++;
            approvalReasons.push(
                "High structure quality"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Weak structure"
            );
        }

        //--------------------------------------------------
        // STRUCTURAL ALIGNMENT
        //--------------------------------------------------

        const structureAligned =
            trendAligned &&
            momentumAligned &&
            bosAligned;
        if (
            structureAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Market structure aligned"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Market structure conflict"
            );
        }

        //--------------------------------------------------
        // LIQUIDITY
        //--------------------------------------------------

        if (
            input.marketStructure.liquiditySweepConfirmed
        ) {
            passedChecks++;
            approvalReasons.push(
                "Liquidity Sweep"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Liquidity sweep missing"
            );
        }

		if (
			input.liquidity.confirmed ?? input.liquidity.sweepConfirmed ?? false
		) {
			passedChecks++;
			approvalReasons.push(
				"Liquidity confirmed"
			);
		}
		else {
			failedChecks++;
			rejectionReasons.push(
				"Liquidity conflict"
			);
		}

        //--------------------------------------------------
        // ORDER BLOCK
        //--------------------------------------------------

        if (
            input.marketStructure.orderBlockAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Institutional Order Block"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Order Block not aligned"
            );
        }

        //--------------------------------------------------
        // FAIR VALUE GAP
        //--------------------------------------------------

        if (
            input.marketStructure.fvgAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Fair Value Gap"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "No valid FVG"
            );
        }

        //--------------------------------------------------
        // LIQUIDITY QUALITY
        //--------------------------------------------------

        if (
            (input.marketStructure.structureQuality ?? 0) >= 80
        ) {
            passedChecks++;
            approvalReasons.push(
                "Institutional liquidity quality"
            );
        }

        //--------------------------------------------------
        // MULTI-TIMEFRAME ALIGNMENT
        //--------------------------------------------------

        if (
            input.multiTimeframe.aligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "MTF aligned"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "MTF conflict"
            );
        }

        //--------------------------------------------------
        // DOMINANT TIMEFRAME
        //--------------------------------------------------

        if (
            input.multiTimeframe.dominantAligned
        ) {
            passedChecks++;
            approvalReasons.push(
                "Dominant timeframe confirmed"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Dominant timeframe mismatch"
            );
        }

        //--------------------------------------------------
        // HIGHER TIMEFRAME TREND
        //--------------------------------------------------

        if (
            input.multiTimeframe.higherTrendConfirmed
        ) {
            passedChecks++;
            approvalReasons.push(
                "Higher timeframe trend"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Higher timeframe disagreement"
            );
        }

        //--------------------------------------------------
        // INSTITUTIONAL ALIGNMENT
        //--------------------------------------------------

        if (
            (input.multiTimeframe.institutionalAlignment ?? 0) >= 80
        ) {
            passedChecks++;
            approvalReasons.push(
                "Institutional alignment"
            );
        }
        else if (
            (input.multiTimeframe.institutionalAlignment ?? 0) < 50
        ) {
            failedChecks++;
            rejectionReasons.push(
                "Weak institutional alignment"
            );
        }

        //--------------------------------------------------
        // CONFLUENCE
        //--------------------------------------------------

        const institutionalConfluence =
            trendAligned &&
            momentumAligned &&
            bosAligned &&
            chochAligned &&
            input.marketStructure.orderBlockAligned &&
            input.marketStructure.fvgAligned &&
            input.marketStructure.liquiditySweepConfirmed &&
            input.multiTimeframe.aligned;
        if (
            institutionalConfluence
        ) {
            passedChecks++;
            approvalReasons.push(
                "Institutional confluence"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Institutional confluence incomplete"
            );
        }

		//--------------------------------------------------
		// ORDER FLOW
		//--------------------------------------------------
		
		if (
		    input.orderFlow.confirmed ?? input.orderFlow.cvdConfirmed ?? false
		) {
			passedChecks++;
			approvalReasons.push(
				"Order Flow confirmed"
			);
		}
		else {
			failedChecks++;
			rejectionReasons.push(
				"Order Flow conflict"
			);
		}

        //--------------------------------------------------
        // CONFIDENCE
        //--------------------------------------------------

		if (
			(input.confidence?.aiConfidence ?? 0) >=
			ExecutionAuthority.minConfidence
		) {
            passedChecks++;
            approvalReasons.push(
                "Confidence threshold met"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Confidence too low"
            );
        }

        //--------------------------------------------------
        // TRADE GRADE
        //--------------------------------------------------

		const confidenceGrade =
			input.confidence?.confidenceGrade ?? "F";
		
		if (
			confidenceGrade === "A" ||
			confidenceGrade === "B"
		) {
            passedChecks++;
            approvalReasons.push(
                "Institutional trade grade"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Trade grade below threshold"
            );
        }

		//--------------------------------------------------
		// AI RECOMMENDATION
		//--------------------------------------------------
		
		if (
			(input.confidence?.recommendation ?? "WAIT") !==
			"WAIT"
		) {
			passedChecks++;
			approvalReasons.push(
				"AI recommendation approved"
			);
		}
		else {
			failedChecks++;
			rejectionReasons.push(
				"AI recommendation rejected"
			);
		}

        //--------------------------------------------------
        // RISK QUALIFICATION
        //--------------------------------------------------

        if (
            input.riskQualification.approved ??
			input.riskQualification.tradeAllowed
        ) {
            passedChecks++;
            approvalReasons.push(
                "Risk qualified"
            );
        }
        else {
            failedChecks++;
			rejectionReasons.push(
				(input.riskQualification.rejectionReasons ?? ["Risk qualification failed"])
					.join(", ")
			);
        }

        //--------------------------------------------------
        // RISK SCORE
        //--------------------------------------------------

        if (
			(
				input.riskQualification.qualificationScore ??
				input.riskQualification.riskScore ??
				0
			) >= ExecutionAuthority.minRiskScore
        ) {
            passedChecks++;
            approvalReasons.push(
                "Risk score acceptable"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Risk score too low"
            );
        }

        //--------------------------------------------------
        // VOLATILITY
        //--------------------------------------------------

        if (
            input.volatility.acceptable
        ) {
            passedChecks++;
            approvalReasons.push(
                "Volatility acceptable"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Volatility rejected"
            );
        }

        //--------------------------------------------------
        // MARKET REGIME
        //--------------------------------------------------

        if (
            input.volatility.regime !== "CHOPPY"
        ) {
            passedChecks++;
            approvalReasons.push(
                "Market regime acceptable"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Choppy market"
            );
        }

        //--------------------------------------------------
        // EXECUTION FILTERS
        //--------------------------------------------------

        if (
            input.executionReady ?? false
        ) {
            passedChecks++;
            approvalReasons.push(
                "Execution ready"
            );
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Execution not ready"
            );
        }

        //--------------------------------------------------
        // DUPLICATE TRADE
        //--------------------------------------------------

        if (
            !input.tradeAlreadyRunning
        ) {
            passedChecks++;
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Existing trade already active"
            );
        }

        //--------------------------------------------------
        // SESSION
        //--------------------------------------------------

        if (
            input.sessionAllowed
        ) {
            passedChecks++;
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Session filter rejected"
            );
        }

        //--------------------------------------------------
        // MARKET STATE
        //--------------------------------------------------

        if (
            input.marketState !== "CLOSED"
        ) {
            passedChecks++;
        }
        else {
            failedChecks++;
            rejectionReasons.push(
                "Market closed"
            );
        }

        //--------------------------------------------------
        // AUTHORITY DECISION
        //--------------------------------------------------

        //--------------------------------------------------
        // CANONICAL FINAL AUTHORIZATION GATE
        //--------------------------------------------------

		const effectiveMode =
			input.effectiveCalculationMode ??
			input.tradeEngineMode ??
			"SCORE";
		
		const confidenceValue =
			input.confidence?.aiConfidence ?? 0;
		
		const confidencePassed =
			(input.confidence?.recommendation ?? "WAIT") !== "WAIT" &&
			confidenceValue >=
				ExecutionAuthority.minConfidence;
		
		const riskScore =
			input.riskQualification.qualificationScore ??
			input.riskQualification.riskScore ??
			0;
		
		const riskPassed =
			riskScore >=
			ExecutionAuthority.minRiskScore;
		
		const directionPassed =
			input.tradeDirection !== 0;
		
		const trendPassed =
			trendAligned;
		
		const sessionPassed =
			input.sessionAllowed !== false;
		
		const positionPassed =
			input.tradeAlreadyRunning !== true;
		
		const aiCorePassed =
			effectiveMode === "AI"
				? input.aiCorePass === true
				: true;
		
		const smcCorePassed =
			effectiveMode === "AI_SMC"
				? (
					input.aiCorePass === true &&
					input.smcCorePass === true
				)
				: true;
		
		const advancedCryptoPassed =
			!input.advancedCryptoEnabled ||
			!input.advancedCryptoApplicable ||
			input.advancedCryptoReady === true;
		
		const mandatoryGatesPassed =
			directionPassed &&
			confidencePassed &&
			riskPassed &&
			trendPassed &&
			sessionPassed &&
			positionPassed &&
			aiCorePassed &&
			smcCorePassed &&
			advancedCryptoPassed;
		
		const authorityApproved =
			mandatoryGatesPassed;
		
		if (authorityApproved) {
		
			approvalReasons.push(
				"Canonical authorization gate passed"
			);
		
		}
		else {
		
			if (!directionPassed)
				rejectionReasons.push("No trade direction");
		
			if (!confidencePassed)
				rejectionReasons.push(
					`Confidence ${confidenceValue.toFixed(1)} < ${ExecutionAuthority.minConfidence}`
				);
		
			if (!riskPassed)
				rejectionReasons.push(
					`Risk ${riskScore.toFixed(1)} < ${ExecutionAuthority.minRiskScore}`
				);
		
			if (!trendPassed)
				rejectionReasons.push("Trend conflict");
		
			if (!sessionPassed)
				rejectionReasons.push("Session not allowed");
		
			if (!positionPassed)
				rejectionReasons.push("Trade already running");
		
			if (!aiCorePassed)
				rejectionReasons.push("AI core not qualified");
		
			if (!smcCorePassed)
				rejectionReasons.push("AI+SMC core not qualified");
		
			if (!advancedCryptoPassed)
				rejectionReasons.push("Advanced Crypto qualification failed");
		
		}

		//--------------------------------------------------
		// RV-15 AUTHORITY GATE TRACE
		//
		// executionAllowed has been false in every RV-10-logged
		// cycle, but nothing in this file has ever printed to
		// console. Same approach that found the engineState bug â€”
		// direct dump instead of guessing further.
		//--------------------------------------------------

		AJLoggingGate.group("[RV-15 AUTHORITY GATE]");

		AJLoggingGate.table({
			structural: {
				trendAligned,
				momentumAligned,
				bosAligned,
				chochAligned,
				structureAligned,
				institutionalConfluence
			}
		});

		AJLoggingGate.table({
			confidence: {
		
				recommendation:
					input.confidence?.recommendation ?? "<undefined>",
		
				recommendationPassed:
					(input.confidence?.recommendation ?? "WAIT") !== "WAIT",
		
				aiConfidence:
					input.confidence?.aiConfidence ?? 0,
		
				runtimeThreshold:
					ExecutionAuthority.minConfidence,
		
				confidencePassed:
					(input.confidence?.aiConfidence ?? 0) >=
					ExecutionAuthority.minConfidence
			}
		});

		AJLoggingGate.table({
			flowAndBlocks: {
				orderFlowConfirmedField: input.orderFlow.confirmed,
				orderFlowCvdConfirmed: (input.orderFlow as any).cvdConfirmed,
				liquidityConfirmedField: input.liquidity.confirmed,
				liquiditySweepConfirmed: (input.liquidity as any).sweepConfirmed,
				orderBlockAligned: input.marketStructure.orderBlockAligned,
				fvgAligned: input.marketStructure.fvgAligned
			}
		});

		AJLoggingGate.table({
			otherGates: {
				executionReady: input.executionReady,
				riskQualificationApproved: input.riskQualification.approved,
				riskQualificationTradeAllowed: input.riskQualification.tradeAllowed
			}
		});

		AJLoggingGate.log("mandatoryGatesPassed:", mandatoryGatesPassed);
		AJLoggingGate.log("authorityApproved:", authorityApproved);

		AJLoggingGate.groupEnd();

        //--------------------------------------------------
        // FINAL DECISION
        //--------------------------------------------------

        if (
            authorityApproved
        ) {
            authorityDecision =
                input.tradeDirection > 0
                    ? "BUY"
                    : "SELL";
        }
        else {
            authorityDecision =
                "WAIT";
        }

        //--------------------------------------------------
        // EXECUTION
        //--------------------------------------------------

        const executionAllowed =
            authorityDecision !==
            "WAIT";

        //--------------------------------------------------
        // AUTHORITY TEXT
        //--------------------------------------------------

        const authorityText =
            authorityDecision === "BUY"
                ? "BUY APPROVED"
                : authorityDecision === "SELL"
                    ? "SELL APPROVED"
                    : "WAIT";

        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

		const diagnostics = {
		
			confidence:
				input.confidence?.aiConfidence ?? 0,
		
			riskScore:
				input.riskQualification.qualificationScore ??
				input.riskQualification.riskScore ??
				0,
		
			passedChecks,
			failedChecks,
		
			approvalRatio:
				passedChecks + failedChecks > 0
					? (passedChecks / (passedChecks + failedChecks)) * 100
					: 0,
		
			trendAligned,
			momentumAligned,
			structureAligned,
			institutionalConfluence
		
		};
		
		const diagnostic =
			EngineDiagnosticBuilder.create({
	
			engine: "ExecutionAuthority",
	
			status:
				authorityApproved
					? "PASSED"
					: "FAILED",
	
			decision:
				authorityDecision,
	
			score:
				input.confidence?.aiConfidence ?? 0,
	
			threshold:
				ExecutionAuthority.minConfidence,
	
			reasons:
				authorityApproved
					? approvalReasons
					: rejectionReasons,
	
			metrics: {
			
				confidence:
					diagnostics.confidence,
			
				riskScore:
					diagnostics.riskScore,
			
				passedChecks:
					diagnostics.passedChecks,
			
				failedChecks:
					diagnostics.failedChecks,
			
				approvalRatio:
					diagnostics.approvalRatio,
			
				trendAligned:
					diagnostics.trendAligned,
			
				momentumAligned:
					diagnostics.momentumAligned,
			
				structureAligned:
					diagnostics.structureAligned,
			
				institutionalConfluence:
					diagnostics.institutionalConfluence
			
			}

		});

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // DECISION
            //--------------------------------------------------

            authorityDecision,
            executionAllowed,
            authorityApproved:
				authorityApproved ?? false,
            authorityText,

            //--------------------------------------------------
            // SUMMARY
            //--------------------------------------------------

            approvalReasons,
            rejectionReasons,

            //--------------------------------------------------
            // CHECKS
            //--------------------------------------------------

            passedChecks,
            failedChecks,

            //--------------------------------------------------
            // FLAGS
            //--------------------------------------------------

            trendAligned,
            momentumAligned,
            structureAligned,
            institutionalConfluence,

            //--------------------------------------------------
            // DIAGNOSTICS
            //--------------------------------------------------

            diagnostics,
			diagnostic
        };
    }
}

