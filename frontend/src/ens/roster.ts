export interface EnsRoster {
    tables: Record<string, string>;
    aleo: Record<string, string>;
}

const STORAGE = "mental-poker.ens.roster";

function empty(): EnsRoster {
    return { tables: {}, aleo: {} };
}

export function loadRoster(): EnsRoster {
    if (typeof localStorage === "undefined") {
        return empty();
    }
    try {
        const raw = localStorage.getItem(STORAGE);
        if (!raw) {
            return empty();
        }
        const parsed = JSON.parse(raw) as Partial<EnsRoster>;
        return {
            tables: parsed.tables && typeof parsed.tables === "object" ? parsed.tables : {},
            aleo: parsed.aleo && typeof parsed.aleo === "object" ? parsed.aleo : {},
        };
    } catch {
        return empty();
    }
}

export function saveRoster(roster: EnsRoster): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.setItem(STORAGE, JSON.stringify(roster));
}

export function rememberTable(gameId: number, name: string, current?: EnsRoster): EnsRoster {
    const roster = current ?? loadRoster();
    if (roster.tables[String(gameId)] === name) {
        return roster;
    }
    const next = { tables: { ...roster.tables, [String(gameId)]: name }, aleo: roster.aleo };
    saveRoster(next);
    return next;
}

export function rememberAleo(aleo: string, name: string, current?: EnsRoster): EnsRoster {
    const roster = current ?? loadRoster();
    if (roster.aleo[aleo] === name) {
        return roster;
    }
    const taken = Object.entries(roster.aleo).find(([, seated]) => seated === name)?.[0];
    if (taken && taken !== aleo) {
        if (!taken.startsWith("seat.")) {
            return roster;
        }
        const aleoMap = { ...roster.aleo };
        delete aleoMap[taken];
        aleoMap[aleo] = name;
        const next = { tables: roster.tables, aleo: aleoMap };
        saveRoster(next);
        return next;
    }
    const next = { tables: roster.tables, aleo: { ...roster.aleo, [aleo]: name } };
    saveRoster(next);
    return next;
}

export function applyDirectory(listed: {
    name: string;
    aleo: string | null;
    gameId: number | null;
    tables?: number[];
}, current?: EnsRoster): EnsRoster {
    let next = current ?? loadRoster();
    if (listed.aleo) {
        next = rememberAleo(listed.aleo, listed.name, next);
    }
    for (const id of listed.tables ?? []) {
        next = rememberTable(id, listed.name, next);
    }
    if (listed.gameId !== null) {
        next = rememberTable(listed.gameId, listed.name, next);
    }
    return next;
}
