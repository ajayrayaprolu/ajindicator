//======================================================
// src/dashboard/DashboardStore.ts
// Global Dashboard State Store : DashboardStore is your global application state (portfolio/runtime),
// AJ Institutional + Portfolio Runtime
//======================================================
//DashboardStore for :                     // Tomorrow another indicator: still works
//AJ Institutional dashboard state             AI Strategy
//Portfolio dashboard                               ↓
//Scanner dashboard                            RuntimeEngine
//Strategy dashboard                                ↓
//AI dashboard                                 StrategyHost
//                                                  ↓
//state                                   DashboardStore.runtime
// ├── portfolioValue
// ├── exposure
// ├── risk
// ├── recommendations
// ├── activeTrades
// ├── winRate
// ├── pnl
// │
// └── runtime
//       ├── state
//       ├── direction
//       ├── confidence
//       ├── tradeScore
//       ├── execution
//       ├── optionSymbol
//       ├── entry
//       ├── stopLoss
//       ├── tp1
//       ├── tp2
//       ├── tp3
//       └── regime

//======================================================
// STATE MODEL
//======================================================

export interface DashboardState {

    //--------------------------------------------------
    // PORTFOLIO
    //--------------------------------------------------

    portfolioValue:number;
    exposure:number;
    risk:number;
    recommendations:number;
    activeTrades:number;
    winRate:number;
    pnl:number;

    //--------------------------------------------------
    // AJ INSTITUTIONAL
    //--------------------------------------------------

    //--------------------------------------------------
    // RUNTIME DASHBOARD
    //--------------------------------------------------

    runtime?:{

        state:string;
        direction:string;
        confidence:number;
        tradeScore:number;
        execution:string;
        optionSymbol:string;
        entry:number | null;
        stopLoss:number | null;
        tp1:number | null;
        tp2:number | null;
        tp3:number | null;
        regime:string;
    };
}


//======================================================
// STORE
//======================================================

export class DashboardStore {

    //--------------------------------------------------
    // STATE
    //--------------------------------------------------

    private static state:
        DashboardState = {

        //--------------------------------------------------
        // PORTFOLIO DEFAULT
        //--------------------------------------------------

        portfolioValue:0,
        exposure:0,
        risk:0,
        recommendations:0,
        activeTrades:0,
        winRate:0,
        pnl:0,

        //--------------------------------------------------
        // RUNTIME DEFAULT
        //--------------------------------------------------

        runtime:{
            state:"WAIT",
            direction:"NONE",
            confidence:0,
            tradeScore:0,
            execution:"WAIT",
            optionSymbol:"-",
            entry:null,
            stopLoss:null,
            tp1:null,
            tp2:null,
            tp3:null,
            regime:"-"
        }
    };


    //--------------------------------------------------
    // GET
    //--------------------------------------------------

    static get():
        DashboardState {
        return this.state;
    }

    //--------------------------------------------------
    // SET
    //--------------------------------------------------

    static set(
        state:
            DashboardState
    ):void {
        this.state =
            state;
    }

    //--------------------------------------------------
    // UPDATE
    //--------------------------------------------------

    static update(

        partial:
            Partial<DashboardState>
    ):void {
        this.state = {
            ...this.state,
            ...partial
        };
    }

    //--------------------------------------------------
    // UPDATE RUNTIME ONLY
    //--------------------------------------------------

    static updateRuntime(

        runtime:
            Partial<
                NonNullable<
                    DashboardState["runtime"]
                >
            >

    ):void {
        this.state = {
            ...this.state,
            runtime:{
                state:
                    this.state.runtime?.state
                    ??
                    "WAIT",

                direction:
                    this.state.runtime?.direction
                    ??
                    "NONE",

                confidence:
                    this.state.runtime?.confidence
                    ??
                    0,

                tradeScore:
                    this.state.runtime?.tradeScore
                    ??
                    0,

                execution:
                    this.state.runtime?.execution
                    ??
                    "WAIT",

                optionSymbol:
                    this.state.runtime?.optionSymbol
                    ??
                    "-",

                entry:
                    this.state.runtime?.entry
                    ??
                    null,

                stopLoss:
                    this.state.runtime?.stopLoss
                    ??
                    null,

                tp1:
                    this.state.runtime?.tp1
                    ??
                    null,

                tp2:
                    this.state.runtime?.tp2
                    ??
                    null,

                tp3:
                    this.state.runtime?.tp3
                    ??
                    null,

                regime:
                    this.state.runtime?.regime
                    ??
                    "-",

                //--------------------------------------------------
                // APPLY NEW VALUES
                //--------------------------------------------------

                ...runtime

            }

        };

    }


    //--------------------------------------------------
    // CLEAR RUNTIME WHEN INDICATOR REMOVED
    //--------------------------------------------------

    static clearRuntime(){
        this.state.runtime = {
            state:"WAIT",
            direction:"NONE",
            confidence:0,
            tradeScore:0,
            execution:"WAIT",
            optionSymbol:"-",
            entry:null,
            stopLoss:null,
            tp1:null,
            tp2:null,
            tp3:null,
            regime:"-"
        };
    }
}