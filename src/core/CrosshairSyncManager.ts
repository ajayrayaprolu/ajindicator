import type {
  IChartApi,
  Time
} from "lightweight-charts";

export class CrosshairSyncManager {

  private static charts =
    new Set<IChartApi>();

  static register(
    chart: IChartApi
  ) {

    this.charts.add(
      chart
    );

  }

  static unregister(
    chart: IChartApi
  ) {

    this.charts.delete(
      chart
    );

  }

  static syncCrosshair(
    sourceChart: IChartApi,
    time: Time
  ) {

    this.charts.forEach(
      chart => {

        if (
          chart === sourceChart
        ) {
          return;
        }

        try {

          chart
            .timeScale()
            .setVisibleRange({
              from: time,
              to: time
            } as any);

        } catch {

        }

      }
    );

  }

}
