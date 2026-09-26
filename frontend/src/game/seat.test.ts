import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearSeat, loadSeat, saveSeat } from "./seat.js";

const address = "aleo1testaddress";
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
