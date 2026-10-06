import { readFileSync } from "node:fs";
import { Group, Scalar } from "@provablehq/sdk";
import { describe, expect, it } from "vitest";
import {
    applyCommunityState,
    cardIndex,
    cardIndexFromGroup,
    cardInfo,
    computeCardHashesFromDeck,
    decryptHandLocal,
    emptyCardView,
    formatCard,
    generateSecret,
    getOpponents,
    keyOpensHand,
    openCard,
    openHand,
    presentCardView,
    presentHoleCard,
} from "./cards.js";
import { initializedDeck } from "./deck.js";
import type { Cards, RevealedCards } from "./program.js";
import { GameState } from "./state.js";

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
        expect(cardIndex(41)).toBe(41);
        expect(cardIndex("41u8")).toBe(41);
        expect(cardIndex("nope")).toBe(255);
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

    it("reads a plaintext community card and a card still under one key", () => {
        const deck = initializedDeck();
        const hashes = computeCardHashesFromDeck(deck);
        const { secret, secretInv } = generateSecret();
        const encrypted = Group.fromString(deck[11]).scalarMultiply(Scalar.fromString(secret)).toString();
        const other = Group.fromString(deck[4]).scalarMultiply(Scalar.fromString(secret)).toString();
        expect(cardIndexFromGroup(deck[11], hashes)).toBe(11);
        expect(openCard(encrypted, secretInv, hashes)).toBe(11);
        expect(openHand([encrypted, other], secretInv, hashes)).toEqual([11, 4]);
        expect(openHand([deck[11], deck[4]], secretInv, hashes)).toEqual([11, 4]);
    });
});

function revealedBoard(partial: Partial<RevealedCards> = {}): RevealedCards {
    return {
        player1: [255, 255],
        player2: [255, 255],
        player3: [255, 255],
        flop: [255, 255, 255],
        turn: 255,
        river: 255,
        ...partial,
    };
}

function cardsFrom(deck: readonly string[], partial: Partial<Cards> = {}): Cards {
    return {
        player1: [deck[0], deck[1]],
        player2: [deck[2], deck[3]],
        player3: [deck[4], deck[5]],
        flop: [deck[6], deck[7], deck[8]],
        turn: deck[9],
        river: deck[10],
        ...partial,
    };
}

describe("presentCardView", () => {
    const deck = initializedDeck();
    const hashes = computeCardHashesFromDeck(deck);
    const { secret, secretInv } = generateSecret();
    const encrypt = (index: number) =>
        Group.fromString(deck[index]).scalarMultiply(Scalar.fromString(secret)).toString();

    it("keeps each community street face down until that street is public", () => {
        const revealed = revealedBoard({ flop: [1, 2, 3], turn: 4, river: 5 });
        const cards = cardsFrom(deck);
        const hidden = presentCardView({
            state: GameState.P1BetPre,
            revealed,
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(hidden.flop).toEqual([255, 255, 255]);
        expect(hidden.turn).toBe(255);
        expect(hidden.river).toBe(255);

        const decryptingFlop = presentCardView({
            state: GameState.P2DecFlop,
            revealed,
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(decryptingFlop.flop).toEqual([255, 255, 255]);

        const flop = presentCardView({
            state: GameState.P1BetFlop,
            revealed,
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(flop.flop).toEqual([1, 2, 3]);
        expect(flop.turn).toBe(255);
        expect(flop.river).toBe(255);

        const turn = presentCardView({
            state: GameState.P1DecRiver,
            revealed,
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(turn.flop).toEqual([1, 2, 3]);
        expect(turn.turn).toBe(4);
        expect(turn.river).toBe(255);

        const river = presentCardView({
            state: GameState.P1Showdown,
            revealed,
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(river.flop).toEqual([1, 2, 3]);
        expect(river.turn).toBe(4);
        expect(river.river).toBe(5);
    });

    it("uses a plaintext group when the public street is still 255 and ignores a stale index", () => {
        const cards = cardsFrom(deck);
        const fromGroup = presentCardView({
            state: GameState.P1BetFlop,
            revealed: revealedBoard(),
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(fromGroup.flop).toEqual([6, 7, 8]);
        expect(fromGroup.turn).toBe(255);

        const encrypted = cardsFrom(deck, {
            flop: [encrypt(20), encrypt(21), encrypt(22)],
            turn: encrypt(23),
            river: encrypt(24),
        });
        const notYet = presentCardView({
            state: GameState.P1BetFlop,
            revealed: revealedBoard(),
            cards: encrypted,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(notYet.flop).toEqual([255, 255, 255]);
        expect(presentHoleCard(11, encrypt(4), secretInv, hashes)).toBe(11);
    });

    it("clears the previous hand on a new shuffle and does not locally open opponents", () => {
        const revealed = revealedBoard({
            player1: [7, 8],
            player2: [9, 10],
            flop: [1, 2, 3],
            turn: 4,
            river: 5,
        });
        const cards = cardsFrom(deck, {
            player1: [encrypt(30), encrypt(31)],
            player3: [encrypt(32), encrypt(33)],
        });
        for (const state of [GameState.P1NewShuffle, GameState.P2Shuffle, GameState.P3Shuffle]) {
            expect(
                presentCardView({
                    state,
                    revealed,
                    cards,
                    playerId: 1,
                    secretInv,
                    cardHashes: hashes,
                }),
            ).toEqual(emptyCardView());
        }

        const cached = presentCardView({
            state: GameState.P3BetRiver,
            revealed,
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(applyCommunityState(cached, GameState.P1BetFlop).turn).toBe(255);
        expect(applyCommunityState(cached, GameState.P1BetFlop).river).toBe(255);
        expect(applyCommunityState(cached, GameState.P2NewShuffle)).toEqual(emptyCardView());

        const shown = presentCardView({
            state: GameState.P1BetPre,
            revealed: revealedBoard(),
            cards,
            playerId: 1,
            secretInv,
            cardHashes: hashes,
        });
        expect(shown.player1).toEqual([30, 31]);
        expect(shown.player2).toEqual([2, 3]);
        expect(shown.player3).toEqual([255, 255]);
        expect(keyOpensHand([encrypt(30), encrypt(31)], secretInv, hashes)).toBe(true);
        expect(keyOpensHand([deck[11], deck[4]], secretInv, hashes)).toBe(false);
        expect(keyOpensHand([encrypt(30), encrypt(31)], Scalar.one().toString(), hashes)).toBe(false);
    });
});
