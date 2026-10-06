"use client";

import { WalletMultiButton } from "@provablehq/aleo-wallet-adapter-react-ui";
import { useWallet } from "@provablehq/aleo-wallet-adapter-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GameController } from "../game/controller.js";
import { initAleoRuntime } from "../net/localSession.js";
import { setLiveLocal, stopLiveLocal, takeLiveLocal } from "../net/liveLocal.js";
import { requestProveSession } from "../net/proveSession.js";
import { config, openLocalSession, openWalletSession } from "../net/session.js";
import { disconnectShieldWallet } from "../net/shieldWallet.js";
import {
    loadLocalAccount,
    loadSigningMode,
    peekLocalPrivateKey,
    saveLocalAccount,
    saveSigningMode,
    type SigningMode,
} from "../net/signing.js";
import { App } from "./App.js";
import { SettingsButton, SettingsDialog } from "./Settings.js";
import { Spinner } from "./Spinner.js";
import { WalletRoot } from "./WalletRoot.js";

export function Boot() {
    const [mode, setMode] = useState<SigningMode>("shield");
    const [ready, setReady] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [epoch, setEpoch] = useState(0);

    useEffect(() => {
        setMode(loadSigningMode());
        setReady(true);
    }, []);

    const saveSettings = (next: SigningMode, privateKey: string) => {
        const modeChanged = next !== mode;
        const keyChanged = next === "local" && privateKey !== peekLocalPrivateKey();
        if (!modeChanged && !keyChanged) {
            return;
        }
        if (keyChanged) {
            saveLocalAccount(privateKey);
        }
        if (modeChanged) {
            saveSigningMode(next);
        }
        stopLiveLocal();
        if (next === "local") {
            void disconnectShieldWallet();
        }
        setMode(next);
        setEpoch((current) => current + 1);
    };

    if (!ready) {
        return null;
    }

    const settings = settingsOpen ? (
        <SettingsDialog mode={mode} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />
    ) : null;
    const openSettings = () => setSettingsOpen(true);

    if (mode === "local") {
        return (
            <>
                <LocalBoot epoch={epoch} onOpenSettings={openSettings} />
                {settings}
            </>
        );
    }

    return (
        <WalletRoot>
            <ShieldBoot onOpenSettings={openSettings} />
            {settings}
        </WalletRoot>
    );
}

function ShieldBoot({ onOpenSettings }: { onOpenSettings: () => void }) {
    const wallet = useWallet();
    const walletRef = useRef(wallet);
    walletRef.current = wallet;
    const [controller, setController] = useState<GameController | null>(null);

    useEffect(() => {
        if (!wallet.connected || !wallet.address) {
            setController((current) => {
                current?.stop();
                return null;
            });
            return;
        }
        const next = new GameController(openWalletSession(walletRef), config.networkName);
        next.start();
        setController(next);
        return () => next.stop();
    }, [wallet.connected, wallet.address]);

    if (!wallet.connected || !wallet.address) {
        return (
            <Gate
                title={`Connect Shield to play on ${config.networkName}.`}
                onOpenSettings={onOpenSettings}
            >
                <WalletMultiButton />
            </Gate>
        );
    }

    if (!controller) {
        return (
            <div className="grid min-h-screen place-items-center p-8">
                <p className="flex items-center gap-2 text-sm text-muted">
                    <Spinner /> Opening your wallet session
                </p>
            </div>
        );
    }

    return <App controller={controller} signingMode="shield" onOpenSettings={onOpenSettings} />;
}

function LocalBoot({ epoch, onOpenSettings }: { epoch: number; onOpenSettings: () => void }) {
    const [controller, setController] = useState<GameController | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const account = loadLocalAccount();
        if (!account) {
            setController(null);
            setError("Add a private key in settings.");
            return;
        }
        const address = account.toString();
        const existing = takeLiveLocal(address);
        if (existing) {
            setError(null);
            setController(existing);
            return;
        }
        let cancelled = false;
        setController(null);
        setError(null);
        void (async () => {
            try {
                await initAleoRuntime();
                const token = await requestProveSession(address);
                if (cancelled) {
                    return;
                }
                const session = openLocalSession({ account, proveToken: token });
                const next = new GameController(session, config.networkName);
                next.start();
                if (cancelled) {
                    next.stop();
                    return;
                }
                setLiveLocal(address, next);
                setController(next);
            } catch (caught) {
                if (!cancelled) {
                    setError(caught instanceof Error ? caught.message : String(caught));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [epoch, attempt]);

    if (error) {
        return (
            <Gate title={error} onOpenSettings={onOpenSettings}>
                <button type="button" onClick={() => setAttempt((current) => current + 1)} className="btn btn-gold">
                    Try again
                </button>
            </Gate>
        );
    }

    if (!controller) {
        return (
            <div className="grid min-h-screen place-items-center p-8">
                <p className="flex items-center gap-2 text-sm text-muted">
                    <Spinner /> Opening your signing session
                </p>
            </div>
        );
    }

    return <App controller={controller} signingMode="local" onOpenSettings={onOpenSettings} />;
}

function Gate({
    title,
    onOpenSettings,
    children,
}: {
    title: string;
    onOpenSettings: () => void;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col px-5 py-8 lg:px-10">
            <SettingsButton onClick={onOpenSettings} className="self-start" />
            <div className="grid flex-1 place-items-center">
                <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
                    <div>
                        <h1 className="font-display text-5xl text-balance text-paper sm:text-6xl">Mental Poker</h1>
                        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-muted">{title}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
