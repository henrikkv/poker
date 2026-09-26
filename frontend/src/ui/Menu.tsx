import { motion } from "motion/react";
import type { GameMessage } from "../game/controller.js";
import type { MenuOption, SeatedTableView } from "../game/model.js";

const OPTIONS: { option: MenuOption; title: string; body: string; suit: string }[] = [
    {
        option: "createGame",
        title: "Create a table",
        body: "Shuffle a fresh encrypted deck, set the buy-in and blinds, and wait for two players.",
        suit: "♠",
    },
    {
        option: "joinGame",
        title: "Join a table",
        body: "Enter a game id or an ENS name to take an open seat, or watch a game that has already started.",
        suit: "♥",
    },
];

export function Menu({
    selected,
    seatedTables,
    blockedGameId,
    dispatch,
}: {
    selected: MenuOption;
    seatedTables: SeatedTableView[];
    blockedGameId: number | null;
    dispatch: (msg: GameMessage) => void;
}) {
    const live = seatedTables.filter((table) => table.unfinished);
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

            {live.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-gold/80 uppercase">Your tables</p>
                    <ul className="mt-3 space-y-2">
                        {live.map((table) => (
                            <li
                                key={table.gameId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3"
                            >
                                <div>
                                    <p className="font-display text-lg text-paper">Resume table {table.gameId}</p>
                                    <p className="text-xs text-muted">
                                        Seated as Player {table.playerIds.join(" and ")}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <GoldButton onClick={() => dispatch({ type: "resumeTable", gameId: table.gameId })}>
                                        Resume
                                    </GoldButton>
                                    <GhostButton onClick={() => dispatch({ type: "hideTable", gameId: table.gameId })}>
                                        Hide this table locally
                                    </GhostButton>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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
                            className={`group relative overflow-hidden rounded-3xl border p-7 text-left transition ${
                                active
                                    ? "border-gold/60 bg-felt/80 shadow-[0_0_0_1px_rgba(230,195,106,0.35),0_20px_50px_rgba(0,0,0,0.35)]"
                                    : "border-white/10 bg-black/20 hover:border-white/25"
                            }`}
                        >
                            <span
                                className={`absolute -top-6 -right-2 font-display text-[9rem] leading-none transition ${
                                    suit === "♥" ? "text-card-red/20" : "text-paper/10"
                                } group-hover:scale-105`}
                                aria-hidden
                            >
                                {suit}
                            </span>
                            <h2 className="font-display text-2xl text-paper">{title}</h2>
                            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

function GoldButton({ children, onClick }: { children: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink shadow-[0_8px_20px_rgba(230,195,106,0.25)]"
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
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-paper transition hover:border-gold/50"
        >
            {children}
        </button>
    );
}
