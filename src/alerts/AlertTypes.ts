export const AlertSeverity = {

  INFO: "INFO",

  SUCCESS: "SUCCESS",

  WARNING: "WARNING",

  ERROR: "ERROR"

} as const;

export type AlertSeverity =
  typeof AlertSeverity[
    keyof typeof AlertSeverity
  ];

export const AlertCategory = {

  SIGNAL: "SIGNAL",

  EXECUTION: "EXECUTION",

  OPTIONS: "OPTIONS",

  LIFECYCLE: "LIFECYCLE",

  RISK: "RISK",

  DASHBOARD: "DASHBOARD"

} as const;

export type AlertCategory =
  typeof AlertCategory[
    keyof typeof AlertCategory
  ];

export interface AlertMessage {

  id: string;

  timestamp: number;

  title: string;

  message: string;

  severity: AlertSeverity;

  category: AlertCategory;

  symbol?: string;

}
