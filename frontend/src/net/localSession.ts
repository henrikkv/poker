import {
    Account,
    AleoKeyProvider,
    AleoNetworkClient,
    NetworkRecordProvider,
    ProgramManager,
    getOrInitConsensusVersionTestHeights,
} from "@provablehq/sdk";
import type { TransactionInput } from "@provablehq/aleo-types";
import { publicBalance } from "./chain.js";
import { PRIORITY_FEE_CREDITS, readMapping, waitUntilSettled, type Session } from "./aleo.js";
import { clearTempAccount, rememberTempAccountHeight, tempAccountScanStart } from "./tempAccount.js";

export interface LocalSessionOptions {
    account: Account;
    endpoint: string;
    ethAddress: string;
    proveToken: string;
    funderAddress: string;
}

function consensusHeights(): string | undefined {
    const value = process.env.CONSENSUS_HEIGHTS;
    return value && value.length > 0 ? value : undefined;
}

export async function initAleoRuntime(): Promise<void> {
    const heights = consensusHeights();
    if (heights) {
        getOrInitConsensusVersionTestHeights(heights);
    }
}

/** ~10s testnet blocks. Do not walk the explorer further back than one day. */
const RECORD_SCAN_BLOCKS = 8_640;

export class LocalSession implements Session {
    readonly kind = "local" as const;
    private readonly networkClient: AleoNetworkClient;
    private readonly programManager: ProgramManager;
    private readonly records: NetworkRecordProvider;
    private returned = false;

    constructor(private readonly options: LocalSessionOptions) {
        this.networkClient = new AleoNetworkClient(options.endpoint);
        const keys = new AleoKeyProvider();
        keys.useCache(true);
        this.records = new NetworkRecordProvider(options.account, this.networkClient);
        this.programManager = new ProgramManager(options.endpoint, keys, this.records);
        this.programManager.setAccount(options.account);
        void this.networkClient.getLatestHeight().then((height) => {
            rememberTempAccountHeight(this.options.ethAddress, height);
        });
    }

    address(): string {
        return this.options.account.toString();
    }

    async execute(
        programName: string,
        functionName: string,
        inputs: TransactionInput[],
        settled?: () => Promise<boolean>,
    ): Promise<string[]> {
        const resolved = await this.resolveInputs(inputs);
        const request = await this.programManager.provingRequest({
            programName,
            functionName,
            inputs: resolved,
            priorityFee: PRIORITY_FEE_CREDITS,
            privateFee: false,
            broadcast: true,
        });
        const response = await fetch("/api/prove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: this.options.proveToken,
                provingRequest: request.toString(),
            }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
            throw new Error(body.error ?? `Delegated prove failed for ${programName}/${functionName}`);
        }
        await waitUntilSettled(functionName, settled);
        return [];
    }

    private async recordScanWindow(): Promise<{ startHeight: number; endHeight: number }> {
        const endHeight = await this.networkClient.getLatestHeight();
        rememberTempAccountHeight(this.options.ethAddress, endHeight);
        return {
            startHeight: tempAccountScanStart(this.options.ethAddress, endHeight, RECORD_SCAN_BLOCKS),
            endHeight,
        };
    }

    async requestRecords(programName: string): Promise<unknown[]> {
        try {
            const window = await this.recordScanWindow();
            const found = await this.records.findRecords({
                unspent: true,
                program: programName,
                programName,
                ...window,
            });
            return found.map((record) => ({
                plaintext: record.record_plaintext ?? "",
                recordView: { fields: {} },
                program: record.program_name ?? programName,
                recordName: record.record_name,
            }));
        } catch {
            return [];
        }
    }

    async mapping(programName: string, mappingName: string, key: string): Promise<string | null> {
        return readMapping(this.networkClient, programName, mappingName, key);
    }

    async returnFunds(): Promise<void> {
        if (this.returned) {
            return;
        }
        const balance = await publicBalance(this, this.address());
        const fee = 1_000_000n;
        if (balance > fee) {
            await this.execute("credits.aleo", "transfer_public", [
                this.options.funderAddress,
                `${balance - fee}u64`,
            ]);
        }
        this.returned = true;
        clearTempAccount(this.options.ethAddress);
        await fetch("/api/fund", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: this.options.proveToken }),
        });
    }

    private async resolveInputs(inputs: TransactionInput[]): Promise<string[]> {
        const resolved: string[] = [];
        for (const input of inputs) {
            if (typeof input === "string") {
                resolved.push(input);
                continue;
            }
            if (input && typeof input === "object" && "type" in input && input.type === "record") {
                const program = "program" in input && typeof input.program === "string" ? input.program : "";
                const recordName = "recordname" in input && typeof input.recordname === "string" ? input.recordname : "";
                const records = await this.records.findRecords({
                    unspent: true,
                    program,
                    programName: program,
                    recordName,
                    record_name: recordName,
                    ...(await this.recordScanWindow()),
                });
                const match = records.find((record) => !recordName || record.record_name === recordName) ?? records[0];
                if (!match?.record_plaintext) {
                    throw new Error(`No unspent ${recordName || "record"} found for ${program}`);
                }
                resolved.push(match.record_plaintext);
                continue;
            }
            throw new Error("Unsupported transaction input");
        }
        return resolved;
    }
}
