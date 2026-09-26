import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useEns } from "../ens/index.js";
import { getOpponents, getViewCards } from "../game/cards.js";
import type { GameMessage } from "../game/controller.js";
import { getChips, getCurrentBet, isPlayerEliminated, type GameModel } from "../game/model.js";
import { currentPlayer, describeGameState, GameState, isBettingState, isLobbyState, type PlayerId } from "../game/state.js";
import { BetControls } from "./BetControls.js";
import { Card } from "./Card.js";
import { ChipIcon, PlayerSeat } from "./PlayerSeat.js";
import { Spinner } from "./Spinner.js";

export function Table({ model, busy, dispatch }: { model: GameModel; busy: boolean; dispatch: (msg: GameMessage) => void }) {
    const ens = useEns();
    const gameId = model.gameId;

    useEffect(() => {
        if (gameId === null) {
            return;
        }
        void ens.hydrateDirectory(gameId);
    }, [ens.hydrateDirectory, gameId]);
    const tableName = ens.tableNameFor(gameId) ?? model.tableName;
    const inviteGameId = model.inviteGameId ?? ens.profile?.gameId ?? null;
    const state = model.currentState;
    const description = state !== null ? describeGameState(state) : null;
    const lobby = state !== null && isLobbyState(state);
    const spectator = model.spectating || (model.gameInitialized && model.currentPlayerId === 0);
    const feltReady = model.gameInitialized && model.card !== null && model.chip !== null && (model.currentPlayerId !== 0 || spectator);

    if (!feltReady) {
        const waiting = !model.gameInitialized ? "Connecting to game…" : "Waiting for game data…";
        return (
            <TableShell
                gameId={gameId}
                tableName={tableName}
                inviteGameId={inviteGameId}
                description={description}
                spectator={spectator}
                lobby={lobby}
                dispatch={dispatch}
            >
                <div className="flex flex-col items-center gap-4 py-24 text-center">
                    {model.backgroundTask ? (
                        <>
                            <Spinner className="size-8 text-gold" />
                            <p className="font-display text-xl text-paper">{model.backgroundTask}</p>
                            <p className="max-w-sm text-sm text-muted">This can take a few minutes. You can leave this tab open.</p>
                        </>
                    ) : (
                        <>
                            <p className="font-display text-xl text-paper">{description ?? waiting}</p>
                            {state !== null && <p className="text-sm text-muted">State {state}</p>}
                        </>
                    )}
                </div>
            </TableShell>
        );
    }

    const me = model.currentPlayerId === 0 ? 1 : model.currentPlayerId;
    const cards = model.card!;
    const chips = model.chip!;
    const [opponent1, opponent2] = getOpponents(me);
    const acting = state !== null ? currentPlayer(state) : null;
    const betting = state !== null && isBettingState(state);

    const seat = (playerId: PlayerId, isYou: boolean) => (
        <PlayerSeat
            playerId={playerId}
            ensName={ens.identityFor(model.playerAddresses?.[playerId - 1])?.name}
            cards={getViewCards(cards, playerId)}
            chips={getChips(chips, playerId)}
            bet={betting ? getCurrentBet(chips, playerId) : 0}
            isYou={isYou}
            isEliminated={isPlayerEliminated(model, playerId)}
            keepCardsVisible={model.gameWinner !== null}
            isDealer={(model.dealerButton & (1 << (playerId - 1))) !== 0}
            isActive={acting === playerId}
            provingLabel={isYou ? model.backgroundTask : null}
            provingStartedMs={isYou ? model.backgroundTaskStartedMs : null}
        />
    );

    return (
        <TableShell
            gameId={gameId}
            tableName={tableName}
            inviteGameId={inviteGameId}
            description={description}
            spectator={spectator}
            lobby={lobby}
            dispatch={dispatch}
        >
            <div className="felt relative mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-6 rounded-[48%/42%] px-6 py-10 sm:px-16">
                <div className="flex w-full justify-between gap-4">
                    {seat(opponent1, false)}
                    {seat(opponent2, false)}
                </div>

                <div className="flex flex-col items-center gap-3">
                    {model.gameWinner !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                        >
                            <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">Game over</p>
                            <p className="mt-1 font-display text-3xl text-paper">
                                {model.gameWinner === model.currentPlayerId ? "You win the table" : `Player ${model.gameWinner} wins`}
                            </p>
                        </motion.div>
                    )}
                    <div className="flex gap-2">
                        {[...cards.flop, cards.turn, cards.river].map((card, i) => (
                            <Card key={i} index={card} size="md" />
                        ))}
                    </div>
                    <motion.div
                        key={chips.pot}
                        initial={{ scale: 0.9, opacity: 0.6 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 rounded-full bg-black/35 px-4 py-1.5 text-sm text-paper"
                    >
                        <ChipIcon className="size-4" />
                        Pot <span className="font-semibold tabular-nums text-gold">{chips.pot}</span>
                    </motion.div>
                </div>

                {seat(me, model.currentPlayerId !== 0)}
            </div>

            <div className="mt-6 flex min-h-24 justify-center">
                <AnimatePresence mode="wait">
                    {model.bettingUi && !spectator ? (
                        <BetControls key="bet" ui={model.bettingUi} disabled={busy} dispatch={dispatch} />
                    ) : (
                        acting !== null &&
                        acting !== model.currentPlayerId &&
                        state !== null &&
                        state !== GameState.P2Join &&
                        state !== GameState.P3Join && (
                            <motion.p key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-center text-sm text-muted">
                                {describeGameState(state)}
                            </motion.p>
                        )
                    )}
                </AnimatePresence>
            </div>
        </TableShell>
    );
}

function TableShell({
    gameId,
    tableName,
    inviteGameId,
    description,
    spectator,
    lobby,
    dispatch,
    children,
}: {
    gameId: number | null;
    tableName: string | null;
    inviteGameId: number | null;
    description: string | null;
    spectator: boolean;
    lobby: boolean;
    dispatch: (msg: GameMessage) => void;
    children: ReactNode;
}) {
    const inviteMismatch = inviteGameId !== null && gameId !== null && inviteGameId !== gameId;

    return (
        <section>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-paper">
                    {tableName ?? "Table"} <span className="text-gold">#{gameId ?? "…"}</span>
                    {spectator && <span className="ml-2 text-sm font-sans text-muted">Spectating</span>}
                </h2>
                {description && <p className="text-sm text-muted">{description}</p>}
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                {gameId !== null && (
                    <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(String(gameId))}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-paper transition hover:border-gold/50"
                    >
                        Copy game {gameId}
                    </button>
                )}
                {tableName && (
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-muted">{tableName}</span>
                )}
                {inviteMismatch && (
                    <span className="rounded-full border border-gold/30 px-3 py-1.5 text-gold">
                        Invite now points at game {inviteGameId}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => dispatch({ type: "leaveLocally" })}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-muted transition hover:border-gold/50 hover:text-paper"
                >
                    Leave locally
                </button>
            </div>
            {lobby && (
                <p className="mb-4 max-w-xl text-sm text-muted">
                    Share the game id{tableName ? ` or ${tableName}` : ""} so the next player can join. Leave locally
                    returns to the menu without refunding on-chain credits.
                </p>
            )}
            {children}
        </section>
    );
}
