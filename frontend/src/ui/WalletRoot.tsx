"use client";

import { Network } from "@provablehq/aleo-types";
import { DecryptPermission } from "@provablehq/aleo-wallet-adapter-core";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adapter-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adapter-shield";
import type { ReactNode } from "react";
import "../app/wallet-adapter.css";

const wallets = [new ShieldWalletAdapter()];

export function WalletRoot({ children }: { children: ReactNode }) {
    return (
        <AleoWalletProvider
            wallets={wallets}
            network={Network.TESTNET}
            autoConnect
            decryptPermission={DecryptPermission.AutoDecrypt}
            programs={["credits.aleo", "mental_poker2.aleo"]}
        >
            <WalletModalProvider>{children}</WalletModalProvider>
        </AleoWalletProvider>
    );
}
