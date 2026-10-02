import { useEffect, useRef } from "react";
import type { LogEntry } from "../game/model.js";
import { Spinner } from "./Spinner.js";

export function LogPanel({ logs }: { logs: LogEntry[] }) {
    const scroller = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, [logs.length]);

    return (
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-felt-deep">
            <h2 className="border-b border-white/10 px-4 py-3 font-display text-lg text-paper">Activity</h2>
            <div ref={scroller} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-sm">
                {logs.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center">
                            <StatusIcon status={entry.status} />
                        </span>
                        <span
                            className={`min-w-0 break-words ${
                                entry.status === "error"
                                    ? "text-red-300"
                                    : entry.status === "pending"
                                      ? "text-gold"
                                      : entry.status === "done"
                                        ? "text-paper/90"
                                        : "text-muted"
                            }`}
                        >
                            {entry.message}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function StatusIcon({ status }: { status: LogEntry["status"] }) {
    switch (status) {
        case "pending":
            return <Spinner className="size-3.5 text-gold" />;
        case "done":
            return (
                <svg viewBox="0 0 16 16" className="size-3.5 text-emerald-400" fill="none" aria-hidden>
                    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        case "error":
            return <span className="size-2 rounded-full bg-red-400" />;
        case "info":
            return <span className="size-1.5 rounded-full bg-muted/60" />;
    }
}
