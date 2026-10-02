import { Account } from "@provablehq/sdk";

const MODE_KEY = "mental-poker.signing-mode";
const ACCOUNT_KEY = "mental-poker.local-account";

export type SigningMode = "shield" | "local";

interface StoredLocalAccount {
    privateKey: string;
    createdHeight: number | null;
}

export function loadSigningMode(): SigningMode {
    if (typeof localStorage === "undefined") {
        return "shield";
    }
    return localStorage.getItem(MODE_KEY) === "local" ? "local" : "shield";
}

export function saveSigningMode(mode: SigningMode): void {
    localStorage.setItem(MODE_KEY, mode);
}

function readStored(): StoredLocalAccount | null {
    if (typeof localStorage === "undefined") {
        return null;
    }
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<StoredLocalAccount>;
        if (typeof parsed.privateKey !== "string" || parsed.privateKey.length === 0) {
            return null;
        }
        return {
            privateKey: parsed.privateKey,
            createdHeight: typeof parsed.createdHeight === "number" ? parsed.createdHeight : null,
        };
    } catch {
        return null;
    }
}

function writeStored(stored: StoredLocalAccount): void {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(stored));
}

export function peekLocalPrivateKey(): string {
    return readStored()?.privateKey ?? "";
}

export function loadLocalAccount(): Account | null {
    const stored = readStored();
    if (!stored) {
        return null;
    }
    try {
        return new Account({ privateKey: stored.privateKey });
    } catch {
        return null;
    }
}

export function accountFromPrivateKey(privateKey: string): Account {
    return new Account({ privateKey: privateKey.trim() });
}

/** Persist a key. A different key starts record scanning from the current height. */
export function saveLocalAccount(privateKey: string): Account {
    const trimmed = privateKey.trim();
    const account = new Account({ privateKey: trimmed });
    const previous = readStored();
    writeStored({
        privateKey: trimmed,
        createdHeight: previous?.privateKey === trimmed ? previous.createdHeight : null,
    });
    return account;
}

export function generateLocalPrivateKey(): string {
    const account = new Account();
    return account.privateKey().to_string();
}

export function rememberLocalAccountHeight(height: number): void {
    const stored = readStored();
    if (!stored || stored.createdHeight !== null) {
        return;
    }
    writeStored({ ...stored, createdHeight: height });
}

export function localAccountScanStart(latestHeight: number, maxBlocks: number): number {
    const created = readStored()?.createdHeight ?? null;
    if (created !== null) {
        return Math.max(0, created - 32);
    }
    return Math.max(0, latestHeight - maxBlocks);
}
