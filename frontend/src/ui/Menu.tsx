import { motion } from "motion/react";
import type { GameMessage } from "../game/controller.js";
import type { MenuOption } from "../game/model.js";

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

export function Menu({ selected, dispatch }: { selected: MenuOption; dispatch: (msg: GameMessage) => void }) {
    return (
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
    );
}
