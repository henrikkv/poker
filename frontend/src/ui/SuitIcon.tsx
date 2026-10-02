import Icon from "@mdi/react";
import { mdiCardsClub, mdiCardsDiamond, mdiCardsHeart, mdiCardsSpade } from "@mdi/js";
import type { Suit } from "../game/cards.js";

const PATHS = {
    spades: mdiCardsSpade,
    hearts: mdiCardsHeart,
    diamonds: mdiCardsDiamond,
    clubs: mdiCardsClub,
} as const;

export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
    return <Icon path={PATHS[suit]} className={className} aria-hidden />;
}
