import { useEffect } from "react";
import { useEns } from "../ens/index.js";
import type { PlayerId } from "../game/state.js";
import { Spinner } from "./Spinner.js";

export function EnsPanel({
    aleo,
    gameId,
    playerId,
}: {
    aleo: string;
    gameId: number | null;
    playerId: PlayerId | 0;
}) {
    const ens = useEns();
    const canWrite = Boolean(ens.ethAddress && ens.name);

    useEffect(() => {
        if (ens.name && aleo) {
            ens.claimSeat(aleo);
        }
    }, [aleo, ens.claimSeat, ens.name]);

    return (
        <section className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-gold/80 uppercase">ENSv2 · Sepolia</p>
            {ens.name ? (
                <div className="mt-2 flex items-center gap-2.5">
                    {ens.profile?.avatar && (
                        <img src={ens.profile.avatar} alt="" className="size-8 rounded-full object-cover" />
                    )}
                    <div className="min-w-0">
                        <p className="truncate font-display text-lg text-paper">{ens.name}</p>
                        <p className="truncate text-[11px] text-muted">
                            {ens.profile?.aleo ? "Aleo key published" : "No network.aleo record yet"}
                        </p>
                    </div>
                </div>
            ) : (
                <p className="mt-2 text-sm text-muted">
                    Connect Ethereum to play as your ENS name. Tables publish their Aleo game id as a{" "}
                    <code className="text-paper/80">poker.game</code> text record.
                </p>
            )}

            {ens.error && <p className="mt-2 text-xs text-red-300">{ens.error}</p>}
            {ens.busy && (
                <p className="mt-2 flex items-center gap-2 text-xs text-gold">
                    <Spinner className="size-3" /> {ens.busy}
                </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                {ens.ethAddress ? (
                    <GhostButton onClick={ens.disconnect}>Disconnect ETH</GhostButton>
                ) : (
                    <GhostButton onClick={() => void ens.connect()}>Connect Ethereum</GhostButton>
                )}
                {canWrite && (
                    <GhostButton disabled={Boolean(ens.busy)} onClick={() => void ens.publishBinding(aleo)}>
                        Publish Aleo key
                    </GhostButton>
                )}
                {canWrite && gameId !== null && playerId !== 0 && (
                    <GhostButton
                        disabled={Boolean(ens.busy)}
                        onClick={() => void ens.publishTable(gameId, aleo, playerId)}
                    >
                        Publish this table
                    </GhostButton>
                )}
                {canWrite && (
                    <GhostButton disabled={Boolean(ens.busy)} onClick={() => void ens.authorizePublisher()}>
                        {ens.publisher ? "Re-authorize publisher" : "Authorize table publisher"}
                    </GhostButton>
                )}
            </div>

            {ens.publisher && (
                <p className="mt-2 break-all text-[11px] text-muted/80">
                    Local key {ens.publisher} can update this name&apos;s table records after the grant, without
                    MetaMask on each publish. It does not sit at the table or shuffle.
                </p>
            )}
        </section>
    );
}

function GhostButton({
    children,
    onClick,
    disabled,
}: {
    children: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-paper transition hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {children}
        </button>
    );
}
