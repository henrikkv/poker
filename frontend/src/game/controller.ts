import type { Session } from "../net/aleo.js";
import { latestHeight, publicBalance } from "../net/chain.js";
import {
    decreaseBlindFrequency,
    decreaseRaise,
    increaseBlindFrequency,
    increaseRaise,
    log,
    newGameModel,
    nextCreateGameField,
    nextJoinGameField,
    nextMenuOption,
    selectNextAction,
    selectPrevAction,
    setAllIn,
    setRaise,
    shouldPoll,
    type BettingAction,
    type CreateGameField,
    type GameModel,
    type JoinGameField,
    type MenuOption,
} from "./model.js";
import { decryptionLogMessage } from "./state.js";
import { parseJoinTarget } from "../ens/parse.js";
import { errorMessage, PokerGame, type GameCommand } from "./poker.js";
import { clearSeat, loadSeat, saveSeat } from "./seat.js";

export type ResolveEnsTable = (input: string) => Promise<{ gameId: number; tableName: string }>;

export type GameMessage =
    | { type: "charInput"; char: string }
    | { type: "backspace" }
    | { type: "confirm" }
    | { type: "back" }
    | { type: "tick" }
    | { type: "left" }
    | { type: "right" }
    | { type: "up" }
    | { type: "down" }
    | { type: "selectMenu"; option: MenuOption }
    | { type: "focusCreateField"; field: CreateGameField }
    | { type: "focusJoinField"; field: JoinGameField }
    | { type: "setInput"; field: "buyIn" | "password" | "gameId"; value: string }
    | { type: "setBlindFrequency"; value: number }
    | { type: "selectBetAction"; action: BettingAction }
    | { type: "setRaise"; amount: number }
    | { type: "allIn" }
    | { type: "gameInitialized"; error?: string }
    | { type: "gameJoined"; error?: string }
    | { type: "gameStatePolled"; error?: string }
    | { type: "betPlaced"; error?: string }
    | { type: "handsCompared"; error?: string }
    | { type: "newShuffleComplete"; error?: string };

type Command =
    | GameCommand
    | { type: "prepareJoin"; gameId: number }
    | { type: "resumeGame"; gameId: number }
    | { type: "findMyGame" }
    | { type: "resolveEnsJoin"; input: string };

function isSync(command: Command): boolean {
    return (
        command.type === "refreshGameState" ||
        command.type === "searchForGame" ||
        command.type === "prepareJoin" ||
        command.type === "resumeGame" ||
        command.type === "findMyGame" ||
        command.type === "resolveEnsJoin"
    );
}

function backgroundLabel(command: GameCommand): string {
    switch (command.type) {
        case "initializeGame":
            return "Creating game";
        case "joinGame":
            return "Joining game";
        case "searchForGame":
            return "Searching for game";
        case "refreshGameState":
            return "Updating game state";
        case "placeBet":
            return "Submitting bet";
        case "autoDecrypt":
            return decryptionLogMessage(command.step);
        case "autoNewShuffle":
            return "Starting new hand";
        case "autoShuffleDeck":
            return "Shuffling deck";
        case "autoCompare":
            return "Comparing hands";
        case "autoClaim":
            return "Claiming prize";
    }
}

export interface ClientStatus {
    address: string;
    balance: bigint | null;
    height: number | null;
    nodeError: string | null;
}

export interface Snapshot {
    model: GameModel;
    status: ClientStatus;
    busy: boolean;
}

const DRIVE_INTERVAL_MS = 100;
const STATUS_INTERVAL_MS = 3000;

export class GameController {
    private model: GameModel;
    private status: ClientStatus;
    private readonly handle: PokerGame;
    private pendingCommand: Command | null = null;
    private running: Promise<void> | null = null;
    private syncBusy = false;
    private snapshot: Snapshot;
    private readonly listeners = new Set<() => void>();
    private timers: ReturnType<typeof setInterval>[] = [];

    constructor(
        readonly session: Session,
        networkName: string,
        private readonly endpoint: string,
        private readonly resolveEnsTable?: ResolveEnsTable,
    ) {
        const address = session.address();
        const seat = loadSeat(address);
        this.handle = new PokerGame(session, seat);
        this.model = newGameModel(networkName);
        if (seat) {
            this.model.lastKnownGameId = seat.lastKnownGameId;
            this.model.gameId = seat.gameId;
        }
        this.status = {
            address,
            balance: null,
            height: null,
            nodeError: null,
        };
        this.snapshot = this.buildSnapshot();
    }

    start(): void {
        this.timers.push(setInterval(() => void this.drive(), DRIVE_INTERVAL_MS));
        this.timers.push(setInterval(() => void this.refreshStatus(), STATUS_INTERVAL_MS));
        void this.refreshStatus();
        this.resumeIfSeated();
        void this.drive();
    }

    stop(): void {
        this.timers.forEach(clearInterval);
        this.timers = [];
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): Snapshot => this.snapshot;

    dispatch = (msg: GameMessage): void => {
        this.processMessage(msg);
        this.emit();
        void this.drive();
    };

    private buildSnapshot(): Snapshot {
        return {
            model: { ...this.model },
            status: { ...this.status },
            busy: this.running !== null,
        };
    }

    private emit(): void {
        this.snapshot = this.buildSnapshot();
        this.listeners.forEach((listener) => listener());
    }

    private persistSeat(): void {
        saveSeat(this.status.address, {
            gameId: this.model.gameId,
            lastKnownGameId: this.model.lastKnownGameId,
            secret: this.handle.secret,
            secretInv: this.handle.secretInv,
        });
    }

    private resumeIfSeated(): void {
        const seat = loadSeat(this.status.address);
        if (seat?.gameId !== null && seat?.gameId !== undefined) {
            this.model.screen = "inGame";
            log(this.model, `Rejoining game ${seat.gameId}`);
            this.pendingCommand = { type: "resumeGame", gameId: seat.gameId };
        } else {
            log(this.model, "Looking for a table you already sit in");
            this.pendingCommand = { type: "findMyGame" };
        }
        this.emit();
    }

    private async sitAsPlayer(gameId: number): Promise<void> {
        await this.handle.trySetPlayerId(gameId);
        this.model.gameId = gameId;
        this.model.gameInitialized = true;
        this.model.currentPlayerId = this.handle.playerId;
        this.model.screen = "inGame";
        this.persistSeat();
        this.pendingCommand = { type: "refreshGameState", gameId };
    }

    private async refreshStatus(): Promise<void> {
        try {
            this.status.height = await latestHeight(this.endpoint);
            this.status.nodeError = null;
            this.status.balance = await publicBalance(this.session, this.status.address);
        } catch (error) {
            this.status.nodeError = errorMessage(error);
        }
        this.emit();
    }

    private processMessage(msg: GameMessage): void {
        let current: GameMessage | null = msg;
        while (current) {
            current = this.update(current);
        }
    }

    private async drive(): Promise<void> {
        if (this.syncBusy) {
            return;
        }
        this.update({ type: "tick" });

        const command = this.pendingCommand;
        if (!command) {
            return;
        }

        if (this.running) {
            if (command.type === "refreshGameState") {
                this.pendingCommand = null;
                await this.runSync(() => this.handle.updateRenderData(command.gameId, this.model));
                this.model.lastPollTime = Date.now();
            }
            return;
        }

        this.pendingCommand = null;
        if (isSync(command)) {
            await this.runSync(() => this.runSyncCommand(command));
            return;
        }

        this.startBackground(command as GameCommand);
    }

    private async runSync(work: () => Promise<GameMessage | null | void>): Promise<void> {
        this.syncBusy = true;
        try {
            const message = await work();
            if (message) {
                this.processMessage(message);
            }
        } catch (error) {
            log(this.model, `Error polling: ${errorMessage(error)}`);
            this.model.lastPollTime = Date.now();
        } finally {
            this.syncBusy = false;
            this.emit();
        }
    }

    private async runSyncCommand(command: Command): Promise<GameMessage | null> {
        const handle = this.handle;
        const model = this.model;
        switch (command.type) {
            case "refreshGameState": {
                let stateChanged: boolean;
                try {
                    stateChanged = await handle.refreshGameState(model, command.gameId);
                } catch (error) {
                    model.lastPollTime = Date.now();
                    return { type: "gameStatePolled", error: errorMessage(error) };
                }
                const next = await handle.detectAutoAction(model, command.gameId, stateChanged);
                if (next) {
                    this.pendingCommand = next;
                }
                return { type: "gameStatePolled" };
            }

            case "searchForGame": {
                if (model.gameId !== null) {
                    if (await handle.checkGameExists(model.gameId)) {
                        await this.sitAsPlayer(model.gameId);
                        log(model, `You are Player ${model.currentPlayerId}`);
                    } else {
                        this.pendingCommand = { type: "searchForGame" };
                    }
                    return null;
                }
                const found = await handle.searchForPlayerGame(model);
                if (found !== null) {
                    log(model, `Found game ${found}`);
                    try {
                        await this.sitAsPlayer(found);
                        log(model, `You are Player ${model.currentPlayerId}`);
                    } catch (error) {
                        log(model, `Warning: Could not determine player ID: ${errorMessage(error)}`);
                        this.pendingCommand = { type: "refreshGameState", gameId: found };
                    }
                } else {
                    model.lastKnownGameId += 1;
                    this.persistSeat();
                    this.pendingCommand = { type: "searchForGame" };
                }
                return null;
            }

            case "resumeGame":
            case "prepareJoin": {
                const id = command.gameId;
                const game = await handle.poker.get_games(id);
                if (!game) {
                    log(model, `Game ${id} does not exist`);
                    if (command.type === "resumeGame") {
                        this.pendingCommand = { type: "findMyGame" };
                    } else {
                        model.gameId = null;
                        model.screen = "joinGame";
                    }
                    return null;
                }
                if (handle.playerIdFromGame(game) !== null) {
                    await this.sitAsPlayer(id);
                    log(model, `Rejoined game ${id} as P${model.currentPlayerId}`);
                    return null;
                }
                if (command.type === "resumeGame") {
                    this.pendingCommand = { type: "findMyGame" };
                    return null;
                }
                const state = game.state;
                if (state === 0 || state === 1) {
                    this.pendingCommand = { type: "joinGame", gameId: id };
                } else {
                    log(model, `Spectating game ${id} (already started)`);
                    model.gameInitialized = true;
                    this.pendingCommand = { type: "refreshGameState", gameId: id };
                }
                return null;
            }

            case "findMyGame": {
                const found = await handle.findSeatedGame();
                if (found === null) {
                    clearSeat(this.status.address);
                    model.gameId = null;
                    model.gameInitialized = false;
                    model.screen = "menu";
                    return null;
                }
                await this.sitAsPlayer(found);
                log(model, `Rejoined game ${found} as P${model.currentPlayerId}`);
                return null;
            }

            case "resolveEnsJoin": {
                if (!this.resolveEnsTable) {
                    log(model, "Error: ENS resolution is not available");
                    return null;
                }
                log(model, `Resolving ${command.input} on ENSv2 Sepolia`);
                try {
                    const table = await this.resolveEnsTable(command.input);
                    model.gameId = table.gameId;
                    model.screen = "inGame";
                    log(model, `${table.tableName} → Aleo game ${table.gameId}`);
                    this.pendingCommand = { type: "prepareJoin", gameId: table.gameId };
                } catch (error) {
                    log(model, `Error: ${errorMessage(error)}`);
                }
                return null;
            }

            default:
                return null;
        }
    }

    private startBackground(command: GameCommand): void {
        this.model.backgroundTask = `Waiting for wallet: ${backgroundLabel(command)}`;
        this.model.backgroundTaskStartedMs = Date.now();

        this.running = this.runBackgroundCommand(command).then((message) => {
            this.running = null;
            this.model.backgroundTask = null;
            this.model.backgroundTaskStartedMs = null;
            if (message && "error" in message && message.error !== undefined && command.type.startsWith("auto")) {
                this.model.currentState = null;
            }
            if (message) {
                this.processMessage(message);
            }
            this.emit();
            void this.drive();
        });
        this.emit();
    }

    private async runBackgroundCommand(command: GameCommand): Promise<GameMessage | null> {
        const handle = this.handle;
        const model = this.model;
        const capture = async (work: () => Promise<void>): Promise<string | undefined> => {
            try {
                await work();
                return undefined;
            } catch (error) {
                return errorMessage(error);
            }
        };

        switch (command.type) {
            case "initializeGame": {
                log(model, "Creating new game");
                return { type: "gameInitialized", error: await capture(() => handle.initializeGame(model)) };
            }
            case "joinGame": {
                const playerNum = (await handle.getGameState(command.gameId)) === 0 ? 2 : 3;
                log(model, `Joining game ${command.gameId} as Player ${playerNum}`);
                return { type: "gameJoined", error: await capture(() => handle.joinGame(model, command.gameId)) };
            }
            case "placeBet":
                return {
                    type: "betPlaced",
                    error: await capture(() =>
                        handle.placeBet(model, command.gameId, command.action, command.amount),
                    ),
                };
            case "autoDecrypt":
                return {
                    type: "gameStatePolled",
                    error: await capture(() => handle.executeAutoDecrypt(model, command.gameId, command.step)),
                };
            case "autoNewShuffle":
                return {
                    type: "newShuffleComplete",
                    error: await capture(() => handle.newShuffle(model, command.gameId)),
                };
            case "autoShuffleDeck":
                return {
                    type: "newShuffleComplete",
                    error: await capture(() => handle.shuffleExistingDeck(model, command.gameId)),
                };
            case "autoCompare":
                return {
                    type: "handsCompared",
                    error: await capture(() => handle.executeAutoCompare(model, command.gameId)),
                };
            case "autoClaim":
                return {
                    type: "gameStatePolled",
                    error: await capture(() => handle.executeAutoClaim(model, command.gameId)),
                };
            default:
                return null;
        }
    }

    private refreshAfter(): void {
        if (this.model.gameId !== null) {
            this.pendingCommand = { type: "refreshGameState", gameId: this.model.gameId };
        }
    }

    private update(msg: GameMessage): GameMessage | null {
        const model = this.model;
        switch (msg.type) {
            case "charInput": {
                const c = msg.char;
                if (model.screen === "joinGame") {
                    if (model.joinGameField === "gameId" && /^[a-zA-Z0-9.-]$/.test(c)) {
                        model.gameIdInput += c;
                    } else if (model.joinGameField === "password" && /^\d$/.test(c)) {
                        model.passwordInput += c;
                    }
                } else if (model.screen === "createGame") {
                    if (model.createGameField === "buyIn") {
                        const next = model.buyInInput + c;
                        if (/^\d*(\.\d{0,6})?$/.test(next)) model.buyInInput = next;
                    } else if (model.createGameField === "password" && /^\d$/.test(c)) {
                        model.passwordInput += c;
                    }
                }
                return null;
            }

            case "backspace": {
                if (model.screen === "joinGame") {
                    if (model.joinGameField === "gameId") model.gameIdInput = model.gameIdInput.slice(0, -1);
                    else model.passwordInput = model.passwordInput.slice(0, -1);
                } else if (model.screen === "createGame") {
                    if (model.createGameField === "buyIn") model.buyInInput = model.buyInInput.slice(0, -1);
                    else if (model.createGameField === "password")
                        model.passwordInput = model.passwordInput.slice(0, -1);
                }
                return null;
            }

            case "setInput": {
                if (msg.field === "buyIn") {
                    if (/^\d*(\.\d{0,6})?$/.test(msg.value)) model.buyInInput = msg.value;
                } else if (msg.field === "gameId") {
                    if (/^[a-zA-Z0-9.-]*$/.test(msg.value)) model.gameIdInput = msg.value;
                } else if (/^\d*$/.test(msg.value)) {
                    model.passwordInput = msg.value;
                }
                return null;
            }

            case "setBlindFrequency": {
                model.blindFrequency = Math.min(Math.max(Math.round(msg.value) || 1, 1), 99);
                return null;
            }

            case "focusCreateField":
                model.createGameField = msg.field;
                return null;

            case "focusJoinField":
                model.joinGameField = msg.field;
                return null;

            case "selectMenu":
                model.selectedMenuOption = msg.option;
                return { type: "confirm" };

            case "back": {
                if (model.screen === "createGame" || model.screen === "joinGame") {
                    model.screen = "menu";
                }
                return null;
            }

            case "confirm": {
                switch (model.screen) {
                    case "menu":
                        if (model.selectedMenuOption === "createGame") {
                            model.screen = "createGame";
                            model.buyInInput = "5";
                            model.blindFrequency = 3;
                            model.passwordInput = "";
                            model.createGameField = "buyIn";
                        } else {
                            model.screen = "joinGame";
                            model.gameIdInput = "";
                            model.passwordInput = "";
                            model.joinGameField = "gameId";
                        }
                        break;
                    case "createGame":
                        model.screen = "inGame";
                        this.pendingCommand = { type: "initializeGame" };
                        break;
                    case "joinGame": {
                        const target = parseJoinTarget(model.gameIdInput);
                        if (!target) break;
                        if (target.kind === "gameId") {
                            model.gameId = target.gameId;
                            model.screen = "inGame";
                            this.pendingCommand = { type: "prepareJoin", gameId: target.gameId };
                        } else {
                            this.pendingCommand = { type: "resolveEnsJoin", input: target.name };
                        }
                        break;
                    }
                    case "inGame":
                        if (model.bettingUi && model.gameId !== null && !this.running) {
                            this.pendingCommand = {
                                type: "placeBet",
                                gameId: model.gameId,
                                action: model.bettingUi.selectedAction,
                                amount: model.bettingUi.raiseAmount,
                            };
                        }
                        break;
                }
                return null;
            }

            case "left":
            case "right": {
                const forward = msg.type === "right";
                if (model.screen === "menu") {
                    model.selectedMenuOption = nextMenuOption(model.selectedMenuOption);
                } else if (model.screen === "createGame") {
                    model.createGameField = nextCreateGameField(model.createGameField);
                } else if (model.screen === "joinGame") {
                    model.joinGameField = nextJoinGameField(model.joinGameField);
                } else if (model.bettingUi) {
                    model.bettingUi = forward ? selectNextAction(model.bettingUi) : selectPrevAction(model.bettingUi);
                }
                return null;
            }

            case "up":
            case "down": {
                const up = msg.type === "up";
                if (model.screen === "menu") {
                    model.selectedMenuOption = nextMenuOption(model.selectedMenuOption);
                } else if (model.screen === "createGame") {
                    if (model.createGameField === "blindFrequency") {
                        if (up) increaseBlindFrequency(model);
                        else decreaseBlindFrequency(model);
                    }
                } else if (model.bettingUi) {
                    model.bettingUi = up ? increaseRaise(model.bettingUi) : decreaseRaise(model.bettingUi);
                }
                return null;
            }

            case "selectBetAction":
                if (model.bettingUi) {
                    model.bettingUi = { ...model.bettingUi, selectedAction: msg.action };
                }
                return null;

            case "setRaise":
                if (model.bettingUi) {
                    model.bettingUi = setRaise(model.bettingUi, msg.amount);
                }
                return null;

            case "allIn":
                if (model.bettingUi) {
                    model.bettingUi = setAllIn({ ...model.bettingUi, selectedAction: "raise" });
                }
                return null;

            case "tick":
                if (
                    model.gameInitialized &&
                    shouldPoll(model) &&
                    this.pendingCommand === null &&
                    model.gameId !== null
                ) {
                    this.pendingCommand = { type: "refreshGameState", gameId: model.gameId };
                }
                return null;

            case "gameInitialized":
                if (msg.error === undefined) {
                    model.gameInitialized = true;
                    model.currentPlayerId = this.handle.playerId;
                    this.persistSeat();
                    this.pendingCommand = { type: "searchForGame" };
                } else {
                    log(model, `Error initializing: ${msg.error}`);
                    model.screen = "createGame";
                }
                return null;

            case "gameJoined":
                if (msg.error === undefined) {
                    model.gameInitialized = true;
                    model.currentPlayerId = this.handle.playerId;
                    this.persistSeat();
                    this.refreshAfter();
                } else {
                    log(model, `Error joining: ${msg.error}`);
                    model.gameId = null;
                    model.screen = "joinGame";
                }
                return null;

            case "gameStatePolled":
                if (msg.error !== undefined) {
                    log(model, `Error polling: ${msg.error}`);
                }
                return null;

            case "betPlaced":
                if (msg.error === undefined) {
                    model.bettingUi = null;
                    this.refreshAfter();
                } else {
                    log(model, `Error placing bet: ${msg.error}`);
                }
                return null;

            case "handsCompared":
                if (msg.error === undefined) {
                    this.refreshAfter();
                } else {
                    log(model, `Error comparing hands: ${msg.error}`);
                }
                return null;

            case "newShuffleComplete":
                if (msg.error === undefined) {
                    this.refreshAfter();
                } else {
                    log(model, `Error shuffling new hand: ${msg.error}`);
                }
                return null;
        }
    }
}
