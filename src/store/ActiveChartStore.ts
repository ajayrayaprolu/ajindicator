//======================================================
// src/store/ActiveChartStore.ts 
// Active Chart Context
//======================================================

export class ActiveChartStore {

    //--------------------------------------------------
    // ACTIVE CHART
    //--------------------------------------------------

    private static activeChartId =
        "";

    //--------------------------------------------------
    // SET
    //--------------------------------------------------

    static setActiveChart(
        chartId:string
    ){
        this.activeChartId =
            chartId;
    }

    //--------------------------------------------------
    // GET
    //--------------------------------------------------

    static getActiveChart(){
        return this.activeChartId;
    }

}