/****************************************************************************************
 * File:
 * AJContextTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/context/AJContextTypes.ts
 *
 * AJ v2 - Canonical Context Input Contract
 *
 * Purpose
 * -------
 * AJContextTypes defines the canonical institutional input contract for the
 * AJ v2 Context Engine. It represents the normalized market intelligence
 * collected from all upstream runtime builders and specialized analysis
 * engines before market context evaluation begins.
 *
 * Rather than calculating indicators, this contract transports completed
 * market-analysis signals into ContextEngine, where they are transformed into
 * institutional context, confluence scores, confidence metrics, validation
 * results, and trading context.
 *
 * This interface serves as the single source of truth for all data required
 * by the ContextEngine and provides a stable boundary between the runtime
 * construction phase and the context evaluation phase.
 *
 * Responsibilities
 * ----------------
 * • Standardize all ContextEngine inputs.
 * • Aggregate normalized market intelligence.
 * • Carry institutional trading signals.
 * • Transport AI-derived market analysis.
 * • Support weighted institutional scoring.
 * • Support validation and diagnostics.
 * • Maintain backward compatibility with previous AJ versions.
 * • Provide extensibility for future AI enhancements.
 *
 * Functional Areas
 * ----------------
 *
 * Trade Routing
 * • AI directional recommendation
 * • Initial routing direction
 *
 * Trend Inputs
 * • EMA trend direction
 * • EMA slope
 * • Higher timeframe trend
 * • AI trend confirmation
 *
 * VWAP Inputs
 * • VWAP bullish alignment
 * • VWAP bearish alignment
 * • VWAP qualification
 *
 * Order Flow Inputs
 * • CVD direction
 * • CVD strength
 * • Order flow qualification
 *
 * AI Intelligence
 * • AI trend signals
 * • AI displacement detection
 * • AI sweep detection
 * • AI breakout confirmation
 * • AI confidence score
 *
 * Smart Money Structure
 * • Liquidity sweep detection
 * • Break of Structure (BOS)
 * • Change of Character (CHOCH)
 * • FVG retest detection
 *
 * Fair Value Gap
 * • Bullish FVG quality
 * • Bearish FVG quality
 *
 * Liquidity
 * • Liquidity sweep strength
 * • Liquidity grab confirmation
 *
 * Breakout
 * • Breakout strength
 * • Breakout confirmation
 *
 * Multi-Timeframe Analysis
 * • Higher timeframe trend
 * • Alignment score
 *
 * Institutional Analysis
 * • Institutional quality score
 * • Confluence score
 *
 * Optional Extensions
 * • Volatility score
 * • Momentum score
 * • Regime score
 *
 * Data Sources
 * ------------
 * ContextInputs is populated by information produced from:
 *
 * • EMA Engine
 * • VWAP Engine
 * • CVD Engine
 * • AI Engine
 * • AI Confidence Engine
 * • Market Structure Engine
 * • Liquidity Engine
 * • Breakout Engine
 * • Volatility Engine
 * • Multi-Timeframe Engine
 * • AJRuntimeContextBuilder
 *
 * Downstream Consumers
 * --------------------
 * Primary Consumer
 * • ContextEngine
 *
 * Indirect Consumers
 * • AJContextEngine
 * • ConfidenceEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • Runtime Adapter
 * • Execution Engine
 *
 * Design Principles
 * -----------------
 * • Canonical data contract
 * • Strongly typed interface
 * • Immutable runtime payload
 * • No business logic
 * • No calculations
 * • No scoring
 * • No validation
 * • No execution decisions
 * • Runtime-independent
 * • Extensible architecture
 * • Backward compatible
 * • Phase 15.5 compliant
 *
 * AJ v2 Pipeline
 *
 * Indicator Engines
 *        │
 *        ▼
 * RuntimeContextBuilder
 *        │
 *        ▼
 *    ContextInputs
 *        │
 *        ▼
 *    ContextEngine
 *        │
 *        ▼
 *    ContextResult
 *        │
 *        ▼
 *   AJContextEngine
 *        │
 *        ▼
 * ConfidenceEngine
 *        │
 *        ▼
 * AJDecisionEngine
 *        │
 *        ▼
 * Authority Engine
 *        │
 *        ▼
 * Execution Engine
 *
 * Notes
 * -----
 * • This interface contains only normalized market-analysis inputs.
 * • All indicator calculations are completed before this contract is created.
 * • ContextEngine is responsible for converting these inputs into institutional
 *   market context and scoring.
 * • New institutional signals should be added here only if they represent
 *   normalized runtime intelligence rather than derived context.
 *
 ****************************************************************************************/

export interface ContextInputs {

    //--------------------------------------------------
    // TRADE ROUTING
    //--------------------------------------------------

    aiBestDir: number;

    //--------------------------------------------------
    // EMA
    //--------------------------------------------------

    emaBull: boolean;
    emaBear: boolean;
    emaSlope: number;

    //--------------------------------------------------
    // VWAP
    //--------------------------------------------------

    useVWAP: boolean;
    vwapBull: boolean;
    vwapBear: boolean;
    vwapAligned: boolean;

    //--------------------------------------------------
    // CVD
    //--------------------------------------------------

    useCVD: boolean;
    cvdBull: boolean;
    cvdBear: boolean;
    cvdStrength: number;

    //--------------------------------------------------
    // AI TREND
    //--------------------------------------------------

    aiTrendLong: boolean;
    aiTrendShort: boolean;
    aiBullDisplacement: boolean;
    aiBearDisplacement: boolean;
    aiSweepThenLong: boolean;
    aiSweepThenShort: boolean;
    aiBreakFollowLong: boolean;
    aiBreakFollowShort: boolean;
    aiConfidence: number;

    //--------------------------------------------------
    // MARKET STRUCTURE
    //--------------------------------------------------

    smcSweepLow: boolean;
    smcSweepHigh: boolean;
    smcBosBull: boolean;
    smcBosBear: boolean;
    smcChochBull: boolean;
    smcChochBear: boolean;
    smcBullFvgRetest: boolean;
    smcBearFvgRetest: boolean;

    //--------------------------------------------------
    // FVG
    //--------------------------------------------------

    bullFvgQuality: number;
    bearFvgQuality: number;

	//--------------------------------------------------
    // LIQUIDITY
    //--------------------------------------------------

    liquiditySweepStrength: number;
    liquidityGrabConfirmed: boolean;

    //--------------------------------------------------
    // INSIDE BAR
    //--------------------------------------------------

    insideBarDetected: boolean;
    insideBarBreakoutLong: boolean;
    insideBarBreakoutShort: boolean;

    //--------------------------------------------------
    // BREAKOUT
    //--------------------------------------------------

    breakoutStrength: number;
    breakoutConfirmed: boolean;

    //--------------------------------------------------
    // MULTI-TIMEFRAME
    //--------------------------------------------------

    htfBullTrend: boolean;
    htfBearTrend: boolean;
    mtfAlignmentScore: number;

    //--------------------------------------------------
    // INSTITUTIONAL
    //--------------------------------------------------

    institutionalScore: number;
    confluenceScore: number;

    //--------------------------------------------------
    // OPTIONAL FUTURE EXTENSIONS
    //--------------------------------------------------

    volatilityScore?: number;
    momentumScore?: number;
    regimeScore?: number;

}
