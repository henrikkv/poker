export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

export function isFailureStatus(status: string): boolean {
    const value = status.toLowerCase();
    return value === "failed" || value === "rejected" || value.includes("fail") || value.includes("reject");
}

export function isSuccessStatus(status: string): boolean {
    const value = status.toLowerCase();
    return value === "accepted" || value === "finalized" || value === "completed" || value === "success";
}

export function onchainId(value: string | undefined): string | undefined {
    return value?.startsWith("at1") ? value : undefined;
}

export function onchainIdFromStatus(status: object): string | undefined {
    const record = status as Record<string, unknown>;
    for (const key of ["transactionId", "id", "transaction_id"]) {
        const value = record[key];
        if (typeof value === "string") {
            const id = onchainId(value);
            if (id) {
                return id;
            }
        }
    }
    return undefined;
}

export function explorerOutcome(body: unknown): "accepted" | "failed" | "rejected" | null {
    if (!body || typeof body !== "object") {
        return null;
    }
    const record = body as Record<string, unknown>;
    const nested = record.transaction;
    const status = String(record.status ?? "").toLowerCase();
    if (isFailureStatus(status)) {
        return status.includes("reject") ? "rejected" : "failed";
    }
    if (isSuccessStatus(status) || typeof record.id === "string" || (nested && typeof nested === "object")) {
        return "accepted";
    }
    return null;
}
