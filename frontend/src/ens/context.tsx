"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ensurePublisherKey, publisherAccountAddress, publisherAddress, publisherWallet } from "./agent.js";
import { POKER_PROGRAM, RECORD, tableRecordContext } from "./keys.js";
import { parseJoinTarget } from "./parse.js";
import { loadRoster, rememberAleo, rememberTable, type EnsRoster } from "./roster.js";
import {
    invalidateEnsProfile,
    resolveAleoRecord,
    resolvePrimaryName,
    resolveProfile,
    resolveTable,
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
    resolveJoin: (input: string) => Promise<{ gameId: number; tableName: string }>;
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
        if (next.aleo) {
            setRoster(rememberAleo(next.aleo, next.name));
        }
        if (next.gameId !== null) {
            setRoster(rememberTable(next.gameId, next.name));
        }
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

    const bindDirectory = useCallback(async (listed: EnsProfile) => {
        if (listed.aleo) {
            setRoster(rememberAleo(listed.aleo, listed.name));
        }
        for (const seatName of Object.values(listed.seats)) {
            if (!seatName) {
                continue;
            }
            const aleo = seatName === listed.name ? listed.aleo : await resolveAleoRecord(seatName);
            if (aleo) {
                setRoster(rememberAleo(aleo, seatName));
            }
        }
    }, []);

    const hydrateDirectory = useCallback(
        async (gameId: number) => {
            const tableName = roster.tables[String(gameId)] ?? (profile?.gameId === gameId ? profile.name : null);
            if (!tableName) {
                return;
            }
            try {
                const table = await resolveTable(tableName);
                setRoster(rememberTable(table.gameId, table.name));
                await bindDirectory(table.profile);
            } catch {
                if (profile?.name === tableName) {
                    await bindDirectory(profile);
                }
            }
        },
        [bindDirectory, profile, roster.tables],
    );

    const resolveJoin = useCallback(
        async (input: string) => {
            const target = parseJoinTarget(input);
            if (!target) {
                throw new Error("Enter a game id or an ENS name");
            }
            if (target.kind === "gameId") {
                return { gameId: target.gameId, tableName: roster.tables[String(target.gameId)] ?? `game ${target.gameId}` };
            }
            const table = await resolveTable(target.name);
            setRoster(rememberTable(table.gameId, table.name));
            await bindDirectory(table.profile);
            return { gameId: table.gameId, tableName: table.name };
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
                    invalidateEnsProfile(profile.name);
                    setRoster(rememberAleo(aleo, profile.name));
                    setProfile({ ...profile, aleo });
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
                const records: Array<readonly [string, string]> = [
                    [RECORD.game, String(gameId)],
                    [RECORD.program, POKER_PROGRAM],
                    [RECORD.aleo, aleo],
                    [RECORD.seat(playerId), profile.name],
                    [RECORD.agentContext, tableRecordContext(gameId, profile.name)],
                    [RECORD.agentEndpointWeb, typeof window === "undefined" ? "" : window.location.origin],
                ];
                await writeRecords(records);
                invalidateEnsProfile(profile.name);
                setRoster(rememberTable(gameId, profile.name));
                setRoster(rememberAleo(aleo, profile.name));
                setProfile({
                    ...profile,
                    aleo,
                    gameId,
                    agentContext: tableRecordContext(gameId, profile.name),
                    seats: { ...profile.seats, [playerId]: profile.name },
                });
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
            setRoster((current) => {
                if (current.aleo[aleo] === profile.name) {
                    return current;
                }
                return rememberAleo(aleo, profile.name);
            });
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
