"use client";

import { WalletMultiButton } from "@provablehq/aleo-wallet-adapter-react-ui";
import { useWallet } from "@provablehq/aleo-wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { EnsProvider, useEns } from "../ens/index.js";
import { GameController } from "../game/controller.js";
import { config, openWalletSession } from "../net/session.js";
import { App } from "./App.js";
import { Spinner } from "./Spinner.js";
import { WalletRoot } from "./WalletRoot.js";

function BootInner() {
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

    if (!wallet.connected || !wallet.address) {
        return (
            <div className="grid min-h-screen place-items-center p-8">
                <div className="flex flex-col items-center gap-5 text-center">
                    <p className="text-[11px] font-semibold tracking-[0.25em] text-gold/80 uppercase">
                        Aleo · {config.networkName}
                    </p>
                    <h1 className="font-display text-4xl text-paper">Mental Poker</h1>
                    <p className="max-w-md text-sm text-muted">
                        Connect Shield to play. After that, connect Ethereum to sit as your ENS name and let
                        friends join the table by that name instead of an Aleo game id.
                    </p>
                    <WalletMultiButton />
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

    return <App controller={controller} />;
}

export function Boot() {
    return (
        <WalletRoot>
            <EnsProvider>
                <BootInner />
            </EnsProvider>
        </WalletRoot>
    );
}
