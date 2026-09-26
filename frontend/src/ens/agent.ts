import { createWalletClient, http, type WalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { sepoliaRpc } from "./client.js";

const STORAGE = "mental-poker.ens.table-publisher";

export function loadPublisherKey(): `0x${string}` | null {
    if (typeof localStorage === "undefined") {
        return null;
    }
    const value = localStorage.getItem(STORAGE);
    return value?.startsWith("0x") ? (value as `0x${string}`) : null;
}

export function publisherAccountAddress(): `0x${string}` | null {
    const key = loadPublisherKey();
    return key ? privateKeyToAccount(key).address : null;
}

/** Local ETH key that can update ENS table records after an EAC grant. */
export function ensurePublisherKey(): `0x${string}` {
    const existing = loadPublisherKey();
    if (existing) {
        return existing;
    }
    const key = generatePrivateKey();
    localStorage.setItem(STORAGE, key);
    return key;
}

export function publisherWallet(): WalletClient {
    const account = privateKeyToAccount(ensurePublisherKey());
    return createWalletClient({
        account,
        chain: sepolia,
        transport: http(sepoliaRpc()),
    });
}

export function publisherAddress(): `0x${string}` {
    return privateKeyToAccount(ensurePublisherKey()).address;
}
