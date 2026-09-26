import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { GameMessage } from "../game/controller.js";
import type { BettingAction, BettingUIState } from "../game/model.js";

export function BetControls({ ui, disabled, dispatch }: {
    ui: BettingUIState;
    disabled: boolean;
    dispatch: (msg: GameMessage) => void;
}) {
    const submit = (action: BettingAction) => {
        dispatch({ type: "selectBetAction", action });
        dispatch({ type: "confirm" });
    };
    const canRaise = ui.maxRaise >= ui.minRaise && ui.minRaise > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl rounded-2xl border border-gold/25 bg-felt-deep/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur"
        >
            <div className="grid grid-cols-3 gap-3">
                <ActionButton selected={ui.selectedAction === "fold"} disabled={disabled} onClick={() => submit("fold")} tone="muted">
                    Fold
                </ActionButton>
                <ActionButton selected={ui.selectedAction === "call"} disabled={disabled} onClick={() => submit("call")} tone="paper">
                    {ui.callAmount === 0 ? "Check" : `Call ${ui.callAmount}`}
                </ActionButton>
                <ActionButton
                    selected={ui.selectedAction === "raise"}
                    disabled={disabled || !canRaise}
                    onClick={() => submit("raise")}
                    tone="gold"
                >
                    {ui.raiseAmount >= ui.maxRaise ? `All in ${ui.raiseAmount}` : `Raise ${ui.raiseAmount}`}
                </ActionButton>
            </div>
            {canRaise && (
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                    <span className="tabular-nums">{ui.minRaise}</span>
                    <input
                        type="range"
                        className="flex-1"
                        min={ui.minRaise}
                        max={ui.maxRaise}
                        step={1}
                        value={ui.raiseAmount}
                        disabled={disabled}
                        onChange={(e) => dispatch({ type: "setRaise", amount: Number(e.target.value) })}
                    />
                    <span className="tabular-nums">{ui.maxRaise}</span>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => dispatch({ type: "allIn" })}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-paper transition hover:border-gold/50 disabled:opacity-40"
                    >
                        All in
                    </button>
                </div>
            )}
        </motion.div>
    );
}

function ActionButton({ selected, disabled, onClick, tone, children }: {
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
    tone: "muted" | "paper" | "gold";
    children: ReactNode;
}) {
    const tones = {
        muted: "bg-white/5 text-paper hover:bg-white/10",
        paper: "bg-paper text-ink hover:brightness-95",
        gold: "bg-gold text-ink hover:brightness-110",
    };
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`rounded-xl px-4 py-3 text-sm font-semibold tabular-nums transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${
                selected ? "ring-2 ring-gold ring-offset-2 ring-offset-felt-deep" : ""
            }`}
        >
            {children}
        </button>
    );
}
