import { GiClubs, GiDiamonds, GiHearts, GiSpades } from "react-icons/gi";
import type { IconType } from "react-icons";
import type { Suit } from "../game/cards.js";

const ICONS: Record<Suit, IconType> = {
    spades: GiSpades,
    hearts: GiHearts,
    diamonds: GiDiamonds,
    clubs: GiClubs,
};

export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
    const Icon = ICONS[suit];
    return <Icon className={className} aria-hidden />;
}
