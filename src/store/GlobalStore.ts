export interface GlobalStore {
    tradeDirection: number;
    tradeConfidence: number;
    engineState: string;
}

export const store: GlobalStore = {
    tradeDirection: 0,
    tradeConfidence: 0,
    engineState: "SCAN"
};
