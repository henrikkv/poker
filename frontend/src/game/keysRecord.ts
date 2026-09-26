function asScalar(value: string): string {
    const literal = value.replace(/\.(private|public)$/, "");
    return literal.endsWith("scalar") ? literal : `${literal}scalar`;
}

function pick(fields: Record<string, unknown>, ...names: string[]): string | null {
    for (const name of names) {
        const value = fields[name];
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
    }
    return null;
}

function fromFields(fields: Record<string, unknown>): { secret: string; secretInv: string } | null {
    const secret = pick(fields, "secret");
    const secretInv = pick(fields, "secret_inv", "secretInv");
    if (!secret || !secretInv) {
        return null;
    }
    return { secret: asScalar(secret), secretInv: asScalar(secretInv) };
}

/** Reads `secret` / `secret_inv` from a wallet Keys record of any adapter shape. */
export function secretsFromRecord(record: unknown): { secret: string; secretInv: string } | null {
    if (!record || typeof record !== "object") {
        return null;
    }
    const rec = record as Record<string, unknown>;
    const view = rec.recordView;
    const viewFields =
        view && typeof view === "object" && "fields" in view && view.fields && typeof view.fields === "object"
            ? (view.fields as Record<string, unknown>)
            : null;

    for (const fields of [viewFields, rec, rec.data]) {
        if (fields && typeof fields === "object" && !Array.isArray(fields)) {
            const pair = fromFields(fields as Record<string, unknown>);
            if (pair) {
                return pair;
            }
        }
    }

    const plaintext = [rec.plaintext, rec.record, rec.data].find((value): value is string => typeof value === "string");
    if (!plaintext) {
        return null;
    }
    const secretInv = plaintext.match(/secret_inv:\s*([^,}\s]+)/)?.[1];
    const secret = plaintext.match(/(?:^|[{\s,])secret:\s*([^,}\s]+)/)?.[1];
    if (!secret || !secretInv) {
        return null;
    }
    return { secret: asScalar(secret), secretInv: asScalar(secretInv) };
}
