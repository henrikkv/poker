function asScalar(value: string): string {
    const literal = value.replace(/\.(private|public)$/, "");
    return literal.endsWith("scalar") ? literal : `${literal}scalar`;
}

function asText(value: unknown): string | null {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    if (typeof value === "number" || typeof value === "bigint") {
        return String(value);
    }
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.value === "string" && record.value.length > 0) {
            return record.value;
        }
        if (typeof record.plaintext === "string" && record.plaintext.length > 0) {
            return record.plaintext;
        }
    }
    return null;
}

function pick(fields: Record<string, unknown>, ...names: string[]): string | null {
    for (const name of names) {
        const text = asText(fields[name]);
        if (text) {
            return text;
        }
    }
    return null;
}

/** Scalar literals from the wallet and from `Scalar.toString()` differ by suffix and padding. */
export function sameScalar(left: string, right: string): boolean {
    const normalize = (value: string) => {
        const body = value
            .trim()
            .toLowerCase()
            .replace(/\.private|\.public/g, "")
            .replace(/scalar/g, "")
            .replace(/^0+(?=\d)/, "");
        return body.length > 0 ? body : "0";
    };
    return normalize(left) === normalize(right);
}

function fromFields(fields: Record<string, unknown>): { secret: string; secretInv: string } | null {
    const secret = pick(fields, "secret");
    const secretInv = pick(fields, "secret_inv", "secretInv");
    if (!secret || !secretInv) {
        return null;
    }
    return { secret: asScalar(secret), secretInv: asScalar(secretInv) };
}

/** Wallet-issued handle used to spend this exact record. */
export function recordUid(record: unknown): string | null {
    if (!record || typeof record !== "object" || !("uid" in record)) {
        return null;
    }
    const uid = record.uid;
    return typeof uid === "string" && uid.length > 0 ? uid : null;
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

    const plaintext = [rec.plaintext, rec.recordPlaintext, rec.record, rec.data].find(
        (value): value is string => typeof value === "string",
    );
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
