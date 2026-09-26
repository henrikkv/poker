import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "./Card.js";

export interface SeatProps {
    playerId: number;
    ensName?: string | null;
    cards: [number, number];
    chips: number;
    bet: number;
    isYou: boolean;
    isEliminated: boolean;
    keepCardsVisible?: boolean;
    isDealer: boolean;
    isActive: boolean;
    provingLabel: string | null;
    provingStartedMs: number | null;
}

export function PlayerSeat(props: SeatProps) {
    const { playerId, ensName, cards, chips, bet, isYou, isEliminated, keepCardsVisible, isDealer, isActive, provingLabel } = props;
    const fadeSeat = isEliminated && !keepCardsVisible;
    return (
        <div className="relative flex flex-col items-center gap-2">
            <motion.div
                animate={isActive ? { boxShadow: "0 0 0 2px rgba(230,195,106,0.9), 0 0 32px rgba(230,195,106,0.35)" } : { boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 0 0 rgba(0,0,0,0)" }}
                className={`relative min-w-44 rounded-2xl bg-felt-deep/90 px-4 pt-3 pb-3 backdrop-blur ${fadeSeat ? "opacity-45 grayscale" : ""}`}
            >
                <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg text-paper">
                        {ensName ?? (isYou ? "You" : `Player ${playerId}`)}
                        <span className="ml-1.5 text-xs font-sans text-muted">P{playerId}</span>
                    </span>
                    {isEliminated ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted uppercase">Out</span>
                    ) : (
                        <span className="text-sm font-semibold text-gold tabular-nums">{chips} chips</span>
                    )}
                </div>
                <div className="mt-2.5 flex justify-center gap-1.5">
                    <Card index={cards[0]} size={isYou ? "lg" : "md"} dim={fadeSeat} />
                    <Card index={cards[1]} size={isYou ? "lg" : "md"} dim={fadeSeat} />
                </div>
                {provingLabel && <ProvingBadge label={provingLabel} startedMs={props.provingStartedMs} />}
                {isDealer && (
                    <span className="absolute -top-2.5 -right-2.5 grid size-7 place-items-center rounded-full bg-paper text-xs font-bold text-ink shadow-md ring-2 ring-felt-deep">
                        D
                    </span>
                )}
            </motion.div>
            <AnimatePresence>
                {bet > 0 && (
                    <motion.div
                        key="bet"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs text-paper"
                    >
                        <ChipIcon /> <span className="tabular-nums">{bet}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ProvingBadge({ label, startedMs }: { label: string; startedMs: number | null }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(timer);
    }, []);
    const seconds = startedMs ? Math.max(0, Math.floor((now - startedMs) / 1000)) : 0;
    return (
        <motion.div
            className="mt-2.5 flex items-center justify-center gap-2 rounded-lg bg-gold/10 px-2 py-1 text-xs text-gold"
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 1.6, repeat: Infinity }}
        >
            <span className="size-1.5 rounded-full bg-gold" />
            <span className="truncate">{label}</span>
            <span className="tabular-nums text-gold/70">{seconds}s</span>
        </motion.div>
    );
}

export function ChipIcon({ className = "size-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" className={className} aria-hidden>
            <circle cx="10" cy="10" r="9" fill="#c8372d" />
            <circle cx="10" cy="10" r="9" fill="none" stroke="#fbf8f1" strokeWidth="2.5" strokeDasharray="3.5 3.6" />
            <circle cx="10" cy="10" r="5" fill="#fbf8f1" fillOpacity="0.25" />
        </svg>
    );
}
