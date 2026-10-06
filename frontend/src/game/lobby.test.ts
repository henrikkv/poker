import { describe, expect, it } from "vitest";
import { GameState } from "./state.js";
import { sameAddress, seatOccupied, seatedPlayerIds, sortLobby, toLobbyTable, type LobbyTable } from "./lobby.js";

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
        addresses: [ALICE, ZERO, ZERO],
        ...partial,
    };
}

describe("lobby", () => {
    it("recognizes an existing seat instead of an open one", () => {
        const game = { player1: ALICE, player2: BOB, player3: "aleo1carolcarolcarolcarolcarolcarolcarolcarolcarolca" };
        expect(seatedPlayerIds(ALICE, game)).toEqual([1]);
        expect(seatedPlayerIds(BOB, game)).toEqual([2]);
        expect(seatedPlayerIds(game.player3, game)).toEqual([3]);
        expect(seatedPlayerIds(`${ALICE}.private`, game)).toEqual([1]);
        expect(seatedPlayerIds(ALICE.toUpperCase(), game)).toEqual([1]);
        expect(seatedPlayerIds("aleo1someoneelseeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", game)).toEqual([]);
        expect(sameAddress(ALICE, ZERO)).toBe(false);
    });

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
        expect(mine).toMatchObject({ yours: true, stage: "Claim", playerIds: [1], addresses: [ALICE, BOB, ZERO] });

        const second = toLobbyTable(8, { player1: ALICE, player2: BOB, player3: ZERO, state: GameState.P2DecHand }, [2]);
        expect(second).toMatchObject({ yours: true, playerIds: [2], waiting: false });
        const third = toLobbyTable(
            9,
            { player1: ALICE, player2: BOB, player3: "aleo1carolcarolcarolcarolcarolcarolcarolcarolcarolca", state: GameState.P3BetPre },
            [3],
        );
        expect(third).toMatchObject({ yours: true, playerIds: [3], waiting: false });
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
