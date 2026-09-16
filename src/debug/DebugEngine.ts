//======================================================
// src/debug/debugEngine.ts
// Global Debug Engine // AJ Institutional Debug Provider : Chart Terminal Debug UI is built from this file
//======================================================
// AJ v2 Debug Architecture
// Engines
//     ↓
// AJDecisionEngine
//     ↓
// Canonical Results
//     ↓
// AJDebugBuilder
//     ↓
// Debug UI
// 
// Redefine the architecture of the debug layer itself.
//                 AJDecisionEngine
//                        │
//                        │
//           Collect Canonical Results
//                        │
//        ┌───────────────┼────────────────┐
//        │               │                │
//        ▼               ▼                ▼
//  Context          Confidence        AI Engine
//        │               │                │
//        └───────────────┬────────────────┘
//                        │
//                        ▼
//                  SMC Engine
//                        │
//                        ▼
//               Authority Engine
//                        │
//                        ▼
//                State Machine
//                        │
//                        ▼
//                 Runtime Sync
//                        │
//                        ▼
//               AJPipelineTrace
//                        │
//                        ▼
//            Pipeline Diagnostics
//                        │
//                        ▼
//                 AJDebugBuilder
//                        │
//                        ▼
//                AJDebugResult
//                        │
//        ┌───────────────┼─────────────────┐
//        ▼               ▼                 ▼
//  Debug Overlay     Console Log      Pipeline Viewer
//==============================================================================
 
import type {AJDebugResult} from "../indicators/AJIndicator/debug/AJDebugBuilder";

//======================================================
// DEBUG MODEL
//======================================================

export interface DebugData
    extends Partial<AJDebugResult> {

    //--------------------------------------------------
    // LEGACY PINE MIGRATION SUPPORT
    //--------------------------------------------------
    
    state?:string;
    
	//--------------------------------------------------
    // SYMBOL + LIFECYCLE
    //--------------------------------------------------
    engineState?:string;
    symbol?:string;
    
    tradeDirection?:number;
    directionText?:string;
    
    bias?:number;

    //--------------------------------------------------
    // PIPELINE FLAGS
    //--------------------------------------------------
    scoreReady:boolean;
    contextReady:boolean;
    breakoutReady:boolean;
    executionReady:boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    tradeConfidence?:number;
	longScore?:number;
	shortScore?:number;
    confidence?:number;

    //--------------------------------------------------
    // SCORES
    //--------------------------------------------------
    aiScore?:number;
    aiConfidence?:number;
    institutionalScore?:number;
    institutionalConfidence?:number;

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------
    regime?:string;
    blockReason?:string;
     
    //--------------------------------------------------
    // OPTION
    //--------------------------------------------------
    
    optionSymbol?:string;
    
    atmStrike?:string;
    
    itmStrike?:string;
    
    otmStrike?:string;

    //--------------------------------------------------
    // MODE ROUTER
    //--------------------------------------------------
    tradeEngineMode?:string;
    routerMode?:string;
    aiStatus?:string;
    smcStatus?:string;
    authorityStatus?:string;

    //--------------------------------------------------
    // PINE STYLE RAW TEXT
    //--------------------------------------------------
    lines?:string[];

}

//======================================================
// ENGINE
//======================================================

export class DebugEngine {

    //--------------------------------------------------
    // ENABLE FLAG
    //--------------------------------------------------

    private static enabled =
        false;

    //--------------------------------------------------
    // RUNTIME DEBUG FEED ACTIVE
    //--------------------------------------------------

    private static hasRuntimeFeed =
        false;

    //--------------------------------------------------
    // CHART CACHE
    //--------------------------------------------------
    
    private static data =
        new Map<
            string,
            DebugData
        >();
    
    private static activeChartId =
        "";

    //--------------------------------------------------
    // ENABLE
    //--------------------------------------------------

    static setEnabled(
        value:boolean
    ){
        this.enabled =
            value;
    }

    static isEnabled(){
        return this.enabled;
    }

    //--------------------------------------------------
    // CHECK DATA EXISTS
    //--------------------------------------------------

    static hasData(){
        return this.hasRuntimeFeed;
    }

    //--------------------------------------------------
    // UPDATE FROM INDICATOR
    //--------------------------------------------------

    static update(

        chartId:string,

        runtime:any

    ){

        if(
            !runtime
        ){
            this.clear();
            return;
        }

        //--------------------------------------------------
        // KEEP ACTIVE CHART IN SYNC
        //--------------------------------------------------

        if(
            !this.activeChartId
        ){
            this.activeChartId =
                chartId;
        }

		const existing: Partial<DebugData> =
			this.data.get(chartId)
			??
			{};

        //--------------------------------------------------
        // AJDEBUGBUILDER OUTPUT (CANONICAL)
        //--------------------------------------------------

        if(
            runtime.debug
        ){

            const debug: AJDebugResult =
				runtime.debug;

            const lifecycle =
                runtime.lifecycleState
                ??
                runtime.engineState
                ??
                debug.state
                ??
                debug.stateText
                ??
                runtime.state
                ??
                "SCAN";

            const direction =
                runtime.tradeDirectionFinal
                ??
                runtime.direction
                ??
                debug.direction
                ??
                0;

            const bias =
                runtime.bias
                ??
                debug.bias
                ??
                direction;

            this.data.set(
                chartId,
                {

                    ...existing,

                    ...debug,

                    //--------------------------------------------------
                    // LIFECYCLE
                    //--------------------------------------------------

                    state:
                        lifecycle,

                    engineState:
                        lifecycle,

                    //--------------------------------------------------
                    // SYMBOL
                    //--------------------------------------------------

                    symbol:
                        runtime.symbol
                        ??
                        debug.symbol
                        ??
                        existing.symbol
                        ??
                        chartId,

                    //--------------------------------------------------
                    // DIRECTION
                    //--------------------------------------------------

                    tradeDirection:
                        direction,

                    directionText:
                        direction > 0
                            ? "LONG"
                            : direction < 0
                                ? "SHORT"
                                : "NONE",

                    bias:
                        bias,

                    //--------------------------------------------------
                    // SCORES
                    //--------------------------------------------------

					tradeConfidence:
						runtime.tradeScore
						??
						debug.confidence
						??
						existing.tradeConfidence
						??
						0,

					confidence:
						runtime.executionConfidence
						??
						runtime.confidence
						??
						debug.confidence
						??
						existing.confidence
						??
						0,

                    scoreReady:
                        (
                            runtime.tradeScore
                            ??
                            debug.confidence
                            ??
                            0
                        ) > 0,

					longScore:
						runtime.longScore
						??
						existing.longScore
						??
						0,
					
					shortScore:
						runtime.shortScore
						??
						existing.shortScore
						??
						0,

                    //--------------------------------------------------
                    // PIPELINE FLAGS
                    //--------------------------------------------------

                    contextReady:
                        debug.contextReady,

                    breakoutReady:
                        debug.breakoutReady,

                    executionReady:
                        runtime.executionAllowed
                        ??
                        debug.executionReady,

                    //--------------------------------------------------
                    // KEEP EXISTING VALUES
                    //--------------------------------------------------

                    optionSymbol:
                        debug.optionSymbol
                        ??
                        existing.optionSymbol,

                    atmStrike:
                        debug.atmStrike
                        ??
                        existing.atmStrike,

                    itmStrike:
                        debug.itmStrike
                        ??
                        existing.itmStrike,

                    otmStrike:
                        debug.otmStrike
                        ??
                        existing.otmStrike,

                    tradeEngineMode:
                        debug.tradeEngineMode ??
                        runtime.tradeEngineMode ??
                        "SCORE",

                    routerMode:
                        debug.routerMode ??
                        runtime.routerMode ??
                        "SCORE",

                    aiStatus:
                        debug.aiStatus,

                    smcStatus:
                        debug.smcStatus,

                    authorityStatus:
                        debug.authorityStatus,

                    blockReason:
                        debug.blockReason,

                    regime:
                        debug.regime,

                    aiConfidence:
                        debug.aiConfidence,

                    institutionalConfidence:
						debug.institutionalConfidence
						??
						existing.institutionalConfidence
						??
						0,

                    lines:
                        debug.lines

                }

            );

            this.hasRuntimeFeed = true;

            return;

        }

        //--------------------------------------------------
        // AJ HOST FORMAT
        //--------------------------------------------------

        const direction =

            runtime.tradeDirectionFinal
            ??
            (
                runtime.direction === "LONG"
                    ? 1
                    : runtime.direction === "SHORT"
                        ? -1
                        : runtime.direction
                        ??
                        0
            );

        const lifecycle =

            runtime.lifecycleState
            ??
            runtime.engineState
            ??
            runtime.state
            ??
            "SCAN";

        this.data.set(

            chartId,

            {

                ...existing,

                state:
                    lifecycle,

                engineState:
                    lifecycle,

                symbol:
                    runtime.symbol
                    ??
                    existing.symbol
                    ??
                    chartId,

                tradeDirection:
                    direction,

                directionText:
                    direction > 0
                        ? "LONG"
                        : direction < 0
                            ? "SHORT"
                            : "NONE",

                bias:
                    runtime.bias
                    ??
                    direction,

                scoreReady:
                    (
                        runtime.tradeScore
                        ??
                        0
                    ) > 0,

                contextReady:
                    runtime.contextReady
                    ??
                    true,

                breakoutReady:
                    runtime.breakoutReady
                    ??
                    false,

                executionReady:
                    runtime.executionAllowed
                    ??
                    false,

                tradeConfidence:
                    runtime.tradeScore
                    ??
                    0,

                confidence:
                    runtime.confidence
                    ??
                    runtime.tradeScore
                    ??
                    0,

                aiScore:
                    runtime.aiConfidence
                    ??
                    0,

                aiConfidence:
                    runtime.aiConfidence
                    ??
                    0,

                institutionalScore:
                    runtime.institutionalConfidence
                    ??
                    0,

                institutionalConfidence:
                    runtime.institutionalConfidence
                    ??
                    0,

                regime:
                    runtime.regime
                    ??
                    "-",

                optionSymbol:
                    runtime.optionSymbol
                    ??
                    existing.optionSymbol
                    ??
                    "-",

                atmStrike:
                    runtime.atmStrike
                    ??
                    existing.atmStrike
                    ??
                    "-",

                itmStrike:
                    runtime.itmStrike
                    ??
                    existing.itmStrike
                    ??
                    "-",

                otmStrike:
                    runtime.otmStrike
                    ??
                    existing.otmStrike
                    ??
                    "-",

                tradeEngineMode:
                    runtime.tradeMode
                    ??
                    runtime.tradeEngineMode
                    ??
                    "-",

                routerMode:
                    runtime.routerMode
                    ??
                    "-",

                aiStatus:
                    runtime.aiStatus
                    ??
                    "-",

                smcStatus:
                    runtime.smcStatus
                    ??
                    "-",

                authorityStatus:
                    runtime.authorityStatus
                    ??
                    "-",

                blockReason:
                    runtime.blockReason
                    ??
                    "-"

            }

        );

        this.hasRuntimeFeed = true;

    }

    //--------------------------------------------------
    // ACTIVE CHART
    //--------------------------------------------------

    static setActiveChart(
        chartId:string

    ){
        this.activeChartId =
            chartId;
    }

    static getActiveChart(){
        return this.activeChartId;

    }
    
    //--------------------------------------------------
    // GET
    //--------------------------------------------------

    static get(
        chartId?:string
    ):DebugData | null{
        const id =
            chartId ??
            this.activeChartId;
        if(!id){
            return null;
        }
        return (
            this.data.get(
                id
            )
            ??
            null
        );
    }

    //--------------------------------------------------
    // CLEAR
    //--------------------------------------------------

    static clear(

        chartId?:string

    ){
        if(
            chartId
        ){

            this.data.delete(
                chartId
            );
            if(
                this.activeChartId ===
                chartId
            ){
                this.activeChartId =
                    "";
            }

        }

        else{

            this.data.clear();

            this.activeChartId =
                "";

        }

        this.hasRuntimeFeed =

            this.data.size > 0;

    }
}

//======================================================
// TRADINGVIEW STYLE FORMATTER
//======================================================

export function buildDebugText(
    d:DebugData
):string {

    //--------------------------------------------------
    // EXACT PINE DEBUG TEXT
    //--------------------------------------------------

    if(
        d.lines &&
        d.lines.length > 0
    ){
        return d.lines.join(
            "\n"
        );
    }

    //--------------------------------------------------
    // GENERATED DEBUG TEXT
    //--------------------------------------------------

    return [
    
        `SYMBOL | ${
        
            d.symbol ??
        
            "-"
        
        }`,
    
        `TRADE MODE | ${d.tradeEngineMode ?? "SCORE"}`,
    
        `SCORE | ${d.tradeConfidence ?? d.confidence ?? 0}`,
    
        `BIAS | ${
            d.tradeDirection === 1
                ? "BULLISH"
                : d.tradeDirection === -1
                    ? "BEARISH"
                    : "NEUTRAL"
        }`,
    
        `DIRECTION | ${
            d.tradeDirection === 1
                ? "LONG"
                : d.tradeDirection === -1
                    ? "SHORT"
                    : "NONE"
        }`,
    
        `OPTION | ${
            d.tradeDirection === 1
                ? "CE"
                : d.tradeDirection === -1
                    ? "PE"
                    : "-"
        }`,
    
        `STRIKE | ATM:${d.atmStrike ?? "-"} ITM:${d.itmStrike ?? "-"} OTM:${d.otmStrike ?? "-"}`,
    
        `VOLUME | VALIDATING`,
    
        `AUTHORITY | ${d.authorityStatus ?? "READY"}`,
    
        `LIFE CYCLE | ${

            d.engineState ??
        
            d.state ??
        
            "SCAN"
        
        }`,
    
    ].join("\n");
    

}