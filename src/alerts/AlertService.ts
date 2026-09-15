import type { AlertMessage } from "./AlertTypes";

export class AlertService {

  private static alerts: AlertMessage[] = [];

  static push(
    alert: AlertMessage
  ): void {

    this.alerts.unshift(
      alert
    );

    if (
      this.alerts.length > 500
    ) {
      this.alerts.pop();
    }
  }

  static getAll(): AlertMessage[] {

    return this.alerts;
  }

  static clear(): void {

    this.alerts = [];
  }
}
