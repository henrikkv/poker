"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ensurePublisherKey, publisherAccountAddress, publisherAddress, publisherWallet } from "./agent.js";
import { POKER_PROGRAM, RECORD, tableRecordContext } from "./keys.js";
import { parseJoinTarget } from "./parse.js";
import { encodeTablesRecord } from "./tables.js";
import { applyDirectory, loadRoster, rememberAleo, type EnsRoster } from "./roster.js";
import {
    cacheEnsProfile,
    peekEnsProfile,
    resolvePrimaryName,
    resolveProfile,
    resolveTable,
    type EnsJoinResult,
    type EnsProfile,
} from "./resolve.js";
import { connectEthereum, ownerWallet } from "./wallet.js";
import { grantPublisherSetterRoles, setTextRecords } from "./write.js";

export interface EnsIdentity {
    name: string;
    avatar: string | null;
}

export interface EnsContextValue {
    ethAddress: `0x${string}` | null;
    name: string | null;
    profile: EnsProfile | null;
    publisher: `0x${string}` | null;
    roster: EnsRoster;
    busy: string | null;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    resolveJoin: (input: string) => Promise<EnsJoinResult>;
    hydrateDirectory: (gameId: number) => Promise<void>;
    publishBinding: (aleo: string) => Promise<void>;
    publishTable: (gameId: number, aleo: string, playerId: 1 | 2 | 3) => Promise<void>;
    authorizePublisher: () => Promise<void>;
    claimSeat: (aleo: string) => void;
    identityFor: (aleo: string | null | undefined) => EnsIdentity | null;
    tableNameFor: (gameId: number | null) => string | null;
}

const EnsContext = createContext<EnsContextValue | null>(null);

export function EnsProvider({
    children,
    allowEthereum = true,
}: {
    children: ReactNode;
    /** When false, resolve ENS names only — never request an Ethereum wallet. */
    allowEthereum?: boolean;
}) {
    const [ethAddress, setEthAddress] = useState<`0x${string}` | null>(null);
    const [profile, setProfile] = useState<EnsProfile | null>(null);
    const [roster, setRoster] = useState<EnsRoster>(() => loadRoster());
    const [publisher, setPublisher] = useState<`0x${string}` | null>(() => publisherAccountAddress());
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (label: string, work: () => Promise<void>) => {
        setBusy(label);
        setError(null);
        try {
            await work();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
            throw caught;
        } finally {
            setBusy(null);
        }
    }, []);

    const loadNamedProfile = useCallback(async (address: `0x${string}`) => {
        const primary = await resolvePrimaryName(address);
        if (!primary) {
            setProfile(null);
            return;
        }
        const next = await resolveProfile(primary);
        setProfile(next);
        setRoster((current) => applyDirectory(next, current));
    }, []);

    const connect = useCallback(async () => {
        if (!allowEthereum) {
            return;
        }
        await run("Connecting Ethereum", async () => {
            const address = await connectEthereum();
            setEthAddress(address);
            await loadNamedProfile(address);
        });
    }, [allowEthereum, loadNamedProfile, run]);

    const disconnect = useCallback(() => {
        setEthAddress(null);
        setProfile(null);
        setError(null);
    }, []);

    const bindDirectory = useCallback((listed: EnsProfile) => {
        setRoster((current) => applyDirectory(listed, current));
    }, []);

    const hydratedKey = useRef<string | null>(null);

    const hydrateDirectory = useCallback(
        async (gameId: number) => {
            const tableName =
                loadRoster().tables[String(gameId)] ??
                (profile && (profile.gameId === gameId || profile.tables.includes(gameId)) ? profile.name : null);
            if (!tableName) {
                return;
            }
            const key = `${gameId}:${tableName}`;
            if (hydratedKey.current === key) {
                return;
            }
            const local = (profile?.name === tableName ? profile : null) ?? peekEnsProfile(tableName);
            if (local) {
                hydratedKey.current = key;
                bindDirectory(local);
                return;
            }
            try {
                bindDirectory(await resolveProfile(tableName));
                hydratedKey.current = key;
            } catch {
                // Keep the local roster if Sepolia is rate-limited.
            }
        },
        [bindDirectory, profile],
    );

    const resolveJoin = useCallback(
        async (input: string) => {
            const target = parseJoinTarget(input);
            if (!target) {
                throw new Error("Enter a game id or an ENS name");
            }
            if (target.kind === "gameId") {
                return {
                    gameId: target.gameId,
                    tableName: roster.tables[String(target.gameId)] ?? `game ${target.gameId}`,
                    inviteGameId: target.gameId,
                    listedIds: [target.gameId],
                };
            }
            const table = await resolveTable(target.name, { fresh: true });
            bindDirectory(table.profile);
            return {
                gameId: table.gameId,
                tableName: table.name,
                inviteGameId: table.gameId,
                listedIds: table.listedIds,
            };
        },
        [bindDirectory, roster.tables],
    );

    const writeRecords = useCallback(
        async (records: Array<readonly [string, string]>) => {
            if (!profile?.name) {
                throw new Error("Connect an Ethereum wallet that has a primary ENS name on Sepolia");
            }
            const name = profile.name;
            try {
                if (publisherAccountAddress()) {
                    await setTextRecords(publisherWallet(), name, records);
                    return;
                }
            } catch {
                // Fall back to the connected owner wallet.
            }
            if (!ethAddress) {
                throw new Error("Connect Ethereum to publish ENS records");
            }
            await setTextRecords(ownerWallet(ethAddress), name, records);
        },
        [ethAddress, profile],
    );

    const publishBinding = useCallback(
        async (aleo: string) => {
            if (!allowEthereum) {
                return;
            }
            await run("Updating your ENS name", async () => {
                await writeRecords([[RECORD.aleo, aleo]]);
                if (profile) {
                    const next = { ...profile, aleo };
                    cacheEnsProfile(next);
                    setRoster((current) => rememberAleo(aleo, profile.name, current));
                    setProfile(next);
                }
            });
        },
        [allowEthereum, profile, run, writeRecords],
    );

    const publishTable = useCallback(
        async (gameId: number, aleo: string, playerId: 1 | 2 | 3) => {
            if (!allowEthereum) {
                return;
            }
            await run("Updating your ENS name", async () => {
                if (!profile?.name) {
                    throw new Error("Connect an Ethereum wallet that has a primary ENS name on Sepolia");
                }
                const listed = profile.tables ?? [];
                const tables = listed.includes(gameId) ? listed : [...listed, gameId];
                const records: Array<readonly [string, string]> = [
                    [RECORD.game, String(gameId)],
                    [RECORD.tables, encodeTablesRecord(tables)],
                    [RECORD.program, POKER_PROGRAM],
                    [RECORD.aleo, aleo],
                    [RECORD.seat(1), playerId === 1 ? profile.name : ""],
                    [RECORD.seat(2), playerId === 2 ? profile.name : ""],
                    [RECORD.seat(3), playerId === 3 ? profile.name : ""],
                    [RECORD.agentContext, tableRecordContext(gameId, profile.name)],
                    [RECORD.agentEndpointWeb, typeof window === "undefined" ? "" : window.location.origin],
                ];
                await writeRecords(records);
                const next = {
                    ...profile,
                    aleo,
                    gameId,
                    tables,
                    agentContext: tableRecordContext(gameId, profile.name),
                    seats: { [playerId]: profile.name },
                };
                cacheEnsProfile(next);
                setRoster((current) => applyDirectory(next, current));
                setProfile(next);
            });
        },
        [allowEthereum, profile, run, writeRecords],
    );

    const authorizePublisher = useCallback(async () => {
        if (!allowEthereum) {
            return;
        }
        await run("Authorizing table publisher", async () => {
            if (!ethAddress || !profile?.name) {
                throw new Error("Connect an ENS name you can write on Sepolia");
            }
            ensurePublisherKey();
            const account = publisherAddress();
            await grantPublisherSetterRoles(ownerWallet(ethAddress), profile.name, account);
            setPublisher(account);
        });
    }, [allowEthereum, ethAddress, profile, run]);

    const claimSeat = useCallback(
        (aleo: string) => {
            if (!profile?.name) {
                return;
            }
            setRoster((current) => rememberAleo(aleo, profile.name, current));
        },
        [profile],
    );

    const identityFor = useCallback(
        (aleo: string | null | undefined): EnsIdentity | null => {
            if (!aleo) {
                return null;
            }
            const name = roster.aleo[aleo] ?? (profile?.aleo === aleo ? profile.name : null);
            if (!name) {
                return null;
            }
            return { name, avatar: profile?.name === name ? profile.avatar : null };
        },
        [profile, roster.aleo],
    );

    const tableNameFor = useCallback(
        (gameId: number | null) => (gameId === null ? null : roster.tables[String(gameId)] ?? null),
        [roster.tables],
    );

    const value = useMemo<EnsContextValue>(
        () => ({
            ethAddress,
            name: profile?.name ?? null,
            profile,
            publisher,
            roster,
            busy,
            error,
            connect,
            disconnect,
            resolveJoin,
            hydrateDirectory,
            publishBinding,
            publishTable,
            authorizePublisher,
            claimSeat,
            identityFor,
            tableNameFor,
        }),
        [
            authorizePublisher,
            busy,
            claimSeat,
            connect,
            publisher,
            disconnect,
            error,
            ethAddress,
            identityFor,
            profile,
            hydrateDirectory,
            publishBinding,
            publishTable,
            resolveJoin,
            roster,
            tableNameFor,
        ],
    );

    return <EnsContext.Provider value={value}>{children}</EnsContext.Provider>;
}

export function useEns(): EnsContextValue {
    const value = useContext(EnsContext);
    if (!value) {
        throw new Error("useEns must be used inside EnsProvider");
    }
    return value;
}
