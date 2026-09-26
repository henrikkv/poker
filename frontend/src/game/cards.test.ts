import { readFileSync } from "node:fs";
import { Group, Scalar } from "@provablehq/sdk";
import { describe, expect, it } from "vitest";
import {
    cardInfo,
    computeCardHashesFromDeck,
    decryptHandLocal,
    formatCard,
    generateSecret,
    getOpponents,
} from "./cards.js";
import { initializedDeck } from "./deck.js";

describe("formatCard", () => {
    it("matches the Rust client", () => {
        expect(formatCard(0)).toBe("♠2");
        expect(formatCard(1)).toBe("♠3");
        expect(formatCard(8)).toBe("♠10");
        expect(formatCard(9)).toBe("♠J");
        expect(formatCard(11)).toBe("♠K");
        expect(formatCard(12)).toBe("♠A");
        expect(formatCard(13)).toBe("♣2");
        expect(formatCard(25)).toBe("♣A");
        expect(formatCard(26)).toBe("♥2");
        expect(formatCard(38)).toBe("♥A");
        expect(formatCard(39)).toBe("♦2");
        expect(formatCard(51)).toBe("♦A");
        expect(formatCard(255)).toBe("???");
        expect(formatCard(123)).toBe("Incorrect card index: 123");
    });

    it("marks hearts and diamonds red", () => {
        expect(cardInfo(26)).toMatchObject({ kind: "valid", isRed: true });
        expect(cardInfo(51)).toMatchObject({ kind: "valid", isRed: true });
        expect(cardInfo(0)).toMatchObject({ kind: "valid", isRed: false });
    });
});

describe("getOpponents", () => {
    it("rotates seats", () => {
        expect(getOpponents(1)).toEqual([2, 3]);
        expect(getOpponents(2)).toEqual([3, 1]);
        expect(getOpponents(3)).toEqual([1, 2]);
    });
});

describe("initializedDeck", () => {
    it("matches src/deck.rs", () => {
        const source = readFileSync(new URL("../../../src/deck.rs", import.meta.url), "utf8");
        const groups = [...source.matchAll(/"(\d+group)"/g)].map((match) => match[1]);
        expect(initializedDeck()).toEqual(groups);
    });
});

describe("decryptHandLocal", () => {
    it("recovers the card index after encrypting with a secret", () => {
        const deck = initializedDeck();
        const hashes = computeCardHashesFromDeck(deck);
        const { secret, secretInv } = generateSecret();
        const encrypted = [7, 42].map((index) =>
            Group.fromString(deck[index]).scalarMultiply(Scalar.fromString(secret)).toString(),
        ) as [string, string];

        expect(decryptHandLocal(encrypted, secretInv, hashes)).toEqual([7, 42]);
    });

    it("returns face down for unknown groups", () => {
        const hashes = computeCardHashesFromDeck();
        const random = Group.random().toString();
        expect(decryptHandLocal([random, random], Scalar.one().toString(), hashes)).toEqual([255, 255]);
    });
});
