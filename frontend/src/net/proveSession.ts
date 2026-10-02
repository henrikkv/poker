export async function requestProveSession(aleoAddress: string): Promise<string> {
    const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aleoAddress }),
    });
    const body = (await response.json()) as { token?: string; error?: string };
    if (!response.ok || !body.token) {
        throw new Error(body.error ?? "Could not open a local signing session");
    }
    return body.token;
}
