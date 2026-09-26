import { signEthereumMessage } from "../ens/wallet.js";
import { fundMessage } from "./tempAccount.js";

export interface FundResult {
    token: string;
    amount: string;
    funderAddress: string;
    alreadyFunded: boolean;
}

export async function requestHouseFunds(
    ethAddress: `0x${string}`,
    aleoAddress: string,
): Promise<FundResult> {
    const issuedAt = new Date().toISOString();
    const signature = await signEthereumMessage(ethAddress, fundMessage(ethAddress, aleoAddress, issuedAt));
    const response = await fetch("/api/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ethAddress, aleoAddress, signature, issuedAt }),
    });
    const body = (await response.json()) as FundResult & { error?: string };
    if (!response.ok) {
        throw new Error(body.error ?? "Could not start your session");
    }
    return body;
}
