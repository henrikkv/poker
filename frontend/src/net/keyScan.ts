import type { WalletContextState } from "@provablehq/aleo-wallet-adapter-react";
import { AleoNetworkClient, RecordScanner, ViewKey } from "@provablehq/sdk";
import { secretsFromRecord } from "../game/keysRecord.js";

/** About a week of ~10s testnet blocks. The scanner indexes from this height, not from genesis. */
const SCAN_WINDOW_BLOCKS = 60_480;
const SCANNER_URL = "https://api.provable.com/scanner";
const STATUS_POLLS = 8;

interface ScannedRecord {
    block_height?: number;
    record_plaintext?: string;
    record_ciphertext?: string;
    record_name?: string;
    program_name?: string;
}

export function scanStartHeight(latest: number, windowBlocks = SCAN_WINDOW_BLOCKS): number {
    if (!Number.isFinite(latest) || latest <= 0) {
        return 0;
    }
    return Math.max(0, Math.floor(latest) - windowBlocks);
}

/** Newest scanner rows first, in the shape `secretsFromRecord` already reads. */
export function ownedRecordsAsWalletRecords(records: readonly ScannedRecord[]): unknown[] {
    return [...records]
        .sort((left, right) => (right.block_height ?? 0) - (left.block_height ?? 0))
        .map((record) => ({
            plaintext: record.record_plaintext,
            record_ciphertext: record.record_ciphertext,
            record_name: record.record_name,
            program_name: record.program_name,
        }));
}

function hasKeysSecret(records: readonly unknown[]): boolean {
    return records.some((record) => secretsFromRecord(record) !== null);
}

/**
 * View key the wallet already holds on the connected account or the injected
 * Shield provider. Shield does not always copy it onto the adapter account.
 */
export function viewKeyFromWallet(wallet: WalletContextState): string | null {
    const stored = wallet.wallet?.adapter.account?.viewKey;
    if (stored) {
        return stored;
    }
    if (typeof window === "undefined") {
        return null;
    }
    const shield = (window as Window & { shield?: { viewKey?: unknown; account?: { viewKey?: unknown } } }).shield;
    if (typeof shield?.viewKey === "string" && shield.viewKey.length > 0) {
        return shield.viewKey;
    }
    if (typeof shield?.account?.viewKey === "string" && shield.account.viewKey.length > 0) {
        return shield.account.viewKey;
    }
    return null;
}

/** Forwards scanner calls so the Provable API key stays on the server. */
const scannerTransport: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === "string" ? init.body : undefined;
    return fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method: init?.method ?? "GET", body }),
    });
};

async function waitUntilIndexed(scanner: RecordScanner, uuid: string): Promise<void> {
    for (let attempt = 0; attempt < STATUS_POLLS; attempt += 1) {
        const status = await scanner.status(uuid);
        if (status.ok && (status.data.synced || status.data.percentage >= 100)) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
}

/**
 * Record Scanning Service lookup for unspent `Keys` records.
 * `registerEncrypted` encrypts the view key to the scanner before it leaves the browser.
 */
export async function scanKeysRecords(
    viewKey: string,
    programName: string,
    networkClient: AleoNetworkClient,
    decrypt?: (ciphertext: string) => Promise<string>,
): Promise<unknown[]> {
    const latest = await networkClient.getLatestHeight().catch(() => 0);
    const start = scanStartHeight(latest);
    const scanner = new RecordScanner({
        url: SCANNER_URL,
        decryptEnabled: true,
        autoReRegister: true,
        transport: scannerTransport,
    });
    const registered = await scanner.registerEncrypted(ViewKey.from_string(viewKey), start);
    if (!registered.ok) {
        throw new Error(registered.error.message || "Could not register with the record scanner");
    }
    await waitUntilIndexed(scanner, registered.data.uuid);
    const found = await scanner.findRecords({
        uuid: registered.data.uuid,
        unspent: true,
        filter: {
            start,
            programs: [programName],
            records: ["Keys"],
            // The scanner guide names these singular fields. The SDK type uses the arrays above.
            program: programName,
            record: "Keys",
        } as {
            start: number;
            programs: string[];
            records: string[];
            program: string;
            record: string;
        },
        responseFilter: {
            record_ciphertext: true,
            record_name: true,
            program_name: true,
            function_name: true,
            spent: true,
            block_height: true,
        },
    });
    const rows = found as ScannedRecord[];
    if (decrypt) {
        for (const row of rows) {
            if (row.record_plaintext || !row.record_ciphertext) {
                continue;
            }
            try {
                row.record_plaintext = await decrypt(row.record_ciphertext);
            } catch {
                // A ciphertext that is not this account's stays encrypted.
            }
        }
    }
    return ownedRecordsAsWalletRecords(rows);
}

/**
 * Records Shield still has, then a scanner lookup when the Keys record is missing.
 * `requestRecords(program, true)` is the wallet's own list, including what it still holds in memory.
 */
export async function recoverKeyRecords(
    wallet: WalletContextState,
    programName: string,
    networkClient: AleoNetworkClient,
): Promise<unknown[]> {
    let held: unknown[] = [];
    try {
        held = await wallet.requestRecords(programName, true, "all");
    } catch {
        held = [];
    }
    if (hasKeysSecret(held)) {
        return held;
    }
    const viewKey = viewKeyFromWallet(wallet);
    if (!viewKey) {
        return held;
    }
    try {
        const scanned = await scanKeysRecords(viewKey, programName, networkClient, (ciphertext) =>
            wallet.decrypt(ciphertext),
        );
        return [...held, ...scanned];
    } catch {
        return held;
    }
}
