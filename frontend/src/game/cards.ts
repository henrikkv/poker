import { Group, Scalar } from "@provablehq/sdk";
import type { Cards, RevealedCards } from "./program.js";
import { initializedDeck } from "./deck.js";
import type { PlayerId } from "./state.js";

export const FACE_DOWN = 255;

export type Suit = "spades" | "clubs" | "hearts" | "diamonds";

export type CardInfo =
    | { kind: "valid"; suit: Suit; symbol: string; value: string; isRed: boolean }
    | { kind: "faceDown" }
    | { kind: "invalid"; index: number };

const SUITS: readonly { suit: Suit; symbol: string }[] = [
    { suit: "spades", symbol: "♠" },
    { suit: "clubs", symbol: "♣" },
    { suit: "hearts", symbol: "♥" },
    { suit: "diamonds", symbol: "♦" },
];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export function cardInfo(cardIndex: number): CardInfo {
    if (cardIndex === FACE_DOWN) {
        return { kind: "faceDown" };
    }
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 51) {
        return { kind: "invalid", index: cardIndex };
    }
    const suitIndex = Math.floor(cardIndex / 13);
    const { suit, symbol } = SUITS[suitIndex];
    return {
        kind: "valid",
        suit,
        symbol,
        value: VALUES[cardIndex % 13],
        isRed: suitIndex === 2 || suitIndex === 3,
    };
}

export function formatCard(cardIndex: number): string {
    const info = cardInfo(cardIndex);
    switch (info.kind) {
        case "faceDown":
            return "???";
        case "invalid":
            return `Incorrect card index: ${info.index}`;
        case "valid":
            return `${info.symbol}${info.value}`;
    }
}

export function getOpponents(playerId: PlayerId): [PlayerId, PlayerId] {
    switch (playerId) {
        case 1:
            return [2, 3];
        case 2:
            return [3, 1];
        case 3:
            return [1, 2];
    }
}

export function getPlayerCards(playerId: PlayerId, cards: Cards): [string, string] {
    switch (playerId) {
        case 1:
            return cards.player1;
        case 2:
            return cards.player2;
        case 3:
            return cards.player3;
    }
}

export function getOtherPlayersCards(
    playerId: PlayerId,
    cards: Cards,
): [[string, string], [string, string]] {
    const [opp1, opp2] = getOpponents(playerId);
    return [getPlayerCards(opp1, cards), getPlayerCards(opp2, cards)];
}

/** A fresh secret and its multiplicative inverse, as scalar literals. */
export function generateSecret(): { secret: string; secretInv: string } {
    const secret = Scalar.random();
    const one = Scalar.one();
    // `Scalar.inverse()` in the SDK negates rather than inverting.
    const secretInv = one.divide(secret);
    const result = { secret: secret.toString(), secretInv: secretInv.toString() };
    secret.free();
    one.free();
    secretInv.free();
    return result;
}

export type CardHashes = ReadonlyMap<string, number>;

export function computeCardHashesFromDeck(deck: readonly string[] = initializedDeck()): CardHashes {
    return new Map(deck.map((group, index) => [normalizeGroup(group), index]));
}

export function decryptHandLocal(
    encryptedHand: readonly [string, string],
    secretInv: string,
    cardHashes: CardHashes,
): [number, number] {
    const inverse = Scalar.fromString(secretInv);
    try {
        return encryptedHand.map((card) => {
            const group = Group.fromString(card);
            const decrypted = group.scalarMultiply(inverse);
            const index = cardHashes.get(decrypted.toString());
            group.free();
            decrypted.free();
            return index ?? FACE_DOWN;
        }) as [number, number];
    } finally {
        inverse.free();
    }
}

function normalizeGroup(group: string): string {
    const parsed = Group.fromString(group);
    const normalized = parsed.toString();
    parsed.free();
    return normalized;
}

/** Community and hole cards as card indices, where 255 is face down. */
export interface CardView {
    flop: [number, number, number];
    turn: number;
    river: number;
    player1: [number, number];
    player2: [number, number];
    player3: [number, number];
}

export function emptyCardView(): CardView {
    return {
        flop: [FACE_DOWN, FACE_DOWN, FACE_DOWN],
        turn: FACE_DOWN,
        river: FACE_DOWN,
        player1: [FACE_DOWN, FACE_DOWN],
        player2: [FACE_DOWN, FACE_DOWN],
        player3: [FACE_DOWN, FACE_DOWN],
    };
}

export function cardViewFromRevealed(revealed: RevealedCards | null): CardView {
    if (!revealed) {
        return emptyCardView();
    }
    return {
        flop: [...revealed.flop],
        turn: revealed.turn,
        river: revealed.river,
        player1: [...revealed.player1],
        player2: [...revealed.player2],
        player3: [...revealed.player3],
    };
}

export function getViewCards(view: CardView, playerId: PlayerId): [number, number] {
    switch (playerId) {
        case 1:
            return view.player1;
        case 2:
            return view.player2;
        case 3:
            return view.player3;
    }
}

export function setViewCards(view: CardView, playerId: PlayerId, cards: [number, number]): void {
    switch (playerId) {
        case 1:
            view.player1 = cards;
            break;
        case 2:
            view.player2 = cards;
            break;
        case 3:
            view.player3 = cards;
            break;
    }
}
