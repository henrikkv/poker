import type { TransactionInput } from "@provablehq/aleo-types";
import type { WalletContextState } from "@provablehq/aleo-wallet-adapter-react";
import { AleoNetworkClient } from "@provablehq/sdk";
import { createBlockPace, isNewBlock, msUntilHeightCheck, noteHeight, noteMissedHeight } from "./blockPace.js";
import { withTimeout } from "./confirm.js";
import { recoverKeyRecords } from "./keyScan.js";

export type { TransactionInput };

export type WalletRef = { current: WalletContextState };

export type SessionKind = "wallet" | "local";

export interface Session {
    readonly kind: SessionKind;
    address(): string;
    execute(
        programName: string,
        functionName: string,
        inputs: TransactionInput[],
        settled?: () => Promise<boolean>,
    ): Promise<string[]>;
    requestRecords(programName: string): Promise<unknown[]>;
    mapping(programName: string, mappingName: string, key: string): Promise<string | null>;
    /** Latest block height via `AleoNetworkClient.getLatestHeight`. */
    latestHeight(): Promise<number>;
}

/**
 * Priority fee sent to Shield, in microcredits.
 * Official adapter examples use 100_000. Shield still synthesizes the
 * transition to estimate the base fee; this value is not that estimate.
 */
export function publicFeeMicrocredits(_functionName: string): number {
    return 100_000;
}

/** Public credits to keep on top of a buy-in so the fee still fits. */
export function reservedFeeMicrocredits(functionName: string, kind: SessionKind = "wallet"): number {
    if (kind === "local") {
        return 500_000;
    }
    switch (functionName) {
        case "create_game":
        case "join_game":
        case "new_hand":
        case "shuffle_deck":
            return 8_000_000;
        case "decrypt_hands":
        case "decrypt_flop":
        case "decrypt_turn_river":
        case "showdown":
        case "compare_hands":
            return 3_000_000;
        default:
            return 1_000_000;
    }
}

export const PRIORITY_FEE_CREDITS = 0.1;

function sleep(ms: number): Promise<void> {
    if (ms <= 0) {
        return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits until `settled` sees the program mapping change.
 * One mapping read up front, in case the transaction is already in the latest block,
 * then one more each time `getLatestHeight` moves. Height itself is not polled faster
 * than the block interval.
 */
export async function waitUntilSettled(
    functionName: string,
    settled?: () => Promise<boolean>,
    readHeight?: () => Promise<number>,
): Promise<void> {
    if (!settled) {
        return;
    }
    const deadline = Date.now() + 600_000;
    if (await settled()) {
        return;
    }
    let pace = createBlockPace();
    try {
        const height = readHeight ? await readHeight() : 0;
        pace = noteHeight(pace, height, Date.now());
    } catch {
        pace = noteMissedHeight(pace, Date.now());
    }
    while (Date.now() < deadline) {
        const remaining = deadline - Date.now();
        const wait = Math.min(msUntilHeightCheck(pace, Date.now()), remaining);
        await sleep(wait);
        if (Date.now() >= deadline) {
            break;
        }
        let height: number;
        try {
            height = readHeight ? await readHeight() : (pace.height ?? 0) + 1;
        } catch {
            pace = noteMissedHeight(pace, Date.now());
            continue;
        }
        const advanced = isNewBlock(pace, height);
        pace = noteHeight(pace, height, Date.now());
        if (!advanced) {
            continue;
        }
        if (await settled()) {
            return;
        }
    }
    throw new Error(`Timed out waiting for ${functionName} to finish`);
}

export async function readMapping(
    networkClient: AleoNetworkClient,
    programName: string,
    mappingName: string,
    key: string,
): Promise<string | null> {
    try {
        const value = await networkClient.getProgramMappingValue(programName, mappingName, key);
        return value == null || value === "null" ? null : value;
    } catch (error) {
        if (String(error instanceof Error ? error.message : error).includes("404")) {
            return null;
        }
        throw error;
    }
}

/**
 * A connected Aleo wallet plus a read-only network client.
 * Transitions are signed and proved by the wallet (Shield via the adapter).
 */
export class WalletSession implements Session {
    readonly kind = "wallet" as const;

    constructor(
        private readonly walletRef: WalletRef,
        private readonly networkClient: AleoNetworkClient,
    ) {}

    private get wallet(): WalletContextState {
        return this.walletRef.current;
    }

    address(): string {
        if (!this.wallet.address) {
            throw new Error("Connect an Aleo wallet to play");
        }
        return this.wallet.address;
    }

    /**
     * Asks the wallet to execute a transition, then waits until `settled` sees
     * the program mapping change. Shield's `shield_…` ids are not explorer ids.
     */
    async execute(
        programName: string,
        functionName: string,
        inputs: TransactionInput[],
        settled?: () => Promise<boolean>,
    ): Promise<string[]> {
        const submitted = await this.wallet.executeTransaction({
            program: programName,
            function: functionName,
            inputs,
            fee: publicFeeMicrocredits(functionName),
        });
        if (!submitted?.transactionId) {
            throw new Error(`Wallet did not submit ${programName}/${functionName}`);
        }
        await waitUntilSettled(functionName, settled, () => this.networkClient.getLatestHeight());
        return [];
    }

    latestHeight(): Promise<number> {
        return this.networkClient.getLatestHeight();
    }

    async requestRecords(programName: string): Promise<unknown[]> {
        return withTimeout(
            recoverKeyRecords(this.wallet, programName, this.networkClient),
            60_000,
            "requestRecords",
        );
    }

    async mapping(programName: string, mappingName: string, key: string): Promise<string | null> {
        return readMapping(this.networkClient, programName, mappingName, key);
    }
}
