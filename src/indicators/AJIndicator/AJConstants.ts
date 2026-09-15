export class AJConstants {

    //--------------------------------------------------
    // INDICATORS
    //--------------------------------------------------

    static readonly EMA_PERIOD = 20;

    static readonly EMA_FAST = 9;

    static readonly EMA_SLOW = 21;

    static readonly EMA_MID = 50;

    static readonly EMA_LONG = 200;

    static readonly RSI_PERIOD = 14;

    static readonly ATR_PERIOD = 14;

    static readonly ADX_PERIOD = 14;

    //--------------------------------------------------
    // SCORE
    //--------------------------------------------------

    static readonly MIN_TRADE_SCORE = 3;

    static readonly LONG_SCORE_BOOST = 1;

    static readonly SHORT_SCORE_BOOST = 1;

    //--------------------------------------------------
    // STATE MACHINE
    //--------------------------------------------------

    static readonly SIGNAL_TIMEOUT = 10;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    static readonly TP1_RR = 1;

    static readonly TP2_RR = 2;

    static readonly TP3_RR = 3;

    static readonly ADV_TP1_RR = 1.5;

    static readonly ADV_TP2_RR = 3;

    static readonly ADV_TP3_RR = 5;

    static readonly SCALP_TP1_RR = 0.8;

    static readonly SCALP_TP2_RR = 1.5;

    static readonly SCALP_TP3_RR = 2;

    static readonly ATR_MULTIPLIER = 1.5;

    static readonly ADV_ATR_MULTIPLIER = 2.0;

    static readonly OPTION_ATR_MULTIPLIER = 1.5;

    static readonly SCALP_ATR_MULTIPLIER = 1.0;

    static readonly SL_BUFFER = 0;

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    static readonly DEFAULT_STRIKE_STEP = 50;

    static readonly DEFAULT_OPTION_TYPE = "";

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    static readonly DEFAULT_POSITION_SIZE = 1;

    //--------------------------------------------------
    // AI
    //--------------------------------------------------

    static readonly DEFAULT_AI_DIRECTION = 0;

}
