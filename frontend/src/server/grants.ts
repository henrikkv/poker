import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface Grant {
    aleo: string;
    at: number;
}

function grantFile(): string {
    const here = process.cwd();
    const dir = existsSync(resolve(here, "package.json")) ? here : resolve(here, "frontend");
    return resolve(dir, ".fund-grants.json");
}

function readAll(): Record<string, Grant> {
    const path = grantFile();
    if (!existsSync(path)) {
        return {};
    }
    try {
        return JSON.parse(readFileSync(path, "utf8")) as Record<string, Grant>;
    } catch {
        return {};
    }
}

function writeAll(grants: Record<string, Grant>): void {
    writeFileSync(grantFile(), `${JSON.stringify(grants, null, 2)}\n`);
}

export function getGrant(token: string): Grant | undefined {
    return readAll()[token];
}

export function findGrant(predicate: (grant: Grant) => boolean): [string, Grant] | undefined {
    return Object.entries(readAll()).find(([, grant]) => predicate(grant));
}

export function putGrant(token: string, grant: Grant): void {
    const grants = readAll();
    grants[token] = grant;
    writeAll(grants);
}

export function deleteGrant(token: string): void {
    const grants = readAll();
    delete grants[token];
    writeAll(grants);
}

export function grantToken(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
