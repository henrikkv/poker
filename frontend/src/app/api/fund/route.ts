import { verifyMessage } from "viem";
import { deleteGrant, findGrant, fundingInFlight, grantToken, putGrant } from "../../../server/grants.js";
import { fundAmount, funderAccount, readPublicCredits, transferPublic } from "../../../server/aleoExecute.js";
import { fundMessage } from "../../../net/tempAccount.js";

export const runtime = "nodejs";
export const maxDuration = 300;

interface FundBody {
    ethAddress?: string;
    aleoAddress?: string;
    signature?: string;
    issuedAt?: string;
}

export async function POST(request: Request): Promise<Response> {
    try {
        const body = (await request.json()) as FundBody;
        const ethAddress = body.ethAddress?.toLowerCase();
        const aleoAddress = body.aleoAddress;
        const signature = body.signature;
        const issuedAt = body.issuedAt;
        if (!ethAddress || !aleoAddress || !signature || !issuedAt) {
            return Response.json({ error: "ethAddress, aleoAddress, signature, and issuedAt are required" }, { status: 400 });
        }
        if (Math.abs(Date.now() - Date.parse(issuedAt)) > 10 * 60_000) {
            return Response.json({ error: "Funding signature expired" }, { status: 400 });
        }
        const valid = await verifyMessage({
            address: ethAddress as `0x${string}`,
            message: fundMessage(ethAddress, aleoAddress, issuedAt),
            signature: signature as `0x${string}`,
        });
        if (!valid) {
            return Response.json({ error: "Invalid Ethereum signature" }, { status: 401 });
        }

        const existing = findGrant((grant) => grant.eth === ethAddress);
        const held = await readPublicCredits(aleoAddress);
        if (held > 0n || (existing && existing[1].aleo === aleoAddress)) {
            const token = existing?.[0] ?? grantToken();
            putGrant(token, { eth: ethAddress, aleo: aleoAddress, at: Date.now() });
            return Response.json({
                alreadyFunded: true,
                token,
                amount: held.toString(),
                funderAddress: funderAccount().toString(),
            });
        }

        if (fundingInFlight.has(ethAddress) || fundingInFlight.has(aleoAddress)) {
            return Response.json({ error: "This session is already starting. Wait a moment and try again." }, { status: 409 });
        }
        fundingInFlight.add(ethAddress);
        fundingInFlight.add(aleoAddress);
        try {
            if (existing) {
                deleteGrant(existing[0]);
            }
            const funder = funderAccount();
            const amount = await transferPublic(funder, aleoAddress, fundAmount());
            const token = grantToken();
            putGrant(token, { eth: ethAddress, aleo: aleoAddress, at: Date.now() });
            return Response.json({
                alreadyFunded: false,
                token,
                amount: amount.toString(),
                funderAddress: funder.toString(),
            });
        } finally {
            fundingInFlight.delete(ethAddress);
            fundingInFlight.delete(aleoAddress);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[fund]", message);
        return Response.json({ error: "Could not start your session" }, { status: 500 });
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const body = (await request.json()) as { token?: string };
    if (body.token) {
        deleteGrant(body.token);
    }
    return Response.json({ ok: true });
}
