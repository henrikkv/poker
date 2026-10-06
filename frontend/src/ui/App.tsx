import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { GameController, GameMessage } from "../game/controller.js";
import { config } from "../net/session.js";
import type { SigningMode } from "../net/signing.js";
import { CreateGameForm, JoinGameForm } from "./Forms.js";
import { Header } from "./Header.js";
import { LogPanel } from "./LogPanel.js";
import { Menu } from "./Menu.js";
import { Table } from "./Table.js";
import { useController } from "./useController.js";

const KEYS: Record<string, GameMessage> = {
    ArrowLeft: { type: "left" },
    ArrowRight: { type: "right" },
    ArrowUp: { type: "up" },
    ArrowDown: { type: "down" },
    Enter: { type: "confirm" },
    Escape: { type: "back" },
};

function isTyping(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function App({
    controller,
    signingMode,
    onOpenSettings,
}: {
    controller: GameController;
    signingMode: SigningMode;
    onOpenSettings: () => void;
}) {
    const { model, status, busy } = useController(controller);
    const dispatch = controller.dispatch;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (document.querySelector("[role='dialog']")) {
                return;
            }
            if (event.key === "Escape") {
                dispatch(KEYS.Escape);
                return;
            }
            if (isTyping(event.target) || event.target instanceof HTMLButtonElement) {
                return;
            }
            const msg = KEYS[event.key];
            if (msg) {
                event.preventDefault();
                dispatch(msg);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [dispatch]);

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 lg:px-10">
            <Header
                status={status}
                networkName={config.networkName}
                signingMode={signingMode}
                onOpenSettings={onOpenSettings}
            />

            <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <main className="min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={model.screen}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            {model.screen === "menu" && (
                                <Menu
                                    selected={model.selectedMenuOption}
                                    seatedTables={model.seatedTables}
                                    lobbyTables={model.lobbyTables}
                                    lobbyReady={model.lobbyReady}
                                    blockedGameId={model.blockedGameId}
                                    yourAddress={status.address}
                                    dispatch={dispatch}
                                />
                            )}
                            {model.screen === "createGame" && (
                                <CreateGameForm model={model} dispatch={dispatch} />
                            )}
                            {model.screen === "joinGame" && (
                                <JoinGameForm model={model} dispatch={dispatch} />
                            )}
                            {model.screen === "inGame" && <Table model={model} busy={busy} dispatch={dispatch} />}
                        </motion.div>
                    </AnimatePresence>
                </main>

                <aside className="flex max-h-[70vh] min-h-64 flex-col lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)]">
                    <LogPanel logs={model.logs} />
                    {model.screen === "inGame" && (
                        <p className="mt-3 px-1 text-sm leading-relaxed text-muted">
                            Friends can join this table by game id.
                        </p>
                    )}
                </aside>
            </div>
        </div>
    );
}
