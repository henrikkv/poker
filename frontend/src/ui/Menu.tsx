import { motion } from "motion/react";
import type { Suit } from "../game/cards.js";
import type { GameMessage } from "../game/controller.js";
import type { LobbyTable } from "../game/lobby.js";
import type { MenuOption, SeatedTableView } from "../game/model.js";
import { SuitIcon } from "./SuitIcon.js";

const OPTIONS: { option: MenuOption; title: string; body: string; suit: Suit }[] = [
    {
        option: "createGame",
        title: "Create a table",
        body: "Shuffle a fresh encrypted deck, set the buy-in and blinds, and wait for two more players.",
        suit: "spades",
    },
    {
        option: "joinGame",
        title: "Join a table",
        body: "Enter a game id to take an open seat, or watch a game that has already started.",
        suit: "hearts",
    },
];

export function Menu({
    selected,
    seatedTables,
    lobbyTables,
    lobbyReady,
    blockedGameId,
    dispatch,
}: {
    selected: MenuOption;
    seatedTables: SeatedTableView[];
    lobbyTables: LobbyTable[];
    lobbyReady: boolean;
    blockedGameId: number | null;
    dispatch: (msg: GameMessage) => void;
}) {
    const tables = lobbyReady ? lobbyTables : seatedTables.filter((table) => table.unfinished).map(pendingRow);
    return (
        <div className="space-y-6">
            {blockedGameId !== null && (
                <div className="rounded-3xl border border-gold/40 bg-black/25 p-5">
                    <p className="font-display text-xl text-paper">You are already in game {blockedGameId}</p>
                    <p className="mt-1 text-sm text-muted">
                        Credits in that table stay locked on-chain. Resume it, or leave locally to use the menu.
                        Leaving locally does not refund.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <GoldButton onClick={() => dispatch({ type: "resumeTable", gameId: blockedGameId })}>
                            {`Resume table ${blockedGameId}`}
                        </GoldButton>
                        <GhostButton onClick={() => dispatch({ type: "leaveLocallyAnyway" })}>
                            Leave locally anyway
                        </GhostButton>
                    </div>
                </div>
            )}

            <section className="rounded-3xl border border-white/10 bg-felt-deep p-5">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-xl text-paper">Tables</h2>
                    {!lobbyReady && <p className="text-sm text-muted">Looking up tables</p>}
                </div>
                {tables.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">
                        {lobbyReady ? "No open tables." : "Recent tables will show up here."}
                    </p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {tables.map((table) => (
                            <TableRow key={table.gameId} table={table} canHide={!lobbyReady} dispatch={dispatch} />
                        ))}
                    </ul>
                )}
            </section>

            <div className="grid gap-5 sm:grid-cols-2">
                {OPTIONS.map(({ option, title, body, suit }, i) => {
                    const active = option === selected;
                    return (
                        <motion.button
                            key={option}
                            type="button"
                            onClick={() => dispatch({ type: "selectMenu", option })}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            whileHover={{ y: -3 }}
                            className={`rounded-3xl border p-7 text-left transition ${
                                active
                                    ? "border-gold/70 bg-felt shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
                                    : "border-white/10 bg-felt-deep hover:border-white/25"
                            }`}
                        >
                            <SuitIcon
                                suit={suit}
                                className={`mb-4 size-7 ${suit === "hearts" ? "text-card-red" : "text-paper"}`}
                            />
                            <h2 className="font-display text-2xl text-paper">{title}</h2>
                            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

function pendingRow(table: SeatedTableView): LobbyTable {
    const playerIds = table.playerIds.filter((id): id is 1 | 2 | 3 => id === 1 || id === 2 || id === 3);
    return {
        gameId: table.gameId,
        state: 0,
        stage: "Waiting",
        progress: "Checking this table",
        waiting: false,
        yours: true,
        seatsFilled: Math.min(3, Math.max(playerIds.length, 1)),
        playerIds,
    };
}

function TableRow({
    table,
    canHide,
    dispatch,
}: {
    table: LobbyTable;
    canHide: boolean;
    dispatch: (msg: GameMessage) => void;
}) {
    const seats = `${table.seatsFilled} of 3 seated`;
    return (
        <li className="flex flex-col gap-3 rounded-2xl border border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-paper">Table {table.gameId}</span>
                    {table.yours && <span className="text-sm text-gold">You</span>}
                    {table.progress !== "Checking this table" && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-muted">{table.stage}</span>
                    )}
                </p>
                <p className="mt-1 text-sm text-paper">{table.progress}</p>
                <p className="text-xs text-muted">{seats}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {table.yours ? (
                    <>
                        <GoldButton onClick={() => dispatch({ type: "resumeTable", gameId: table.gameId })}>
                            Resume
                        </GoldButton>
                        {canHide && (
                            <GhostButton onClick={() => dispatch({ type: "hideTable", gameId: table.gameId })}>
                                Hide
                            </GhostButton>
                        )}
                    </>
                ) : table.waiting ? (
                    <GoldButton onClick={() => dispatch({ type: "openListedTable", gameId: table.gameId })}>
                        Join
                    </GoldButton>
                ) : (
                    <GhostButton onClick={() => dispatch({ type: "watchTable", gameId: table.gameId })}>
                        Watch
                    </GhostButton>
                )}
            </div>
        </li>
    );
}

function GoldButton({ children, onClick }: { children: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="btn btn-gold"
        >
            {children}
        </button>
    );
}

function GhostButton({ children, onClick }: { children: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="btn btn-ghost"
        >
            {children}
        </button>
    );
}
