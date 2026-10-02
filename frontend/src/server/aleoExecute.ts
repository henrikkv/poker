import { AleoNetworkClient, getOrInitConsensusVersionTestHeights, type ProvingRequest } from "@provablehq/sdk";
import { pokerEnv } from "./loadPokerEnv.js";

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

export async function submitDelegated(provingRequest: ProvingRequest | string): Promise<void> {
    initServerAleo();
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
