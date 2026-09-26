import { AleoNetworkClient } from "@provablehq/sdk";
import { WalletSession, type WalletRef } from "./aleo.js";
import { LocalSession, type LocalSessionOptions } from "./localSession.js";

export const config = {
    networkName: "Testnet",
    endpoint: `${typeof window === "undefined" ? "" : window.location.origin}/explorer/v2`,
};

export function openWalletSession(wallet: WalletRef): WalletSession {
    return new WalletSession(wallet, new AleoNetworkClient(config.endpoint));
}

export function openLocalSession(options: Omit<LocalSessionOptions, "endpoint">): LocalSession {
    return new LocalSession({ ...options, endpoint: config.endpoint });
}
