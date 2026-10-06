import { Group, Scalar } from "@provablehq/sdk";
import type { Cards, RevealedCards } from "./program.js";
import { initializedDeck } from "./deck.js";
import { GameState, isNewHandState, type PlayerId } from "./state.js";

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

/** Deck index of a group that is already a plaintext card, or null while it is still encrypted. */
export function cardIndexFromGroup(group: string, cardHashes: CardHashes): number | null {
    try {
        const text = group.endsWith("group") ? group : `${group}group`;
        const parsed = Group.fromString(text);
        try {
            const index = cardHashes.get(parsed.toString());
            return index === undefined ? null : index;
        } finally {
            parsed.free();
        }
    } catch {
        return null;
    }
}

/** Plaintext lookup, then one multiplication by the player's inverse. */
export function openCard(group: string, secretInv: string, cardHashes: CardHashes): number | null {
    const plain = cardIndexFromGroup(group, cardHashes);
    if (plain !== null) {
        return plain;
    }
    try {
        const [index] = decryptHandLocal([group, group], secretInv, cardHashes);
        return index === FACE_DOWN ? null : index;
    } catch {
        return null;
    }
}

export function openHand(
    encryptedHand: readonly [string, string],
    secretInv: string,
    cardHashes: CardHashes,
): [number, number] | null {
    try {
        const result = encryptedHand.map((card) => {
            const plain = cardIndexFromGroup(card, cardHashes);
            if (plain !== null) {
                return plain;
            }
            const [index] = decryptHandLocal([card, card], secretInv, cardHashes);
            return index;
        }) as [number, number];
        return result[0] === FACE_DOWN && result[1] === FACE_DOWN ? null : result;
    } catch {
        return null;
    }
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

/** Accepts a Leo `u8` whether the SDK returns a number or a literal such as `41u8`. */
export function cardIndex(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isInteger(parsed)) {
            return parsed;
        }
    }
    return FACE_DOWN;
}

function cardPair(cards: readonly unknown[]): [number, number] {
    return [cardIndex(cards[0]), cardIndex(cards[1])];
}

export function cardViewFromRevealed(revealed: RevealedCards | null): CardView {
    if (!revealed) {
        return emptyCardView();
    }
    return {
        flop: [cardIndex(revealed.flop[0]), cardIndex(revealed.flop[1]), cardIndex(revealed.flop[2])],
        turn: cardIndex(revealed.turn),
        river: cardIndex(revealed.river),
        player1: cardPair(revealed.player1),
        player2: cardPair(revealed.player2),
        player3: cardPair(revealed.player3),
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

/**
 * Streets whose community cards are already dealt and decrypted.
 * Decrypt states for a street are not public yet. A new shuffle hides the whole board.
 * Claim keeps the finished board; a 255 chain value still displays face down.
 */
export function communityStreets(state: GameState | null): { flop: boolean; turn: boolean; river: boolean } {
    if (state === null || isNewHandState(state)) {
        return { flop: false, turn: false, river: false };
    }
    const claiming = state >= GameState.P1Claim && state <= GameState.P3Claim;
    return {
        flop: claiming || (state >= GameState.P1BetFlop && state <= GameState.Compare),
        turn: claiming || (state >= GameState.P1BetTurn && state <= GameState.Compare),
        river: claiming || (state >= GameState.P1BetRiver && state <= GameState.Compare),
    };
}

/** Revealed index when it is public, otherwise a plaintext deck group. Never multiplies by a secret. */
export function chainCardIndex(revealedIndex: number, group: string | null | undefined, cardHashes: CardHashes): number {
    if (revealedIndex !== FACE_DOWN) {
        return revealedIndex;
    }
    if (!group) {
        return FACE_DOWN;
    }
    return cardIndexFromGroup(group, cardHashes) ?? FACE_DOWN;
}

/**
 * Own hole card: use a public index as-is. Otherwise multiply this client's secret once.
 * A failed decrypt stays face down and does not replace a public index.
 */
export function presentHoleCard(
    revealedIndex: number,
    group: string | null | undefined,
    secretInv: string | null,
    cardHashes: CardHashes,
): number {
    const revealed = chainCardIndex(revealedIndex, group, cardHashes);
    if (revealed !== FACE_DOWN) {
        return revealed;
    }
    if (!secretInv || !group) {
        return FACE_DOWN;
    }
    try {
        const [index] = decryptHandLocal([group, group], secretInv, cardHashes);
        return index;
    } catch {
        return FACE_DOWN;
    }
}

/** True when this secret peels a still-encrypted hole card to a deck index. Plaintext groups do not count. */
export function keyOpensHand(
    hand: readonly [string, string],
    secretInv: string,
    cardHashes: CardHashes,
): boolean {
    let openedEncrypted = false;
    for (const card of hand) {
        if (cardIndexFromGroup(card, cardHashes) !== null) {
            continue;
        }
        try {
            const [index] = decryptHandLocal([card, card], secretInv, cardHashes);
            if (index === FACE_DOWN) {
                return false;
            }
            openedEncrypted = true;
        } catch {
            return false;
        }
    }
    return openedEncrypted;
}

/** Local hole-card decrypt is useful only after every player has peeled the other layers. */
export function holeSecretsApply(state: GameState | null): boolean {
    if (state === null || isNewHandState(state)) {
        return false;
    }
    return state > GameState.P3DecHand;
}

export function presentCardView(input: {
    state: GameState | null;
    revealed: RevealedCards | null;
    cards: Cards | null;
    playerId: PlayerId | 0;
    secretInv: string | null;
    cardHashes: CardHashes;
}): CardView {
    if (input.state !== null && isNewHandState(input.state)) {
        return emptyCardView();
    }
    const revealed = cardViewFromRevealed(input.revealed);
    const streets = communityStreets(input.state);
    const secret = holeSecretsApply(input.state) && input.playerId !== 0 ? input.secretInv : null;
    const board = (visible: boolean, revealedIndex: number, group: string | undefined): number =>
        visible ? chainCardIndex(revealedIndex, group, input.cardHashes) : FACE_DOWN;
    const hole = (player: PlayerId, pair: [number, number], groups: readonly [string, string] | null): [number, number] => {
        const own = secret !== null && player === input.playerId ? secret : null;
        return [
            presentHoleCard(pair[0], groups?.[0], own, input.cardHashes),
            presentHoleCard(pair[1], groups?.[1], own, input.cardHashes),
        ];
    };
    return {
        flop: [
            board(streets.flop, revealed.flop[0], input.cards?.flop[0]),
            board(streets.flop, revealed.flop[1], input.cards?.flop[1]),
            board(streets.flop, revealed.flop[2], input.cards?.flop[2]),
        ],
        turn: board(streets.turn, revealed.turn, input.cards?.turn),
        river: board(streets.river, revealed.river, input.cards?.river),
        player1: hole(1, revealed.player1, input.cards?.player1 ?? null),
        player2: hole(2, revealed.player2, input.cards?.player2 ?? null),
        player3: hole(3, revealed.player3, input.cards?.player3 ?? null),
    };
}

/** Drop community cards the current street has not revealed. A new hand clears the whole view. */
export function applyCommunityState(view: CardView, state: GameState | null): CardView {
    if (state !== null && isNewHandState(state)) {
        return emptyCardView();
    }
    const streets = communityStreets(state);
    return {
        ...view,
        flop: streets.flop ? view.flop : [FACE_DOWN, FACE_DOWN, FACE_DOWN],
        turn: streets.turn ? view.turn : FACE_DOWN,
        river: streets.river ? view.river : FACE_DOWN,
    };
}
