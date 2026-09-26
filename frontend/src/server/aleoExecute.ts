import {
    Account,
    AleoKeyProvider,
    AleoNetworkClient,
    ProgramManager,
    getOrInitConsensusVersionTestHeights,
    type ProvingRequest,
} from "@provablehq/sdk";
import { pokerEnv } from "./loadPokerEnv.js";

const PRIORITY_FEE_CREDITS = 0.1;

export function explorerHost(): string {
    const endpoint = (pokerEnv("ENDPOINT") || "https://api.explorer.provable.com").replace(/\/$/, "");
    return `${endpoint}/v2`;
}

/** `setProverUri` prefix. The testnet SDK appends `/testnet`. */
export function proveUri(): string {
    const raw = (pokerEnv("PROVABLE_API_URL") || "https://api.provable.com").replace(/\/$/, "");
    if (raw.includes("explorer")) {
        return "https://api.provable.com/prove";
    }
    if (raw.endsWith("/prove")) {
        return raw;
    }
    return `${raw.replace(/\/v2$/, "")}/prove`;
}

export function initServerAleo(): void {
    const heights = pokerEnv("CONSENSUS_HEIGHTS");
    if (heights) {
        getOrInitConsensusVersionTestHeights(heights);
    }
}

export function funderKey(): string {
    const key = pokerEnv("FUNDER_PRIVATE_KEY") || pokerEnv("PRIVATE_KEY");
    if (!key) {
        throw new Error("Set FUNDER_PRIVATE_KEY (or PRIVATE_KEY) in the poker .env");
    }
    return key;
}

export function funderAccount(): Account {
    return new Account({ privateKey: funderKey() });
}

export function fundAmount(): bigint {
    return parseMicrocredits(pokerEnv("FUND_MICROCREDITS")) ?? 40_000_000n;
}

function parseMicrocredits(raw: string | undefined): bigint | undefined {
    if (!raw) {
        return undefined;
    }
    const digits = raw.replace(/[_\s,]/g, "");
    if (!/^\d+$/.test(digits)) {
        return undefined;
    }
    return BigInt(digits);
}

export function programManagerFor(account: Account): { manager: ProgramManager; client: AleoNetworkClient } {
    const client = new AleoNetworkClient(explorerHost());
    const keys = new AleoKeyProvider();
    keys.useCache(true);
    const manager = new ProgramManager(explorerHost(), keys);
    manager.setAccount(account);
    return { manager, client };
}

export async function submitDelegated(provingRequest: ProvingRequest | string): Promise<void> {
    const apiKey = pokerEnv("PROVABLE_API_KEY");
    const consumerId = pokerEnv("PROVABLE_CONSUMER_ID");
    if (!apiKey || !consumerId) {
        throw new Error(
            "PROVABLE_API_KEY and PROVABLE_CONSUMER_ID are required for delegated proving. Put both in poker/.env (the repo root, not frontend/.env) and restart next.",
        );
    }
    const client = new AleoNetworkClient("https://api.provable.com/v2");
    client.setProverUri(proveUri());
    const result = await client.submitProvingRequestSafe({
        provingRequest,
        apiKey,
        consumerId,
    });
    if (!result.ok) {
        throw new Error(result.error.message || `Prove failed (${result.status})`);
    }
    const broadcast = result.data.broadcast_result;
    if (broadcast && (broadcast.status === "Rejected" || broadcast.status === "Failed")) {
        throw new Error(broadcast.message || `Broadcast ${broadcast.status}`);
    }
}

export async function transferPublic(from: Account, to: string, amount: bigint): Promise<bigint> {
    initServerAleo();
    const { manager, client } = programManagerFor(from);
    const funderBalance = await publicCredits(client, from.toString());
    const feeReserve = 2_000_000n;
    const maxSend = funderBalance > feeReserve ? funderBalance - feeReserve : 0n;
    if (maxSend <= 0n) {
        throw new Error(`House funder ${from} has ${funderBalance} microcredits; need public credits to fund a table`);
    }
    const send = amount < maxSend ? amount : maxSend;
    const before = await publicCredits(client, to);
    if (before > 0n) {
        return 0n;
    }
    const request = await manager.provingRequest({
        programName: "credits.aleo",
        functionName: "transfer_public",
        inputs: [to, `${send}u64`],
        priorityFee: PRIORITY_FEE_CREDITS,
        privateFee: false,
        broadcast: true,
    });
    await submitDelegated(request);
    const deadline = Date.now() + 600_000;
    while (Date.now() < deadline) {
        if ((await publicCredits(client, to)) !== before) {
            return send;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Timed out waiting for the house transfer to land");
}

export async function readPublicCredits(address: string): Promise<bigint> {
    return publicCredits(new AleoNetworkClient(explorerHost()), address);
}

async function publicCredits(client: AleoNetworkClient, address: string): Promise<bigint> {
    try {
        const value = await client.getProgramMappingValue("credits.aleo", "account", address);
        if (!value || value === "null") {
            return 0n;
        }
        return BigInt(value.replace(/"/g, "").replace(/u64(\.public|\.private)?$/, ""));
    } catch {
        return 0n;
    }
}

