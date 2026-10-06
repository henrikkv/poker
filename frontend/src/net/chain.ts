import type { Session } from "./aleo.js";

export async function publicBalance(session: Session, address: string): Promise<bigint> {
    const value = await session.mapping("credits.aleo", "account", address);
    if (value === null) {
        return 0n;
    }
    return BigInt(value.replace(/"/g, "").replace(/u64(\.public|\.private)?$/, ""));
}
