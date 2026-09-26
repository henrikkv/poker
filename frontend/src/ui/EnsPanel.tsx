import { useEffect } from "react";
import { useEns } from "../ens/index.js";
import type { PlayerId } from "../game/state.js";
import { Spinner } from "./Spinner.js";
import type { PlayPath } from "./playPath.js";

export function EnsPanel({
    aleo,
    gameId,
    playerId,
    playPath,
}: {
    aleo: string;
    gameId: number | null;
    playerId: PlayerId | 0;
    playPath: PlayPath;
}) {
    if (playPath === "shield") {
        return <ShieldEnsNote />;
    }
    return <EthereumEnsPanel aleo={aleo} gameId={gameId} playerId={playerId} />;
}

function ShieldEnsNote() {
    return (
        <section className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-gold/80 uppercase">Join by name</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
                You can join a table by entering its ENS name on the join menu. This session only uses your
                Shield wallet.
            </p>
        </section>
    );
}

function EthereumEnsPanel({
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
    const seated = gameId !== null && playerId !== 0;

    useEffect(() => {
        if (ens.name && aleo) {
            ens.claimSeat(aleo);
        }
    }, [aleo, ens.claimSeat, ens.name]);

    useEffect(() => {
        if (gameId === null) {
            return;
        }
        void ens.hydrateDirectory(gameId);
    }, [ens.hydrateDirectory, gameId]);

    return (
        <section className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-gold/80 uppercase">ENS · Sepolia</p>
            {ens.name ? (
                <div className="mt-2 flex items-center gap-2.5">
                    {ens.profile?.avatar && (
                        <img src={ens.profile.avatar} alt="" className="size-8 rounded-full object-cover" />
                    )}
                    <div className="min-w-0">
                        <p className="truncate font-display text-lg text-paper">{ens.name}</p>
                        <p className="truncate text-[11px] text-muted">
                            {ens.profile?.aleo ? "Listed on this name" : "Not listed on this name yet"}
                        </p>
                    </div>
                </div>
            ) : (
                <p className="mt-2 text-sm text-muted">
                    Connect the wallet that owns your name if you want friends to join as yourname.eth.
                </p>
            )}

            {ens.error && <p className="mt-2 text-xs text-red-300">{ens.error}</p>}
            {ens.busy && (
                <p className="mt-2 flex items-center gap-2 text-xs text-gold">
                    <Spinner className="size-3" /> {ens.busy}
                </p>
            )}

            {canWrite && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    Optional. Your wallet will ask you to confirm an update to {ens.name}. Play works without
                    this.{" "}
                    {seated ? (
                        <>
                            <strong className="font-medium text-paper/80">Share this table</strong> writes the
                            current game and your seat onto the name, so friends can join as {ens.name}.
                        </>
                    ) : (
                        <>
                            <strong className="font-medium text-paper/80">Publish Aleo address</strong> lists
                            this session on the name so others can find you.
                        </>
                    )}
                </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                {canWrite && !seated && (
                    <GhostButton disabled={Boolean(ens.busy)} onClick={() => void ens.publishBinding(aleo)}>
                        Publish Aleo address
                    </GhostButton>
                )}
                {canWrite && seated && (
                    <GhostButton
                        disabled={Boolean(ens.busy)}
                        onClick={() => void ens.publishTable(gameId, aleo, playerId)}
                    >
                        Share this table
                    </GhostButton>
                )}
            </div>
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
