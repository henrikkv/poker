import type { GameController } from "../game/controller.js";

let live: { eth: string; controller: GameController } | null = null;

export function takeLiveEthereum(eth: string): GameController | null {
    if (live?.eth === eth.toLowerCase()) {
        return live.controller;
    }
    return null;
}

export function setLiveEthereum(eth: string, controller: GameController): void {
    live = { eth: eth.toLowerCase(), controller };
}

export function stopLiveEthereum(repay: boolean): void {
    if (!live) {
        return;
    }
    const current = live;
    live = null;
    current.controller.stop();
    if (repay) {
        void current.controller.settleHouseFunds();
    }
}
