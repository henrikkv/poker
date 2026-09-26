import { getGrant } from "../../../server/grants.js";
import { submitDelegated } from "../../../server/aleoExecute.js";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
    try {
        const body = (await request.json()) as { token?: string; provingRequest?: string };
        if (!body.token || !getGrant(body.token)) {
            return Response.json({ error: "Unknown or expired prove token" }, { status: 401 });
        }
        if (!body.provingRequest) {
            return Response.json({ error: "provingRequest is required" }, { status: 400 });
        }
        await submitDelegated(body.provingRequest);
        return Response.json({ ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[prove]", message);
        return Response.json({ error: message }, { status: 500 });
    }
}
