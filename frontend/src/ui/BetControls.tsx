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
    const raiseAmount = Math.min(ui.raiseAmount, ui.maxRaise);
    const allIn = ui.maxRaise > ui.callAmount && raiseAmount >= ui.maxRaise;
    const canRaise = (ui.maxRaise >= ui.minRaise && ui.minRaise > ui.callAmount) || allIn;
    const canAllIn = ui.maxRaise > ui.callAmount;

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
                    {ui.callAmount === 0 ? "Check" : ui.callAmount >= ui.maxRaise ? `All in ${ui.maxRaise}` : `Call ${ui.callAmount}`}
                </ActionButton>
                <ActionButton
                    selected={ui.selectedAction === "raise"}
                    disabled={disabled || !canRaise}
                    onClick={() => submit("raise")}
                    tone="gold"
                >
                    {allIn ? `All in ${ui.maxRaise}` : `Raise ${raiseAmount}`}
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
                        value={Math.min(Math.max(raiseAmount, Math.min(ui.minRaise, ui.maxRaise)), ui.maxRaise)}
                        disabled={disabled}
                        onChange={(e) => dispatch({ type: "setRaise", amount: Number(e.target.value) })}
                    />
                    <span className="tabular-nums">{ui.maxRaise}</span>
                    {canAllIn && (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => dispatch({ type: "allIn" })}
                            className="btn btn-ghost"
                        >
                            All in {ui.maxRaise}
                        </button>
                    )}
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
        muted: "btn-ghost",
        paper: "btn-ghost",
        gold: "btn-gold",
    };
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={selected}
            className={`btn tabular-nums ${tones[tone]}`}
        >
            {children}
        </button>
    );
}
