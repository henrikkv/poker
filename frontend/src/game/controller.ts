import type { EnsJoinResult } from "../ens/resolve.js";
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
    type SeatedTableView,
} from "./model.js";
import { decryptionLogMessage, isLobbyState } from "./state.js";
import { parseJoinTarget } from "../ens/parse.js";
import { loadRoster } from "../ens/roster.js";
import { errorMessage, PokerGame, type GameCommand, type SeatedGameInfo } from "./poker.js";
import {
    hideJoinedTable,
    listJoinedTables,
    loadJoinedTable,
    loadSeat,
    rememberJoinedTable,
    saveSeat,
} from "./seat.js";

export type ResolveEnsTable = (input: string) => Promise<EnsJoinResult>;
export type JoinIdentity = () => { name: string | null; aleo: string | null };

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
    | { type: "resumeTable"; gameId: number }
    | { type: "leaveLocally" }
    | { type: "hideTable"; gameId: number }
    | { type: "leaveLocallyAnyway" }
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
    | { type: "scanSeats" }
    | { type: "guardCreate" }
    | { type: "resolveEnsJoin"; input: string };

function isSync(command: Command): boolean {
    return (
        command.type === "refreshGameState" ||
        command.type === "searchForGame" ||
        command.type === "prepareJoin" ||
        command.type === "resumeGame" ||
        command.type === "scanSeats" ||
        command.type === "guardCreate" ||
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

    private autoQueuedForState: number | null = null;
    private searchAttempts = 0;
    private joinRetryUsed = false;
    private allowSecondSeat = false;

    constructor(
        readonly session: Session,
        networkName: string,
        private readonly endpoint: string,
        private readonly resolveEnsTable?: ResolveEnsTable,
        private readonly joinIdentity?: JoinIdentity,
    ) {
        const address = session.address();
        const seat = loadSeat(address);
        this.handle = new PokerGame(session, seat);
        this.model = newGameModel(networkName);
        if (seat) {
            this.model.lastKnownGameId = seat.lastKnownGameId;
            this.model.gameId = seat.gameId;
        }
        this.model.seatedTables = listJoinedTables(address).map((table) => ({
            gameId: table.gameId,
            playerIds: table.playerIds,
            unfinished: true,
        }));
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

    async settleHouseFunds(): Promise<void> {
        if (!this.session.returnFunds) {
            return;
        }
        try {
            log(this.model, "Returning leftover credits");
            await this.session.returnFunds();
            log(this.model, "Returned leftover credits");
        } catch (error) {
            log(this.model, `Could not return leftover credits: ${errorMessage(error)}`);
        }
        this.emit();
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

    private knownSeatIds(): number[] {
        const ids = listJoinedTables(this.status.address).map((table) => table.gameId);
        const seat = loadSeat(this.status.address);
        if (seat?.gameId !== null && seat?.gameId !== undefined) {
            ids.push(seat.gameId);
        }
        if (this.model.gameId !== null) {
            ids.push(this.model.gameId);
        }
        return [...new Set(ids)];
    }

    private rememberSeated(tables: SeatedGameInfo[]): void {
        this.model.seatedTables = tables.map(
            (table): SeatedTableView => ({
                gameId: table.gameId,
                playerIds: table.playerIds,
                unfinished: table.unfinished,
            }),
        );
        for (const table of tables) {
            rememberJoinedTable(table.gameId, this.status.address, table.playerIds);
        }
    }

    private nameAlreadySeated(game: { player1: string; player2: string; player3: string }): boolean {
        const identity = this.joinIdentity?.();
        const name = identity?.name;
        if (!name || this.handle.playerIdFromGame(game) !== null) {
            return false;
        }
        const roster = loadRoster();
        const published = identity?.aleo;
        for (const address of [game.player1, game.player2, game.player3]) {
            if (!address) {
                continue;
            }
            if (roster.aleo[address] === name) {
                return true;
            }
            if (published && address === published && address !== this.status.address) {
                return true;
            }
        }
        return false;
    }

    private persistSeat(): void {
        saveSeat(this.status.address, {
            gameId: this.model.gameId,
            lastKnownGameId: this.model.lastKnownGameId,
            secret: this.handle.secret,
            secretInv: this.handle.secretInv,
        });
        if (this.model.gameId !== null && this.handle.playerId !== 0) {
            const prior = loadJoinedTable(this.model.gameId);
            const playerIds = new Set(prior?.address === this.status.address ? prior.playerIds : []);
            playerIds.add(this.handle.playerId);
            rememberJoinedTable(this.model.gameId, this.status.address, [...playerIds]);
        }
    }

    private resumeIfSeated(): void {
        log(this.model, "Looking for tables you already joined");
        this.pendingCommand = { type: "scanSeats" };
        this.emit();
    }

    private leaveTableLocally(hideCurrent: boolean): void {
        if (hideCurrent && this.model.gameId !== null) {
            hideJoinedTable(this.model.gameId);
        }
        this.model.gameId = null;
        this.model.gameInitialized = false;
        this.model.screen = "menu";
        this.model.currentState = null;
        this.model.currentPlayerId = 0;
        this.model.card = null;
        this.model.chip = null;
        this.model.bettingUi = null;
        this.model.spectating = false;
        this.model.playerAddresses = null;
        this.model.gameWinner = null;
        this.model.backgroundTask = null;
        this.model.inviteGameId = null;
        this.pendingCommand = null;
        this.persistSeat();
        this.model.seatedTables = listJoinedTables(this.status.address).map((table) => ({
            gameId: table.gameId,
            playerIds: table.playerIds,
            unfinished: true,
        }));
    }

    private async blockIfSeatedElsewhere(targetId: number | null): Promise<number | null> {
        if (this.allowSecondSeat) {
            return null;
        }
        const unfinished = await this.handle.findUnfinishedSeat(this.knownSeatIds());
        if (unfinished !== null && unfinished !== targetId) {
            this.model.blockedGameId = unfinished;
            log(this.model, `You are already in game ${unfinished}`);
            this.model.screen = "menu";
            this.model.gameId = null;
            this.model.gameInitialized = false;
            try {
                this.rememberSeated(await this.handle.findSeatedGames(this.knownSeatIds()));
            } catch {
                // Keep the local list if the chain read fails.
            }
            return unfinished;
        }
        return null;
    }

    private async sitAsPlayer(gameId: number): Promise<void> {
        await this.handle.trySetPlayerId(gameId);
        this.model.gameId = gameId;
        this.model.gameInitialized = true;
        this.model.currentPlayerId = this.handle.playerId;
        this.model.screen = "inGame";
        this.model.spectating = false;
        this.model.blockedGameId = null;
        this.persistSeat();
        const game = await this.handle.poker.get_games(gameId);
        if (game) {
            rememberJoinedTable(gameId, this.status.address, this.handle.seatsFromGame(game));
        }
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
            log(this.model, `Could not refresh the table: ${errorMessage(error)}`);
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
                const next = await handle.detectAutoAction(model, command.gameId);
                if (next && (stateChanged || this.autoQueuedForState !== model.currentState)) {
                    this.pendingCommand = next;
                    this.autoQueuedForState = model.currentState;
                }
                return { type: "gameStatePolled" };
            }

            case "searchForGame": {
                const target = model.gameId ?? model.lastKnownGameId;
                const lookup = await handle.lookupGame(target);
                if (lookup.status === "ok" && handle.playerIdFromGame(lookup.game) !== null) {
                    this.searchAttempts = 0;
                    await this.sitAsPlayer(target);
                    log(model, `You are Player ${model.currentPlayerId}`);
                    return null;
                }
                this.searchAttempts += 1;
                if (lookup.status === "error") {
                    log(model, `Could not read game ${target} yet. Keeping this table.`);
                }
                if (this.searchAttempts < 8) {
                    this.pendingCommand = { type: "searchForGame" };
                    return null;
                }
                this.searchAttempts = 0;
                const found = await handle.findSeatedGame(this.knownSeatIds());
                if (found !== null) {
                    log(model, `Found game ${found}`);
                    await this.sitAsPlayer(found);
                    log(model, `You are Player ${model.currentPlayerId}`);
                    return null;
                }
                log(model, `Game ${target} is not on chain yet. You can hide it locally or keep this tab open.`);
                return null;
            }

            case "resumeGame":
            case "prepareJoin": {
                const id = command.gameId;
                if (command.type === "prepareJoin" && (await this.blockIfSeatedElsewhere(id))) {
                    return null;
                }
                log(model, `Opening game ${id}`);
                model.backgroundTask = `Opening game ${id}`;
                this.emit();
                const lookup = await handle.lookupGame(id);
                model.backgroundTask = null;
                if (lookup.status === "error") {
                    log(model, `Could not read game ${id}. Secrets are kept. Hide this table locally if it is abandoned.`);
                    if (command.type === "resumeGame") {
                        model.screen = "menu";
                        model.gameInitialized = false;
                    } else {
                        model.gameId = null;
                        model.screen = "joinGame";
                    }
                    return null;
                }
                if (lookup.status === "missing") {
                    log(model, `Game ${id} is not ready yet. Secrets are kept.`);
                    if (command.type === "resumeGame") {
                        model.screen = "menu";
                        model.gameInitialized = false;
                    } else {
                        model.gameId = null;
                        model.screen = "joinGame";
                    }
                    return null;
                }
                const game = lookup.game;
                if (handle.playerIdFromGame(game) !== null) {
                    await this.sitAsPlayer(id);
                    const seats = handle.seatsFromGame(game);
                    log(
                        model,
                        seats.length > 1
                            ? `Rejoined game ${id} as Player ${seats.join(" and ")}`
                            : `Rejoined game ${id} as Player ${model.currentPlayerId}`,
                    );
                    return null;
                }
                const prior = loadJoinedTable(id);
                if (prior && prior.address !== this.status.address) {
                    log(
                        model,
                        "This table is abandoned. A reload created a new key, so it cannot be finished. Start a new game and do not republish this id as the only invite.",
                    );
                    model.gameId = null;
                    model.screen = "menu";
                    return null;
                }
                if (command.type === "resumeGame") {
                    log(model, `You are not seated in game ${id}`);
                    this.pendingCommand = { type: "scanSeats" };
                    return null;
                }
                if (this.nameAlreadySeated(game)) {
                    log(model, "This name is already seated at that table");
                    model.gameId = null;
                    model.screen = "joinGame";
                    return null;
                }
                const state = game.state;
                if (isLobbyState(state)) {
                    this.joinRetryUsed = false;
                    this.pendingCommand = { type: "joinGame", gameId: id };
                } else {
                    log(model, `Spectating game ${id} (already started)`);
                    model.gameId = id;
                    model.gameInitialized = true;
                    model.spectating = true;
                    model.currentPlayerId = 0;
                    model.screen = "inGame";
                    this.pendingCommand = { type: "refreshGameState", gameId: id };
                }
                return null;
            }

            case "scanSeats": {
                log(model, "Searching for your tables");
                model.backgroundTask = "Searching for your tables";
                this.emit();
                let seated: SeatedGameInfo[] = [];
                try {
                    seated = await handle.findSeatedGames(this.knownSeatIds());
                } catch (error) {
                    model.backgroundTask = null;
                    log(model, `Could not scan tables: ${errorMessage(error)}. Secrets are kept.`);
                    model.screen = "menu";
                    return null;
                }
                model.backgroundTask = null;
                this.rememberSeated(seated);
                const live = seated.filter((table) => table.unfinished);
                if (live.length === 1) {
                    await this.sitAsPlayer(live[0].gameId);
                    log(model, `Rejoined game ${live[0].gameId} as Player ${model.currentPlayerId}`);
                    return null;
                }
                if (live.length > 1) {
                    log(model, `You have ${live.length} open tables`);
                    model.screen = "menu";
                    model.gameId = null;
                    model.gameInitialized = false;
                    return null;
                }
                log(model, "No table found — create or join from the menu");
                model.gameId = null;
                model.gameInitialized = false;
                model.screen = "menu";
                this.persistSeat();
                return null;
            }

            case "guardCreate": {
                if (await this.blockIfSeatedElsewhere(null)) {
                    return null;
                }
                model.screen = "inGame";
                this.searchAttempts = 0;
                this.pendingCommand = { type: "initializeGame" };
                return null;
            }

            case "resolveEnsJoin": {
                if (!this.resolveEnsTable) {
                    log(model, "Error: ENS resolution is not available");
                    return null;
                }
                log(model, `Looking up ${command.input}`);
                try {
                    const table = await this.resolveEnsTable(command.input);
                    model.tableName = table.tableName;
                    model.inviteGameId = table.inviteGameId;
                    const listed = table.listedIds.length > 0
                        ? table.listedIds
                        : table.inviteGameId !== null
                          ? [table.inviteGameId]
                          : [];
                    if (listed.length === 0) {
                        log(model, `Error: ${table.tableName} is not listing a table right now`);
                        return null;
                    }
                    for (const id of listed) {
                        const lookup = await handle.lookupGame(id, 2);
                        if (lookup.status === "ok" && handle.playerIdFromGame(lookup.game) !== null) {
                            log(model, `${table.tableName} — resuming game ${id}`);
                            await this.sitAsPlayer(id);
                            return null;
                        }
                    }
                    for (const id of [...listed].reverse()) {
                        const lookup = await handle.lookupGame(id, 2);
                        if (lookup.status === "ok" && isLobbyState(lookup.game.state)) {
                            if (await this.blockIfSeatedElsewhere(id)) {
                                return null;
                            }
                            model.gameId = id;
                            model.screen = "inGame";
                            log(model, `${table.tableName} → open lobby ${id}`);
                            this.pendingCommand = { type: "prepareJoin", gameId: id };
                            return null;
                        }
                    }
                    const invite = table.inviteGameId ?? listed[listed.length - 1];
                    log(model, `${table.tableName} — spectating game ${invite}`);
                    model.gameId = invite;
                    model.spectating = true;
                    model.screen = "inGame";
                    this.pendingCommand = { type: "prepareJoin", gameId: invite };
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
        this.model.backgroundTask = backgroundLabel(command);
        this.model.backgroundTaskStartedMs = Date.now();

        this.running = this.runBackgroundCommand(command).then((message) => {
            this.running = null;
            this.model.backgroundTask = null;
            this.model.backgroundTaskStartedMs = null;
            if (message && "error" in message && message.error !== undefined && command.type.startsWith("auto")) {
                this.autoQueuedForState = null;
                this.model.currentState = null;
            }
            if (message) {
                this.processMessage(message);
            }
            if (this.model.gameId !== null && this.pendingCommand === null) {
                this.pendingCommand = { type: "refreshGameState", gameId: this.model.gameId };
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
            case "autoClaim": {
                const error = await capture(() => handle.executeAutoClaim(model, command.gameId));
                if (!error && model.gameId !== null) {
                    hideJoinedTable(model.gameId);
                    await this.settleHouseFunds();
                }
                return { type: "gameStatePolled", error };
            }
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

            case "resumeTable":
                model.blockedGameId = null;
                model.screen = "inGame";
                this.pendingCommand = { type: "resumeGame", gameId: msg.gameId };
                return null;

            case "leaveLocally":
                log(model, "Left locally. On-chain escrow is unchanged.");
                this.leaveTableLocally(false);
                return null;

            case "hideTable":
                log(model, `Hid table ${msg.gameId} on this device`);
                hideJoinedTable(msg.gameId);
                if (model.gameId === msg.gameId) {
                    this.leaveTableLocally(false);
                } else {
                    model.seatedTables = model.seatedTables.filter((table) => table.gameId !== msg.gameId);
                }
                return null;

            case "leaveLocallyAnyway":
                this.allowSecondSeat = true;
                model.blockedGameId = null;
                log(model, "Left locally. Credits in the unfinished table stay locked.");
                this.leaveTableLocally(false);
                return null;

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
                        this.pendingCommand = { type: "guardCreate" };
                        break;
                    case "joinGame": {
                        const target = parseJoinTarget(model.gameIdInput);
                        if (!target) break;
                        if (target.kind === "gameId") {
                            model.gameId = target.gameId;
                            model.screen = "inGame";
                            this.joinRetryUsed = false;
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
                    this.searchAttempts = 0;
                    this.pendingCommand = { type: "searchForGame" };
                } else {
                    log(model, `Error initializing: ${msg.error}`);
                    model.screen = "createGame";
                }
                return null;

            case "gameJoined":
                if (msg.error === undefined) {
                    this.joinRetryUsed = false;
                    model.gameInitialized = true;
                    model.currentPlayerId = this.handle.playerId;
                    this.persistSeat();
                    this.refreshAfter();
                } else if (!this.joinRetryUsed && model.gameId !== null) {
                    this.joinRetryUsed = true;
                    log(model, "That seat was taken. Trying the next open seat.");
                    this.pendingCommand = { type: "prepareJoin", gameId: model.gameId };
                } else {
                    log(model, `Error joining: ${msg.error}`);
                    model.gameId = null;
                    model.screen = "joinGame";
                }
                return null;

            case "gameStatePolled":
                if (msg.error !== undefined) {
                    log(model, `Could not refresh the table: ${msg.error}`);
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
