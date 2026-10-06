import { describe, expect, it } from "vitest";
import {
    decreaseBlindFrequency,
    decreaseRaise,
    formatCredits,
    increaseBlindFrequency,
    increaseRaise,
    facingAllIn,
    newBettingUi,
    raiseBounds,
    newGameModel,
    parseCreditsInput,
    selectNextAction,
    selectPrevAction,
    setAllIn,
} from "./model.js";
import {
    currentPlayer,
    describeGameState,
    GameState,
    gameStage,
    gameStateFromU8,
    isBettingState,
    isLobbyState,
    isUnfinishedState,
} from "./state.js";

describe("GameState", () => {
    it("covers 0..36", () => {
        for (let state = 0; state <= 36; state++) {
            expect(gameStateFromU8(state)).toBe(state);
            expect(describeGameState(state as GameState)).toBeTruthy();
        }
        expect(gameStateFromU8(37)).toBeNull();
    });

    it("treats lobby and in-hand as unfinished, not claim", () => {
        expect(isUnfinishedState(GameState.P2Join)).toBe(true);
        expect(isUnfinishedState(GameState.P3Shuffle)).toBe(true);
        expect(isUnfinishedState(GameState.P1Claim)).toBe(false);
        expect(isLobbyState(GameState.P2Join)).toBe(true);
        expect(isLobbyState(GameState.P1DecHand)).toBe(false);
    });

    it("names the street each state belongs to", () => {
        expect(gameStage(GameState.P3Join)).toBe("Waiting");
        expect(gameStage(GameState.P1DecHand)).toBe("Pre-flop");
        expect(gameStage(GameState.P3BetPre)).toBe("Pre-flop");
        expect(gameStage(GameState.P1DecFlop)).toBe("Flop");
        expect(gameStage(GameState.P2BetTurn)).toBe("Turn");
        expect(gameStage(GameState.P3BetRiver)).toBe("River");
        expect(gameStage(GameState.Compare)).toBe("Showdown");
        expect(gameStage(GameState.P3Shuffle)).toBe("New hand");
        expect(gameStage(GameState.P2Claim)).toBe("Claim");
    });

    it("identifies betting states", () => {
        const betting = [5, 6, 7, 11, 12, 13, 17, 18, 19, 23, 24, 25];
        for (let state = 0; state <= 36; state++) {
            expect(isBettingState(state as GameState)).toBe(betting.includes(state));
        }
    });

    it("maps states to the acting player", () => {
        expect(currentPlayer(GameState.P2Join)).toBe(2);
        expect(currentPlayer(GameState.P3Join)).toBe(3);
        expect(currentPlayer(GameState.P1DecHand)).toBe(1);
        expect(currentPlayer(GameState.P3BetRiver)).toBe(3);
        expect(currentPlayer(GameState.Compare)).toBeNull();
        expect(currentPlayer(GameState.P1NewShuffle)).toBe(1);
        expect(currentPlayer(GameState.P2NewShuffle)).toBe(2);
        expect(currentPlayer(GameState.P2Shuffle)).toBe(2);
        expect(currentPlayer(GameState.P3Shuffle)).toBe(3);
        expect(currentPlayer(GameState.P2Claim)).toBe(2);
    });
});

describe("BettingUIState", () => {
    it("starts on call at the minimum raise", () => {
        const ui = newBettingUi(100, 10, 20);
        expect(ui).toMatchObject({ selectedAction: "call", raiseAmount: 20, maxRaise: 100 });
        expect(newBettingUi(50, 20, 80)).toMatchObject({ raiseAmount: 50, maxRaise: 50 });
    });

    it("cycles actions both ways", () => {
        const ui = newBettingUi(100, 10, 20);
        expect(selectNextAction(ui).selectedAction).toBe("raise");
        expect(selectPrevAction(ui).selectedAction).toBe("fold");
        expect(selectNextAction(selectNextAction(selectNextAction(ui))).selectedAction).toBe("call");
    });

    it("only adjusts the raise while raise is selected", () => {
        const ui = newBettingUi(50, 10, 20);
        expect(increaseRaise(ui).raiseAmount).toBe(20);
        const raising = selectNextAction(ui);
        expect(increaseRaise(raising).raiseAmount).toBe(40);
        expect(increaseRaise(increaseRaise(raising)).raiseAmount).toBe(50);
        expect(decreaseRaise(raising).raiseAmount).toBe(20);
        expect(setAllIn(raising).raiseAmount).toBe(50);
        expect(setAllIn(ui)).toMatchObject({ selectedAction: "raise", raiseAmount: 50 });
    });

    it("lets a bigger stack raise over a short all-in", () => {
        const chips = {
            player1: 0,
            player2: 100,
            player3: 1000,
            player1_bet: 90,
            player2_bet: 0,
            player3_bet: 0,
        };
        expect(facingAllIn(chips, 2)).toBe(true);
        expect(raiseBounds(100, 90, 110, true)).toEqual({ minRaise: 91, maxRaise: 100 });
        expect(raiseBounds(1000, 90, 110, true)).toEqual({ minRaise: 110, maxRaise: 1000 });
        expect(raiseBounds(100, 90, 110, false)).toEqual({ minRaise: 110, maxRaise: 100 });
    });
});

describe("GameModel", () => {
    it("clamps blind frequency to 1..99", () => {
        const model = newGameModel("Devnet");
        model.blindFrequency = 99;
        increaseBlindFrequency(model);
        expect(model.blindFrequency).toBe(99);
        model.blindFrequency = 1;
        decreaseBlindFrequency(model);
        expect(model.blindFrequency).toBe(1);
    });
});

describe("credits", () => {
    it("formats like the Rust Credits display", () => {
        expect(formatCredits(100_000_000n)).toBe("100");
        expect(formatCredits(1_500_000n)).toBe("1.5");
        expect(formatCredits(1n)).toBe("0.000001");
    });

    it("parses buy-in input", () => {
        expect(parseCreditsInput("100")).toBe(100_000_000n);
        expect(parseCreditsInput("2.25")).toBe(2_250_000n);
        expect(parseCreditsInput("")).toBe(100_000_000n);
    });
});
