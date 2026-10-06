import type { Chips } from "./program.js";
import type { CardView } from "./cards.js";
import type { LobbyTable } from "./lobby.js";
import type { GameState, PlayerId } from "./state.js";

export const MAX_LOGS = 100;

export type Screen = "menu" | "createGame" | "joinGame" | "inGame";

export interface SeatedTableView {
    gameId: number;
    playerIds: number[];
    unfinished: boolean;
}
export type CreateGameField = "buyIn" | "blindFrequency" | "password";
export type JoinGameField = "gameId" | "password";
export type MenuOption = "createGame" | "joinGame";
export type BettingAction = "fold" | "call" | "raise";

export const BETTING_ACTIONS: readonly BettingAction[] = ["fold", "call", "raise"];

export function nextCreateGameField(field: CreateGameField): CreateGameField {
    switch (field) {
        case "buyIn":
            return "blindFrequency";
        case "blindFrequency":
            return "password";
        case "password":
            return "buyIn";
    }
}

export function nextJoinGameField(field: JoinGameField): JoinGameField {
    return field === "gameId" ? "password" : "gameId";
}

export function nextMenuOption(option: MenuOption): MenuOption {
    return option === "createGame" ? "joinGame" : "createGame";
}

export interface BettingUIState {
    selectedAction: BettingAction;
    raiseAmount: number;
    callAmount: number;
    minRaise: number;
    maxRaise: number;
}

export function newBettingUi(playerChips: number, callAmount: number, minRaise: number): BettingUIState {
    const maxRaise = Math.max(playerChips, 0);
    return {
        selectedAction: "call",
        raiseAmount: Math.min(Math.max(minRaise, 0), maxRaise),
        callAmount,
        minRaise,
        maxRaise,
    };
}

/** Another seat has put their last chips in and still has a live bet. */
export function facingAllIn(chips: Chips, playerId: PlayerId): boolean {
    return ([1, 2, 3] as const).some(
        (id) => id !== playerId && getChips(chips, id) === 0 && getCurrentBet(chips, id) > 0,
    );
}

/**
 * Chips this player may put in above a call.
 * A full raise uses the table's minimum. Facing an all-in, a player who still
 * has more chips than the call can raise any amount up to their stack. The
 * chain accepts that bet; it does not have to be a full minimum raise.
 */
export function raiseBounds(
    playerChips: number,
    callAmount: number,
    fullMinRaise: number,
    opponentAllIn: boolean,
): { minRaise: number; maxRaise: number } {
    const maxRaise = playerChips;
    let minRaise = fullMinRaise;
    if (opponentAllIn && playerChips > callAmount && fullMinRaise > playerChips) {
        minRaise = Math.min(playerChips, callAmount + 1);
    }
    return { minRaise, maxRaise };
}

export function selectNextAction(ui: BettingUIState): BettingUIState {
    const order: Record<BettingAction, BettingAction> = { fold: "call", call: "raise", raise: "fold" };
    return { ...ui, selectedAction: order[ui.selectedAction] };
}

export function selectPrevAction(ui: BettingUIState): BettingUIState {
    const order: Record<BettingAction, BettingAction> = { fold: "raise", call: "fold", raise: "call" };
    return { ...ui, selectedAction: order[ui.selectedAction] };
}

export function increaseRaise(ui: BettingUIState): BettingUIState {
    if (ui.selectedAction !== "raise") {
        return ui;
    }
    return { ...ui, raiseAmount: Math.min(ui.raiseAmount + ui.minRaise, ui.maxRaise) };
}

export function decreaseRaise(ui: BettingUIState): BettingUIState {
    if (ui.selectedAction !== "raise") {
        return ui;
    }
    return { ...ui, raiseAmount: Math.max(Math.max(ui.raiseAmount - ui.minRaise, 0), ui.minRaise) };
}

export function setAllIn(ui: BettingUIState): BettingUIState {
    return { ...ui, selectedAction: "raise", raiseAmount: ui.maxRaise };
}

export function setRaise(ui: BettingUIState, amount: number): BettingUIState {
    const clamped = Math.min(Math.max(Math.round(amount), ui.minRaise), ui.maxRaise);
    return { ...ui, selectedAction: "raise", raiseAmount: clamped };
}

export interface ChipView extends Chips {
    pot: number;
}

export function chipViewFromChips(chips: Chips): ChipView {
    return { ...chips, pot: chips.player1_bet + chips.player2_bet + chips.player3_bet };
}

export function getChips(chips: Chips, playerId: PlayerId): number {
    return playerId === 1 ? chips.player1 : playerId === 2 ? chips.player2 : chips.player3;
}

export function getCurrentBet(chips: Chips, playerId: PlayerId): number {
    return playerId === 1 ? chips.player1_bet : playerId === 2 ? chips.player2_bet : chips.player3_bet;
}

export function highestBet(chips: Chips): number {
    return Math.max(chips.player1_bet, chips.player2_bet, chips.player3_bet);
}

export type LogStatus = "info" | "pending" | "done" | "error";

export interface LogEntry {
    id: number;
    status: LogStatus;
    message: string;
    at: number;
}

export interface GameModel {
    gameId: number | null;
    gameInitialized: boolean;
    lastPollTime: number;
    currentState: GameState | null;
    currentPlayerId: PlayerId | 0;

    screen: Screen;
    selectedMenuOption: MenuOption;
    gameIdInput: string;
    passwordInput: string;
    buyInInput: string;
    blindFrequency: number;
    createGameField: CreateGameField;
    joinGameField: JoinGameField;
    logs: LogEntry[];

    shouldQuit: boolean;

    decryptedHand: [number, number] | null;

    card: CardView | null;
    chip: ChipView | null;

    bettingUi: BettingUIState | null;

    lastKnownGameId: number;

    seatedTables: SeatedTableView[];
    lobbyTables: LobbyTable[];
    lobbyReady: boolean;
    blockedGameId: number | null;
    spectating: boolean;

    playerAddresses: [string, string, string] | null;
    eliminatedPlayers: [boolean, boolean, boolean];
    gameWinner: PlayerId | null;
    dealerButton: number;
    backgroundTask: string | null;
    backgroundTaskStartedMs: number | null;
}

let nextLogId = 1;

export function newGameModel(networkName: string): GameModel {
    const model: GameModel = {
        gameId: null,
        gameInitialized: false,
        lastPollTime: 0,
        currentState: null,
        currentPlayerId: 0,
        screen: "menu",
        selectedMenuOption: "createGame",
        gameIdInput: "",
        passwordInput: "",
        buyInInput: "5",
        blindFrequency: 3,
        createGameField: "buyIn",
        joinGameField: "gameId",
        logs: [],
        shouldQuit: false,
        decryptedHand: null,
        card: null,
        chip: null,
        bettingUi: null,
        lastKnownGameId: 0,
        seatedTables: [],
        lobbyTables: [],
        lobbyReady: false,
        blockedGameId: null,
        spectating: false,
        playerAddresses: null,
        eliminatedPlayers: [false, false, false],
        gameWinner: null,
        dealerButton: 0,
        backgroundTask: null,
        backgroundTaskStartedMs: null,
    };
    log(model, `Starting poker on ${networkName}`);
    return model;
}

function addLog(model: GameModel, status: LogStatus, message: string): void {
    model.logs = [...model.logs, { id: nextLogId++, status, message, at: Date.now() }].slice(-MAX_LOGS);
}

export function log(model: GameModel, message: string): void {
    addLog(model, message.startsWith("Error") ? "error" : "info", message);
}

export function logActionStart(model: GameModel, message: string): void {
    addLog(model, "pending", message);
}

export function logActionComplete(model: GameModel): void {
    const last = model.logs[model.logs.length - 1];
    if (last?.status === "pending") {
        model.logs = [...model.logs.slice(0, -1), { ...last, status: "done" }];
    }
}

export function updateEliminatedPlayers(model: GameModel, playersOutBitmap: number): void {
    model.eliminatedPlayers = [
        (playersOutBitmap & 1) !== 0,
        (playersOutBitmap & 2) !== 0,
        (playersOutBitmap & 4) !== 0,
    ];
}

export function isPlayerEliminated(model: GameModel, playerId: number): boolean {
    return playerId >= 1 && playerId <= 3 ? model.eliminatedPlayers[playerId - 1] : false;
}

export function checkForWinner(model: GameModel): PlayerId | null {
    const active = ([1, 2, 3] as const).filter((id) => !isPlayerEliminated(model, id));
    if (active.length === 1) {
        model.gameWinner = active[0];
        return active[0];
    }
    return null;
}

export function increaseBlindFrequency(model: GameModel): void {
    model.blindFrequency = Math.min(model.blindFrequency + 1, 99);
}

export function decreaseBlindFrequency(model: GameModel): void {
    model.blindFrequency = Math.max(model.blindFrequency - 1, 1);
}

export function formatCredits(microcredits: bigint | number): string {
    const value = BigInt(microcredits);
    const whole = value / 1_000_000n;
    const fraction = value % 1_000_000n;
    if (fraction === 0n) {
        return whole.toString();
    }
    return `${whole}.${fraction.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

export function parseCreditsInput(input: string, fallback = 100): bigint {
    const trimmed = input.trim();
    if (!/^\d*(\.\d{0,6})?$/.test(trimmed) || trimmed === "" || trimmed === ".") {
        return BigInt(fallback) * 1_000_000n;
    }
    const [whole, fraction = ""] = trimmed.split(".");
    return BigInt(whole || "0") * 1_000_000n + BigInt(fraction.padEnd(6, "0") || "0");
}

export function parsePassword(input: string): bigint {
    if (!/^\d+$/.test(input)) {
        return 0n;
    }
    const value = BigInt(input);
    return value < 1n << 128n ? value : 0n;
}
