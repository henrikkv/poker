export interface StoredSeat {
    gameId: number | null;
    lastKnownGameId: number;
    secret: string;
    secretInv: string;
}

export interface JoinedTable {
    gameId: number;
    address: string;
    playerIds: number[];
}

const prefix = "mental-poker.seat.";
const JOINED = "mental-poker.joined-tables";

function key(address: string): string {
    return `${prefix}${address}`;
}

export function loadSeat(address: string): StoredSeat | null {
    if (typeof localStorage === "undefined") {
        return null;
    }
    try {
        const raw = localStorage.getItem(key(address));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as Partial<StoredSeat>;
        if (typeof parsed.secret !== "string" || typeof parsed.secretInv !== "string") {
            return null;
        }
        if (typeof parsed.lastKnownGameId !== "number" || !Number.isInteger(parsed.lastKnownGameId)) {
            return null;
        }
        if (parsed.gameId !== null && (typeof parsed.gameId !== "number" || !Number.isInteger(parsed.gameId))) {
            return null;
        }
        return {
            gameId: parsed.gameId ?? null,
            lastKnownGameId: parsed.lastKnownGameId,
            secret: parsed.secret,
            secretInv: parsed.secretInv,
        };
    } catch {
        return null;
    }
}

export function saveSeat(address: string, seat: StoredSeat): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.setItem(key(address), JSON.stringify(seat));
}

/** Wipes shuffle secrets. Do not call on a flaky mapping read. */
export function clearSeat(address: string): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.removeItem(key(address));
}

interface StoredJoined {
    address: string;
    playerIds: number[];
}

function readJoined(): Record<string, StoredJoined> {
    if (typeof localStorage === "undefined") {
        return {};
    }
    try {
        const raw = localStorage.getItem(JOINED);
        return raw ? (JSON.parse(raw) as Record<string, StoredJoined>) : {};
    } catch {
        return {};
    }
}

function writeJoined(all: Record<string, StoredJoined>): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.setItem(JOINED, JSON.stringify(all));
}

export function loadJoinedTable(gameId: number): JoinedTable | null {
    const stored = readJoined()[String(gameId)];
    if (!stored) {
        return null;
    }
    return { gameId, address: stored.address, playerIds: stored.playerIds };
}

export function listJoinedTables(address?: string): JoinedTable[] {
    return Object.entries(readJoined())
        .map(([id, stored]) => ({
            gameId: Number(id),
            address: stored.address,
            playerIds: stored.playerIds,
        }))
        .filter((table) => Number.isInteger(table.gameId) && (!address || table.address === address))
        .sort((a, b) => b.gameId - a.gameId);
}

export function rememberJoinedTable(gameId: number, address: string, playerIds: number[]): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    const all = readJoined();
    const prior = all[String(gameId)];
    const merged = new Set(prior?.address === address ? prior.playerIds : []);
    for (const id of playerIds) {
        merged.add(id);
    }
    all[String(gameId)] = { address, playerIds: [...merged] };
    writeJoined(all);
}

/** Hide a table in this browser. Does not touch on-chain escrow or shuffle secrets. */
export function hideJoinedTable(gameId: number): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    const all = readJoined();
    delete all[String(gameId)];
    writeJoined(all);
}
