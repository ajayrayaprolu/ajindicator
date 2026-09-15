/****************************************************************************************
 * File:
 * TradeManagement.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/TradeManagement.ts
 *
 * Purpose:
 * Canonical institutional Trade Management Engine for AJ v2.
 *
 * This engine manages an active institutional trade after execution
 * has been approved. It is responsible for maintaining the position
 * throughout its lifecycle until the trade is completely closed.
 *
 * Responsibilities:
 * -----------------
 * • Position sizing updates
 * • Position tracking
 * • TP1 / TP2 / TP3 management
 * • Partial exit calculations
 * • Scale-in management
 * • Scale-out management
 * • Break-even activation
 * • Trailing eligibility
 * • Re-entry eligibility
 * • Live risk updates
 * • Portfolio-aware exposure
 * • Trade progress tracking
 * • Institutional diagnostics
 * • Construction of the canonical TradeManagementResult
 *
 * This engine DOES NOT:
 * ---------------------
 * • Detect entries
 * • Make BUY / SELL decisions
 * • Calculate confidence
 * • Calculate authority
 * • Perform lifecycle transitions
 * • Calculate trailing stops
 *
 * Those responsibilities belong to their respective engines.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Authority Decision
 *      ↓
 * Execution Engine
 *      ↓
 * Trade Management
 *          ├── Position Management
 *          ├── Partial Exits
 *          ├── Scale In
 *          ├── Scale Out
 *          ├── Break Even
 *          ├── Risk Updates
 *          └── Portfolio Management
 *      ↓
 * Lifecycle Engine
 *      ↓
 * Trailing Engine
 *      ↓
 * ReEntry Engine
 *      ↓
 * Exit Engine
 ****************************************************************************************/

import type {ExecutionContext} from "./ExecutionTypes";
import type { RuntimeExecutionResult } from "../../../../runtime/execution";
import type {TradeManagementResult} from "./TradeManagementResult";
import type {
    TradeProgress,
    ScaleInState,
    ScaleOutState,
    PartialExit,
    TradeRiskState,
    PortfolioExposure
} from "./TradeManagementTypes";

//======================================================
// TRADE MANAGEMENT ENGINE
//======================================================

export class TradeManagement {

    //--------------------------------------------------
    // CONFIGURATION
    //--------------------------------------------------

    private static readonly TP1_EXIT_PERCENT = 0.30;

    private static readonly TP2_EXIT_PERCENT = 0.30;

    private static readonly TP3_EXIT_PERCENT = 0.40;

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(

        ctx: ExecutionContext,

        runtime: RuntimeExecutionResult

    ): TradeManagementResult {

        //--------------------------------------------------
        // POSITION INITIALIZATION
        //--------------------------------------------------

        const totalPosition = Math.max(
            ctx.positionSize,
            0
        );

        //--------------------------------------------------
        // TARGET STATUS
        //--------------------------------------------------
		const tp1Hit =
            runtime.tp1Hit;

        const tp2Hit =
            runtime.tp2Hit;

        const tp3Hit =
            runtime.tp3Hit;

        const slHit =
            runtime.stopLossHit;

        //--------------------------------------------------
        // POSITION STATE
        //--------------------------------------------------

        const tradeActive =
            runtime.inPosition &&
            !runtime.positionClosed;

        const tradeCompleted =
            runtime.positionClosed ||
            slHit ||
            tp3Hit;

        const tradeClosed = tradeCompleted;

        //--------------------------------------------------
        // POSITION METRICS
        //--------------------------------------------------

        let remainingPosition = totalPosition;
        let realizedPosition = 0;

        //--------------------------------------------------
        // INITIAL AVERAGE ENTRY
        //--------------------------------------------------

        let averageEntryPrice = ctx.entryPrice;

        //--------------------------------------------------
        // TARGET LEVEL
        //--------------------------------------------------

        let targetLevelReached = 0;

        if (
            tp1Hit
        ) {
            targetLevelReached = 1;
        }

        if (
            tp2Hit
        ) {
            targetLevelReached = 2;
        }

        if (
            tp3Hit
        ) {
            targetLevelReached = 3;
        }

        //--------------------------------------------------
        // DEFAULT FLAGS
        //--------------------------------------------------

        let trailingAllowed = false;
        let trailingActive = false;
        let breakEvenActive = false;
        let breakEvenPrice = ctx.entryPrice;
        let reEntryEligible = false;
        let executionScore = 0;
        let managementScore = 0;

        //--------------------------------------------------
        // PARTIAL EXIT MANAGEMENT
        //--------------------------------------------------

        const tp1ExitQty =
            totalPosition *
            this.TP1_EXIT_PERCENT;

        const tp2ExitQty =
            totalPosition *
            this.TP2_EXIT_PERCENT;

		const tp3ExitQty =
			totalPosition *
			this.TP3_EXIT_PERCENT;

        //--------------------------------------------------
        // PARTIAL EXIT STATE
        //--------------------------------------------------

        let partialExitExecuted = false;
        let partialExitQty = 0;
		
		//--------------------------------------------------
        // TP1
        //--------------------------------------------------

        if (
            tp1Hit
        ) {
            partialExitExecuted = true;
            partialExitQty +=
                tp1ExitQty;
        }

        //--------------------------------------------------
        // TP2
        //--------------------------------------------------

        if (
            tp2Hit
        ) {
            partialExitExecuted = true;
            partialExitQty +=
                tp2ExitQty;
        }

        //--------------------------------------------------
        // TP3
        //--------------------------------------------------

        if (
            tp3Hit
        ) {
            partialExitExecuted = true;
			partialExitQty =
				tp1ExitQty +
				tp2ExitQty +
				tp3ExitQty;
        }

        //--------------------------------------------------
        // STOP LOSS
        //--------------------------------------------------

        if (
            slHit
        ) {
            partialExitQty =
                totalPosition;
        }

        //--------------------------------------------------
        // POSITION UPDATE
        //--------------------------------------------------

        realizedPosition =
            Math.min(
                partialExitQty,
                totalPosition
            );

        remainingPosition =
            Math.max(
                0,
                totalPosition -
                realizedPosition
            );

        //--------------------------------------------------
        // PARTIAL EXIT CONTRACT
        //--------------------------------------------------

        const partialExit: PartialExit = {
            exitPercent:
                totalPosition > 0
                    ? (realizedPosition / totalPosition) * 100
                    : 0,

            exitQuantity:
                realizedPosition,
            remainingPosition,
            realizedPnL:
                undefined
        };

        //--------------------------------------------------
        // BREAK-EVEN MANAGEMENT
        //--------------------------------------------------

        breakEvenActive =
            tp1Hit &&
            !slHit &&
            !tradeCompleted;

        breakEvenPrice = ctx.entryPrice;

        //--------------------------------------------------
        // TRAILING MANAGEMENT
        //--------------------------------------------------

        trailingAllowed =
            breakEvenActive &&
            !tp3Hit &&
            !slHit;

        trailingActive =
            trailingAllowed &&
            (
                tp2Hit ||
                tp3Hit
            );
		
		//--------------------------------------------------
        // SCALE-IN
        //--------------------------------------------------

        const scaleIn: ScaleInState = {
            enabled:
                tradeActive &&
                !tp1Hit &&
                !tradeCompleted,

            executed: false,
            additionalQuantity: 0,
            averageEntryPrice: averageEntryPrice

        };

        //--------------------------------------------------
        // SCALE-OUT
        //--------------------------------------------------

        const scaleOut: ScaleOutState = {

            enabled: partialExitExecuted,
            executed: partialExitExecuted,
            exitQuantity: realizedPosition,
            remainingPosition: remainingPosition

        };

        //--------------------------------------------------
        // RE-ENTRY ELIGIBILITY
        //--------------------------------------------------

        reEntryEligible =
            breakEvenActive &&
            trailingAllowed &&
            !tradeCompleted &&
            remainingPosition > 0;

        //--------------------------------------------------
        // MANAGEMENT SCORE
        //--------------------------------------------------

        executionScore = 0;

        if (
            tp1Hit
        ) {
            executionScore += 25;
        }

        if (
            tp2Hit
        ) {
            executionScore += 25;
        }

        if (
            tp3Hit
        ) {
            executionScore += 25;
        }

        if (
            breakEvenActive
        ) {
            executionScore += 10;
        }

        if (
            trailingActive
        ) {
            executionScore += 15;
        }

        managementScore =
            Math.min(
                executionScore,
                100
            );

        //--------------------------------------------------
        // SCALE-IN MANAGEMENT
        //--------------------------------------------------

        if (

            scaleIn.enabled &&
            ctx.confidence >= 85 &&
            ctx.riskScore >= 80 &&
            ctx.mtfAlignment >= 80 &&
            remainingPosition > 0

        ) {

            //--------------------------------------------------
            // ADD 25% POSITION
            //--------------------------------------------------

            scaleIn.executed = true;
            scaleIn.additionalQuantity =
                totalPosition *
                0.25;

            //--------------------------------------------------
            // UPDATE AVERAGE ENTRY
            //--------------------------------------------------

            scaleIn.averageEntryPrice =

                (
                    averageEntryPrice *
                    totalPosition +
                    ctx.currentPrice *
                    scaleIn.additionalQuantity
                ) /

                (
                    totalPosition +
                    scaleIn.additionalQuantity
                );

        }

        //--------------------------------------------------
        // SCALE-OUT MANAGEMENT
        //--------------------------------------------------

        if (
            tp1Hit
        ) {
            scaleOut.enabled = true;
            scaleOut.executed = true;
            scaleOut.exitQuantity = tp1ExitQty;
            scaleOut.remainingPosition = remainingPosition;
        }
		
		if (
            tp2Hit
        ) {
            scaleOut.enabled = true;
            scaleOut.executed = true;
            scaleOut.exitQuantity =
                tp1ExitQty +
                tp2ExitQty;
            scaleOut.remainingPosition = remainingPosition;

        }

        if (
            tp3Hit ||
            slHit
        ) {

            scaleOut.enabled = true;
            scaleOut.executed = true;
            scaleOut.exitQuantity = totalPosition;
            scaleOut.remainingPosition = 0;
        }

        //--------------------------------------------------
        // SYNCHRONIZE POSITION
        //--------------------------------------------------

        remainingPosition = scaleOut.remainingPosition;

        //--------------------------------------------------
        // UPDATE AVERAGE ENTRY
        //--------------------------------------------------

        averageEntryPrice = scaleIn.averageEntryPrice;

        //--------------------------------------------------
        // LIVE RISK MANAGEMENT
        //--------------------------------------------------

        const unrealizedPnL =
            ctx.tradeDir > 0
                ?
                (
                    ctx.currentPrice -
                    averageEntryPrice
                ) *
                remainingPosition
                :
                (
                    averageEntryPrice -
                    ctx.currentPrice
                ) *
                remainingPosition;

        //--------------------------------------------------
        // REALIZED PNL
        //--------------------------------------------------

        const realizedPnL =
            partialExitExecuted
                ?
                (
                    ctx.currentPrice -
                    averageEntryPrice
                ) *
                realizedPosition *
                (
                    ctx.tradeDir >= 0
                        ? 1
                        : -1
                )
                : 0;

        //--------------------------------------------------
        // CURRENT RISK
        //--------------------------------------------------

        const currentRisk =

            Math.abs(
                averageEntryPrice -
                ctx.slPrice
            ) *
            remainingPosition;

        //--------------------------------------------------
        // REWARD : RISK
        //--------------------------------------------------

        const rewardRiskRatio =

            Math.abs(
                ctx.tp3 -
                averageEntryPrice
            ) /
            Math.max(
                Math.abs(
                    averageEntryPrice -
                    ctx.slPrice 
                ),
                0.000001
            );

        //--------------------------------------------------
        // DRAWDOWN
        //--------------------------------------------------

        const drawdown =
            Math.max(
                0,
                currentRisk
            );

        //--------------------------------------------------
        // TRADE RISK OBJECT
        //--------------------------------------------------

        const risk: TradeRiskState = {
            currentRisk,
            rewardRiskRatio,
            unrealizedPnL,
            realizedPnL,
            drawdown
        };

        //--------------------------------------------------
        // PORTFOLIO EXPOSURE
        //--------------------------------------------------

        const exposure =
            remainingPosition *
            ctx.currentPrice;

        //--------------------------------------------------
        // PORTFOLIO OBJECT
        //--------------------------------------------------

        const portfolio: PortfolioExposure = {
            totalExposure: exposure,
            availableCapital: 0,
            marginUsed: exposure,
            leverage: 1,
            riskUtilization:
                ctx.accountRiskPercent ??
                0
        };
		
		//--------------------------------------------------
		// TRADE PROGRESS
		//--------------------------------------------------
		
		const progress: TradeProgress = {
		
			//--------------------------------------------------
			// TARGET STATUS
			//--------------------------------------------------
		
			tp1Hit,
			tp2Hit,
			tp3Hit,
			slHit,
		
			//--------------------------------------------------
			// POSITION
			//--------------------------------------------------
		
			remainingPosition,
			realizedPosition,
		
			//--------------------------------------------------
			// TRADE STATUS
			//--------------------------------------------------
		
			tradeActive,
			tradeCompleted,
			tradeClosed,
		
			//--------------------------------------------------
			// MANAGEMENT
			//--------------------------------------------------
		
			breakEvenActive,
			trailingAllowed,
			trailingActive
		
		};

        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

        const diagnostics = {

            //--------------------------------------------------
            // BREAK EVEN
            //--------------------------------------------------

            breakEvenActivated: breakEvenActive,

            //--------------------------------------------------
            // TRAILING
            //--------------------------------------------------

            trailingActivated: trailingActive,

            //--------------------------------------------------
            // SCALE MANAGEMENT
            //--------------------------------------------------

            scaleInExecuted: scaleIn.executed,
            scaleOutExecuted: scaleOut.executed,

            //--------------------------------------------------
            // PARTIAL EXIT
            //--------------------------------------------------

            partialExitExecuted,

            //--------------------------------------------------
            // RE-ENTRY
            //--------------------------------------------------

            reEntryEligible,

            //--------------------------------------------------
            // TRADE STATUS
            //--------------------------------------------------

            tradeCompleted

        };

        //--------------------------------------------------
        // METADATA
        //--------------------------------------------------

        const metadata = {
            tradeDirection: ctx.tradeDir,
            entryPrice: averageEntryPrice,
            currentPrice: ctx.currentPrice,
            remainingPosition,
            targetLevelReached,
            executionScore,
            managementScore
        };

        //--------------------------------------------------
        // NOTES
        //--------------------------------------------------

        const notes: string[] = [];

        if (
            tp1Hit
        ) {
            notes.push(
                "TP1 reached"
            );
        }

        if (
            tp2Hit
        ) {
            notes.push(
                "TP2 reached"
            );
        }

        if (
            tp3Hit
        ) {
            notes.push(
                "TP3 reached"
            );
        }

        if (
            breakEvenActive
        ) {
            notes.push(
                "Break-even activated"
            );
        }

        if (
            trailingActive
        ) {
            notes.push(
                "Trailing enabled"
            );
        }

        if (
            reEntryEligible
        ) {
            notes.push(
                "Eligible for institutional re-entry"
            );
        }

        if (
            tradeCompleted
        ) {
            notes.push(
                "Trade completed"
            );
        }
		
		//--------------------------------------------------
        // FINAL RESULT
        //--------------------------------------------------

        return {

		//--------------------------------------------------
		// TRADE STATUS
		//--------------------------------------------------
		
		tradeActive,
		tradeCompleted,
		tradeClosed,
		
		positionOpen:
			tradeActive,
		
		positionClosed:
			tradeClosed,
		
		exitReason:
			slHit
				? "STOPLOSS"
				: tp3Hit
					? "TP3"
					: "NONE",

            //--------------------------------------------------
            // POSITION
            //--------------------------------------------------

            positionSize: totalPosition,
            remainingPosition,
            realizedPosition,
            averageEntryPrice,

            //--------------------------------------------------
            // TARGET STATUS
            //--------------------------------------------------

			tp1Hit,
			tp2Hit,
			tp3Hit,
			stopLossHit: slHit,

            //--------------------------------------------------
            // BREAK EVEN
            //--------------------------------------------------

            breakEvenActive,
            breakEvenPrice,

            //--------------------------------------------------
            // TRAILING
            //--------------------------------------------------

            trailingAllowed,
            trailingActive,
            trailingStop: breakEvenPrice,

            //--------------------------------------------------
            // SCALE IN / SCALE OUT
            //--------------------------------------------------

            scaleIn,
            scaleOut,

            //--------------------------------------------------
            // PARTIAL EXIT
            //--------------------------------------------------

            partialExit,

            //--------------------------------------------------
            // TRADE PROGRESS
            //--------------------------------------------------

            progress,
            targetLevelReached,

            //--------------------------------------------------
            // RE-ENTRY
            //--------------------------------------------------

            reEntryEligible,
            reEntryCount:
                ctx.reEntryCount ??
                0,

            remainingAttempts:
                Math.max(
                    0,
                    2 -

                    (
                        ctx.reEntryCount ??
                        0
                    )
                ),

            //--------------------------------------------------
            // LIVE RISK
            //--------------------------------------------------

            risk,

            //--------------------------------------------------
            // PORTFOLIO
            //--------------------------------------------------

            portfolio,

            //--------------------------------------------------
            // SCORES
            //--------------------------------------------------

            executionScore,
            managementScore,

            //--------------------------------------------------
            // DIAGNOSTICS
            //--------------------------------------------------

            diagnostics,

            //--------------------------------------------------
            // OPTIONAL FLAGS
            //--------------------------------------------------

            emergencyExit: false,
            timeoutExit:
                ctx.barsInTrade >=
                ctx.maxHoldingBars,

            forceExit: false,

            //--------------------------------------------------
            // EXTENSIONS
            //--------------------------------------------------

            metadata,
            notes
        };
    }
}		