import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function searchDirs(): string[] {
    const dirs: string[] = [];
    let dir = process.cwd();
    for (let i = 0; i < 4; i += 1) {
        dirs.push(dir);
        const parent = resolve(dir, "..");
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return dirs;
}

function envFiles(): string[] {
    const names = [".env", ".env.local", ".env.development", ".env.development.local"];
    return searchDirs().flatMap((dir) => names.map((name) => resolve(dir, name)));
}

function parseEnvFile(path: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    if (!existsSync(path)) {
        return parsed;
    }
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const cut = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!cut) {
            continue;
        }
        let value = cut[2].trim();
        if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        parsed[cut[1]] = value;
    }
    return parsed;
}

function mergedEnv(): Record<string, string> {
    const merged: Record<string, string> = {};
    for (const file of envFiles()) {
        const parsed = parseEnvFile(file);
        for (const [key, value] of Object.entries(parsed)) {
            if (value) {
                merged[key] = value;
            }
        }
    }
    return merged;
}

/** Reads poker/.env and frontend/.env*. First non-empty value for each key wins from the farthest parent. */
export function pokerEnv(name: string): string | undefined {
    const fromFiles = mergedEnv()[name];
    const fromProcess = process.env[name];
    const value = fromFiles || fromProcess;
    return value && value.length > 0 ? value : undefined;
}
