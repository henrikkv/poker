import type { Session, TransactionInput } from "../net/aleo.js";
import { reservedFeeMicrocredits } from "../net/aleo.js";
import { withExclusiveLock } from "../net/tabLock.js";
import { MentalPoker, type Cards, type Game, type RevealedCards } from "./program.js";
import { recordUid, sameScalar, secretsFromRecord } from "./keysRecord.js";
import type { StoredSeat } from "./seat.js";
import { publicBalance } from "../net/chain.js";
import {
    applyCommunityState,
    cardIndexFromGroup,
    computeCardHashesFromDeck,
    emptyCardView,
    generateSecret,
    getOtherPlayersCards,
    getPlayerCards,
    keyOpensHand,
    openHand,
    presentCardView,
    type CardHashes,
} from "./cards.js";
import { initializedDeck } from "./deck.js";
import {
    chipViewFromChips,
    checkForWinner,
    formatCredits,
    getChips,
    getCurrentBet,
    highestBet,
    isPlayerEliminated,
    log,
    logActionComplete,
    logActionStart,
    facingAllIn,
    newBettingUi,
    raiseBounds,
    parseCreditsInput,
    parsePassword,
    updateEliminatedPlayers,
    type BettingAction,
    type ChipView,
    type GameModel,
} from "./model.js";
import { seatedPlayerIds, sortLobby, toLobbyTable, type LobbyTable } from "./lobby.js";
import {
    currentPlayer,
    decryptionLogMessage,
    describeGameState,
    GameState,
    gameStateFromU8,
    isBettingState,
    isNewHandState,
    isUnfinishedState,
    type DecryptionStep,
    type PlayerId,
} from "./state.js";
import { shuffleDeck } from "./waksman.js";

export type GameLookup =
    | { status: "ok"; game: Game }
    | { status: "missing" }
    | { status: "error"; message: string };

export interface SeatedGameInfo {
    gameId: number;
    playerIds: PlayerId[];
    state: number;
    unfinished: boolean;
}

/** Recent games shown on the menu, plus any id this browser already joined. */
const SCAN_TAIL = 16;

export type GameCommand =
    | { type: "initializeGame" }
    | { type: "joinGame"; gameId: number }
    | { type: "searchForGame" }
    | { type: "refreshGameState"; gameId: number }
    | { type: "placeBet"; gameId: number; action: BettingAction; amount: number }
    | { type: "autoDecrypt"; gameId: number; step: DecryptionStep }
    | { type: "autoNewShuffle"; gameId: number }
    | { type: "autoShuffleDeck"; gameId: number }
    | { type: "autoCompare"; gameId: number }
    | { type: "autoClaim"; gameId: number };

function playerBitmap(playerId: PlayerId): number {
    return 1 << (playerId - 1);
}

export class PokerGame {
    readonly poker: MentalPoker;
    secret: string;
    secretInv: string;
    readonly cardHashes: CardHashes;
    playerId: PlayerId | 0 = 0;
    hasKeys = false;
    /** Wallet handle for the Keys record that matches the secret used on this deck. */
    private keysUid: string | null = null;
    /** Hole-card groups we already searched the wallet for. A new deal searches again. */
    private searchedHand: string | null = null;
    private loggedKeyMiss = false;
    private lastCards: Cards | null = null;

    constructor(readonly session: Session, seat?: StoredSeat | null) {
        this.poker = new MentalPoker(session);
        const { secret, secretInv } = seat ?? generateSecret();
        this.secret = secret;
        this.secretInv = secretInv;
        this.cardHashes = computeCardHashesFromDeck(initializedDeck());
        // A restored seat is the secret this browser already submitted.
        // A local key always signs with the secret it holds. Shield must not
        // treat a freshly generated secret as a Keys record.
        this.hasKeys = seat != null || session.kind === "local";
    }

    get address(): string {
        return this.session.address();
    }

    private requireKeys(): void {
        if (!this.hasKeys) {
            throw new Error("No Keys record in the connected wallet for this game");
        }
    }

    private async requireGame(gameId: number): Promise<Game> {
        const game = await this.poker.get_games(gameId);
        if (!game) {
            throw new Error(`Game ${gameId} not found`);
        }
        return game;
    }

    private async requireBalance(buyIn: bigint): Promise<void> {
        const balance = await publicBalance(this.session, this.address);
        if (balance < buyIn) {
            throw new Error(
                `Insufficient public balance. Need ${formatCredits(buyIn)} credits (buy-in plus fee) but have ${formatCredits(balance)} credits`,
            );
        }
    }

    seatsFromGame(game: Pick<Game, "player1" | "player2" | "player3">): PlayerId[] {
        return seatedPlayerIds(this.address, game);
    }

    playerIdFromGame(game: Pick<Game, "player1" | "player2" | "player3">): PlayerId | null {
        return this.seatsFromGame(game)[0] ?? null;
    }

    adoptActingSeat(game: Game, state: GameState | null): PlayerId | null {
        const seats = this.seatsFromGame(game);
        if (seats.length === 0) {
            return null;
        }
        const turn = state === null ? null : currentPlayer(state);
        const id = turn && seats.includes(turn) ? turn : seats[0];
        this.playerId = id;
        if (this.session.kind === "local") {
            this.hasKeys = true;
        }
        return id;
    }

    async checkGameExists(gameId: number): Promise<boolean> {
        return (await this.poker.get_games(gameId)) !== null;
    }

    async getGameState(gameId: number): Promise<number | null> {
        return (await this.poker.get_games(gameId))?.state ?? null;
    }

    async checkAddressConflict(gameId: number): Promise<boolean> {
        const game = await this.poker.get_games(gameId);
        return game !== null && this.playerIdFromGame(game) !== null;
    }

    async getChip(gameId: number): Promise<ChipView | null> {
        const chips = await this.poker.get_chips(gameId);
        return chips ? chipViewFromChips(chips) : null;
    }

    async trySetPlayerId(gameId: number): Promise<void> {
        const game = await this.requireGame(gameId);
        const id = this.adoptActingSeat(game, gameStateFromU8(game.state));
        if (id === null) {
            throw new Error(`Not a player in game ${gameId}`);
        }
    }

    /**
     * Spend the Keys record whose secret encrypted this deck.
     * A wallet with several unspent Keys records otherwise picks one at random,
     * and that leaves the next street face down.
     */
    private keysInput(): TransactionInput {
        const request = {
            type: "record" as const,
            program: "mental_poker2.aleo",
            recordname: "Keys",
        };
        if (this.keysUid) {
            return { ...request, uid: this.keysUid };
        }
        if (!this.hasKeys) {
            throw new Error("No Keys record in the connected wallet for this game");
        }
        return { ...request, filters: { secret: { eq: this.secret } } };
    }

    private async prepareKeys(cards: Cards | null): Promise<"hit" | "pinned" | "miss" | "empty"> {
        if (this.session.kind === "local") {
            return this.hasKeys ? "hit" : "miss";
        }
        const hand = cards && this.playerId !== 0 ? getPlayerCards(this.playerId, cards) : null;
        const heldOpens = Boolean(hand && this.hasKeys && keyOpensHand(hand, this.secretInv, this.cardHashes));
        if (heldOpens && this.keysUid) {
            return "hit";
        }
        let records: unknown[] = [];
        try {
            records = await this.session.requestRecords("mental_poker2.aleo");
        } catch {
            return "empty";
        }
        if (records.length === 0) {
            return "empty";
        }
        let sameUid: string | null = null;
        for (const record of records) {
            const pair = secretsFromRecord(record);
            const uid = recordUid(record);
            if (!pair) {
                continue;
            }
            if (hand && keyOpensHand(hand, pair.secretInv, this.cardHashes)) {
                if (!heldOpens) {
                    this.secret = pair.secret;
                    this.secretInv = pair.secretInv;
                    this.hasKeys = true;
                }
                if (uid) {
                    this.keysUid = uid;
                }
                return "hit";
            }
            if (this.hasKeys && uid && sameScalar(pair.secret, this.secret)) {
                sameUid = uid;
            }
        }
        if (sameUid) {
            this.keysUid = sameUid;
            return "pinned";
        }
        return "miss";
    }

    private paintCards(state: GameState | null, revealed: RevealedCards | null, model: GameModel): void {
        const locked = model.currentState !== null && isNewHandState(model.currentState) ? model.currentState : state;
        model.card = presentCardView({
            state: locked,
            revealed,
            cards: this.lastCards,
            playerId: model.currentPlayerId,
            secretInv: this.hasKeys ? this.secretInv : null,
            cardHashes: this.cardHashes,
        });
    }

    async lookupGame(gameId: number): Promise<GameLookup> {
        try {
            const game = await this.poker.get_games(gameId);
            if (game) {
                return { status: "ok", game };
            }
            return { status: "missing" };
        } catch (error) {
            return { status: "error", message: errorMessage(error) };
        }
    }

    async findSeatedGames(knownIds: number[] = []): Promise<SeatedGameInfo[]> {
        const found: SeatedGameInfo[] = [];
        for (const gameId of await this.recentGameIds(knownIds)) {
            try {
                const game = await this.poker.get_games(gameId);
                if (!game) {
                    continue;
                }
                const playerIds = this.seatsFromGame(game);
                if (playerIds.length === 0) {
                    continue;
                }
                found.push({
                    gameId,
                    playerIds,
                    state: game.state,
                    unfinished: isUnfinishedState(game.state),
                });
            } catch {
                // A flaky read must not drop a known seat.
            }
        }
        return found;
    }

    async listLobby(knownIds: number[] = []): Promise<LobbyTable[]> {
        const ids = await this.recentGameIds(knownIds);
        const rows = await Promise.all(
            ids.map(async (gameId) => {
                try {
                    const game = await this.poker.get_games(gameId);
                    if (!game) {
                        return null;
                    }
                    return toLobbyTable(gameId, game, this.seatsFromGame(game));
                } catch {
                    return null;
                }
            }),
        );
        return sortLobby(rows.filter((row): row is LobbyTable => row !== null));
    }

    private async recentGameIds(knownIds: number[]): Promise<number[]> {
        let latest = 0;
        try {
            const next = (await this.poker.get_next_game_id(0)) ?? 0;
            latest = next > 0 ? next - 1 : 0;
        } catch {
            latest = Math.max(0, ...knownIds);
        }
        const ids = new Set(knownIds.filter((id) => Number.isInteger(id) && id >= 0));
        for (let id = latest; id >= Math.max(0, latest - SCAN_TAIL + 1); id -= 1) {
            ids.add(id);
        }
        return [...ids].sort((a, b) => b - a);
    }

    async findSeatedGame(knownIds: number[] = []): Promise<number | null> {
        const seated = await this.findSeatedGames(knownIds);
        return seated.find((table) => table.unfinished)?.gameId ?? seated[0]?.gameId ?? null;
    }

    async findUnfinishedSeat(knownIds: number[] = []): Promise<number | null> {
        const seated = await this.findSeatedGames(knownIds);
        return seated.find((table) => table.unfinished)?.gameId ?? null;
    }

    async initializeGame(model: GameModel): Promise<void> {
        logActionStart(model, "Shuffling deck");
        const { control } = shuffleDeck(initializedDeck());
        logActionComplete(model);

        const password = parsePassword(model.passwordInput);
        const buyIn = parseCreditsInput(model.buyInInput);

        await this.requireBalance(buyIn + BigInt(reservedFeeMicrocredits("create_game", this.session.kind)));

        const nextId = await this.poker.get_next_game_id(0);
        model.lastKnownGameId = nextId ?? 0;

        logActionStart(model, "Creating game");
        await this.poker.create_game(
            model.lastKnownGameId,
            buyIn,
            control,
            this.secret,
            this.secretInv,
            password,
            model.blindFrequency,
        );
        this.hasKeys = true;
        this.playerId = 1;
        model.gameId = model.lastKnownGameId;
        logActionComplete(model);
    }

    async joinGame(model: GameModel, gameId: number): Promise<void> {
        const existing = await this.poker.get_games(gameId);
        if (existing && this.playerIdFromGame(existing) !== null) {
            await this.trySetPlayerId(gameId);
            log(model, `Rejoined game ${gameId} as Player ${this.playerId}`);
            return;
        }

        logActionStart(model, "Loading the table deck");
        const deck = await this.poker.get_decks(gameId);
        if (!deck) {
            throw new Error(`Deck not found for game ${gameId}`);
        }
        logActionComplete(model);

        logActionStart(model, "Shuffling deck");
        const { control } = shuffleDeck(deck);
        logActionComplete(model);

        const password = parsePassword(model.passwordInput);
        await withExclusiveLock(`poker-join-game-${gameId}`, async () => {
            const game = await this.requireGame(gameId);
            if (this.playerIdFromGame(game) !== null) {
                await this.trySetPlayerId(gameId);
                log(model, `Rejoined game ${gameId} as Player ${this.playerId}`);
                return;
            }
            await this.requireBalance(game.buy_in + BigInt(reservedFeeMicrocredits("join_game", this.session.kind)));
            const joiningAs: PlayerId = game.state === 0 ? 2 : 3;
            logActionStart(model, `Joining game ${gameId}`);
            await this.poker.join_game(gameId, game.buy_in, deck, control, this.secret, this.secretInv, password);
            this.hasKeys = true;
            this.playerId = joiningAs;
            logActionComplete(model);
            try {
                await this.trySetPlayerId(gameId);
            } catch {
                // The mapping can lag Shield's confirmation. Keep the secret just submitted.
            }
            log(model, `Joined game ${gameId} as Player ${this.playerId}`);
        });
    }

    async placeBet(model: GameModel, gameId: number, action: BettingAction, amount: number): Promise<void> {
        switch (action) {
            case "fold": {
                logActionStart(model, "Folding");
                await this.poker.fold(gameId);
                logActionComplete(model);
                break;
            }
            case "call": {
                const chips = await this.poker.get_chips(gameId);
                if (!chips) {
                    throw new Error("No chips found");
                }
                if (this.playerId === 0) {
                    throw new Error("Invalid player_id");
                }
                const stack = getChips(chips, this.playerId);
                const owed = Math.max(highestBet(chips) - getCurrentBet(chips, this.playerId), 0);
                const callAmount = Math.min(owed, stack);
                logActionStart(model, callAmount === 0 ? "Checking" : callAmount >= stack ? `All in ${callAmount}` : `Calling ${callAmount}`);
                await this.poker.bet(gameId, callAmount);
                logActionComplete(model);
                break;
            }
            case "raise": {
                const chips = await this.poker.get_chips(gameId);
                if (!chips) {
                    throw new Error("No chips found");
                }
                if (this.playerId === 0) {
                    throw new Error("Invalid player_id");
                }
                const stack = getChips(chips, this.playerId);
                const wager = Math.min(Math.max(amount, 0), stack);
                logActionStart(model, wager >= stack ? `All in ${wager}` : `Raising ${wager}`);
                await this.poker.bet(gameId, wager);
                logActionComplete(model);
                break;
            }
        }
    }

    private async handleDecryptionStep(
        step: DecryptionStep,
        gameId: number,
        cards: Cards,
        model: GameModel,
    ): Promise<void> {
        if (this.playerId === 0) {
            throw new Error("Unknown player id");
        }
        await this.prepareKeys(cards);
        this.requireKeys();
        const keys = this.keysInput();
        logActionStart(model, decryptionLogMessage(step));
        switch (step) {
            case "hands": {
                const [other1, other2] = getOtherPlayersCards(this.playerId, cards);
                await this.poker.decrypt_hands(gameId, other1, other2, keys);
                break;
            }
            case "flop":
                await this.poker.decrypt_flop(gameId, cards.flop, keys);
                break;
            case "turn":
                await this.poker.decrypt_turn_river(gameId, cards.turn, keys);
                break;
            case "river":
                await this.poker.decrypt_turn_river(gameId, cards.river, keys);
                break;
            case "showdown":
                await this.poker.showdown(gameId, getPlayerCards(this.playerId, cards), keys);
                break;
        }
        this.keysUid = null;
        logActionComplete(model);
    }

    private setupBettingUi(
        state: GameState,
        stateChanged: boolean,
        chips: ChipView | null,
        game: Game,
        model: GameModel,
    ): void {
        if (this.playerId === 0 || !isBettingState(state) || currentPlayer(state) !== this.playerId) {
            model.bettingUi = null;
            return;
        }
        if (!chips) {
            return;
        }
        if (isPlayerEliminated(model, this.playerId) || getChips(chips, this.playerId) === 0) {
            model.bettingUi = null;
            return;
        }
        if (!stateChanged && model.bettingUi !== null) {
            return;
        }

        const playerChips = getChips(chips, this.playerId);
        const currentBet = getCurrentBet(chips, this.playerId);
        const highest = highestBet(chips);
        const minRaiseSize = highest === 0 || game.last_raise_size === 0 ? game.bb : game.last_raise_size;
        const callAmount = Math.max(highest - currentBet, 0);
        const fullMinRaise = Math.max(highest + minRaiseSize - currentBet, 0);
        const { minRaise } = raiseBounds(playerChips, callAmount, fullMinRaise, facingAllIn(chips, this.playerId));

        model.bettingUi = newBettingUi(playerChips, callAmount, minRaise);
    }

    private async handleCompareHands(gameId: number, game: Game, model: GameModel): Promise<void> {
        if (this.playerId === 0 || game.dealer_button !== playerBitmap(this.playerId)) {
            return;
        }
        logActionStart(model, "Comparing hands");
        try {
            await this.poker.compare_hands(gameId);
        } catch (error) {
            log(model, `Error comparing hands: ${errorMessage(error)}`);
            return;
        }
        logActionComplete(model);
        await this.logUpdatedState(gameId, model);
    }

    private async handleClaimPrize(gameId: number, game: Game, model: GameModel): Promise<void> {
        const prize = game.buy_in * 3n;
        logActionStart(model, `Claiming prize: ${formatCredits(prize)} credits`);
        try {
            await this.poker.claim_prize(gameId, prize);
        } catch (error) {
            log(model, `Error claiming prize: ${errorMessage(error)}`);
            return;
        }
        logActionComplete(model);
        log(model, `Claimed ${formatCredits(prize)} credits`);
        await this.logUpdatedState(gameId, model);
    }

    private async logUpdatedState(gameId: number, model: GameModel): Promise<void> {
        const updated = await this.poker.get_games(gameId);
        if (!updated) {
            return;
        }
        const updatedState = gameStateFromU8(updated.state);
        if (updatedState !== model.currentState) {
            if (updatedState !== null) {
                log(model, describeGameState(updatedState));
            }
            model.currentState = updatedState;
        }
    }

    /** Chips, revealed cards and the dealer button, without touching the state machine. */
    async updateRenderData(gameId: number, model: GameModel): Promise<void> {
        const [chips, revealed, game] = await Promise.all([
            this.getChip(gameId),
            this.poker.get_revealed_cards(gameId),
            this.poker.get_games(gameId),
        ]);
        this.paintCards(game ? gameStateFromU8(game.state) : model.currentState, revealed, model);
        model.chip = chips;
        if (game) {
            model.dealerButton = game.dealer_button;
            model.playerAddresses = [game.player1, game.player2, game.player3];
            updateEliminatedPlayers(model, game.players_out);
        }
    }

    async refreshGameState(model: GameModel, gameId: number): Promise<boolean> {
        if (!model.gameInitialized) {
            return false;
        }

        const game = await this.requireGame(gameId);
        model.playerAddresses = [game.player1, game.player2, game.player3];
        const newState = gameStateFromU8(game.state);
        const acting = this.adoptActingSeat(game, newState);
        if (acting !== null) {
            model.currentPlayerId = acting;
            model.spectating = false;
        }
        const stateChanged = model.currentState !== newState;

        if (stateChanged) {
            if (newState !== null) {
                log(model, describeGameState(newState));
            }
            model.currentState = newState;

            switch (newState) {
                case GameState.P1NewShuffle:
                case GameState.P2NewShuffle:
                case GameState.P2Shuffle:
                case GameState.P3Shuffle:
                    model.card = emptyCardView();
                    model.decryptedHand = null;
                    this.searchedHand = null;
                    this.loggedKeyMiss = false;
                    this.keysUid = null;
                    model.gameWinner = null;
                    if (
                        (newState === GameState.P1NewShuffle && this.playerId === 1) ||
                        (newState === GameState.P2NewShuffle && this.playerId === 2)
                    ) {
                        log(model, "Starting new hand");
                    }
                    if (
                        (newState === GameState.P2Shuffle && this.playerId === 2) ||
                        (newState === GameState.P3Shuffle && this.playerId === 3)
                    ) {
                        log(model, "Shuffling deck");
                    }
                    break;
            }
        }

        const [chips, cards] = await Promise.all([this.getChip(gameId), this.poker.get_cards(gameId)]);
        this.lastCards = cards;
        let handDecrypted = false;

        if (newState !== null) {
            this.setupBettingUi(newState, stateChanged, chips, game, model);

            if (model.decryptedHand === null && cards && this.playerId !== 0) {
                const beforeDecrypt: GameState[] = [
                    GameState.P2Join,
                    GameState.P3Join,
                    GameState.P1DecHand,
                    GameState.P2DecHand,
                    GameState.P3DecHand,
                    GameState.P1NewShuffle,
                    GameState.P2NewShuffle,
                    GameState.P2Shuffle,
                    GameState.P3Shuffle,
                ];
                if (!beforeDecrypt.includes(newState)) {
                    const encryptedHand = getPlayerCards(this.playerId, cards);
                    const fingerprint = `${encryptedHand[0]}|${encryptedHand[1]}`;
                    const stillEncrypted = encryptedHand.some(
                        (card) => cardIndexFromGroup(card, this.cardHashes) === null,
                    );
                    let opened =
                        stillEncrypted && this.hasKeys && keyOpensHand(encryptedHand, this.secretInv, this.cardHashes);
                    if (stillEncrypted && !opened && this.session.kind !== "local" && this.searchedHand !== fingerprint) {
                        const recovered = await this.prepareKeys(cards);
                        if (recovered !== "empty") {
                            this.searchedHand = fingerprint;
                        }
                        opened = this.hasKeys && keyOpensHand(encryptedHand, this.secretInv, this.cardHashes);
                        if (!opened && recovered === "miss" && !this.loggedKeyMiss) {
                            log(model, "None of the keys in this wallet open your hole cards.");
                            this.loggedKeyMiss = true;
                        }
                    }
                    if (opened) {
                        const local = openHand(encryptedHand, this.secretInv, this.cardHashes);
                        if (local) {
                            model.decryptedHand = local;
                            handDecrypted = true;
                        }
                    }
                }
            }
        }

        if (stateChanged || handDecrypted || model.card === null) {
            await this.updateRenderData(gameId, model);
        } else if (model.card) {
            model.card = applyCommunityState(model.card, newState);
            model.chip = chips;
        }

        updateEliminatedPlayers(model, game.players_out);

        const previousWinner = model.gameWinner;
        const winner = checkForWinner(model);
        if (winner !== null && previousWinner === null) {
            log(model, `Player ${winner} wins!`);
        }

        model.lastPollTime = Date.now();
        return stateChanged;
    }

    async detectAutoAction(model: GameModel, gameId: number): Promise<GameCommand | null> {
        const state = model.currentState;
        if (state === null) {
            return null;
        }
        const game = await this.poker.get_games(gameId);
        if (!game) {
            return null;
        }
        const seats = this.seatsFromGame(game);
        if (seats.length === 0) {
            return null;
        }
        const me = this.adoptActingSeat(game, state) ?? seats[0];
        model.currentPlayerId = me;

        const isClaim = state === GameState.P1Claim || state === GameState.P2Claim || state === GameState.P3Claim;
        if (isClaim) {
            return currentPlayer(state) === me ? { type: "autoClaim", gameId } : null;
        }
        if (model.gameWinner !== null) {
            return null;
        }
        const mine = (p1: GameState, p2: GameState, p3: GameState) =>
            (state === p1 && seats.includes(1) && me === 1) ||
            (state === p2 && seats.includes(2) && me === 2) ||
            (state === p3 && seats.includes(3) && me === 3);

        if (this.hasKeys) {
            let step: DecryptionStep | null = null;
            if (mine(GameState.P1DecHand, GameState.P2DecHand, GameState.P3DecHand)) step = "hands";
            else if (mine(GameState.P1DecFlop, GameState.P2DecFlop, GameState.P3DecFlop)) step = "flop";
            else if (mine(GameState.P1DecTurn, GameState.P2DecTurn, GameState.P3DecTurn)) step = "turn";
            else if (mine(GameState.P1DecRiver, GameState.P2DecRiver, GameState.P3DecRiver)) step = "river";
            else if (mine(GameState.P1Showdown, GameState.P2Showdown, GameState.P3Showdown)) step = "showdown";

            if (step) {
                return { type: "autoDecrypt", gameId, step };
            }
        }

        if ((state === GameState.P1NewShuffle && me === 1) || (state === GameState.P2NewShuffle && me === 2)) {
            return { type: "autoNewShuffle", gameId };
        }
        if ((state === GameState.P2Shuffle && me === 2) || (state === GameState.P3Shuffle && me === 3)) {
            return { type: "autoShuffleDeck", gameId };
        }

        if (state === GameState.Compare) {
            const game = await this.poker.get_games(gameId);
            if (game && game.dealer_button === playerBitmap(me)) {
                return { type: "autoCompare", gameId };
            }
        }

        return null;
    }

    async executeAutoDecrypt(model: GameModel, gameId: number, step: DecryptionStep): Promise<void> {
        const cards = await this.poker.get_cards(gameId);
        if (!cards) {
            throw new Error(`Cards not found for game ${gameId}`);
        }
        await this.handleDecryptionStep(step, gameId, cards, model);
    }

    async executeAutoCompare(model: GameModel, gameId: number): Promise<void> {
        await this.handleCompareHands(gameId, await this.requireGame(gameId), model);
    }

    async executeAutoClaim(model: GameModel, gameId: number): Promise<void> {
        await this.handleClaimPrize(gameId, await this.requireGame(gameId), model);
    }

    async searchForPlayerGame(model: GameModel): Promise<number | null> {
        const game = await this.poker.get_games(model.lastKnownGameId);
        if (game && this.playerIdFromGame(game) !== null) {
            return model.lastKnownGameId;
        }
        return null;
    }

    async newShuffle(model: GameModel, gameId: number): Promise<void> {
        const { control } = shuffleDeck(initializedDeck());
        logActionStart(model, "Starting new hand");
        await this.poker.new_hand(gameId, control, this.secret, this.secretInv);
        this.hasKeys = true;
        logActionComplete(model);
        model.decryptedHand = null;
    }

    async shuffleExistingDeck(model: GameModel, gameId: number): Promise<void> {
        const deck = await this.poker.get_decks(gameId);
        if (!deck) {
            throw new Error(`Deck not found for game ${gameId}`);
        }
        logActionStart(model, "Shuffling deck");
        const { control } = shuffleDeck(deck);
        await this.poker.shuffle_deck(gameId, deck, control, this.secret, this.secretInv);
        this.hasKeys = true;
        logActionComplete(model);
        model.decryptedHand = null;
    }
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
