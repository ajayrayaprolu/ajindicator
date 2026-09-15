/****************************************************************************************
 * File:
 * OrderBlockResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderBlock/OrderBlockResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Order Block Engine.
 *
 * This contract contains only raw Order Block intelligence.
 * No confidence aggregation, trade qualification or execution
 * decisions belong in this file.
 *
 * AJ v2 Architecture
 *
 * MarketState
 *      │
 *      ▼
 * OrderFlow
 *      │
 *      ▼
 * MarketStructure
 *      │
 *      ▼
 * Liquidity
 *      │
 *      ▼
 * OrderBlock
 *      │
 *      ▼
 * Trend
 ****************************************************************************************/

export interface OrderBlockResult {

    //--------------------------------------------------
    // ORDER BLOCK DETECTION
    //--------------------------------------------------

    bullishOrderBlock: boolean;

    bearishOrderBlock: boolean;

    //--------------------------------------------------
    // ZONE LEVELS
    //--------------------------------------------------

    blockHigh: number;

    blockLow: number;

    //--------------------------------------------------
    // VALIDITY
    //--------------------------------------------------

    fresh: boolean;

    mitigated: boolean;

    active: boolean;

    expired: boolean;

    //--------------------------------------------------
    // TOUCH INFORMATION
    //--------------------------------------------------

    touchCount: number;

    mitigationCount: number;

    lastTouchIndex?: number;

	//--------------------------------------------------
	// REACTION
	//--------------------------------------------------
	
	reactionStrength: boolean;
	
	reactionPercent: number;
	
	//--------------------------------------------------
	// ORDER BLOCK DISTANCE
	//--------------------------------------------------
	
	orderBlockDistance: number;
	
	reactionDistance?: number;

    //--------------------------------------------------
    // ZONE QUALITY
    //--------------------------------------------------

    zoneStrength: number;

    confidence: number;

    zoneQuality:
        | "NONE"
        | "FRESH"
        | "ACTIVE"
        | "WEAK"
        | "EXPIRED";

    //--------------------------------------------------
    // HIGHER TIMEFRAME
    //--------------------------------------------------

    higherTimeframeAligned: boolean;

    higherTimeframe: string;

    //--------------------------------------------------
    // MARKET BIAS
    //--------------------------------------------------

    marketBias:
        | -1
        | 0
        | 1;

    //--------------------------------------------------
    // ORDER BLOCK CLASSIFICATION
    //--------------------------------------------------

    blockType:
        | "NONE"
        | "BULLISH"
        | "BEARISH";

    //--------------------------------------------------
    // LIFE CYCLE
    //--------------------------------------------------

    createdBarIndex?: number;

    lastReactionBar?: number;

    ageInBars?: number;

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    notes?: string[];

}