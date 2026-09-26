import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { cardInfo } from "../game/cards.js";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
    sm: "w-11",
    md: "w-16",
    lg: "w-20",
};

export function Card({ index, size = "md", dim = false }: { index: number; size?: Size; dim?: boolean }) {
    const info = cardInfo(index);
    const key = info.kind === "valid" ? `face-${index}` : "back";
    return (
        <div className={`${SIZES[size]} aspect-[5/7] [perspective:600px] ${dim ? "opacity-40" : ""}`}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={key}
                    className="size-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
                    initial={{ rotateY: 90, opacity: 0.4 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0.4 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                >
                    {info.kind === "valid" ? (
                        <CardFace value={info.value} symbol={info.symbol} red={info.isRed} />
                    ) : (
                        <CardBack />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function CardFace({ value, symbol, red }: { value: string; symbol: string; red: boolean }) {
    const color = red ? "var(--color-card-red)" : "var(--color-ink)";
    return (
        <svg viewBox="0 0 100 140" className="size-full" role="img" aria-label={`${value}${symbol}`}>
            <rect x="1" y="1" width="98" height="138" rx="9" fill="#fbf8f1" stroke="#d8d0bf" strokeWidth="2" />
            <g fill={color} fontFamily="var(--font-display)" fontWeight="700">
                <text x="10" y="30" fontSize="26">
                    {value}
                </text>
                <text x="11" y="52" fontSize="20">
                    {symbol}
                </text>
                <text x="50" y="92" fontSize="54" textAnchor="middle">
                    {symbol}
                </text>
                <g transform="rotate(180 50 70)">
                    <text x="10" y="30" fontSize="26">
                        {value}
                    </text>
                    <text x="11" y="52" fontSize="20">
                        {symbol}
                    </text>
                </g>
            </g>
        </svg>
    );
}

function CardBack() {
    const id = useId().replace(/:/g, "");
    return (
        <svg viewBox="0 0 100 140" className="size-full" role="img" aria-label="Face-down card">
            <defs>
                <pattern id={`lattice-${id}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="12" height="12" fill="#7a1f2b" />
                    <path d="M0 6h12M6 0v12" stroke="#a83a47" strokeWidth="2" />
                </pattern>
            </defs>
            <rect x="1" y="1" width="98" height="138" rx="9" fill="#fbf8f1" stroke="#d8d0bf" strokeWidth="2" />
            <rect x="8" y="8" width="84" height="124" rx="5" fill={`url(#lattice-${id})`} />
            <rect x="8" y="8" width="84" height="124" rx="5" fill="none" stroke="#e6c36a" strokeOpacity="0.6" strokeWidth="1.5" />
        </svg>
    );
}
