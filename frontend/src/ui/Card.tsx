import { useId } from "react";
import { cardInfo, type Suit } from "../game/cards.js";
import { SuitIcon } from "./SuitIcon.js";

type Size = "sm" | "md" | "lg";

const WIDTH: Record<Size, string> = {
    sm: "w-11",
    md: "w-16",
    lg: "w-20",
};

const TYPE: Record<Size, { pip: string; pipSuit: string; center: string }> = {
    sm: { pip: "text-[11px]", pipSuit: "size-2.5", center: "size-5" },
    md: { pip: "text-sm", pipSuit: "size-3", center: "size-7" },
    lg: { pip: "text-base", pipSuit: "size-3.5", center: "size-9" },
};

export function Card({ index, size = "md", dim = false }: { index: number; size?: Size; dim?: boolean }) {
    const numeric = typeof index === "number" ? index : Number(index);
    const info = cardInfo(Number.isFinite(numeric) ? numeric : 255);
    return (
        <div className={`${WIDTH[size]} aspect-[5/7] ${dim ? "opacity-40" : ""}`}>
            {info.kind === "valid" ? (
                <CardFace value={info.value} suit={info.suit} red={info.isRed} size={size} />
            ) : (
                <CardBack />
            )}
        </div>
    );
}

function CardFace({ value, suit, red, size }: { value: string; suit: Suit; red: boolean; size: Size }) {
    const tone = red ? "text-card-red" : "text-ink";
    const type = TYPE[size];
    return (
        <div
            role="img"
            aria-label={`${value} of ${suit}`}
            className="relative size-full overflow-hidden rounded-[8%] border-2 border-[#d8d0bf] bg-[#fbf8f1]"
        >
            <Pip value={value} suit={suit} type={type} className={`top-[7%] left-[10%] ${tone}`} />
            <SuitIcon suit={suit} className={`absolute top-1/2 left-1/2 ${type.center} -translate-x-1/2 -translate-y-1/2 ${tone}`} />
            <Pip value={value} suit={suit} type={type} className={`right-[10%] bottom-[7%] rotate-180 ${tone}`} />
        </div>
    );
}

function Pip({
    value,
    suit,
    type,
    className,
}: {
    value: string;
    suit: Suit;
    type: { pip: string; pipSuit: string };
    className: string;
}) {
    return (
        <span className={`absolute flex flex-col items-center leading-none font-bold ${type.pip} ${className}`}>
            {value}
            <SuitIcon suit={suit} className={`mt-px ${type.pipSuit}`} />
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
