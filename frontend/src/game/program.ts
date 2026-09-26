import { Plaintext } from "@provablehq/sdk";
import type { Session, TransactionInput } from "../net/aleo.js";

const PROGRAM = "mental_poker2.aleo";

/** `Game` from mental_poker2.aleo. */
export interface Game {
    player1: string;
    player2: string;
    player3: string;
    buy_in: bigint;
    password_hash: bigint;
    state: number;
    dealer_button: number;
    players_out: number;
    players_folded: number;
    last_bet: number;
    sb: number;
    bb: number;
    blind_frequency: number;
    remaining_hands: number;
    hands_played: number;
    last_raise_size: number;
}

export interface Chips {
    player1: number;
    player2: number;
    player3: number;
    player1_bet: number;
    player2_bet: number;
    player3_bet: number;
}

export interface Cards {
    player1: [string, string];
    player2: [string, string];
    player3: [string, string];
    flop: [string, string, string];
    turn: string;
    river: string;
}

export interface RevealedCards {
    player1: [number, number];
    player2: [number, number];
    player3: [number, number];
    flop: [number, number, number];
    turn: number;
    river: number;
}

/** Asks the connected wallet to spend an unspent `Keys` record from this program. */
const KEYS_RECORD: TransactionInput = {
    type: "record",
    program: PROGRAM,
    recordname: "Keys",
};

/** `[group; 52]` */
export type Deck = string[];
/** `[bool; 249]` Waksman network control bits. */
export type ControlBits = boolean[];

const u8 = (value: number) => `${value}u8`;
const u16 = (value: number) => `${value}u16`;
const u32 = (value: number) => `${value}u32`;
const u64 = (value: bigint) => `${value}u64`;
const u128 = (value: bigint) => `${value}u128`;
const scalar = (value: string) => (value.endsWith("scalar") ? value : `${value}scalar`);
const group = (value: string) => (value.endsWith("group") ? value : `${value}group`);
const groups = (values: string[]) => `[${values.map(group).join(", ")}]`;
const bools = (values: boolean[]) => `[${values.join(", ")}]`;

function expectLength<T>(values: T[], length: number, name: string): T[] {
    if (values.length !== length) {
        throw new Error(`${name} must have ${length} elements, got ${values.length}`);
    }
    return values;
}

function parse<T>(value: string | null): T | null {
    return value === null ? null : (Plaintext.fromString(value).toObject() as T);
}

/** mental_poker2.aleo, with the same calls `game.rs` makes on the Rust bindings. */
export class MentalPoker {
    constructor(private readonly session: Session) {}

    private async mappingSnapshot(gameId: number): Promise<string> {
        const [game, chips, cards, revealed] = await Promise.all([
            this.get_games(gameId),
            this.get_chips(gameId),
            this.get_cards(gameId),
            this.get_revealed_cards(gameId),
        ]);
        return JSON.stringify({ game, chips, cards, revealed }, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value,
        );
    }

    private async run(functionName: string, inputs: TransactionInput[], gameId: number): Promise<void> {
        const before = await this.mappingSnapshot(gameId);
        await this.session.execute(PROGRAM, functionName, inputs, async () => {
            return (await this.mappingSnapshot(gameId)) !== before;
        });
    }

    async create_game(
        gameId: number,
        buyIn: bigint,
        controlBits: ControlBits,
        secret: string,
        secretInv: string,
        password: bigint,
        blindFrequency: number,
    ): Promise<void> {
        await this.run(
            "create_game",
            [
                u64(buyIn),
                bools(expectLength(controlBits, 249, "control_bits")),
                scalar(secret),
                scalar(secretInv),
                u128(password),
                u8(blindFrequency),
            ],
            gameId,
        );
    }

    async join_game(
        gameId: number,
        buyIn: bigint,
        deck: Deck,
        controlBits: ControlBits,
        secret: string,
        secretInv: string,
        password: bigint,
    ): Promise<void> {
        await this.run(
            "join_game",
            [
                u32(gameId),
                u64(buyIn),
                groups(expectLength(deck, 52, "deck")),
                bools(expectLength(controlBits, 249, "control_bits")),
                scalar(secret),
                scalar(secretInv),
                u128(password),
            ],
            gameId,
        );
    }

    async bet(gameId: number, amount: number): Promise<void> {
        await this.run("bet", [u32(gameId), u16(amount)], gameId);
    }

    async fold(gameId: number): Promise<void> {
        await this.run("fold", [u32(gameId)], gameId);
    }

    async decrypt_hands(gameId: number, other1: string[], other2: string[]): Promise<void> {
        await this.run("decrypt_hands", [u32(gameId), groups(other1), groups(other2), KEYS_RECORD], gameId);
    }

    async decrypt_flop(gameId: number, flop: string[]): Promise<void> {
        await this.run("decrypt_flop", [u32(gameId), groups(flop), KEYS_RECORD], gameId);
    }

    async decrypt_turn_river(gameId: number, card: string): Promise<void> {
        await this.run("decrypt_turn_river", [u32(gameId), group(card), KEYS_RECORD], gameId);
    }

    async showdown(gameId: number, hand: string[]): Promise<void> {
        await this.run("showdown", [u32(gameId), groups(hand), KEYS_RECORD], gameId);
    }

    async compare_hands(gameId: number): Promise<void> {
        await this.run("compare_hands", [u32(gameId)], gameId);
    }

    async new_hand(gameId: number, controlBits: ControlBits, secret: string, secretInv: string): Promise<void> {
        await this.run(
            "new_hand",
            [
                u32(gameId),
                bools(expectLength(controlBits, 249, "control_bits")),
                scalar(secret),
                scalar(secretInv),
            ],
            gameId,
        );
    }

    async shuffle_deck(
        gameId: number,
        deck: Deck,
        controlBits: ControlBits,
        secret: string,
        secretInv: string,
    ): Promise<void> {
        await this.run(
            "shuffle_deck",
            [
                u32(gameId),
                groups(expectLength(deck, 52, "deck")),
                bools(expectLength(controlBits, 249, "control_bits")),
                scalar(secret),
                scalar(secretInv),
            ],
            gameId,
        );
    }

    async claim_prize(gameId: number, prize: bigint): Promise<void> {
        await this.run("claim_prize", [u32(gameId), u64(prize)], gameId);
    }

    async get_next_game_id(key: number): Promise<number | null> {
        return parse<number>(await this.session.mapping(PROGRAM, "next_game_id", u32(key)));
    }

    async get_games(gameId: number): Promise<Game | null> {
        return parse<Game>(await this.session.mapping(PROGRAM, "games", u32(gameId)));
    }

    async get_decks(gameId: number): Promise<Deck | null> {
        return parse<Deck>(await this.session.mapping(PROGRAM, "decks", u32(gameId)));
    }

    async get_chips(gameId: number): Promise<Chips | null> {
        return parse<Chips>(await this.session.mapping(PROGRAM, "chips", u32(gameId)));
    }

    async get_cards(gameId: number): Promise<Cards | null> {
        return parse<Cards>(await this.session.mapping(PROGRAM, "cards", u32(gameId)));
    }

    async get_revealed_cards(gameId: number): Promise<RevealedCards | null> {
        return parse<RevealedCards>(await this.session.mapping(PROGRAM, "revealed_cards", u32(gameId)));
    }
}
