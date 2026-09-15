//======================================================
// src/indicators/AJIndicator/smc/SMCTypes.ts
// Pine SMC Router Input Contract
//======================================================

export interface SMCInputs {

    //--------------------------------------------------
    // BOS
    //--------------------------------------------------

    smcBosBull:boolean;
    smcBosBear:boolean;

    //--------------------------------------------------
    // CHOCH
    //--------------------------------------------------

    smcChochBull:boolean;
    smcChochBear:boolean;

    //--------------------------------------------------
    // FVG
    //--------------------------------------------------

    smcBullFvgRetest:boolean;
    smcBearFvgRetest:boolean;

    //--------------------------------------------------
    // LIQUIDITY
    //--------------------------------------------------

    smcSweepLow:boolean;
    smcSweepHigh:boolean;

    //--------------------------------------------------
    // AI CONTEXT
    //--------------------------------------------------

    aiBullDisplacement:boolean;
    aiBearDisplacement:boolean;

    aiBreakFollowLong:boolean;
    aiBreakFollowShort:boolean;

    aiSweepThenLong:boolean;
    aiSweepThenShort:boolean;

}