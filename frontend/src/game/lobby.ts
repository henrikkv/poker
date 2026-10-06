import {
    describeGameState,
    gameStage,
    gameStateFromU8,
    isLobbyState,
    isUnfinishedState,
    type GameStage,
    type GameState,
    type PlayerId,
} from "./state.js";

export interface LobbyTable {
    gameId: number;
    state: GameState;
    stage: GameStage;
    progress: string;
    waiting: boolean;
    yours: boolean;
    seatsFilled: number;
    playerIds: PlayerId[];
    addresses: [string, string, string];
}

/** Plain address text from a mapping value or a wallet string. */
export function addressText(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }
    if (typeof value === "number" || typeof value === "bigint") {
        return String(value);
    }
    if (value && typeof value === "object") {
        const text = String(value);
        if (text !== "[object Object]") {
            return text.trim();
        }
    }
    return "";
}

/** Compare public Aleo addresses. Mapping values and wallet strings can differ by case or a visibility suffix. */
export function sameAddress(left: unknown, right: unknown): boolean {
    const normalize = (value: unknown) => addressText(value).toLowerCase().replace(/\.(private|public)$/, "");
    const a = normalize(left);
    const b = normalize(right);
    return a.startsWith("aleo1") && a.length > 10 && a === b;
}

export function seatedPlayerIds(
    address: string,
    game: { player1: string; player2: string; player3: string },
): PlayerId[] {
    const seats: PlayerId[] = [];
    if (sameAddress(address, game.player1)) {
        seats.push(1);
    }
    if (sameAddress(address, game.player2)) {
        seats.push(2);
    }
    if (sameAddress(address, game.player3)) {
        seats.push(3);
    }
    return seats;
}

/** Empty seats are `0u128 as address`, which renders as a near-all-`q` Aleo address. */
export function seatOccupied(address: string): boolean {
    const normalized = address.trim().toLowerCase();
    if (!normalized || normalized === "0u128" || normalized === "0field" || normalized === "0group") {
        return false;
    }
    if (!normalized.startsWith("aleo1")) {
        return false;
    }
    const body = normalized.slice(5);
    if (body.length === 0) {
        return false;
    }
    const qs = [...body].filter((char) => char === "q").length;
    return qs / body.length < 0.8;
}

export function seatsFilled(addresses: readonly string[]): number {
    return addresses.filter(seatOccupied).length;
}

export function toLobbyTable(
    gameId: number,
    game: { player1: string; player2: string; player3: string; state: number },
    yourSeats: readonly number[],
): LobbyTable | null {
    const state = gameStateFromU8(game.state);
    if (state === null) {
        return null;
    }
    const addresses: [string, string, string] = [
        addressText(game.player1),
        addressText(game.player2),
        addressText(game.player3),
    ];
    const playerIds = yourSeats.filter((id): id is PlayerId => id === 1 || id === 2 || id === 3);
    const yours = playerIds.length > 0;
    if (!isUnfinishedState(state) && !yours) {
        return null;
    }
    return {
        gameId,
        state,
        stage: gameStage(state),
        progress: describeGameState(state),
        waiting: isLobbyState(state),
        yours,
        seatsFilled: seatsFilled(addresses),
        playerIds,
        addresses,
    };
}

export function sortLobby(tables: readonly LobbyTable[]): LobbyTable[] {
    return [...tables].sort((a, b) => {
        if (a.yours !== b.yours) {
            return a.yours ? -1 : 1;
        }
        if (a.waiting !== b.waiting) {
            return a.waiting ? -1 : 1;
        }
        return b.gameId - a.gameId;
    });
}
