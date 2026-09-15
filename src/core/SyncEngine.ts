export interface SyncState {

    attached: boolean;

    localBias: number;

    masterBias: number;
}

export class SyncEngine {

    static aligned(state: SyncState) {

        return (
            state.attached &&
            state.localBias === state.masterBias
        );
    }
}
