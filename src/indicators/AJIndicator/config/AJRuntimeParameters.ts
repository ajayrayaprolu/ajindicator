/*****************************************************************************************
 * File:
 * AJRuntimeParameters.ts
 *
 * Path:
 * src/indicators/AJIndicator/config/AJRuntimeParameters.ts
 *
 * Purpose:
 * Canonical Runtime Configuration for the AJ Trading System.
 * AJRuntimeParameters.ts is the global threshold/profile authority — confidence, authority, risk, execution, structure, liquidity, production/development profiles.
 * 
 * Responsibilities
 * ---------------------------------------------------------------------------------------
 * â€¢ Centralized runtime thresholds
 * â€¢ Runtime tuning without modifying engine code
 * â€¢ Test / Optimization / Production support
 * â€¢ Single source of truth for all engine thresholds
 *
 * This class DOES NOT
 * ---------------------------------------------------------------------------------------
 * â€¢ Execute trades
 * â€¢ Make trading decisions
 * â€¢ Calculate indicators
 * â€¢ Store strategy state
 *
 * Every AJ Engine should read its configurable thresholds
 * from this class instead of hardcoding values.
 *
 *	AJRuntimeParameters.ts
 *        │
 *        ├── confidenceThreshold
 *        ├── authorityConfidenceThreshold
 *        ├── riskThreshold
 *        ├── structureQuality
 *        ├── liquidityQuality
 *        ├── institutionalAlignment
 *        ├── approvalRatio
 *        ├── executionConfidence
 *        └── tradeScore
 *
 * 	RuntimeParameters.ts
 *        │
 *        ├── minimumConfidence
 *        ├── executionConfidence
 *        ├── institutionalConfidence
 *        ├── minimumTradeScore
 *        ├── minimumStructureConfidence
 *        ├── minimumLiquidityConfidence
 *        ├── minimumTrendConfidence
 *        ├── executionThreshold
 *        └── minimumExecutionScore
 *
 ******************************************************************************************/

export class AJRuntimeParameters {

    //--------------------------------------------------
    // UI OVERRIDE
    //--------------------------------------------------

    static developerRuntimeOverride = false;

    //--------------------------------------------------
    // PRODUCTION PROFILE
    //--------------------------------------------------

    private static readonly PRODUCTION = {

        confidenceThreshold:60,
        authorityConfidenceThreshold:60,
        riskThreshold:80,

        trendStrength:60,
        momentumStrength:60,
        structureQuality:60,
        liquidityQuality:60,

        institutionalAlignment:70,
        approvalRatio:60,

        executionConfidence:60,
        tradeScore:60,

        adxThreshold:25,
        rsiBull:60,
        rsiBear:40

    };

    //--------------------------------------------------
    // DEVELOPER PROFILE
    //--------------------------------------------------

    private static readonly DEVELOPER = {

        confidenceThreshold:20,
        authorityConfidenceThreshold:20,
        riskThreshold:20,

        trendStrength:20,
        momentumStrength:20,
        structureQuality:20,
        liquidityQuality:20,

        institutionalAlignment:20,
        approvalRatio:20,

        executionConfidence:20,
        tradeScore:20,

        adxThreshold:20,
        rsiBull:50,
        rsiBear:50

    };
	
	//--------------------------------------------------
    // PROFILE IDENTIFICATION
    //--------------------------------------------------

    static get environment():
        "DEVELOPMENT" |
        "PRODUCTION" {

        return AJRuntimeParameters.developerRuntimeOverride
            ? "DEVELOPMENT"
            : "PRODUCTION";

    }

    //--------------------------------------------------
    // CURRENT RUNTIME VALUES
    //--------------------------------------------------

    static confidenceThreshold = 60;

    static authorityConfidenceThreshold = 60;

    static riskThreshold = 80;

    static trendStrength = 60;

    static momentumStrength = 60;

    static structureQuality = 60;

    static liquidityQuality = 60;

    static institutionalAlignment = 70;

    static approvalRatio = 60;

    static executionConfidence = 60;

    static tradeScore = 60;
    static adxThreshold = 25;
    static rsiBull = 60;
    static rsiBear = 40;

    //--------------------------------------------------
    // INTERNAL PROFILE APPLY
    //--------------------------------------------------

    private static apply(profile: typeof AJRuntimeParameters.PRODUCTION): void {

        AJRuntimeParameters.confidenceThreshold =
            profile.confidenceThreshold;

        AJRuntimeParameters.authorityConfidenceThreshold =
            profile.authorityConfidenceThreshold;

        AJRuntimeParameters.riskThreshold =
            profile.riskThreshold;

        AJRuntimeParameters.trendStrength =
            profile.trendStrength;

        AJRuntimeParameters.momentumStrength =
            profile.momentumStrength;

        AJRuntimeParameters.structureQuality =
            profile.structureQuality;

        AJRuntimeParameters.liquidityQuality =
            profile.liquidityQuality;

        AJRuntimeParameters.institutionalAlignment =
            profile.institutionalAlignment;

        AJRuntimeParameters.approvalRatio =
            profile.approvalRatio;

        AJRuntimeParameters.executionConfidence =
            profile.executionConfidence;

        AJRuntimeParameters.tradeScore =
            profile.tradeScore;

        AJRuntimeParameters.adxThreshold =
            profile.adxThreshold;

        AJRuntimeParameters.rsiBull =
            profile.rsiBull;

        AJRuntimeParameters.rsiBear =
            profile.rsiBear;
    }

    //--------------------------------------------------
    // PRODUCTION
    //--------------------------------------------------

    static applyProductionProfile(): void {

        AJRuntimeParameters.developerRuntimeOverride = false;

        AJRuntimeParameters.apply(

            AJRuntimeParameters.PRODUCTION

        );

    }

    //--------------------------------------------------
    // DEVELOPER
    //--------------------------------------------------

    static applyDeveloperProfile(): void {

        AJRuntimeParameters.developerRuntimeOverride = true;

        AJRuntimeParameters.apply(

            AJRuntimeParameters.DEVELOPER

        );

    }

    //--------------------------------------------------
    // ENABLE DEV MODE
    //--------------------------------------------------

    static enableDeveloperMode(): void {

        AJRuntimeParameters.applyDeveloperProfile();

    }

    //--------------------------------------------------
    // DISABLE DEV MODE
    //--------------------------------------------------

    static disableDeveloperMode(): void {

        AJRuntimeParameters.applyProductionProfile();

    }

    //--------------------------------------------------
    // RESET
    //--------------------------------------------------

    static resetToProduction(): void {

        AJRuntimeParameters.applyProductionProfile();

    }

    //--------------------------------------------------
    // CUSTOM PROFILE
    //--------------------------------------------------

    static applyProfile(values: Partial<typeof AJRuntimeParameters.PRODUCTION>): void {

        Object.assign(

            AJRuntimeParameters,

            values

        );

    }

    //--------------------------------------------------
    // CURRENT CONFIGURATION
    //--------------------------------------------------

    static getCurrentConfiguration() {

        return {
            developerRuntimeOverride:
                AJRuntimeParameters.developerRuntimeOverride,

            confidenceThreshold:
                AJRuntimeParameters.confidenceThreshold,

            authorityConfidenceThreshold:
                AJRuntimeParameters.authorityConfidenceThreshold,

            riskThreshold:
                AJRuntimeParameters.riskThreshold,

            trendStrength:
                AJRuntimeParameters.trendStrength,

            momentumStrength:
                AJRuntimeParameters.momentumStrength,

            structureQuality:
                AJRuntimeParameters.structureQuality,

            liquidityQuality:
                AJRuntimeParameters.liquidityQuality,

            institutionalAlignment:
                AJRuntimeParameters.institutionalAlignment,

            approvalRatio:
                AJRuntimeParameters.approvalRatio,

            executionConfidence:
                AJRuntimeParameters.executionConfidence,

            tradeScore:
                AJRuntimeParameters.tradeScore,

            adxThreshold:
                AJRuntimeParameters.adxThreshold,

            rsiBull:
                AJRuntimeParameters.rsiBull,

            rsiBear:
                AJRuntimeParameters.rsiBear,
			
			environment:
                AJRuntimeParameters.environment,
			
        };

    }

}

//--------------------------------------------------
// Initialize Production Defaults
//--------------------------------------------------

AJRuntimeParameters.applyProductionProfile();

