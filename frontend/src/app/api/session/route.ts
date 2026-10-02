import { Account } from "@provablehq/sdk";
import { findGrant, grantToken, putGrant } from "../../../server/grants.js";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
    try {
        const body = (await request.json()) as { aleoAddress?: string };
        const aleoAddress = body.aleoAddress?.trim();
        if (!aleoAddress || !Account.isValidAddress(aleoAddress)) {
            return Response.json({ error: "A valid Aleo address is required" }, { status: 400 });
        }
        const existing = findGrant((grant) => grant.aleo === aleoAddress);
        if (existing) {
            return Response.json({ token: existing[0] });
        }
        const token = grantToken();
        putGrant(token, { aleo: aleoAddress, at: Date.now() });
        return Response.json({ token });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[session]", message);
        return Response.json({ error: "Could not open a local signing session" }, { status: 500 });
    }
}
