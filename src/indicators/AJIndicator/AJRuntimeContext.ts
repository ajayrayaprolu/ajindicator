/****************************************************************************************
 * File:
 * AJRuntimeContext.ts
 *
 * Path:
 * src/indicators/AJIndicator/AJRuntimeContext.ts
 *
 * Purpose:
 * Central runtime contract shared by every AJ Institutional engine.
 * This object transports all derived market intelligence between engines
 * without containing any calculation logic.
 *
 * Responsibility:
 * â€¢ Runtime data contract only
 * â€¢ Shared by all AJ engines
 * â€¢ No business logic
 * â€¢ No calculations
 *
 * AJ v2 Frozen Architecture
 *
 * Raw Market Data
 *        │
 *        ▼
 * Market State Engine
 *        │
 *        ▼
 * Order Flow Engine
 *        │
 *        ▼
 * Market Structure Engine
 *        │
 *        ▼
 * Liquidity Engine
 *        │
 *        ▼
 * Order Block Engine
 *        │
 *        ▼
 * Trend Engine
 *        │
 *        ▼
 * Price Action Engine
 *        │
 *        ▼
 * Momentum Engine
 *        │
 *        ▼
 * Volatility Engine
 *        │
 *        ▼
 * Multi-Timeframe Engine
 *        │
 *        ▼
 * Risk Qualification Engine
 *        │
 *        ▼
 * Confidence Engine
 *        │
 *        ▼
 * Trade Authority
 *        │
 *        ▼
 * Execution Engine
 *
 * Notes
 * -----
 * This file intentionally contains only runtime contracts.
 * Every engine appends information into this context.
 ****************************************************************************************/

import type { RuntimeContext } from "../../runtime/RuntimeContext";
import type { ConfidenceResult } from "./engines/Confidence/ConfidenceResult";

export interface AJRuntimeContext
extends RuntimeContext {

    //--------------------------------------------------
    // CORE INDICATORS
    //--------------------------------------------------

    ema20: number;
    ema50: number;
    ema200: number;

    ema20Slope: number;
    ema50Slope: number;
    ema200Slope: number;

    vwap: number;

    atr: number;

    rsi: number;

    adx: number;

    //--------------------------------------------------
    // TREND STATE
    //--------------------------------------------------

    emaBull: boolean;
    emaBear: boolean;

    vwapBull: boolean;
    vwapBear: boolean;
	
	//--------------------------------------------------
    // VWAP COMPATIBILITY
    //--------------------------------------------------

    vwapAligned: boolean;

    rsiBull: boolean;
    rsiBear: boolean;

    adxTrend: boolean;

    //--------------------------------------------------
    // MARKET STATE ENGINE
    //--------------------------------------------------

    marketState?: {

        regime:
            string;

        trend:
            string;

        phase:
            string;

        bullish:
            boolean;

        bearish:
            boolean;

        ranging:
            boolean;

        expanding:
            boolean;

        compressing:
            boolean;

        accumulation:
            boolean;

        distribution:
            boolean;

        volatilityState:
            string;

    };

    //--------------------------------------------------
    // ORDER FLOW ENGINE
    //--------------------------------------------------

    orderFlow?: {

        source:

            | "REAL"

            | "SYNTHETIC"

            | "NONE";

        confidence:
            number;

        buyingPressure:
            number;

        sellingPressure:
            number;

        delta:
            number;

        cumulativeDelta:
            number;

        bullish:
            boolean;

        bearish:
            boolean;

    };

    //--------------------------------------------------
    // BACKWARD COMPATIBILITY (CVD)
    //--------------------------------------------------

    cvdValue: number;

    cvdDelta: number;

    cvdBull: boolean;

    cvdBear: boolean;

    cvdStrength: number;

    //--------------------------------------------------
    // INSIDE BAR
    //--------------------------------------------------

    insideBar: boolean;

    motherHigh: number;

    motherLow: number;

    insideBarBreakoutLong: boolean;

    insideBarBreakoutShort: boolean;

    //--------------------------------------------------
    // MARKET STRUCTURE ENGINE
    //--------------------------------------------------

	marketStructure?: {
	
		trend:
			string;
	
		bullish:
			boolean;
	
		bearish:
			boolean;
	
		strength:
			number;
	
		bosConfirmed:
			boolean;
	
		chochConfirmed:
			boolean;
	
		internalBos:
			boolean;
	
		externalBos:
			boolean;
	
		//--------------------------------------------------
		// AJ v2 Compatibility
		//--------------------------------------------------
	
		breakoutConfirmed:
			boolean;
	
		bosDirection:
			number;
	
		chochDirection:
			number;
	
	};

    //--------------------------------------------------
    // BREAK OF STRUCTURE
    //--------------------------------------------------

    bosBull: boolean;

    bosBear: boolean;

    bosStrength: number;

    //--------------------------------------------------
    // CHANGE OF CHARACTER
    //--------------------------------------------------

    chochBull: boolean;

    chochBear: boolean;

    chochStrength: number;

    //--------------------------------------------------
    // FAIR VALUE GAP
    //--------------------------------------------------

    fvgBull: boolean;

    fvgBear: boolean;

    fvgUpper: number;

    fvgLower: number;

    fvgMitigated: boolean;

    //--------------------------------------------------
    // LIQUIDITY ENGINE
    //--------------------------------------------------

	liquidity?: {
	
		sweepHigh:
			boolean;
	
		sweepLow:
			boolean;
	
		retailTrapLong:
			boolean;
	
		retailTrapShort:
			boolean;
	
		stopHunt:
			boolean;
	
		strength:
			number;
	
		confidence:
			number;
	
		//--------------------------------------------------
		// AJ v2 Compatibility
		//--------------------------------------------------
	
		sweepConfirmed:
			boolean;
	
	};

    //--------------------------------------------------
    // LIQUIDITY (BACKWARD COMPATIBILITY)
    //--------------------------------------------------

    liquiditySweepLow: boolean;

    liquiditySweepHigh: boolean;

    stopHuntDetected: boolean;

    sweepStrength: number;

    //--------------------------------------------------
    // ORDER BLOCK ENGINE
    //--------------------------------------------------

    orderBlock?: {

        bullish:
            boolean;

        bearish:
            boolean;

        fresh:
            boolean;

        mitigated:
            boolean;

        touchCount:
            number;

        strength:
            number;

        zoneStrength:
            string;

        higherTimeframe:
            boolean;

    };

    //--------------------------------------------------
    // TRADE MODE ROUTER
    //--------------------------------------------------

    tradeEngineMode?:

        | "CONFIDENCE"

        | "SCORE"

        | "AI"

        | "AI_SMC";

    requestedTradeEngineMode?:
        string;

    effectiveCalculationMode?:
        string;

    intelligentModeEnabled?:
        boolean;

    intelligentModeReason?:
        string;

    intelligentMarketRegime?:
        string;

    routerMode?:
        string;

    //--------------------------------------------------
    // MODE CORE READINESS
    //--------------------------------------------------

    aiCorePass?:
        boolean;

    smcCorePass?:
        boolean;

    //--------------------------------------------------
    // ADVANCED CRYPTO
    //--------------------------------------------------

    advCryptoReady?:
        boolean;

    cryptoScoreResult?:
        any;

    //--------------------------------------------------
    // STRATEGY PROFILE
    //--------------------------------------------------

    smcProfile?:
        | "SAFE"
        | "SWING"
        | "SCALPER";
	
    //--------------------------------------------------
    // TREND ENGINE
    //--------------------------------------------------

    trend?: {

        bullish:
            boolean;

        bearish:
            boolean;

        direction:
            number;

        strength:
            number;

        emaAlignment:
            number;

        vwapAlignment:
            number;

        adxStrength:
            number;

    };

    //--------------------------------------------------
    // PRICE ACTION ENGINE
    //--------------------------------------------------

    priceAction?: {

        bullish:
            boolean;

        bearish:
            boolean;

        rejection:
            boolean;

        continuation:
            boolean;

        engulfing:
            boolean;

        insideBar:
            boolean;

        outsideBar:
            boolean;

        pinBar:
            boolean;

        hammer:
            boolean;

        shootingStar:
            boolean;

        bodyStrength:
            number;

        upperWick:
            number;

        lowerWick:
            number;

        rejectionStrength:
            number;

    };

    //--------------------------------------------------
    // MOMENTUM ENGINE
    //--------------------------------------------------

    momentum?: {

        bullish:
            boolean;

        bearish:
            boolean;

        strength:
            number;

        acceleration:
            number;

        exhaustion:
            boolean;

        continuation:
            boolean;

    };

    //--------------------------------------------------
    // VOLATILITY ENGINE
    //--------------------------------------------------

    volatility?: {

        atr:
            number;

        expanding:
            boolean;

        contracting:
            boolean;

        squeeze:
            boolean;

        expansionStrength:
            number;

    };

    //--------------------------------------------------
    // MULTI TIMEFRAME ENGINE
    //--------------------------------------------------

    multiTimeframe?: {

        alignment:
            number;

        bullish:
            boolean;

        bearish:
            boolean;

        higherTimeframeTrend:
            string;

        lowerTimeframeTrend:
            string;

        confidence:
            number;

    };

    //--------------------------------------------------
    // RISK QUALIFICATION ENGINE
    //--------------------------------------------------

    riskQualification?: {

        qualified: boolean;
        noTrade: boolean;
        grade: string;
        riskScore: number;
        trapDetected: boolean;
        choppyMarket: boolean;
        conflictingSignals: boolean;
        nearbyResistance: boolean;
        nearbySupport: boolean;
        reason: string;

    };
	
	//--------------------------------------------------
	// AI CONFIDENCE COMPATIBILITY
	//--------------------------------------------------
	
	riskQualificationApproved: boolean;
	orderFlowBull: boolean;
	orderFlowBear: boolean;
	orderFlowConfidence: number;
	orderBlockBull: boolean;
	orderBlockBear: boolean;

    //--------------------------------------------------
    // AI CONTEXT
    //--------------------------------------------------

    aiTrendLong: boolean;
    aiTrendShort: boolean;
    aiBullDisplacement: boolean;
    aiBearDisplacement: boolean;
    aiMarketStructureBull: boolean;
    aiMarketStructureBear: boolean;
    aiInstitutionalLong: boolean;
    aiInstitutionalShort: boolean;
    aiSafeEntry: boolean;
    aiFastScalp: boolean;

    aiScoreLong: number;
    aiScoreShort: number;
    aiBestScore: number;
    aiBestDir: number;
    aiMarketQualityOk: boolean;
    aiWeakBody: boolean;
    aiBestDirection: number;
    aiSmcPass: boolean;
    aiSweepThenLong: boolean;
    aiSweepThenShort: boolean;
    aiBreakFollowLong: boolean;
    aiBreakFollowShort: boolean;

    //--------------------------------------------------
    // CONFIDENCE ENGINE
    //--------------------------------------------------

	confidence?: ConfidenceResult;
	
    //--------------------------------------------------
    // BACKWARD COMPATIBILITY
    //--------------------------------------------------

    trendConfidence: number;

    structureConfidence: number;

    liquidityConfidence: number;

    aiConfidence: number;

    executionConfidence: number;

    institutionalScore: number;

    contextConfidence: number;

    //--------------------------------------------------
    // MARKET REGIME
    //--------------------------------------------------

    marketRegime: string;

    mtfAlignment: number;

    //--------------------------------------------------
    // CONTEXT RESULT
    //--------------------------------------------------

    ctxLong: boolean;

    ctxShort: boolean;

    //--------------------------------------------------
    // EXECUTION DECISION
    //--------------------------------------------------

    executionReady: boolean;

    tradeDirectionFinal: number;

	//--------------------------------------------------
	// Legacy Compatibility (Transport Only)
	//
	// These fields exist only for migration.
	//
	// Canonical ownership now belongs to:
	//
	// â€¢ ContextEngine
	// â€¢ AIConfidenceEngine
	// â€¢ ExecutionAuthority
	//
	// Remove only after every consumer has migrated.
	//--------------------------------------------------

    tradeScore: number;

    scoreLong: number;

    scoreShort: number;

    institutionalLongScore: number;

    institutionalShortScore: number;

    //--------------------------------------------------
    // TRADE AUTHORITY
    //--------------------------------------------------

    authority?: {

        approved:
            boolean;

        blocked:
            boolean;

        tradeGrade:
            string;

		confidence?:
			ConfidenceResult;

        reason:
            string;

        warnings:
            string[];

    };

    //--------------------------------------------------
    // EXECUTION ENGINE
    //--------------------------------------------------

	execution?: {
	
		ready: boolean;
		direction: number;
		entry: number;
		stopLoss: number;
		target1: number;
		target2: number;
		target3: number;
		riskReward: number;
		quantity: number;
		trailingEnabled: boolean;
		inPosition: boolean;
	
		//------------------------------------
		// Execution lifecycle
		//------------------------------------
	
		executionAcknowledged: boolean;
	
	};

    //--------------------------------------------------
    // RUNTIME INTELLIGENCE
    //--------------------------------------------------

    runtimeIntelligence: {

        trendConfidence:
            number;

        structureConfidence:
            number;

        liquidityConfidence:
            number;

        aiConfidence:
            number;

        executionConfidence:
            number;

        institutionalScore:
            number;

        marketRegime:
            string;

        executionReady:
            boolean;

        mtfAlignment:
            number;
			
		//--------------------------------------------------
		// INTELLIGENT TRADE MODE
		//--------------------------------------------------
	
		requestedTradeEngineMode?:
			"AUTO" |
			"SCORE" |
			"AI" |
			"AI_SMC" |
			string;
	
		effectiveCalculationMode?:
			"SCORE" |
			"AI" |
			"AI_SMC" |
			string;
	
		intelligentModeEnabled?:
			boolean;
	
		intelligentModeReason?:
			string;
	
		intelligentMarketRegime?:
			string;
	
		//--------------------------------------------------
		// ADVANCED CRYPTO
		//--------------------------------------------------
	
		advCryptoReady?:
			boolean;
	
		cryptoScoreResult?:
			unknown;
	
		//--------------------------------------------------
		// RISK
		//--------------------------------------------------
	
		riskQualificationResult?:
			unknown;
	
		riskQualificationApproved?:
        boolean;

        //--------------------------------------------------
        // AJ v2
        //--------------------------------------------------

        confidence?:
            number;

        marketState?:
            string;

        orderFlow?:
            string;

        riskGrade?:
            string;

        evidence?:
            string[];
		
		//--------------------------------------------------
        // SMART SYNC
        //--------------------------------------------------

        syncEnabled?:
            boolean;

        syncAligned?:
            boolean;

        syncDetached?:
            boolean;

        syncPair?:
            string;

        syncReason?:
            string;

    };
	
    //--------------------------------------------------
    // SMART TRADE SYNC
    //--------------------------------------------------

    smartSync?: {

        enabled:
            boolean;

        mode:
            | "NSE ↔ BN"
            | "SPX ↔ BTC"
            | "NSE + SPX (ALL)"
            | "Sync OFF";

        pair:
            string;

        available:
            boolean;

        aligned:
            boolean;

        detached:
            boolean;

        direction:
            number;

        score:
            number;

        confidence:
            number;

        barDistance:
            number;

        reason:
            string;

    };
	
    //--------------------------------------------------
    // CHART RUNTIME SETTINGS
    //--------------------------------------------------

    chartId:
        string;

    enableAdvancedCrypto:
        boolean;

    cryptoBTCMode:
        boolean;

    showZones:
        boolean;

    showRRPosition:
        boolean;

    //--------------------------------------------------
    // VISUAL INTELLIGENCE
    //--------------------------------------------------

    visuals?: {

        showMarketState:
            boolean;

        showConfidence:
            boolean;

        showRisk:
            boolean;

        showOrderBlocks:
            boolean;

        showLiquidity:
            boolean;

        showStructure:
            boolean;

        showTooltips:
            boolean;

        showMentorAdvice:
            boolean;

    };

    //--------------------------------------------------
    // DASHBOARD
    //--------------------------------------------------

    dashboard?: {

        marketMood:
            string;

        recommendation:
            string;

        summary:
            string;

        evidence:
            string[];

        warnings:
            string[];

    };

    //--------------------------------------------------
    // RESERVED FOR FUTURE AJ FEATURES
    //--------------------------------------------------

    authorityResult?:
        unknown;

    decisionResult?:
        unknown;

    executionPlan?:
        unknown;

    aiTelemetry?:
        Record<string, unknown>;

    //--------------------------------------------------
    // SMC ZONES
    //--------------------------------------------------

    demandZones?:
        any[];

    supplyZones?:
        any[];

    fvgZones?:
        any[];

    liquidityZones?:
        any[];

    orderBlockZones?:
        any[];

    //--------------------------------------------------
    // FUTURE ENGINE OUTPUTS
    //--------------------------------------------------

    marketStateResult?:
        unknown;

    orderFlowResult?:
        unknown;

    marketStructureResult?:
        unknown;

    liquidityResult?:
        unknown;

    orderBlockResult?:
        unknown;

    trendResult?:
        unknown;

    priceActionResult?:
        unknown;

    momentumResult?:
        unknown;

    volatilityResult?:
        unknown;

    multiTimeframeResult?:
        unknown;

    riskQualificationResult?:
        unknown;

    confidenceResult?:
        unknown;

    //--------------------------------------------------
    // END
    //--------------------------------------------------

}
