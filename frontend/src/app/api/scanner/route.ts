import { pokerEnv } from "../../../server/loadPokerEnv.js";

export const runtime = "nodejs";

const SCANNER_PREFIX = "https://api.provable.com/scanner/testnet/";

let jwt: { token: string; expiration: number } | null = null;

async function authorization(): Promise<{ token: string; apiKey: string }> {
    const apiKey = pokerEnv("PROVABLE_API_KEY");
    const consumerId = pokerEnv("PROVABLE_CONSUMER_ID");
    if (!apiKey || !consumerId) {
        throw new Error(
            "PROVABLE_API_KEY and PROVABLE_CONSUMER_ID are required to scan records. Put both in poker/.env and restart next.",
        );
    }
    if (jwt && Date.now() < jwt.expiration - 5 * 60 * 1000) {
        return { token: jwt.token, apiKey };
    }
    const response = await fetch(`https://api.provable.com/jwts/${consumerId}`, {
        method: "POST",
        headers: { "X-Provable-API-Key": apiKey },
    });
    if (!response.ok) {
        throw new Error(`Could not authorize the record scan (${response.status})`);
    }
    const token = response.headers.get("authorization");
    if (!token) {
        throw new Error("Record scan authorization did not return a token");
    }
    const body = (await response.json()) as { exp?: number };
    jwt = { token, expiration: (body.exp ?? 0) * 1000 };
    return { token, apiKey };
}

export async function POST(request: Request): Promise<Response> {
    let payload: { url?: string; method?: string; body?: string };
    try {
        payload = (await request.json()) as { url?: string; method?: string; body?: string };
    } catch {
        return Response.json({ error: "Invalid scanner request" }, { status: 400 });
    }
    const url = payload.url ?? "";
    if (!url.startsWith(SCANNER_PREFIX)) {
        return Response.json({ error: "Unsupported scanner url" }, { status: 400 });
    }
    const method = payload.method === "GET" ? "GET" : "POST";
    try {
        const auth = await authorization();
        const upstream = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: auth.token,
                "X-Provable-API-Key": auth.apiKey,
            },
            body: method === "GET" ? undefined : payload.body,
        });
        const text = await upstream.text();
        return new Response(text, {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Record scan failed";
        return Response.json({ error: message }, { status: 502 });
    }
}
