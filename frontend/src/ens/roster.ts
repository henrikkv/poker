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

export function rememberTable(gameId: number, name: string): EnsRoster {
    const roster = loadRoster();
    if (roster.tables[String(gameId)] === name) {
        return roster;
    }
    roster.tables[String(gameId)] = name;
    saveRoster(roster);
    return roster;
}

export function rememberAleo(aleo: string, name: string): EnsRoster {
    const roster = loadRoster();
    if (roster.aleo[aleo] === name) {
        return roster;
    }
    roster.aleo[aleo] = name;
    saveRoster(roster);
    return roster;
}
