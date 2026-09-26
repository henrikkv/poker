import { normalize } from "viem/ens";
import { ensPublicClient } from "./client.js";
import { RECORD } from "./keys.js";
import { parseGameRecord } from "./parse.js";
import { parseTablesRecord } from "./tables.js";

const PROFILE_TTL_MS = 60_000;
const profileCache = new Map<string, { at: number; profile: EnsProfile }>();
const aleoCache = new Map<string, { at: number; aleo: string | null }>();
const inflight = new Map<string, Promise<EnsProfile>>();

export interface EnsProfile {
    name: string;
    address: `0x${string}` | null;
    avatar: string | null;
    description: string | null;
    aleo: string | null;
    gameId: number | null;
    tables: number[];
    agentContext: string | null;
    agentEndpoint: string | null;
    seats: Partial<Record<1 | 2 | 3, string>>;
}

export interface EnsTable {
    name: string;
    gameId: number | null;
    listedIds: number[];
    profile: EnsProfile;
}

export interface EnsJoinResult {
    tableName: string;
    gameId: number | null;
    inviteGameId: number | null;
    listedIds: number[];
}

function uniqueIds(ids: Array<number | null | undefined>): number[] {
    const listed: number[] = [];
    for (const id of ids) {
        if (id !== null && id !== undefined && Number.isInteger(id) && !listed.includes(id)) {
            listed.push(id);
        }
    }
    return listed;
}

export function peekEnsProfile(rawName: string): EnsProfile | null {
    const name = normalize(rawName);
    const hit = profileCache.get(name);
    if (!hit || Date.now() - hit.at > PROFILE_TTL_MS) {
        return null;
    }
    return hit.profile;
}

export function invalidateEnsProfile(rawName: string): void {
    const name = normalize(rawName);
    profileCache.delete(name);
    aleoCache.delete(name);
}

export function cacheEnsProfile(profile: EnsProfile): void {
    profileCache.set(profile.name, { at: Date.now(), profile });
    if (profile.aleo) {
        aleoCache.set(profile.name, { at: Date.now(), aleo: profile.aleo });
    }
}

async function text(name: string, key: string): Promise<string | null> {
    try {
        return await ensPublicClient().getEnsText({ name, key });
    } catch {
        return null;
    }
}

async function withRetry<T>(work: () => Promise<T>, attempts = 4): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await work();
        } catch (error) {
            last = error;
            await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
        }
    }
    throw last instanceof Error ? last : new Error(String(last));
}

export async function resolveAleoRecord(rawName: string): Promise<string | null> {
    const name = normalize(rawName);
    const hit = aleoCache.get(name);
    if (hit && Date.now() - hit.at < PROFILE_TTL_MS) {
        return hit.aleo;
    }
    const aleo = await text(name, RECORD.aleo);
    aleoCache.set(name, { at: Date.now(), aleo });
    return aleo;
}

export async function resolveProfile(rawName: string, options?: { fresh?: boolean }): Promise<EnsProfile> {
    const name = normalize(rawName);
    if (!options?.fresh) {
        const cached = peekEnsProfile(name);
        if (cached) {
            return cached;
        }
    }
    const pending = inflight.get(name);
    if (pending) {
        return pending;
    }
    const work = fetchProfile(name).finally(() => inflight.delete(name));
    inflight.set(name, work);
    return work;
}

async function fetchProfile(name: string): Promise<EnsProfile> {
    const client = ensPublicClient();
    const [address, avatar, description, aleo, game, tables, agentContext, agentEndpoint, seat1, seat2, seat3] =
        await Promise.all([
            client.getEnsAddress({ name }).catch(() => null),
            client.getEnsAvatar({ name }).catch(() => null),
            text(name, "description"),
            text(name, RECORD.aleo),
            text(name, RECORD.game),
            text(name, RECORD.tables),
            text(name, RECORD.agentContext),
            text(name, RECORD.agentEndpointWeb),
            text(name, RECORD.seat(1)),
            text(name, RECORD.seat(2)),
            text(name, RECORD.seat(3)),
        ]);
    const profile: EnsProfile = {
        name,
        address,
        avatar,
        description,
        aleo,
        gameId: parseGameRecord(game),
        tables: typeof parseTablesRecord === "function" ? parseTablesRecord(tables) : [],
        agentContext,
        agentEndpoint,
        seats: {
            ...(seat1 ? { 1: seat1 } : {}),
            ...(seat2 ? { 2: seat2 } : {}),
            ...(seat3 ? { 3: seat3 } : {}),
        },
    };
    const readFailed = address === null && aleo === null && game === null && tables === null;
    if (!readFailed) {
        profileCache.set(name, { at: Date.now(), profile });
        aleoCache.set(name, { at: Date.now(), aleo });
    }
    return profile;
}

export async function resolvePrimaryName(address: `0x${string}`): Promise<string | null> {
    try {
        return await ensPublicClient().getEnsName({ address });
    } catch {
        return null;
    }
}

export async function resolveTable(rawName: string, options?: { fresh?: boolean }): Promise<EnsTable> {
    if (options?.fresh) {
        invalidateEnsProfile(rawName);
    }
    const profile = options?.fresh
        ? await withRetry(async () => {
              const next = await resolveProfile(rawName, { fresh: true });
              if (uniqueIds([...next.tables, next.gameId]).length === 0) {
                  throw new Error(`${next.name} is not listing a table right now`);
              }
              return next;
          }, 2)
        : await resolveProfile(rawName);
    const listedIds = uniqueIds([...profile.tables, profile.gameId]);
    if (listedIds.length === 0) {
        throw new Error(`${profile.name} is not listing a table right now`);
    }
    return { name: profile.name, gameId: profile.gameId, listedIds, profile };
}
