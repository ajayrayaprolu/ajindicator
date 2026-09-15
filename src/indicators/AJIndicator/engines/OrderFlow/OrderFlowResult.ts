/****************************************************************************************
 * File:
 * OrderFlowResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderFlow/OrderFlowResult.ts
 *
 * Purpose:
 * Canonical output contract produced by the AJ v2 OrderFlowEngine.
 *
 * Responsibility:
 * Represents the evaluated order flow state regardless of whether it
 * originated from real exchange volume (CVD) or the synthetic
 * institutional order flow model.
 *
 * This engine never performs scoring or execution decisions.
 *
 * AJ v2 Architecture
 *
 * MarketStateEngine
 *          │
 *          ▼
 * OrderFlowEngine
 *          │
 *          ▼
 * MarketStructureEngine
 *
 ****************************************************************************************/

//======================================================
// ORDER FLOW RESULT
//======================================================

export interface OrderFlowResult {

    //--------------------------------------------------
    // ENGINE MODE
    //--------------------------------------------------

    mode:
        | "REAL"
        | "SYNTHETIC";

    usingRealVolume: boolean;

    usingSyntheticFlow: boolean;

    volumeReliable: boolean;

    //--------------------------------------------------
    // ORDER FLOW DIRECTION
    //--------------------------------------------------

    bullish: boolean;

    bearish: boolean;

    neutral: boolean;

	//--------------------------------------------------
	// FLOW METRICS
	//--------------------------------------------------
	
	delta: number;
	
	//--------------------------------------------------
	// CUMULATIVE DELTA
	//--------------------------------------------------
	
	cumulativeDelta: number;
	
	imbalance: number;
	
	strength: number;
	
	confidence: number;
	
	syntheticScore: number;
	
	//--------------------------------------------------
	// MARKET PARTICIPATION
	//--------------------------------------------------
	
	marketParticipation: number;

    //--------------------------------------------------
    // PRESSURE
    //--------------------------------------------------

    buyingPressure: number;

    sellingPressure: number;

    //--------------------------------------------------
    // INSTITUTIONAL BEHAVIOR
    //--------------------------------------------------

    absorption: boolean;

    exhaustion: boolean;

    //--------------------------------------------------
    // OPTIONAL SMART MONEY SIGNALS
    //--------------------------------------------------

    retailTrapBull?: boolean;

    retailTrapBear?: boolean;

    liquidityGrab?: boolean;

    stopHunt?: boolean;

    fakeBreakout?: boolean;

    icebergDetected?: boolean;

    absorptionDetected?: boolean;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    explanation: string;

    evidence?: string[];

    warnings?: string[];

    metadata?: Record<string, unknown>;

}