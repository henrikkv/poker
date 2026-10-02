import { describe, expect, it } from "vitest";
import { GameState } from "./state.js";
import { seatOccupied, sortLobby, toLobbyTable, type LobbyTable } from "./lobby.js";

const ZERO = "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanfpnq";
const ALICE = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2kzg6en4q4r7g2k6p0s0q0s0q0s0q0s0q";
const BOB = "aleo1abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnop";

function row(partial: Pick<LobbyTable, "gameId" | "yours" | "waiting">): LobbyTable {
    return {
        state: partial.waiting ? GameState.P2Join : GameState.P1BetPre,
        stage: partial.waiting ? "Waiting" : "Pre-flop",
        progress: "",
        seatsFilled: 1,
        playerIds: partial.yours ? [1] : [],
        ...partial,
    };
}

describe("lobby", () => {
    it("treats the zero address and numeric placeholders as empty seats", () => {
        expect(seatOccupied("")).toBe(false);
        expect(seatOccupied("0u128")).toBe(false);
        expect(seatOccupied(ZERO)).toBe(false);
        expect(seatOccupied(ALICE)).toBe(true);
        expect(seatOccupied(BOB)).toBe(true);
    });

    it("keeps waiting, in-progress, and your claim tables", () => {
        const waiting = toLobbyTable(4, { player1: ALICE, player2: ZERO, player3: ZERO, state: GameState.P2Join }, []);
        expect(waiting).toMatchObject({ waiting: true, yours: false, seatsFilled: 1, stage: "Waiting" });

        const playing = toLobbyTable(
            5,
            { player1: ALICE, player2: BOB, player3: ZERO, state: GameState.P1BetFlop },
            [],
        );
        expect(playing).toMatchObject({ waiting: false, seatsFilled: 2, stage: "Flop" });

        expect(
            toLobbyTable(6, { player1: ALICE, player2: BOB, player3: ZERO, state: GameState.P1Claim }, []),
        ).toBeNull();

        const mine = toLobbyTable(7, { player1: ALICE, player2: BOB, player3: ZERO, state: GameState.P1Claim }, [1]);
        expect(mine).toMatchObject({ yours: true, stage: "Claim", playerIds: [1] });
    });

    it("orders your tables, then tables waiting for players, then newer ids", () => {
        const sorted = sortLobby([
            row({ gameId: 3, yours: false, waiting: false }),
            row({ gameId: 9, yours: false, waiting: true }),
            row({ gameId: 2, yours: true, waiting: false }),
            row({ gameId: 8, yours: false, waiting: true }),
        ]);
        expect(sorted.map((table) => table.gameId)).toEqual([2, 9, 8, 3]);
    });
});
