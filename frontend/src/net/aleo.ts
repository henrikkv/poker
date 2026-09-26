import type { TransactionInput } from "@provablehq/aleo-types";
import type { WalletContextState } from "@provablehq/aleo-wallet-adapter-react";
import { AleoNetworkClient } from "@provablehq/sdk";
import { withTimeout } from "./confirm.js";

export type { TransactionInput };

export type WalletRef = { current: WalletContextState };

/**
 * Priority fee sent to Shield, in microcredits.
 * Official adapter examples use 100_000. Shield still synthesizes the
 * transition to estimate the base fee; this value is not that estimate.
 */
export function publicFeeMicrocredits(_functionName: string): number {
    return 100_000;
}

/** Public credits to keep on top of a buy-in so the synthesized base fee still fits. */
export function reservedFeeMicrocredits(functionName: string): number {
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

/**
 * A connected Aleo wallet plus a read-only network client.
 * Transitions are signed and proved by the wallet (Shield via the adapter).
 */
export class Session {
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
        await this.waitUntilSettled(functionName, settled);
        return [];
    }

    async requestRecords(programName: string): Promise<unknown[]> {
        return withTimeout(this.wallet.requestRecords(programName, true, "unspent"), 8_000, "requestRecords");
    }

    async mapping(programName: string, mappingName: string, key: string): Promise<string | null> {
        try {
            const value = await this.networkClient.getProgramMappingValue(programName, mappingName, key);
            return value == null || value === "null" ? null : value;
        } catch (error) {
            if (String(error instanceof Error ? error.message : error).includes("404")) {
                return null;
            }
            throw error;
        }
    }

    private async waitUntilSettled(functionName: string, settled?: () => Promise<boolean>): Promise<void> {
        if (!settled) {
            return;
        }
        const deadline = Date.now() + 600_000;
        while (Date.now() < deadline) {
            if (await settled()) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        throw new Error(`Timed out waiting for ${functionName} to land on-chain`);
    }
}
