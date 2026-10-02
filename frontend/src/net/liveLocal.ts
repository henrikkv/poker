import type { GameController } from "../game/controller.js";

let live: { address: string; controller: GameController } | null = null;

export function takeLiveLocal(address: string): GameController | null {
    if (live?.address === address) {
        return live.controller;
    }
    return null;
}

export function setLiveLocal(address: string, controller: GameController): void {
    if (live && live.controller !== controller) {
        live.controller.stop();
    }
    live = { address, controller };
}

export function stopLiveLocal(): void {
    if (!live) {
        return;
    }
    const current = live;
    live = null;
    current.controller.stop();
}
