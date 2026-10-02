import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { cardInfo, type Suit } from "../game/cards.js";
import { SuitIcon } from "./SuitIcon.js";

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
                        <CardFace value={info.value} suit={info.suit} red={info.isRed} />
                    ) : (
                        <CardBack />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function CardFace({ value, suit, red }: { value: string; suit: Suit; red: boolean }) {
    const tone = red ? "text-card-red" : "text-ink";
    return (
        <div
            role="img"
            aria-label={`${value} of ${suit}`}
            className="@container relative size-full overflow-hidden rounded-[8%] border-2 border-[#d8d0bf] bg-[#fbf8f1]"
        >
            <Pip value={value} suit={suit} className={`top-[6%] left-[8%] ${tone}`} />
            <SuitIcon
                suit={suit}
                className={`absolute top-[52%] left-1/2 size-[40cqw] -translate-x-1/2 -translate-y-1/2 ${tone}`}
            />
            <Pip value={value} suit={suit} className={`right-[8%] bottom-[6%] rotate-180 ${tone}`} />
        </div>
    );
}

function Pip({ value, suit, className }: { value: string; suit: Suit; className: string }) {
    return (
        <span className={`absolute flex flex-col items-center font-display leading-none font-bold ${className}`}>
            <span className="text-[26cqw]">{value}</span>
            <SuitIcon suit={suit} className="mt-[1cqw] size-[18cqw]" />
        </span>
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
