import { WalletMultiButton } from "@provablehq/aleo-wallet-adapter-react-ui";
import type { ReactNode } from "react";
import type { ClientStatus } from "../game/controller.js";
import { formatCredits } from "../game/model.js";
import type { SigningMode } from "../net/signing.js";
import { SettingsButton } from "./Settings.js";

export function Header({
    status,
    networkName,
    signingMode,
    onOpenSettings,
}: {
    status: ClientStatus;
    networkName: string;
    signingMode: SigningMode;
    onOpenSettings: () => void;
}) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 className="font-display text-3xl leading-tight text-paper sm:text-4xl">Mental Poker</h1>
                <SettingsButton onClick={onOpenSettings} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone="neutral">{networkName}</Pill>

                <Pill tone={status.nodeError ? "bad" : "ok"}>
                    <span className={`size-2 rounded-full ${status.nodeError ? "bg-red-400" : "bg-emerald-400"}`} />
                    {status.nodeError ? "Node unreachable" : `Block ${status.height ?? "…"}`}
                </Pill>

                <Pill tone="neutral">{status.balance === null ? "…" : `${formatCredits(status.balance)} credits`}</Pill>

                {signingMode === "shield" ? (
                    <WalletMultiButton />
                ) : (
                    <Pill tone="neutral">Local key</Pill>
                )}
            </div>
        </header>
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
