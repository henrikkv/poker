import { describe, expect, it } from "vitest";
import {
    MAX_BLOCK_INTERVAL_MS,
    MIN_BLOCK_INTERVAL_MS,
    createBlockPace,
    isNewBlock,
    msUntilHeightCheck,
    noteHeight,
    noteMissedHeight,
} from "./blockPace.js";

describe("block pace", () => {
    it("reads height immediately, then not again until one block interval", () => {
        const pace = noteHeight(createBlockPace(), 100, 1_000);
        expect(msUntilHeightCheck(createBlockPace(), 1_000)).toBe(0);
        expect(msUntilHeightCheck(pace, 1_000)).toBe(MIN_BLOCK_INTERVAL_MS);
        expect(msUntilHeightCheck(pace, 1_000 + MIN_BLOCK_INTERVAL_MS - 1)).toBe(1);
        expect(msUntilHeightCheck(pace, 1_000 + MIN_BLOCK_INTERVAL_MS)).toBe(0);
    });

    it("backs off while the height stays on the same block", () => {
        let pace = noteHeight(createBlockPace(), 100, 0);
        pace = noteHeight(pace, 100, MIN_BLOCK_INTERVAL_MS);
        expect(pace.intervalMs).toBe(MIN_BLOCK_INTERVAL_MS * 2);
        expect(msUntilHeightCheck(pace, MIN_BLOCK_INTERVAL_MS)).toBe(MIN_BLOCK_INTERVAL_MS * 2);
        expect(isNewBlock(pace, 100)).toBe(false);
    });

    it("allows one state read when the height increases and waits one measured block", () => {
        let pace = noteHeight(createBlockPace(), 100, 0);
        pace = noteHeight(pace, 100, 3_000);
        pace = noteHeight(pace, 102, 9_000);
        expect(isNewBlock({ ...pace, height: 100 }, 102)).toBe(true);
        expect(pace.intervalMs).toBe(4_500);
        expect(msUntilHeightCheck(pace, 9_000)).toBe(4_500);
        expect(isNewBlock(pace, 102)).toBe(false);
    });

    it("does not poll faster than the shortest block interval", () => {
        let pace = noteHeight(createBlockPace(), 10, 0);
        pace = noteHeight(pace, 12, 1_000);
        expect(pace.intervalMs).toBe(MIN_BLOCK_INTERVAL_MS);
    });

    it("caps the backoff", () => {
        let pace = noteHeight(createBlockPace(), 10, 0);
        for (let step = 0; step < 8; step += 1) {
            pace = noteHeight(pace, 10, pace.checkedAt + pace.intervalMs);
        }
        expect(pace.intervalMs).toBe(MAX_BLOCK_INTERVAL_MS);
        const missed = noteMissedHeight(pace, pace.checkedAt + pace.intervalMs);
        expect(missed.intervalMs).toBe(MAX_BLOCK_INTERVAL_MS);
    });
});
