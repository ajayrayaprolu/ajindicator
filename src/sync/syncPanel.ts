export interface SyncPanelData {

  leftPrimary: string;

  leftSecondary: string;

  attached: boolean;

  masterBias: number;

  aligned: boolean;
}

export function buildSyncPanel(
  data: SyncPanelData
) {

  return {
    leftPrimary: data.leftPrimary,

    leftSecondary: data.leftSecondary,

    sync:
      data.attached
        ? "ATTACHED"
        : "DETACHED",

    master:
      data.masterBias === 1
        ? "LONG"
        : "SHORT",

    aligned:
      data.aligned
        ? "ALIGNED"
        : "NOT ALIGNED"
  };
}
