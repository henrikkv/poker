"use client";

import { WalletMultiButton } from "@provablehq/aleo-wallet-adapter-react-ui";
import { useWallet } from "@provablehq/aleo-wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { EnsProvider, useEns } from "../ens/index.js";
import { GameController } from "../game/controller.js";
import { requestHouseFunds } from "../net/fund.js";
import { initAleoRuntime } from "../net/localSession.js";
import { config, openLocalSession, openWalletSession } from "../net/session.js";
import { setLiveEthereum, stopLiveEthereum, takeLiveEthereum } from "../net/liveEthereum.js";
import { disconnectShieldWallet } from "../net/shieldWallet.js";
import { loadTempAccount } from "../net/tempAccount.js";
import { App } from "./App.js";
import type { PlayPath } from "./playPath.js";
import { Spinner } from "./Spinner.js";
import { WalletRoot } from "./WalletRoot.js";

function Chooser({ onChoose }: { onChoose: (path: PlayPath) => void }) {
    return (
        <div className="grid min-h-screen place-items-center p-8">
            <div className="flex flex-col items-center gap-5 text-center">
                <p className="text-[11px] font-semibold tracking-[0.25em] text-gold/80 uppercase">
                    Aleo · {config.networkName}
                </p>
                <h1 className="font-display text-4xl text-paper">Mental Poker</h1>
                <p className="max-w-md text-sm text-muted">
                    Choose one wallet. Play with Ethereum if you have a Sepolia ENS name. Play with Shield if
                    you use an Aleo wallet.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => onChoose("ethereum")}
                        className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_20px_rgba(230,195,106,0.25)]"
                    >
                        Play with Ethereum
                    </button>
                    <button
                        type="button"
                        onClick={() => onChoose("shield")}
                        className="rounded-xl border border-white/15 px-6 py-2.5 text-sm text-paper"
                    >
                        Play with Shield
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChangeWalletButton({ onChange }: { onChange: () => void }) {
    return (
        <button type="button" onClick={onChange} className="text-xs text-muted transition hover:text-paper">
            Use a different wallet
        </button>
    );
}

function ShieldBoot({ onChangeWallet }: { onChangeWallet: () => void }) {
    const wallet = useWallet();
    const walletRef = useRef(wallet);
    walletRef.current = wallet;
    const ens = useEns();
    const resolveJoin = useRef(ens.resolveJoin);
    resolveJoin.current = ens.resolveJoin;
    const [controller, setController] = useState<GameController | null>(null);

    useEffect(() => {
        if (!wallet.connected || !wallet.address) {
            setController((current) => {
                current?.stop();
                return null;
            });
            return;
        }
        const next = new GameController(
            openWalletSession(walletRef),
            config.networkName,
            config.endpoint,
            (input) => resolveJoin.current(input),
        );
        next.start();
        setController(next);
        return () => next.stop();
    }, [wallet.connected, wallet.address]);

    const leave = () => {
        if (wallet.connected) {
            void wallet.disconnect();
        }
        onChangeWallet();
    };

    if (!wallet.connected || !wallet.address) {
        return (
            <div className="grid min-h-screen place-items-center p-8">
                <div className="flex flex-col items-center gap-5 text-center">
                    <p className="text-[11px] font-semibold tracking-[0.25em] text-gold/80 uppercase">
                        Aleo · {config.networkName}
                    </p>
                    <h1 className="font-display text-4xl text-paper">Mental Poker</h1>
                    <p className="max-w-md text-sm text-muted">Connect Shield to play.</p>
                    <WalletMultiButton />
                    <ChangeWalletButton onChange={leave} />
                </div>
            </div>
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

    return <App controller={controller} playPath="shield" onChangeWallet={leave} />;
}

function EthereumBoot({ onChangeWallet }: { onChangeWallet: () => void }) {
    const ens = useEns();
    const resolveJoin = useRef(ens.resolveJoin);
    resolveJoin.current = ens.resolveJoin;
    const joinIdentity = useRef(() => ({ name: ens.name, aleo: ens.profile?.aleo ?? null }));
    joinIdentity.current = () => ({ name: ens.name, aleo: ens.profile?.aleo ?? null });
    const [phase, setPhase] = useState<"connect" | "fund" | "play">("connect");
    const [status, setStatus] = useState("Connect the wallet that owns your ENS name");
    const [error, setError] = useState<string | null>(null);
    const [controller, setController] = useState<GameController | null>(null);
    const [bootAttempt, setBootAttempt] = useState(0);
    const funding = useRef(false);

    useEffect(() => {
        void disconnectShieldWallet();
    }, []);

    useEffect(() => {
        if (!ens.ethAddress) {
            funding.current = false;
            return;
        }
        const existing = takeLiveEthereum(ens.ethAddress);
        if (existing) {
            setController(existing);
            setPhase("play");
            return;
        }
        if (funding.current) {
            return;
        }
        funding.current = true;
        let cancelled = false;
        setPhase("fund");
        setStatus("Preparing your session");
        void (async () => {
            try {
                await initAleoRuntime();
                const account = loadTempAccount(ens.ethAddress!);
                const funded = await requestHouseFunds(ens.ethAddress!, account.toString());
                if (cancelled) {
                    return;
                }
                const session = openLocalSession({
                    account,
                    ethAddress: ens.ethAddress!,
                    proveToken: funded.token,
                    funderAddress: funded.funderAddress,
                });
                const next = new GameController(
                    session,
                    config.networkName,
                    config.endpoint,
                    (input) => resolveJoin.current(input),
                    () => joinIdentity.current(),
                );
                next.start();
                setLiveEthereum(ens.ethAddress!, next);
                setController(next);
                setPhase("play");
            } catch (caught) {
                if (!cancelled) {
                    funding.current = false;
                    setError(caught instanceof Error ? caught.message : String(caught));
                    setPhase("connect");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [ens.ethAddress, bootAttempt]);

    const leave = () => {
        stopLiveEthereum(true);
        setController(null);
        ens.disconnect();
        onChangeWallet();
    };

    if (phase !== "play" || !controller) {
        return (
            <div className="grid min-h-screen place-items-center p-8">
                <div className="flex flex-col items-center gap-5 text-center">
                    <p className="text-[11px] font-semibold tracking-[0.25em] text-gold/80 uppercase">
                        Ethereum · Sepolia
                    </p>
                    <h1 className="font-display text-4xl text-paper">Mental Poker</h1>
                    <p className="max-w-md text-sm text-muted">{error ?? status}</p>
                    {!ens.ethAddress && (
                        <button
                            type="button"
                            onClick={() => void ens.connect()}
                            className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-ink"
                        >
                            Connect Ethereum
                        </button>
                    )}
                    {ens.busy && (
                        <p className="flex items-center gap-2 text-sm text-gold">
                            <Spinner /> {ens.busy}
                        </p>
                    )}
                    {phase === "fund" && !error && (
                        <p className="flex items-center gap-2 text-sm text-gold">
                            <Spinner /> Confirm in your wallet, then wait a moment
                        </p>
                    )}
                    {error && ens.ethAddress && (
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                funding.current = false;
                                setBootAttempt((current) => current + 1);
                            }}
                            className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-ink"
                        >
                            Try again
                        </button>
                    )}
                    <ChangeWalletButton onChange={leave} />
                </div>
            </div>
        );
    }

    return <App controller={controller} playPath="ethereum" onChangeWallet={leave} />;
}

export function Boot() {
    const [path, setPath] = useState<PlayPath | null>(null);

    const choose = (next: PlayPath) => {
        if (next === "ethereum") {
            void disconnectShieldWallet();
        }
        setPath(next);
    };

    const leavePath = () => {
        void disconnectShieldWallet();
        setPath(null);
    };

    if (!path) {
        return <Chooser onChoose={choose} />;
    }

    if (path === "shield") {
        return (
            <WalletRoot>
                <EnsProvider allowEthereum={false}>
                    <ShieldBoot onChangeWallet={leavePath} />
                </EnsProvider>
            </WalletRoot>
        );
    }

    return (
        <EnsProvider allowEthereum>
            <EthereumBoot onChangeWallet={leavePath} />
        </EnsProvider>
    );
}
