import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    clearSeat,
    hideJoinedTable,
    listJoinedTables,
    loadJoinedTable,
    loadSeat,
    rememberJoinedTable,
    saveSeat,
} from "./seat.js";

const address = "aleo1testaddress";
const other = "aleo1other";
const store = new Map<string, string>();

beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value);
            },
            removeItem: (key: string) => {
                store.delete(key);
            },
        },
    });
});

afterEach(() => {
    clearSeat(address);
});

describe("seat storage", () => {
    it("round-trips a seat for an address", () => {
        saveSeat(address, {
            gameId: 4,
            lastKnownGameId: 4,
            secret: "1scalar",
            secretInv: "2scalar",
        });
        expect(loadSeat(address)).toEqual({
            gameId: 4,
            lastKnownGameId: 4,
            secret: "1scalar",
            secretInv: "2scalar",
        });
    });

    it("returns null for a missing or invalid seat", () => {
        expect(loadSeat(address)).toBeNull();
        localStorage.setItem(`mental-poker.seat.${address}`, "{");
        expect(loadSeat(address)).toBeNull();
    });
});

describe("joined tables", () => {
    it("remembers more than one table for the same key", () => {
        rememberJoinedTable(4, address, [1]);
        rememberJoinedTable(9, address, [2]);
        rememberJoinedTable(9, address, [3]);
        expect(listJoinedTables(address)).toEqual([
            { gameId: 9, address, playerIds: [2, 3] },
            { gameId: 4, address, playerIds: [1] },
        ]);
        expect(loadJoinedTable(9)).toEqual({ gameId: 9, address, playerIds: [2, 3] });
    });

    it("hides a table without wiping secrets", () => {
        saveSeat(address, {
            gameId: 4,
            lastKnownGameId: 4,
            secret: "1scalar",
            secretInv: "2scalar",
        });
        rememberJoinedTable(4, address, [1]);
        rememberJoinedTable(8, other, [2]);
        hideJoinedTable(4);
        expect(listJoinedTables(address)).toEqual([]);
        expect(listJoinedTables()).toEqual([{ gameId: 8, address: other, playerIds: [2] }]);
        expect(loadSeat(address)?.secret).toBe("1scalar");
    });
});
