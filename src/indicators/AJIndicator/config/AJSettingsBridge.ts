//======================================================
// \src\indicators\AJIndicator\config\AJSettingsBridge.ts
// Bridge:
// TradingView UI Settings
//          |
//          v
// RuntimeParameters
//======================================================

import { AJIndicatorSettingsStore } from "../store/AJIndicatorSettingsStore";
import { RuntimeParameters } from "../../../runtime/config/RuntimeParameters";
import { AJRuntimeParameters } from "./AJRuntimeParameters";

//======================================================

export class AJSettingsBridge {

    static apply(
        chartId:string
    ){

        //--------------------------------------------------
        // CHART RUNTIME
        //--------------------------------------------------

        const runtime =
            RuntimeParameters.forChart(
                chartId
            );

        const settings =
            AJIndicatorSettingsStore.get(
                chartId
            );

        //--------------------------------------------------
        // RESET CHART RUNTIME
        //--------------------------------------------------

        runtime.reset();

        //--------------------------------------------------
        // RUNTIME PARAMETER PROFILE
        //--------------------------------------------------

        if(
            settings.developerRuntimeOverride
        ){

            AJRuntimeParameters.enableDeveloperMode();

        }
        else {

            AJRuntimeParameters.disableDeveloperMode();

        }

        //--------------------------------------------------
        // TRADE ENGINE MODE
        //
        // SCORE = INTELLIGENT CONTROLLER
        // AI / AI_SMC = MANUAL OVERRIDE
        //--------------------------------------------------

		runtime.setTradeEngineMode(
			settings.tradeEngineMode
		);
		
		(runtime as any).requestedTradeEngineMode =
			settings.tradeEngineMode === "SCORE"
				? "AUTO"
				: settings.tradeEngineMode;
		
		(runtime as any).intelligentModeEnabled =
			settings.tradeEngineMode === "SCORE";

        //--------------------------------------------------
        // BASE MODE THRESHOLDS
        //--------------------------------------------------

        switch(
            settings.tradeEngineMode
        ){

            case "SCORE":

                runtime.minimumTradeScore =
                    60;

                runtime.minimumConfidence =
                    60;

                runtime.executionConfidence =
                    60;

                runtime.minimumStructureConfidence =
                    60;

                runtime.minimumLiquidityConfidence =
                    55;

                break;

            case "AI":

                runtime.minimumTradeScore =
                    60;

                runtime.minimumConfidence =
                    60;

                runtime.executionConfidence =
                    60;

                runtime.minimumStructureConfidence =
                    55;

                runtime.minimumLiquidityConfidence =
                    50;

                break;

            case "AI_SMC":

                runtime.minimumTradeScore =
                    60;

                runtime.minimumConfidence =
                    60;

                runtime.executionConfidence =
                    60;

                runtime.minimumStructureConfidence =
                    60;

                runtime.minimumLiquidityConfidence =
                    55;

                break;

        }

        //--------------------------------------------------
        // FILTERS
        //--------------------------------------------------

        runtime.adxTrendThreshold =
            settings.enableADXStrength
                ? 30
                : 25;

        //--------------------------------------------------
        // ADVANCED CRYPTO
        //
        // Market profile only.
        // It does NOT become a fourth trade mode.
        //--------------------------------------------------

        runtime.enableAdvancedCrypto =
            settings.enableAdvancedCrypto;

        runtime.cryptoBTCMode =
            settings.cryptoBTCMode;

        runtime.cryptoVolatilityWeight =
            runtime.enableAdvancedCrypto
                ? 1.25
                : 1.00;

        runtime.cryptoInstitutionalWeight =
            runtime.enableAdvancedCrypto
                ? 1.30
                : 1.00;

        runtime.cryptoMinimumScore =
            runtime.enableAdvancedCrypto
                ? 75
                : 60;

        //--------------------------------------------------
        // RISK
        //--------------------------------------------------

        runtime.stopMultiplier =
            settings.slATR;

        runtime.atrMultiplier =
            settings.atrLength / 14;

        //--------------------------------------------------
        // STRATEGY PROFILE
        //--------------------------------------------------

        runtime.smcProfile =
            settings.smcProfile;

        runtime.aiScalperEnabled =
            settings.aiScalper ?? false;

        runtime.scoreScalperEnabled =
            settings.scoreScalper ?? false;
			
		//--------------------------------------------------
        // SMART TRADE SYNC
        //--------------------------------------------------

        (
            runtime as any
        ).syncMode =
            settings.syncMode;

        (
            runtime as any
        ).syncBars =
            settings.syncBars;

        (
            runtime as any
        ).desyncBars =
            settings.desyncBars;

        (
            runtime as any
        ).spxDetach =
            settings.spxDetach;

        (
            runtime as any
        ).spxReattach =
            settings.spxReattach;

        (
            runtime as any
        ).bnDetach =
            settings.bnDetach;

        (
            runtime as any
        ).bnReattach =
            settings.bnReattach;

		switch(settings.smcProfile){
		
			case "SAFE":
		
				runtime.maximumRiskPercent = 1;
				runtime.riskReward = 2.5;
				break;
		
			case "SWING":
		
				runtime.maximumRiskPercent = 1.5;
				runtime.riskReward = 2;
				break;
		
			case "SCALPER":
		
				runtime.maximumRiskPercent = 2;
				runtime.riskReward = 1;
				break;
		}

        //--------------------------------------------------
        // VISIBILITY
        //--------------------------------------------------

        runtime.showZones =
            settings.showZones;

        runtime.showRRPosition =
            settings.showRRPosition;

    }

}