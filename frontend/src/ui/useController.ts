import { useSyncExternalStore } from "react";
import type { GameController, Snapshot } from "../game/controller.js";

export function useController(controller: GameController): Snapshot {
    return useSyncExternalStore(controller.subscribe, controller.getSnapshot);
}
