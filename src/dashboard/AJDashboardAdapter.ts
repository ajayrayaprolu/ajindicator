//======================================================
// \src\dashboard\AJDashboardAdapter.ts
// AJ Institutional Dashboard Adapter - Dashboard Metrics similar to Pine Dashboard Runtime Bridge
// Contained : dashboard runtime cache
//======================================================

import {
    DashboardFormatter,
    type DashboardRuntime
} from "./DashboardFormatter";

//======================================================
// DASHBOARD DATA CONTRACT
//======================================================

export type AJDashboardData =
    DashboardRuntime;

//======================================================

export class AJDashboardAdapter {

	//--------------------------------------------------
    // CHART CACHE
    //--------------------------------------------------

    private static data =

        new Map<
            string,
            AJDashboardData
        >();

    private static activeChartId =
        "";

    //--------------------------------------------------
    // INDEX BIAS CACHE
    //
    // Keyed by underlying root (NIFTY, BANKNIFTY, ...).
    // Index charts publish their bias here every cycle;
    // option charts on the same root read it back so
    // their DIRECTION display mirrors the index instead
    // of the option premium's own price action.
    //--------------------------------------------------

    private static indexBias =
        new Map<string, number>();

    static setIndexBias(
        rootSymbol:string,
        direction:number
    ):void {
        if (!rootSymbol) {
            return;
        }
        this.indexBias.set(
            rootSymbol,
            direction
        );
    }

    static getIndexBias(
        rootSymbol:string
    ):number | undefined {
        return this.indexBias.get(
            rootSymbol
        );
    }

	//--------------------------------------------------
    // UPDATE
    //--------------------------------------------------

    static update(
        chartId:string,
        data:
            Partial<AJDashboardData>
    ):void {
        const existing =
            this.data.get(
                chartId
            ) ?? {};
        this.data.set(
            chartId,
            {
                ...existing,
                ...data
            }
        );
    }

	//--------------------------------------------------
    // GET RAW
    //--------------------------------------------------

    static get(
        chartId?:string
    ):AJDashboardData {
        return (
            this.data.get(
                chartId ??
                this.activeChartId
            )
            ??
            {}
        );
    }

	//--------------------------------------------------
    // ACTIVE CHART
    //--------------------------------------------------

    static setActiveChart(
        chartId:string
    ){
        if(
            this.data.has(
                chartId
            )
        ){
            this.activeChartId =
                chartId;
        }
    }
	
    //--------------------------------------------------
    // BUILD UI MODEL
    //--------------------------------------------------

    static build(

        runtimePanel?:
            AJDashboardData

    ){

        const view =
            DashboardFormatter.format(
                runtimePanel ??
                this.get()
            );

        return {
        //==========ChartWindow.tsx will have dashboard Labels and Values=============
            title:
                "AJ Institutional Dashboard",

            metrics:[

                {
                    label:"POSITION",
                    value:view.position
                },

                {
                    label:"DIRECTION",
                    value:view.direction
                },

                {
                    label:"OPTION",
                    value:view.option
                },

                {
                    label:"ENTRY",
                    value:view.entry
                },

                {
                    label:"SL",
                    value:view.stop
                },

                {
                    label:"TP1",
                    value:view.tp1
                },

                {
                    label:"TP2",
                    value:view.tp2
                },

                {
                    label:"TP3",
                    value:view.tp3
                },

                {
                    label:"RE-ENTRY",
                    value:view.reEntry
                },

                {
                    label:"RE-ENTRY SL",
                    value:view.reEntrySL
                }

            ]


        };


    }


}