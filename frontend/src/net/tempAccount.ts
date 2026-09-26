import { Account } from "@provablehq/sdk";

const prefix = "mental-poker.temp-aleo.";

interface StoredTemp {
    privateKey: string;
    createdHeight: number | null;
}

function storageKey(ethAddress: string): string {
    return `${prefix}${ethAddress.toLowerCase()}`;
}

function readRaw(ethAddress: string): string | null {
    const key = storageKey(ethAddress);
    if (typeof localStorage !== "undefined") {
        const local = localStorage.getItem(key);
        if (local) {
            return local;
        }
    }
    if (typeof sessionStorage !== "undefined") {
        const session = sessionStorage.getItem(key);
        if (session) {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(key, session);
            }
            return session;
        }
    }
    return null;
}

function parseStored(raw: string): StoredTemp {
    if (raw.startsWith("{")) {
        const parsed = JSON.parse(raw) as Partial<StoredTemp>;
        if (typeof parsed.privateKey === "string") {
            return {
                privateKey: parsed.privateKey,
                createdHeight: typeof parsed.createdHeight === "number" ? parsed.createdHeight : null,
            };
        }
    }
    return { privateKey: raw, createdHeight: null };
}

function writeStored(ethAddress: string, stored: StoredTemp): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.setItem(storageKey(ethAddress), JSON.stringify(stored));
}

export function loadTempAccount(ethAddress: string): Account {
    const raw = readRaw(ethAddress);
    if (raw) {
        return new Account({ privateKey: parseStored(raw).privateKey });
    }
    const account = new Account();
    writeStored(ethAddress, { privateKey: account.privateKey().to_string(), createdHeight: null });
    return account;
}

export function rememberTempAccountHeight(ethAddress: string, height: number): void {
    const raw = readRaw(ethAddress);
    if (!raw) {
        return;
    }
    const stored = parseStored(raw);
    if (stored.createdHeight !== null) {
        return;
    }
    writeStored(ethAddress, { ...stored, createdHeight: height });
}

export function tempAccountScanStart(ethAddress: string, latestHeight: number, maxBlocks: number): number {
    const raw = readRaw(ethAddress);
    const created = raw ? parseStored(raw).createdHeight : null;
    if (created !== null) {
        return Math.max(0, created - 32);
    }
    return Math.max(0, latestHeight - maxBlocks);
}

export function clearTempAccount(ethAddress: string): void {
    const key = storageKey(ethAddress);
    if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
    }
    if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(key);
    }
}

export function fundMessage(ethAddress: string, aleoAddress: string, issuedAt: string): string {
    return `Fund mental-poker temp Aleo account ${aleoAddress} from ${ethAddress} at ${issuedAt}`;
}
