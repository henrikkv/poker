import type { FormEvent, ReactNode } from "react";
import { parseJoinTarget } from "../ens/parse.js";
import type { GameMessage } from "../game/controller.js";
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
            className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-black/25 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur"
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
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</span>
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
            <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm text-muted transition hover:text-paper">
                Back
            </button>
            <div className="flex items-center gap-3">
                {reason && <span className="text-xs text-muted">{reason}</span>}
                <button
                    type="submit"
                    disabled={disabled}
                    className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_20px_rgba(230,195,106,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
            <Field label="Game id or ENS name" hint="A host who published their table can be joined as alice.eth.">
                <input
                    id="join-game-id"
                    name="gameId"
                    autoComplete="off"
                    className={inputClass}
                    autoFocus
                    placeholder="17 or alice.eth"
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
                disabled={parseJoinTarget(model.gameIdInput) === null}
            />
        </Panel>
    );
}

function Stepper({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/25 text-lg text-paper transition hover:border-gold/50"
        >
            {label}
        </button>
    );
}
