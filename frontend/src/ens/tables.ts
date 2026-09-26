function asGameId(value: unknown): number | null {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
        return value;
    }
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
        return Number(value.trim());
    }
    return null;
}

/** `poker.tables` is a JSON array of advertised game ids, newest last. */
export function parseTablesRecord(value: string | null | undefined): number[] {
    if (value == null || value.trim() === "") {
        return [];
    }
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }
        const ids: number[] = [];
        for (const item of parsed) {
            const id = asGameId(item);
            if (id !== null && !ids.includes(id)) {
                ids.push(id);
            }
        }
        return ids;
    } catch {
        return [];
    }
}

export function encodeTablesRecord(ids: number[]): string {
    const unique: number[] = [];
    for (const id of ids) {
        if (Number.isInteger(id) && id >= 0 && !unique.includes(id)) {
            unique.push(id);
        }
    }
    return JSON.stringify(unique);
}
