/****************************************************************************************
 * File:
 * LiquidityResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Liquidity/LiquidityResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Liquidity Engine.
 *
 * This contract represents institutional liquidity intelligence only.
 * It does not perform confidence aggregation, trade qualification,
 * execution decisions or position management.
 *
 * AJ v2 Architecture              This is exactly the kind of relationship AJ v2 should learn         That's where improve AJ v2.
 *
 * MarketState                        Liquidity Sweep                 LIQUIDITY EVENT                        IDENTIFY LIQUIDITY
 *      │                                     ↓                              ↓                                       ↓
 *      ▼                                Displacement                 STRUCTURE RESPONSE                    CLASSIFY LIQUIDITY
 * OrderFlow                                  ↓                              ↓                                       ↓
 *      │                              FVG created                 INSTITUTIONAL EVIDENCE                 RICE APPROACHES LIQUIDITY
 *      ▼                                     ↓                              ↓                                       ↓
 * MarketStructure                  Order Block identified          MOMENTUM / VOLUME                         ┌───────────────┐
 *      │                                     ↓                              ↓                                │               │
 *      ▼                           Price retests OB/FVG                   RISK                              SWEEP           RUN
 * Liquidity                                  ↓                              ↓                                │               │
 *      │                           Structure confirms                   CONFIDENCE                           ↓               ↓
 *      ▼                                     ↓                                                         REJECTION        CONTINUATION
 * OrderBlock                        Confidence modifier                                                      │               │
 *                                                                                                             ↓               ↓
 *                                                                                                        CHOCH/BOS       BOS / DISPLACEMENT
 *                                                                                                             │               │
 *                                                                                                             ↓               ↓
 *                                                                                                        REVERSAL         CONTINUATION    
 ****************************************************************************************/

export interface LiquidityResult {

    //--------------------------------------------------
    // LIQUIDITY SWEEPS
    //--------------------------------------------------

    sweepHigh: boolean;

    sweepLow: boolean;

    //--------------------------------------------------
    // STOP HUNTS
    //--------------------------------------------------

    stopHuntDetected: boolean;

    stopHuntHigh: boolean;

    stopHuntLow: boolean;

    //--------------------------------------------------
    // RETAIL TRAPS
    //--------------------------------------------------

    retailBuyTrap: boolean;

    retailSellTrap: boolean;

    //--------------------------------------------------
    // EQUAL LIQUIDITY
    //--------------------------------------------------

    equalHigh: boolean;

    equalLow: boolean;

    //--------------------------------------------------
    // LIQUIDITY VOIDS
    //--------------------------------------------------

    liquidityVoid: boolean;

    //--------------------------------------------------
    // FAKE BREAKOUTS
    //--------------------------------------------------

    fakeBreakoutBull: boolean;

    fakeBreakoutBear: boolean;

	//--------------------------------------------------
	// MARKET BIAS
	//--------------------------------------------------
	
	marketBias: -1 | 0 | 1;
	
	//--------------------------------------------------
	// INTERNAL / EXTERNAL LIQUIDITY
	//--------------------------------------------------
	
	externalBuySideLiquidity: boolean;
	
	externalSellSideLiquidity: boolean;
	
	internalBuySideLiquidity: boolean;
	
	internalSellSideLiquidity: boolean;
	
	//--------------------------------------------------
	// BUY / SELL SIDE LIQUIDITY
	//--------------------------------------------------
	
	buySideLiquidity: boolean;
	
	sellSideLiquidity: boolean;

    //--------------------------------------------------
    // LIQUIDITY CLASSIFICATION
    //--------------------------------------------------

    liquidityState:
        | "NEUTRAL"
        | "BUY_SIDE_LIQUIDITY"
        | "SELL_SIDE_LIQUIDITY"
        | "STOP_HUNT"
        | "RETAIL_TRAP"
        | "FAKE_BREAKOUT"
        | "LIQUIDITY_VOID";

    //--------------------------------------------------
    // ACTIVE SIGNAL
    //--------------------------------------------------

    activeSignal:
        | "NONE"
        | "SWEEP_HIGH"
        | "SWEEP_LOW"
        | "BUY_TRAP"
        | "SELL_TRAP"
        | "STOP_HUNT_HIGH"
        | "STOP_HUNT_LOW"
        | "VOID";

    //--------------------------------------------------
    // STRENGTH
    //--------------------------------------------------

    strength: number;

    confidence: number;

    //--------------------------------------------------
    // ANALYTICS
    //--------------------------------------------------

    liquidityScore: number;

    reactionStrength: number;

    sweepDistance: number;

    mitigationProbability: number;

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    touchedLiquidityLevels?: number[];

    restingLiquidityAbove?: number;

    restingLiquidityBelow?: number;

    notes?: string[];

}