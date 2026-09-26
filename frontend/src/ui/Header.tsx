import { WalletMultiButton } from "@provablehq/aleo-wallet-adapter-react-ui";
import type { ReactNode } from "react";
import { useEns } from "../ens/index.js";
import type { ClientStatus } from "../game/controller.js";
import { formatCredits } from "../game/model.js";

export function Header({ status, networkName }: { status: ClientStatus; networkName: string }) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="text-[11px] font-semibold tracking-[0.25em] text-gold/80 uppercase">
                    Aleo · {networkName}
                </p>
                <h1 className="font-display text-3xl leading-tight text-paper">Mental Poker</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={status.nodeError ? "bad" : "ok"}>
                    <span className={`size-2 rounded-full ${status.nodeError ? "bg-red-400" : "bg-emerald-400"}`} />
                    {status.nodeError ? "Node unreachable" : `Block ${status.height ?? "…"}`}
                </Pill>

                <Pill tone="neutral">{status.balance === null ? "…" : `${formatCredits(status.balance)} credits`}</Pill>

                <EnsBadge />
                <WalletMultiButton />
            </div>
        </header>
    );
}

function EnsBadge() {
    const ens = useEns();
    if (ens.name) {
        return <Pill tone="ok">{ens.name}</Pill>;
    }
    return (
        <button
            type="button"
            onClick={() => void ens.connect()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-paper transition hover:border-gold/50"
        >
            Play as ENS
        </button>
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
