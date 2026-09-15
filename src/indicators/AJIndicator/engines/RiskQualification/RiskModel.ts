/****************************************************************************************
 * File:
 * RiskModel.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/RiskModel.ts
 *
 * Purpose:
 * Canonical Institutional Risk Model for AJ v2.
 *
 * Responsibilities:
 * -----------------
 * • Dynamic position sizing
 * • Volatility-adjusted risk
 * • Confidence-adjusted allocation
 * • Portfolio-aware allocation
 * • Capital allocation
 * • Margin validation
 * • Leverage validation
 * • Institutional diagnostics
 *
 * This engine DOES NOT:
 * ---------------------
 * • Generate BUY / SELL decisions
 * • Generate Entry / Exit signals
 * • Generate Confidence
 * • Generate Authority
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Risk Qualification
 *      ↓
 * Entry Risk Engine
 *      ↓
 * Risk Model
 *      ↓
 * Execution Engine
 ****************************************************************************************/

import type {

    RiskInput

} from "./RiskTypes";

import type {

    RiskResult

} from "./RiskResult";

//======================================================
// RISK MODEL
//======================================================

export class RiskModel {

    //--------------------------------------------------
    // CONFIGURATION
    //--------------------------------------------------

    private static readonly MIN_STOP_DISTANCE = 0.000001;

    private static readonly DEFAULT_LEVERAGE = 1;

    //--------------------------------------------------
    // CALCULATE
    //--------------------------------------------------

    static calculate(

        input: RiskInput

    ): RiskResult {

        //--------------------------------------------------
        // ACCOUNT
        //--------------------------------------------------

        const accountSize =

            Math.max(

                input.accountSize,

                0

            );

        const availableCapital =

            input.availableCapital ??

            accountSize;

        //--------------------------------------------------
        // RISK PERCENT
        //--------------------------------------------------

        const requestedRiskPercent =

            Math.max(

                input.riskPercent,

                0

            );

        const maximumRiskPercent =

            input.maxRiskPercent ??

            requestedRiskPercent;

        const riskPercent =

            Math.min(

                requestedRiskPercent,

                maximumRiskPercent

            );

        //--------------------------------------------------
        // RISK AMOUNT
        //--------------------------------------------------

        let riskAmount =

            accountSize *

            (

                riskPercent /

                100

            );

        //--------------------------------------------------
        // STOP DISTANCE
        //--------------------------------------------------

        const stopDistance =

            Math.max(

                Math.abs(

                    input.entryPrice -

                    input.stopLoss

                ),

                this.MIN_STOP_DISTANCE

            );

        //--------------------------------------------------
        // ATR DISTANCE
        //--------------------------------------------------

        const atrDistance =

            Math.max(

                input.atr,

                this.MIN_STOP_DISTANCE

            );

        //--------------------------------------------------
        // BASE POSITION SIZE
        //--------------------------------------------------

        let positionSize =

            riskAmount /

            stopDistance;

        //--------------------------------------------------
        // DEFAULT VALUES
        //--------------------------------------------------

        let leverageUsed =

            input.leverage ??

            this.DEFAULT_LEVERAGE;

        let allocationApproved =

            true;

        let positionApproved =

            true;

        let confidence =

            input.confidence ??

            0;

        let riskScore =

            input.riskScore ??

            0;

        //--------------------------------------------------
        // VOLATILITY
        //--------------------------------------------------
		//--------------------------------------------------
        // VOLATILITY ADJUSTMENT
        //--------------------------------------------------

        const volatilityScore =

            input.volatilityScore ??

            50;

        if (

            volatilityScore >= 80

        ) {

            //--------------------------------------------------
            // HIGH VOLATILITY
            //--------------------------------------------------

            positionSize *= 0.70;

            riskAmount *= 0.70;

        }

        else if (

            volatilityScore >= 60

        ) {

            //--------------------------------------------------
            // MODERATE VOLATILITY
            //--------------------------------------------------

            positionSize *= 0.85;

            riskAmount *= 0.85;

        }

        else if (

            volatilityScore <= 20

        ) {

            //--------------------------------------------------
            // VERY LOW VOLATILITY
            //--------------------------------------------------

            positionSize *= 1.10;

        }

        //--------------------------------------------------
        // CONFIDENCE ADJUSTMENT
        //--------------------------------------------------

        if (

            confidence >= 95

        ) {

            positionSize *= 1.20;

        }

        else if (

            confidence >= 90

        ) {

            positionSize *= 1.10;

        }

        else if (

            confidence >= 80

        ) {

            positionSize *= 1.00;

        }

        else if (

            confidence >= 70

        ) {

            positionSize *= 0.90;

        }

        else if (

            confidence >= 60

        ) {

            positionSize *= 0.75;

        }

        else {

            positionSize *= 0.50;

        }

        //--------------------------------------------------
        // AUTHORITY VALIDATION
        //--------------------------------------------------

        if (

            input.authorityApproved === false ||

            input.authorityDecision === "WAIT"

        ) {

            allocationApproved = false;

            positionApproved = false;

            positionSize = 0;

        }

        //--------------------------------------------------
        // RISK QUALIFICATION
        //--------------------------------------------------

        if (

            input.riskQualified === false

        ) {

            allocationApproved = false;

            positionApproved = false;

            positionSize = 0;

        }

        //--------------------------------------------------
        // RISK SCORE ADJUSTMENT
        //--------------------------------------------------

        if (

            riskScore >= 90

        ) {

            positionSize *= 1.10;

        }

        else if (

            riskScore >= 80

        ) {

            positionSize *= 1.00;

        }

        else if (

            riskScore >= 70

        ) {

            positionSize *= 0.90;

        }

        else if (

            riskScore >= 60

        ) {

            positionSize *= 0.75;

        }

        else {

            positionSize *= 0.50;

        }

        //--------------------------------------------------
        // TREND ADJUSTMENT
        //--------------------------------------------------

        const trendStrength =

            input.trendStrength ??

            50;

        if (

            trendStrength >= 80

        ) {

            positionSize *= 1.10;

        }

        else if (

            trendStrength <= 30

        ) {

            positionSize *= 0.70;

        }

        //--------------------------------------------------
        // MOMENTUM ADJUSTMENT
        //--------------------------------------------------

        const momentumScore =

            input.momentumScore ??

            50;

        if (

            momentumScore >= 80

        ) {

            positionSize *= 1.05;

        }

        else if (

            momentumScore <= 30

        ) {

            positionSize *= 0.85;

        }

        //--------------------------------------------------
        // MULTI-TIMEFRAME ADJUSTMENT
        //--------------------------------------------------

        const mtfAlignment =

            input.mtfAlignment ??

            50;

        if (

            mtfAlignment >= 90

        ) {

            positionSize *= 1.15;

        }

        else if (

            mtfAlignment >= 80

        ) {

            positionSize *= 1.05;

        }

        else if (

            mtfAlignment < 60

        ) {

            positionSize *= 0.75;

        }

        //--------------------------------------------------
        // POSITION SANITY
        //--------------------------------------------------

        positionSize =

            Math.max(

                0,

                positionSize

            );

        //--------------------------------------------------
        // PORTFOLIO
        //--------------------------------------------------
		//--------------------------------------------------
        // PORTFOLIO EXPOSURE
        //--------------------------------------------------

        const portfolioExposure =

            Math.max(

                input.portfolioExposure ??

                0,

                0

            );

        const openPositions =

            Math.max(

                input.openPositions ??

                0,

                0

            );

        const correlationScore =

            Math.max(

                input.correlationScore ??

                0,

                0

            );

        //--------------------------------------------------
        // EXPOSURE ADJUSTMENT
        //--------------------------------------------------

        if (

            portfolioExposure >= 80

        ) {

            positionSize *= 0.60;

        }

        else if (

            portfolioExposure >= 60

        ) {

            positionSize *= 0.80;

        }

        //--------------------------------------------------
        // OPEN POSITIONS
        //--------------------------------------------------

        if (

            openPositions >= 10

        ) {

            positionSize *= 0.60;

        }

        else if (

            openPositions >= 5

        ) {

            positionSize *= 0.80;

        }

        //--------------------------------------------------
        // CORRELATION
        //--------------------------------------------------

        if (

            correlationScore >= 80

        ) {

            positionSize *= 0.75;

        }

        //--------------------------------------------------
        // CAPITAL ALLOCATION
        //--------------------------------------------------

        let capitalAllocated =

            positionSize *

            input.entryPrice;

        //--------------------------------------------------
        // AVAILABLE CAPITAL
        //--------------------------------------------------

        if (

            capitalAllocated >

            availableCapital

        ) {

            capitalAllocated =

                availableCapital;

            positionSize =

                capitalAllocated /

                Math.max(

                    input.entryPrice,

                    this.MIN_STOP_DISTANCE

                );

        }

        //--------------------------------------------------
        // LEVERAGE
        //--------------------------------------------------

        leverageUsed =

            Math.max(

                leverageUsed,

                1

            );

        //--------------------------------------------------
        // MARGIN REQUIRED
        //--------------------------------------------------

        const marginRequired =

            capitalAllocated /

            leverageUsed;

        //--------------------------------------------------
        // MARGIN VALIDATION
        //--------------------------------------------------

        if (

            input.marginAvailable !== undefined &&

            marginRequired >

            input.marginAvailable

        ) {

            allocationApproved = false;

            positionApproved = false;

        }

        //--------------------------------------------------
        // REWARD / RISK
        //--------------------------------------------------

        const rewardRiskRatio =

            input.rewardRiskRatio ??

            0;

        //--------------------------------------------------
        // RISK UTILIZATION
        //--------------------------------------------------

        const riskUtilization =

            accountSize > 0

                ?

                (

                    riskAmount /

                    accountSize

                ) * 100

                :

                0;

        //--------------------------------------------------
        // POSITION VALUE
        //--------------------------------------------------

        const positionValue =

            positionSize *

            input.entryPrice;

        //--------------------------------------------------
        // PORTFOLIO RISK
        //--------------------------------------------------

        const portfolioRisk =

            portfolioExposure +

            riskUtilization;

        //--------------------------------------------------
        // CAPITAL AVAILABLE
        //--------------------------------------------------

        const capitalAvailable =

            availableCapital >=

            capitalAllocated;

        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

        const diagnostics = {

            authorityApproved:

                input.authorityApproved ??

                false,

            riskQualified:

                input.riskQualified ??

                false,

            volatilityAccepted:

                volatilityScore <= 80,

            trendAligned:

                trendStrength >= 60,

            mtfAligned:

                mtfAlignment >= 60,

            capitalAvailable

        };

        //--------------------------------------------------
        // NOTES
        //--------------------------------------------------

        const notes: string[] = [];

        if (

            diagnostics.authorityApproved

        ) {

            notes.push(

                "Authority approved"

            );

        }

        if (

            diagnostics.riskQualified

        ) {

            notes.push(

                "Risk qualified"

            );

        }

        if (

            diagnostics.volatilityAccepted

        ) {

            notes.push(

                "Volatility acceptable"

            );

        }

        if (

            diagnostics.trendAligned

        ) {

            notes.push(

                "Trend aligned"

            );

        }

        if (

            diagnostics.mtfAligned

        ) {

            notes.push(

                "Multi-timeframe aligned"

            );

        }

        if (

            capitalAvailable

        ) {

            notes.push(

                "Capital available"

            );

        }

        //--------------------------------------------------
        // FINAL RESULT
        //--------------------------------------------------
		        return {

            //--------------------------------------------------
            // RISK
            //--------------------------------------------------

            riskAmount,

            riskPercent,

            riskUtilization,

            //--------------------------------------------------
            // POSITION
            //--------------------------------------------------

            positionSize,

            positionValue,

            //--------------------------------------------------
            // CAPITAL
            //--------------------------------------------------

            capitalAllocated,

            availableCapital:

                availableCapital -

                capitalAllocated,

            //--------------------------------------------------
            // DISTANCE
            //--------------------------------------------------

            stopDistance,

            atrDistance,

            //--------------------------------------------------
            // LEVERAGE
            //--------------------------------------------------

            leverageUsed,

            marginRequired,

            //--------------------------------------------------
            // PORTFOLIO
            //--------------------------------------------------

            portfolioExposure,

            portfolioRisk,

            openPositions,

            //--------------------------------------------------
            // REWARD / RISK
            //--------------------------------------------------

            rewardRiskRatio,

            //--------------------------------------------------
            // QUALITY
            //--------------------------------------------------

            confidence,

            riskScore,

            //--------------------------------------------------
            // VALIDATION
            //--------------------------------------------------

            allocationApproved,

            positionApproved,

            //--------------------------------------------------
            // DIAGNOSTICS
            //--------------------------------------------------

            diagnostics,

            //--------------------------------------------------
            // METADATA
            //--------------------------------------------------

            notes

        };

    }

}