export interface StoredSeat {
    gameId: number | null;
    lastKnownGameId: number;
    secret: string;
    secretInv: string;
}

const prefix = "mental-poker.seat.";

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

export function clearSeat(address: string): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.removeItem(key(address));
}
