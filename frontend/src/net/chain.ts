import type { Session } from "./aleo.js";

export async function latestHeight(endpoint: string): Promise<number> {
    const response = await fetch(`${endpoint}/testnet/block/height/latest`);
    if (!response.ok) {
        throw new Error(`${response.status} ${await response.text()}`);
    }
    return Number(await response.json());
}

export async function publicBalance(session: Session, address: string): Promise<bigint> {
    const value = await session.mapping("credits.aleo", "account", address);
    if (value === null) {
        return 0n;
    }
    return BigInt(value.replace(/"/g, "").replace(/u64(\.public|\.private)?$/, ""));
}
