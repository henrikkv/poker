import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

let cached: PublicClient | null = null;

export function sepoliaRpc(): string {
    return process.env.NEXT_PUBLIC_SEPOLIA_RPC || DEFAULT_RPC;
}

/** Read-only ENSv2 client. Resolution goes through the Universal Resolver on Sepolia. */
export function ensPublicClient(): PublicClient {
    if (!cached) {
        cached = createPublicClient({
            chain: sepolia,
            transport: http(sepoliaRpc()),
        });
    }
    return cached;
}
