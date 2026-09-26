export const GameState = {
    P2Join: 0,
    P3Join: 1,

    P1DecHand: 2,
    P2DecHand: 3,
    P3DecHand: 4,

    P1BetPre: 5,
    P2BetPre: 6,
    P3BetPre: 7,

    P1DecFlop: 8,
    P2DecFlop: 9,
    P3DecFlop: 10,

    P1BetFlop: 11,
    P2BetFlop: 12,
    P3BetFlop: 13,

    P1DecTurn: 14,
    P2DecTurn: 15,
    P3DecTurn: 16,

    P1BetTurn: 17,
    P2BetTurn: 18,
    P3BetTurn: 19,

    P1DecRiver: 20,
    P2DecRiver: 21,
    P3DecRiver: 22,

    P1BetRiver: 23,
    P2BetRiver: 24,
    P3BetRiver: 25,

    P1Showdown: 26,
    P2Showdown: 27,
    P3Showdown: 28,

    Compare: 29,

    P1NewShuffle: 30,
    P2NewShuffle: 31,
    P2Shuffle: 32,
    P3Shuffle: 33,
    P1Claim: 34,
    P2Claim: 35,
    P3Claim: 36,
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export type PlayerId = 1 | 2 | 3;

const DESCRIPTIONS: readonly string[] = [
    "Waiting for Player 2 to join",
    "Waiting for Player 3 to join",
    "Waiting for Player 1 to decrypt hands",
    "Waiting for Player 2 to decrypt hands",
    "Waiting for Player 3 to decrypt hands",
    "Waiting for Player 1 to bet (pre-flop)",
    "Waiting for Player 2 to bet (pre-flop)",
    "Waiting for Player 3 to bet (pre-flop)",
    "Waiting for Player 1 to decrypt flop",
    "Waiting for Player 2 to decrypt flop",
    "Waiting for Player 3 to decrypt flop",
    "Waiting for Player 1 to bet (flop)",
    "Waiting for Player 2 to bet (flop)",
    "Waiting for Player 3 to bet (flop)",
    "Waiting for Player 1 to decrypt turn",
    "Waiting for Player 2 to decrypt turn",
    "Waiting for Player 3 to decrypt turn",
    "Waiting for Player 1 to bet (turn)",
    "Waiting for Player 2 to bet (turn)",
    "Waiting for Player 3 to bet (turn)",
    "Waiting for Player 1 to decrypt river",
    "Waiting for Player 2 to decrypt river",
    "Waiting for Player 3 to decrypt river",
    "Waiting for Player 1 to bet (river)",
    "Waiting for Player 2 to bet (river)",
    "Waiting for Player 3 to bet (river)",
    "Waiting for Player 1 showdown",
    "Waiting for Player 2 showdown",
    "Waiting for Player 3 showdown",
    "Ready to compare hands",
    "Waiting for Player 1 to shuffle new deck",
    "Waiting for Player 2 to shuffle new deck",
    "Waiting for Player 2 to shuffle",
    "Waiting for Player 3 to shuffle",
    "Waiting for Player 1 to claim prize",
    "Waiting for Player 2 to claim prize",
    "Waiting for Player 3 to claim prize",
];

export function gameStateFromU8(state: number): GameState | null {
    return Number.isInteger(state) && state >= 0 && state <= 36 ? (state as GameState) : null;
}

export function describeGameState(state: GameState): string {
    return DESCRIPTIONS[state];
}

export function isBettingState(state: GameState): boolean {
    return (
        (state >= GameState.P1BetPre && state <= GameState.P3BetPre) ||
        (state >= GameState.P1BetFlop && state <= GameState.P3BetFlop) ||
        (state >= GameState.P1BetTurn && state <= GameState.P3BetTurn) ||
        (state >= GameState.P1BetRiver && state <= GameState.P3BetRiver)
    );
}

export function currentPlayer(state: GameState): PlayerId | null {
    switch (state) {
        case GameState.P1DecHand:
        case GameState.P1BetPre:
        case GameState.P1DecFlop:
        case GameState.P1BetFlop:
        case GameState.P1DecTurn:
        case GameState.P1BetTurn:
        case GameState.P1DecRiver:
        case GameState.P1BetRiver:
        case GameState.P1Showdown:
        case GameState.P1NewShuffle:
        case GameState.P1Claim:
            return 1;

        case GameState.P2Join:
        case GameState.P2DecHand:
        case GameState.P2BetPre:
        case GameState.P2DecFlop:
        case GameState.P2BetFlop:
        case GameState.P2DecTurn:
        case GameState.P2BetTurn:
        case GameState.P2DecRiver:
        case GameState.P2BetRiver:
        case GameState.P2Showdown:
        case GameState.P2NewShuffle:
        case GameState.P2Shuffle:
        case GameState.P2Claim:
            return 2;

        case GameState.P3Join:
        case GameState.P3DecHand:
        case GameState.P3BetPre:
        case GameState.P3DecFlop:
        case GameState.P3BetFlop:
        case GameState.P3DecTurn:
        case GameState.P3BetTurn:
        case GameState.P3DecRiver:
        case GameState.P3BetRiver:
        case GameState.P3Showdown:
        case GameState.P3Shuffle:
        case GameState.P3Claim:
            return 3;

        case GameState.Compare:
            return null;
    }
}

export type DecryptionStep = "hands" | "flop" | "turn" | "river" | "showdown";

export function decryptionLogMessage(step: DecryptionStep): string {
    switch (step) {
        case "hands":
            return "Decrypting hand cards";
        case "flop":
            return "Decrypting flop";
        case "turn":
            return "Decrypting turn";
        case "river":
            return "Decrypting river";
        case "showdown":
            return "Revealing cards for showdown";
    }
}
