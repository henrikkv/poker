import type { FormEvent, ReactNode } from "react";
import type { GameMessage } from "../game/controller.js";
import { parseGameId } from "../game/parseGameId.js";
import type { GameModel } from "../game/model.js";

type Dispatch = (msg: GameMessage) => void;

function Panel({ title, subtitle, children, onSubmit }: {
    title: string;
    subtitle: string;
    children: ReactNode;
    onSubmit: () => void;
}) {
    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit();
    };
    return (
        <form
            onSubmit={submit}
            className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-felt-deep p-8 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        >
            <h2 className="font-display text-2xl text-paper">{title}</h2>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
            <div className="mt-7 space-y-5">{children}</div>
        </form>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-paper">{label}</span>
            <div className="mt-1.5">{children}</div>
            {hint && <span className="mt-1 block text-xs text-muted/70">{hint}</span>}
        </label>
    );
}

const inputClass =
    "w-full rounded-xl border border-white/10 bg-felt-deep/80 px-4 py-3 text-paper placeholder:text-muted/50 outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20";

function Actions({ onBack, submitLabel, disabled, reason }: {
    onBack: () => void;
    submitLabel: string;
    disabled: boolean;
    reason?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={onBack} className="btn-quiet">
                Back
            </button>
            <div className="flex items-center gap-3">
                {reason && <span className="text-xs text-muted">{reason}</span>}
                <button
                    type="submit"
                    disabled={disabled}
                    className="btn btn-gold"
                >
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}

export function CreateGameForm({ model, dispatch }: { model: GameModel; dispatch: Dispatch }) {
    return (
        <Panel
            title="Create a table"
            subtitle="Blinds start at 5/10 and rise every few hands. The buy-in is escrowed by the program."
            onSubmit={() => dispatch({ type: "confirm" })}
        >
            {model.blockedGameId !== null && (
                <p className="rounded-xl border border-gold/30 bg-black/20 px-4 py-3 text-sm text-paper">
                    You are already in game {model.blockedGameId}. Resume that table instead of opening another.
                </p>
            )}
            <Field label="Buy-in (credits)">
                <input
                    id="create-buy-in"
                    name="buyIn"
                    autoComplete="off"
                    className={inputClass}
                    inputMode="decimal"
                    autoFocus
                    value={model.buyInInput}
                    onFocus={() => dispatch({ type: "focusCreateField", field: "buyIn" })}
                    onChange={(e) => dispatch({ type: "setInput", field: "buyIn", value: e.target.value })}
                />
            </Field>

            <Field label="Blind frequency" hint="Hands played before the blinds go up.">
                <div className="flex items-center gap-2">
                    <Stepper label="−" onClick={() => dispatch({ type: "setBlindFrequency", value: model.blindFrequency - 1 })} />
                    <input
                        id="create-blind-frequency"
                        name="blindFrequency"
                        autoComplete="off"
                        className={`${inputClass} text-center`}
                        inputMode="numeric"
                        value={model.blindFrequency}
                        onFocus={() => dispatch({ type: "focusCreateField", field: "blindFrequency" })}
                        onChange={(e) => dispatch({ type: "setBlindFrequency", value: Number(e.target.value) })}
                    />
                    <Stepper label="+" onClick={() => dispatch({ type: "setBlindFrequency", value: model.blindFrequency + 1 })} />
                </div>
            </Field>

            <Field label="Password" hint="Optional. Numbers only; players need it to join.">
                <input
                    id="create-password"
                    name="password"
                    autoComplete="new-password"
                    className={inputClass}
                    type="password"
                    inputMode="numeric"
                    placeholder="No password"
                    value={model.passwordInput}
                    onFocus={() => dispatch({ type: "focusCreateField", field: "password" })}
                    onChange={(e) => dispatch({ type: "setInput", field: "password", value: e.target.value })}
                />
            </Field>

            <Actions onBack={() => dispatch({ type: "back" })} submitLabel="Create table" disabled={false} />
        </Panel>
    );
}

export function JoinGameForm({ model, dispatch }: { model: GameModel; dispatch: Dispatch }) {
    return (
        <Panel
            title="Join a table"
            subtitle="Open tables are waiting for players 2 and 3. Started games open as a spectator."
            onSubmit={() => dispatch({ type: "confirm" })}
        >
            {model.blockedGameId !== null && (
                <p className="rounded-xl border border-gold/30 bg-black/20 px-4 py-3 text-sm text-paper">
                    You are already in game {model.blockedGameId}. Resume that table, or leave locally to join a
                    different one.
                </p>
            )}
            <Field label="Game id" hint="The number the host copied from their table.">
                <input
                    id="join-game-id"
                    name="gameId"
                    autoComplete="off"
                    className={inputClass}
                    autoFocus
                    inputMode="numeric"
                    placeholder="17"
                    value={model.gameIdInput}
                    onFocus={() => dispatch({ type: "focusJoinField", field: "gameId" })}
                    onChange={(e) => dispatch({ type: "setInput", field: "gameId", value: e.target.value })}
                />
            </Field>

            <Field label="Password" hint="Leave empty if the table has none.">
                <input
                    id="join-password"
                    name="password"
                    autoComplete="current-password"
                    className={inputClass}
                    type="password"
                    inputMode="numeric"
                    placeholder="No password"
                    value={model.passwordInput}
                    onFocus={() => dispatch({ type: "focusJoinField", field: "password" })}
                    onChange={(e) => dispatch({ type: "setInput", field: "password", value: e.target.value })}
                />
            </Field>

            <Actions
                onBack={() => dispatch({ type: "back" })}
                submitLabel="Join table"
                disabled={parseGameId(model.gameIdInput) === null}
            />
        </Panel>
    );
}

function Stepper({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="btn btn-ghost size-12 px-0 text-lg"
        >
            {label}
        </button>
    );
}
