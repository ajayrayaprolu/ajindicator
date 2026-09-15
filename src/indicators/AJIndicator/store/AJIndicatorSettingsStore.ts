//======================================================
// src\indicators\AJIndicator\store\AJIndicatorSettingsStore.ts
// TradingView Pine Input Migration - Indicator Settings Instance Isolation
// AJ(AI+SMC) SmartTrade
// AJIndicator
// │
// ├── config
// │     AJIndicatorSettingsPanel.tsx   ← UI
// │     AJRuntimeParameters.ts         ← Production + Developer
// │     AJSettingsBridge.ts            ← Applies settings
// │
// ├── store
// │     AJIndicatorSettingsStore.ts
// │
// └── runtime
// 
// This is a clean separation:
// 
// AJIndicatorSettingsPanel → UI only.
// AJIndicatorSettingsStore → persists the user's choice.
// AJSettingsBridge → applies the choice.
// AJRuntimeParameters → contains the production and developer parameter sets.
//======================================================

export type AJTradeEngineMode =

    "SCORE" |
    "AI" |
    "AI_SMC";

export type AJSMCProfile =

    | "SAFE"
    | "SWING"
    | "SCALPER";

export type AJSyncMode =

    | "NSE ↔ BN"
    | "SPX ↔ BTC"
    | "NSE + SPX (ALL)"
    | "Sync OFF";

//------------------------------------------------------
// SETTINGS MODEL
//------------------------------------------------------

export interface AJIndicatorSettings {

    //--------------------------------------------------
    // FILTERS
    //--------------------------------------------------
    useVWAP:boolean;
    useCVD:boolean;
    enableADXStrength:boolean;
    enableAMDProtection:boolean;
    enableCPRRejection:boolean;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------
    biasSMA:number;
    emaFast:number;
    emaSlow:number;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------
    slATR:number;
    atrLength:number;
    cprBuffer:number;

    //--------------------------------------------------
    // AI ENGINE
    //--------------------------------------------------
    tradeEngineMode: AJTradeEngineMode;
    scoreScalper:boolean;
    aiScalper:boolean;
    smcProfile: AJSMCProfile;

    //--------------------------------------------------
    // ADVANCED CRYPTO
    //--------------------------------------------------
    enableAdvancedCrypto:boolean;
    cryptoBTCMode:boolean;

    //--------------------------------------------------
    // SMART SYNC
    //--------------------------------------------------
    syncMode: AJSyncMode;
    spxDetach:number;
    spxReattach:number;
    bnDetach:number;
    bnReattach:number;
    syncBars:number;
    desyncBars:number;

    //--------------------------------------------------
    // VISIBILITY
    //--------------------------------------------------
    showTradeLevels:boolean;
    trailingSL:boolean;
    reEntry:boolean;
    showDashboard:boolean;
    showTradeDebug:boolean;
    showZones:boolean;
    showRRPosition:boolean;

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------
    algoOptions:boolean;
    greeksModel:boolean;
	
	//--------------------------------------------------
	// DEVELOPER
	//--------------------------------------------------
	developerRuntimeOverride:boolean;

}

//------------------------------------------------------
// DEFAULTS FROM ORIGINAL PINE SCRIPT
//------------------------------------------------------

export const DEFAULT_AJ_SETTINGS:
AJIndicatorSettings = {

    useVWAP:true,
    useCVD:true,
    enableADXStrength:true,
    enableAMDProtection:false,
    enableCPRRejection:false,
    biasSMA:50,
    emaFast:9,
    emaSlow:21,
    slATR:1.5,
    atrLength:14,
    cprBuffer:0.15,

    //=======================
	// TRADE DEFAULT SETTINGS
	//=======================
    tradeEngineMode: "SCORE",

    scoreScalper:false,
    aiScalper:false,

    smcProfile:"SCALPER",

    enableAdvancedCrypto:false,
    cryptoBTCMode:true,
	
    syncMode: "NSE + SPX (ALL)",

    spxDetach:3,
    spxReattach:2,
    bnDetach:3,
    bnReattach:2,
    syncBars:3,
    desyncBars:2,
	
    showTradeLevels:true,
    trailingSL:true,
    reEntry:true,
    showDashboard:true,
    showTradeDebug:true,
    showZones:true,
    showRRPosition:true,
    algoOptions:false,
    greeksModel:false,
	developerRuntimeOverride:false

};
//--------------------------------------------------
// PER-CHART SETTINGS STORE
//------------------------------------------------------

export class AJIndicatorSettingsStore {

    //--------------------------------------------------
    // INSTANCE SETTINGS
    //--------------------------------------------------

    private static settings =
        new Map<
            string,
            AJIndicatorSettings
        >();

    //--------------------------------------------------

    private static cloneDefaults():
        AJIndicatorSettings {
        return {
            ...DEFAULT_AJ_SETTINGS
        };
    }

    //--------------------------------------------------
    // GET
    //--------------------------------------------------

    static get(
        chartId:string
    ):AJIndicatorSettings{
        let settings =
            this.settings.get(
                chartId
            );
        if(
            !settings
        ){
            settings =
                this.cloneDefaults();
            this.settings.set(
                chartId,
                settings
            );
        }
        return settings;
    }

    //--------------------------------------------------
    // SET
    //--------------------------------------------------

	static set(
		chartId:string,
		settings:AJIndicatorSettings
	):void{
		this.settings.set(
			chartId,
			{
				...settings
			}
		);
	}

    //--------------------------------------------------
    // RESET
    //--------------------------------------------------

    static reset(
        chartId:string
    ):void{
        this.settings.set(
            chartId,
            this.cloneDefaults()
        );
    }
}