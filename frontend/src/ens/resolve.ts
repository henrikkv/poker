import { normalize } from "viem/ens";
import { ensPublicClient } from "./client.js";
import { RECORD } from "./keys.js";
import { parseGameRecord } from "./parse.js";

export interface EnsProfile {
    name: string;
    address: `0x${string}` | null;
    avatar: string | null;
    description: string | null;
    aleo: string | null;
    gameId: number | null;
    agentContext: string | null;
    agentEndpoint: string | null;
    seats: Partial<Record<1 | 2 | 3, string>>;
}

export interface EnsTable {
    name: string;
    gameId: number;
    profile: EnsProfile;
}

async function text(name: string, key: string): Promise<string | null> {
    try {
        return await ensPublicClient().getEnsText({ name, key });
    } catch {
        return null;
    }
}

export async function resolveProfile(rawName: string): Promise<EnsProfile> {
    const name = normalize(rawName);
    const client = ensPublicClient();
    const [address, avatar, description, aleo, game, agentContext, agentEndpoint, seat1, seat2, seat3] =
        await Promise.all([
            client.getEnsAddress({ name }).catch(() => null),
            client.getEnsAvatar({ name }).catch(() => null),
            text(name, "description"),
            text(name, RECORD.aleo),
            text(name, RECORD.game),
            text(name, RECORD.agentContext),
            text(name, RECORD.agentEndpointWeb),
            text(name, RECORD.seat(1)),
            text(name, RECORD.seat(2)),
            text(name, RECORD.seat(3)),
        ]);
    return {
        name,
        address,
        avatar,
        description,
        aleo,
        gameId: parseGameRecord(game),
        agentContext,
        agentEndpoint,
        seats: {
            ...(seat1 ? { 1: seat1 } : {}),
            ...(seat2 ? { 2: seat2 } : {}),
            ...(seat3 ? { 3: seat3 } : {}),
        },
    };
}

export async function resolvePrimaryName(address: `0x${string}`): Promise<string | null> {
    try {
        return await ensPublicClient().getEnsName({ address });
    } catch {
        return null;
    }
}

export async function resolveTable(rawName: string): Promise<EnsTable> {
    const profile = await resolveProfile(rawName);
    if (profile.gameId === null) {
        throw new Error(`${profile.name} has no ${RECORD.game} record on ENSv2 Sepolia`);
    }
    return { name: profile.name, gameId: profile.gameId, profile };
}
