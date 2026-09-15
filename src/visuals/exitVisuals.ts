import {
  ChartOverlayManager
} from "./ChartOverlayManager";

export class ExitVisuals {

  static partialExit(
    id: string,
    price: number
  ): void {

    ChartOverlayManager.draw({

      id,

      kind: "partial",

      price,

      text: "TP HIT",

      color: "#00FF00"
    });
  }
}
