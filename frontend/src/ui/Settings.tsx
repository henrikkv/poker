"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import {
    accountFromPrivateKey,
    generateLocalPrivateKey,
    peekLocalPrivateKey,
    type SigningMode,
} from "../net/signing.js";

export function SettingsButton({
    onClick,
    className,
    children = "Settings",
}: {
    onClick: () => void;
    className?: string;
    children?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`mt-1 min-h-11 px-0 text-left text-sm text-muted transition hover:text-paper ${className ?? ""}`}
        >
            {children}
        </button>
    );
}

export function SettingsDialog({
    mode,
    onClose,
    onSave,
}: {
    mode: SigningMode;
    onClose: () => void;
    onSave: (next: SigningMode, privateKey: string) => void;
}) {
    const titleId = useId();
    const [choice, setChoice] = useState<SigningMode>(mode);
    const [privateKey, setPrivateKey] = useState(() => peekLocalPrivateKey());
    const [showKey, setShowKey] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [keyError, setKeyError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        if (!privateKey.trim()) {
            setAddress(null);
            setKeyError(null);
            return;
        }
        try {
            setAddress(accountFromPrivateKey(privateKey).toString());
            setKeyError(null);
        } catch {
            setAddress(null);
            setKeyError("That private key is not a valid Aleo key.");
        }
    }, [privateKey]);

    const save = () => {
        if (choice === "local" && !address) {
            setKeyError(privateKey.trim() ? "That private key is not a valid Aleo key." : "Add a private key to sign locally.");
            return;
        }
        onSave(choice, choice === "local" ? privateKey.trim() : "");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-felt-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
                <h2 id={titleId} className="font-display text-3xl text-paper">
                    How actions are signed
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                    Shield asks you to confirm each shuffle, bet, and other action. A local key lets this browser
                    sign those actions on its own.
                </p>

                <fieldset className="mt-5 space-y-2">
                    <legend className="sr-only">Signing mode</legend>
                    <ModeOption
                        selected={choice === "shield"}
                        title="Shield wallet"
                        body="Confirm every action in Shield."
                        onSelect={() => setChoice("shield")}
                    />
                    <ModeOption
                        selected={choice === "local"}
                        title="Local private key"
                        body="The SDK holds the key and submits shuffles and other actions without a wallet click."
                        onSelect={() => setChoice("local")}
                    />
                </fieldset>

                {choice === "local" && (
                    <div className="mt-5 space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-paper">Aleo private key</span>
                            <textarea
                                value={privateKey}
                                onChange={(event) => setPrivateKey(event.target.value)}
                                spellCheck={false}
                                autoComplete="off"
                                rows={3}
                                placeholder="APrivateKey1…"
                                className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-paper outline-none focus:border-gold/60"
                                style={{ WebkitTextSecurity: showKey ? "none" : "disc" } as CSSProperties}
                            />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setShowKey((current) => !current)}
                                className="btn btn-ghost"
                            >
                                {showKey ? "Hide key" : "Show key"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPrivateKey(generateLocalPrivateKey());
                                    setShowKey(true);
                                }}
                                className="btn btn-ghost"
                            >
                                Generate a new key
                            </button>
                        </div>
                        {address && (
                            <p className="text-xs leading-relaxed text-muted">
                                Address <span className="break-all text-paper">{address}</span>. Fund this account with
                                public credits before you play. The key stays in this browser.
                            </p>
                        )}
                        {keyError && <p className="text-xs text-red-300">{keyError}</p>}
                    </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-quiet">
                        Cancel
                    </button>
                    <button type="button" onClick={save} className="btn btn-gold">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModeOption({
    selected,
    title,
    body,
    onSelect,
}: {
    selected: boolean;
    title: string;
    body: string;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`w-full rounded-2xl border px-4 py-3 text-left ${
                selected ? "border-gold/60 bg-black/30" : "border-white/10 bg-black/15 hover:border-white/25"
            }`}
        >
            <span className="block text-sm font-semibold text-paper">{title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">{body}</span>
        </button>
    );
}
