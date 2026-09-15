//======================================================
// src/dashboard/DashboardService.ts
// AJ Institutional Dashboard Runtime Service
//======================================================

import type {
    DashboardPanel
} from "./DashboardTypes";

//======================================================
// DASHBOARD SERVICE
//======================================================

export class DashboardService {

    //--------------------------------------------------
    // PANEL CACHE
    //--------------------------------------------------

    private static panels =
        new Map<
            string,
            DashboardPanel
        >();

    //--------------------------------------------------
    // REGISTER PANEL
    //--------------------------------------------------

    static register(
        panel:
            DashboardPanel
    ):void {
        this.update(
            panel
        );
    }

    //--------------------------------------------------
    // UPDATE PANEL
    //--------------------------------------------------

    static update(
        panel:
            DashboardPanel
    ):void {
        if(
            !panel ||
            !panel.id
        ){
            return;
        }

        //--------------------------------------------------
        // EXISTING SNAPSHOT
        //--------------------------------------------------

        const existing =
            this.panels.get(
                panel.id
            );

        //--------------------------------------------------
        // MERGE UPDATE
        //--------------------------------------------------

        this.panels.set(
            panel.id,
            {
                ...existing,
                ...panel,
                metrics:
                    panel.metrics
                    ??
                    existing?.metrics
                    ??
                    []
            }
        );
    }

    //--------------------------------------------------
    // GET PANEL
    //--------------------------------------------------

    static get(
        id:string
    ):
        DashboardPanel | undefined {
        return this.panels.get(
            id
        );
    }

    //--------------------------------------------------
    // GET AJ PANEL
    //--------------------------------------------------

    static getAJ():
        DashboardPanel | undefined {
        return this.get(
            "AJ_MASTER"
        );
    }


    //--------------------------------------------------
    // GET ALL
    //--------------------------------------------------

    static getAll():
        DashboardPanel[] {
        return Array.from(
            this.panels.values()
        );
    }


    //--------------------------------------------------
    // HAS DATA
    //--------------------------------------------------

    static hasData():
        boolean {
        return (
            this.panels.size > 0
        );
    }

    //--------------------------------------------------
    // CLEAR SINGLE PANEL
    //--------------------------------------------------

    static clearPanel(
        id:string
    ):void {
        this.panels.delete(
            id
        );
    }

    //--------------------------------------------------
    // CLEAR ALL
    //--------------------------------------------------

    static clear():
        void {
        this.panels.clear();
    }
}