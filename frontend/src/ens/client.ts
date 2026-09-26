import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

const DEFAULT_RPCS = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://sepolia.drpc.org",
    "https://rpc.sepolia.org",
];

let cached: PublicClient | null = null;

export function sepoliaRpc(): string {
    return process.env.NEXT_PUBLIC_SEPOLIA_RPC || DEFAULT_RPCS[0];
}

function rpcList(): string[] {
    const preferred = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
    const urls = preferred ? [preferred, ...DEFAULT_RPCS.filter((url) => url !== preferred)] : DEFAULT_RPCS;
    return [...new Set(urls)];
}

/** Read-only ENSv2 client. Resolution goes through the Universal Resolver on Sepolia. */
export function ensPublicClient(): PublicClient {
    if (!cached) {
        cached = createPublicClient({
            chain: sepolia,
            transport: fallback(rpcList().map((url) => http(url))),
        });
    }
    return cached;
}
