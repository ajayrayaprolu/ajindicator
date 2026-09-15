//======================================================
// src/runtime/config/RuntimeParameters.ts
// RuntimeParameters Instance Isolation and Runtime Configuration
// RuntimeParameters.ts is the per-chart runtime/config authority — it owns enableAdvancedCrypto, tradeEngineMode, intelligent-mode resolution, strategy profile, etc.
// 
//	RuntimeParameters
//        │
//        ├── active profile
//        │     ├── DEVELOPMENT
//        │     └── PRODUCTION
//        │
//        ├── trading mode
//        │     ├── SCORE
//        │     ├── AI
//        │     └── AI_SMC
//        │
//        ├── market profile
//        │     ├── NORMAL
//        │     └── ADVANCED_CRYPTO
//        │
//        └── strategy profile
//              ├── SAFE
//              ├── SWING
//              └── SCALPER
//			  
//			          ┌────────────────────────┐
//                    │ RuntimeParameters      │
//                    │ SINGLE SOURCE OF TRUTH │
//                    └───────────┬────────────┘
//                                │
//            ┌───────────────────┼───────────────────┐
//            │                   │                   │
//       Environment          Trading Mode        Strategy
//       DEV / PROD          SCORE / AI / AI_SMC   SAFE/SWING/SCALPER
//            │                   │                   │
//            └───────────────────┼───────────────────┘
//                                │
//                         Market Profile
//                     NORMAL / ADVANCED_CRYPTO
//                                │
//                                ▼
//                    ┌────────────────────────┐
//                    │ Existing AJ Engines    │
//                    │                        │
//                    │ Confidence             │
//                    │ Structure              │
//                    │ Liquidity              │
//                    │ Institutional          │
//                    │ Momentum               │
//                    │ Risk                   │
//                    │ Execution              │
//                    └───────────┬────────────┘
//                                │
//                                ▼
//                       Calculated Result
//                                │
//                                ▼
//                    ┌────────────────────────┐
//                    │ ONE TRADE GATE         │
//                    │                        │
//                    │ RuntimeGate.evaluate() │
//                    └───────────┬────────────┘
//                                │
//                         ┌──────┴──────┐
//                         │             │
//                       TRADE        NO_TRADE
//======================================================

//======================================================
// src/runtime/config/RuntimeParameters.ts
// RuntimeParameters Instance Isolation and Runtime Configuration
//======================================================

export type RuntimeTradeEngineMode =
    "SCORE" |
    "AI" |
    "AI_SMC";

export type IntelligentCalculationMode =
    "SCORE" |
    "AI" |
    "AI_SMC";

export interface IntelligentModeDecision {

    requestedMode:
        RuntimeTradeEngineMode;

    effectiveMode:
        IntelligentCalculationMode;

    intelligent:
        boolean;

    regime:
        string;

    reason:
        string;

}

//======================================================

export class RuntimeParameters {

    //--------------------------------------------------
    // CHART RUNTIME REGISTRY
    //--------------------------------------------------

    private static registry =
        new Map<string, RuntimeParameters>();

    //--------------------------------------------------

    static forChart(
        chartId:string
    ):RuntimeParameters{

        let runtime =
            this.registry.get(chartId);

        if(!runtime){

            runtime =
                new RuntimeParameters();

            this.registry.set(
                chartId,
                runtime
            );

        }

        return runtime;

    }

    //--------------------------------------------------
    // ACTIVE CHART CONTEXT
    //--------------------------------------------------

    static setActiveChart(
        _chartId:string
    ){

        //--------------------------------------------------
        // Reserved for runtime isolation.
        //--------------------------------------------------

    }

    //--------------------------------------------------
    // AI
    //--------------------------------------------------

    minimumConfidence = 60;
    executionConfidence = 60;
    institutionalConfidence = 65;
    minimumTradeScore = 65;

    //--------------------------------------------------
    // ADVANCED CRYPTO
    //--------------------------------------------------

    enableAdvancedCrypto = false;

    cryptoBTCMode = false;

    cryptoVolatilityWeight = 1.0;

    cryptoInstitutionalWeight = 1.0;

    cryptoMinimumScore = 60;

    //--------------------------------------------------
    // VISIBILITY
    //--------------------------------------------------

    showZones = true;

    showRRPosition = true;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    adxTrendThreshold = 25;
    rsiBullThreshold = 60;
    rsiBearThreshold = 40;

    //--------------------------------------------------
    // STRUCTURE
    //--------------------------------------------------

    minimumStructureConfidence = 60;
    minimumLiquidityConfidence = 55;
    minimumTrendConfidence = 60;

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    executionThreshold = 60;
    minimumExecutionScore = 65;
    maximumSpread = 0.50;
    minimumVolumeMultiplier = 1.00;

    //--------------------------------------------------
    // ATR
    //--------------------------------------------------

    atrMultiplier = 1.00;
    stopMultiplier = 1.00;
    trailingMultiplier = 1.00;
    volatilityMultiplier = 1.00;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionMultiplier = 1.00;
    maximumRiskPercent = 2.00;
    maximumExposure = 10.00;
    capitalAllocation = 1.00;

    //--------------------------------------------------
    // RISK / REWARD
    //--------------------------------------------------

    riskReward = 1.00;
    tp1Multiplier = 1.00;
    tp2Multiplier = 2.00;
    tp3Multiplier = 3.00;

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    minimumOptionPremium = 10;
    maximumOptionPremium = 500;
    minimumOpenInterest = 1000;
    minimumIV = 10;

    //--------------------------------------------------
    // PORTFOLIO
    //--------------------------------------------------

    maximumOpenPositions = 5;
    maximumDailyLoss = 5.00;
    maximumDrawdown = 10.00;
    correlationLimit = 0.80;

    //--------------------------------------------------
    // ADAPTIVE LEARNING
    //--------------------------------------------------

    learningRate = 0.10;
    optimizationWindow = 100;
    optimizationFrequency = 25;
    minimumSampleSize = 30;

    //--------------------------------------------------
    // SMC PROFILE
    //--------------------------------------------------

    smcProfile:
        "SAFE" |
        "SWING" |
        "SCALPER" =
        "SCALPER";

    aiScalperEnabled = false;

    scoreScalperEnabled = false;

    //--------------------------------------------------
    // TRADE ENGINE MODE
    //
    // SCORE is the default intelligent controller.
    // AI / AI_SMC are explicit manual overrides.
    //--------------------------------------------------

    tradeEngineMode:
        RuntimeTradeEngineMode =
        "SCORE";

    requestedTradeEngineMode:
        RuntimeTradeEngineMode =
        "SCORE";

    effectiveCalculationMode:
        IntelligentCalculationMode =
        "SCORE";

    intelligentModeEnabled =
        true;

    intelligentModeReason =
        "Default SCORE intelligent controller";

    intelligentMarketRegime =
        "NORMAL";

    //--------------------------------------------------
    // AI FLAGS
    //--------------------------------------------------

    enableAITradeSafety = false;
    enableAISMCMode = false;

    //--------------------------------------------------
    // UPDATE TRADE ENGINE MODE
    //--------------------------------------------------

    setTradeEngineMode(

        mode:
            RuntimeTradeEngineMode

    ):void {

        this.requestedTradeEngineMode =
            mode;

        //--------------------------------------------------
        // Manual AI / AI+SMC
        //--------------------------------------------------

        if(
            mode === "AI"
        ){

            this.tradeEngineMode =
                "AI";

            this.effectiveCalculationMode =
                "AI";

            this.intelligentModeEnabled =
                false;

            this.intelligentModeReason =
                "Manual AI override";

            this.enableAITradeSafety =
                true;

            this.enableAISMCMode =
                false;

            return;
        }

        if(
            mode === "AI_SMC"
        ){

            this.tradeEngineMode =
                "AI_SMC";

            this.effectiveCalculationMode =
                "AI_SMC";

            this.intelligentModeEnabled =
                false;

            this.intelligentModeReason =
                "Manual AI+SMC override";

            this.enableAITradeSafety =
                true;

            this.enableAISMCMode =
                true;

            return;
        }

        //--------------------------------------------------
        // SCORE = INTELLIGENT CONTROLLER
        //--------------------------------------------------

        this.tradeEngineMode =
            "SCORE";

        this.effectiveCalculationMode =
            "SCORE";

        this.intelligentModeEnabled =
            true;

        this.intelligentModeReason =
            "Intelligent controller active";

        this.enableAITradeSafety =
            false;

        this.enableAISMCMode =
            false;

    }

    //--------------------------------------------------
    // INTELLIGENT MODE ROUTER
    //--------------------------------------------------

    resolveIntelligentMode(

        input: {

            tradeScore?: number;

            trendScore?: number;

            momentumScore?: number;

            structureScore?: number;

            liquidityScore?: number;

            institutionalScore?: number;

            volatilityScore?: number;

            volatilityState?: string;

            bosBull?: boolean;

            bosBear?: boolean;

            chochBull?: boolean;

            chochBear?: boolean;

            liquiditySweep?: boolean;

            fvgRetest?: boolean;

            retailTrap?: string;

            marketRegime?: string;

            marketState?: string;

        }

    ):IntelligentModeDecision {

        //--------------------------------------------------
        // MANUAL OVERRIDE
        //--------------------------------------------------

        if(
            this.requestedTradeEngineMode !==
            "SCORE"
        ){

            const manualMode =
                this.requestedTradeEngineMode;

            this.tradeEngineMode =
                manualMode;

            this.effectiveCalculationMode =
                manualMode;

            this.intelligentModeEnabled =
                false;

            this.intelligentModeReason =
                manualMode === "AI"
                    ? "Manual AI override"
                    : "Manual AI+SMC override";

            this.intelligentMarketRegime =
                input.marketRegime ??
                input.marketState ??
                "UNKNOWN";

            this.enableAITradeSafety =
                (manualMode as string) !== "SCORE"

            this.enableAISMCMode =
                manualMode === "AI_SMC";

            return {

                requestedMode:
                    manualMode,

                effectiveMode:
                    manualMode,

                intelligent:
                    false,

                regime:
                    this.intelligentMarketRegime,

                reason:
                    this.intelligentModeReason

            };

        }

        //--------------------------------------------------
        // INTELLIGENT CONTROLLER
        //--------------------------------------------------

        const tradeScore =
            input.tradeScore ?? 0;

        const structureScore =
            input.structureScore ?? 0;

        const liquidityScore =
            input.liquidityScore ?? 0;

        const institutionalScore =
            input.institutionalScore ?? 0;

        const volatilityScore =
            input.volatilityScore ?? 0;

        const volatilityState =
            (
                input.volatilityState ??
                "NORMAL"
            ).toUpperCase();

        const bos =
            !!input.bosBull ||
            !!input.bosBear;

        const choch =
            !!input.chochBull ||
            !!input.chochBear;

        const sweep =
            !!input.liquiditySweep;

        const fvgRetest =
            !!input.fvgRetest;

        const trap =
            input.retailTrap != null &&
            input.retailTrap !== "NONE";

        const highVolatility =
            volatilityState === "HIGH" ||
            volatilityState === "EXTREME" ||
            volatilityState === "EXPANDING" ||
            volatilityScore >= 70;

        //--------------------------------------------------
        // SMC EVIDENCE
        //--------------------------------------------------

        const strongSMC =
            choch ||
            (
                sweep &&
                (
                    bos ||
                    fvgRetest ||
                    structureScore >= 60
                )
            ) ||
            (
                fvgRetest &&
                structureScore >= 60
            ) ||
            (
                bos &&
                structureScore >= 70 &&
                institutionalScore >= 70
            );

        //--------------------------------------------------
        // SCORE / AI CONDITIONS
        //--------------------------------------------------

        const strongScoreContext =
            !highVolatility &&
            !trap &&
            tradeScore >= 60 &&
            structureScore >= 60 &&
            liquidityScore >= 50 &&
            institutionalScore >= 60;

        const AIContext =
            highVolatility ||
            trap ||
            tradeScore < 50 ||
            (
                structureScore >= 55 &&
                liquidityScore >= 50
            );

        //--------------------------------------------------
        // EFFECTIVE MODE
        //--------------------------------------------------

        let effectiveMode:
            IntelligentCalculationMode =
            "SCORE";

        let reason =
            "Normal market conditions; SCORE calculation";

        if(
            strongSMC
        ){

            effectiveMode =
                "AI_SMC";

            if(choch){

                reason =
                    "CHOCH / structural regime change detected";

            }
            else if(
                sweep &&
                fvgRetest
            ){

                reason =
                    "Liquidity sweep + FVG retest detected";

            }
            else if(
                sweep
            ){

                reason =
                    "Liquidity sweep with structural confirmation";

            }
            else if(
                bos &&
                structureScore >= 70
            ){

                reason =
                    "Strong BOS and institutional structure";

            }
            else {

                reason =
                    "Institutional SMC evidence detected";

            }

        }
        else if(
            AIContext &&
            !strongScoreContext
        ){

            effectiveMode =
                "AI";

            if(highVolatility){

                reason =
                    "Elevated volatility requires AI protection";

            }
            else if(trap){

                reason =
                    "Retail trap conditions require AI protection";

            }
            else if(
                tradeScore < 50
            ){

                reason =
                    "Weak SCORE context requires AI evaluation";

            }
            else {

                reason =
                    "Mixed market conditions require AI evaluation";

            }

        }

        //--------------------------------------------------
        // APPLY
        //--------------------------------------------------

        this.tradeEngineMode =
            effectiveMode;

        this.effectiveCalculationMode =
            effectiveMode;

        this.intelligentModeEnabled =
            true;

        this.intelligentModeReason =
            reason;

        this.intelligentMarketRegime =
            input.marketRegime ??
            input.marketState ??
            (
                highVolatility
                    ? "VOLATILE"
                    : "NORMAL"
            );

        this.enableAITradeSafety =
            effectiveMode !== "SCORE";

        this.enableAISMCMode =
            effectiveMode === "AI_SMC";

        return {

            requestedMode:
                "SCORE",

            effectiveMode,

            intelligent:
                true,

            regime:
                this.intelligentMarketRegime,

            reason

        };

    }

    //--------------------------------------------------
    // RESET
    //--------------------------------------------------

    reset(): void {

        this.minimumConfidence = 60;
        this.executionConfidence = 60;
        this.institutionalConfidence = 65;
        this.minimumTradeScore = 65;

        this.enableAdvancedCrypto = false;
        this.cryptoBTCMode = false;
        this.cryptoVolatilityWeight = 1.00;
        this.cryptoInstitutionalWeight = 1.00;
        this.cryptoMinimumScore = 60;

        this.showZones = true;
        this.showRRPosition = true;

        this.adxTrendThreshold = 25;
        this.rsiBullThreshold = 60;
        this.rsiBearThreshold = 40;

        this.minimumStructureConfidence = 60;
        this.minimumLiquidityConfidence = 55;
        this.minimumTrendConfidence = 60;

        this.executionThreshold = 60;
        this.minimumExecutionScore = 65;
        this.maximumSpread = 0.50;
        this.minimumVolumeMultiplier = 1.00;

        this.atrMultiplier = 1.00;
        this.stopMultiplier = 1.00;
        this.trailingMultiplier = 1.00;
        this.volatilityMultiplier = 1.00;

        this.positionMultiplier = 1.00;
        this.maximumRiskPercent = 2.00;
        this.maximumExposure = 10.00;
        this.capitalAllocation = 1.00;

        this.riskReward = 1.00;
        this.tp1Multiplier = 1.00;
        this.tp2Multiplier = 2.00;
        this.tp3Multiplier = 3.00;

        this.minimumOptionPremium = 10;
        this.maximumOptionPremium = 500;
        this.minimumOpenInterest = 1000;
        this.minimumIV = 10;

        this.maximumOpenPositions = 5;
        this.maximumDailyLoss = 5.00;
        this.maximumDrawdown = 10.00;
        this.correlationLimit = 0.80;

        this.learningRate = 0.10;
        this.optimizationWindow = 100;
        this.optimizationFrequency = 25;
        this.minimumSampleSize = 30;

        this.smcProfile = "SCALPER";

        this.aiScalperEnabled = false;
        this.scoreScalperEnabled = false;

        this.tradeEngineMode =
            "SCORE";

        this.requestedTradeEngineMode =
            "SCORE";

        this.effectiveCalculationMode =
            "SCORE";

        this.intelligentModeEnabled =
            true;

        this.intelligentModeReason =
            "Default SCORE intelligent controller";

        this.intelligentMarketRegime =
            "NORMAL";

        this.enableAITradeSafety =
            false;

        this.enableAISMCMode =
            false;

    }

}

