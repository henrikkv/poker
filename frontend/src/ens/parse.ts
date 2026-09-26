export type JoinTarget = { kind: "gameId"; gameId: number } | { kind: "ens"; name: string };

/** True when the input looks like a name, not a numeric Aleo game id. */
export function looksLikeEnsName(input: string): boolean {
    const value = input.trim().toLowerCase();
    if (!value.includes(".") || /\s/.test(value)) {
        return false;
    }
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value);
}

export function parseJoinTarget(input: string): JoinTarget | null {
    const value = input.trim();
    if (value === "") {
        return null;
    }
    if (/^\d+$/.test(value)) {
        return { kind: "gameId", gameId: Number(value) };
    }
    if (looksLikeEnsName(value)) {
        return { kind: "ens", name: value.toLowerCase() };
    }
    return null;
}

export function parseGameRecord(value: string | null | undefined): number | null {
    if (value == null) {
        return null;
    }
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
        return null;
    }
    return Number(trimmed);
}

export { encodeTablesRecord, parseTablesRecord } from "./tables.js";
