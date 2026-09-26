import { AleoNetworkClient } from "@provablehq/sdk";
import { Session, type WalletRef } from "./aleo.js";

export const config = {
    networkName: "Testnet",
    endpoint: `${typeof window === "undefined" ? "" : window.location.origin}/explorer/v2`,
};

export function openWalletSession(wallet: WalletRef): Session {
    return new Session(wallet, new AleoNetworkClient(config.endpoint));
}
