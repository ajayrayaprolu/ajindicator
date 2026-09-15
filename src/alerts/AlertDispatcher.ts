import { AlertService } from "./AlertService";
import type {
  AlertCategory,
  AlertMessage,
  AlertSeverity
} from "./AlertTypes";

export class AlertDispatcher {

  static dispatch(

    title: string,

    message: string,

    severity: AlertSeverity,

    category: AlertCategory,

    symbol?: string

  ): void {

    const alert: AlertMessage = {

      id:
        `${Date.now()}-${Math.random()}`,

      timestamp:
        Date.now(),

      title,

      message,

      severity,

      category,

      symbol
    };

    AlertService.push(
      alert
    );
  }
}
