import { WalletMultiButton } from "@provablehq/aleo-wallet-adapter-react-ui";
import type { ReactNode } from "react";
import { useEns } from "../ens/index.js";
import type { ClientStatus } from "../game/controller.js";
import { formatCredits } from "../game/model.js";
import type { PlayPath } from "./playPath.js";

export function Header({
    status,
    networkName,
    playPath,
    onChangeWallet,
    gameId,
    inviteGameId,
}: {
    status: ClientStatus;
    networkName: string;
    playPath: PlayPath;
    onChangeWallet: () => void;
    gameId: number | null;
    inviteGameId: number | null;
}) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="text-[11px] font-semibold tracking-[0.25em] text-gold/80 uppercase">
                    {playPath === "ethereum" ? "Ethereum · Sepolia" : `Aleo · ${networkName}`}
                </p>
                <h1 className="font-display text-3xl leading-tight text-paper">Mental Poker</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={status.nodeError ? "bad" : "ok"}>
                    <span className={`size-2 rounded-full ${status.nodeError ? "bg-red-400" : "bg-emerald-400"}`} />
                    {status.nodeError ? "Node unreachable" : `Block ${status.height ?? "…"}`}
                </Pill>

                <Pill tone="neutral">{status.balance === null ? "…" : `${formatCredits(status.balance)} credits`}</Pill>

                {playPath === "ethereum" && <EnsName gameId={gameId} inviteGameId={inviteGameId} />}
                {playPath === "shield" && <WalletMultiButton />}

                <button
                    type="button"
                    onClick={onChangeWallet}
                    className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-muted transition hover:border-gold/50 hover:text-paper"
                >
                    Use a different wallet
                </button>
            </div>
        </header>
    );
}

function EnsName({ gameId, inviteGameId }: { gameId: number | null; inviteGameId: number | null }) {
    const ens = useEns();
    if (!ens.name) {
        return null;
    }
    const invite = inviteGameId ?? ens.profile?.gameId ?? null;
    return (
        <span className="flex flex-wrap items-center gap-2">
            <Pill tone="ok">
                {ens.name}
                {gameId !== null && (
                    <>
                        {" · "}
                        <span className="text-gold">#{gameId}</span>
                    </>
                )}
            </Pill>
            {invite !== null && gameId !== null && invite !== gameId && (
                <Pill tone="neutral">Invite now points at game {invite}</Pill>
            )}
        </span>
    );
}

function Pill({ tone, children }: { tone: "ok" | "bad" | "neutral"; children: ReactNode }) {
    const tones = {
        ok: "border-emerald-400/20 text-paper",
        bad: "border-red-400/40 text-red-200",
        neutral: "border-white/10 text-paper",
    };
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border bg-black/25 px-3 py-1.5 text-xs ${tones[tone]}`}>
            {children}
        </span>
    );
}
