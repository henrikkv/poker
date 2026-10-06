/**
 * Chain reads stay on the block clock.
 *
 * The SDK guide puts a confirmation at about one to three blocks, or 3–9 seconds,
 * so the first guess is 3s. If a height read still shows the same block, the next
 * gap doubles until a new height arrives. The measured gap between heights then
 * becomes the wait, and it never drops below that 3s floor.
 */

export const MIN_BLOCK_INTERVAL_MS = 3_000;
export const MAX_BLOCK_INTERVAL_MS = 30_000;

export interface BlockPace {
    height: number | null;
    /** Local time when `height` last increased. */
    advancedAt: number;
    /** Local time of the last height read, successful or not. `0` means none yet. */
    checkedAt: number;
    intervalMs: number;
}

export function createBlockPace(): BlockPace {
    return {
        height: null,
        advancedAt: 0,
        checkedAt: 0,
        intervalMs: MIN_BLOCK_INTERVAL_MS,
    };
}

/** A mapping or game-state read is due only when the chain has a new block. */
export function isNewBlock(pace: BlockPace, height: number): boolean {
    return pace.height === null || height > pace.height;
}

/** Milliseconds until the next `getLatestHeight` call. The first call is immediate. */
export function msUntilHeightCheck(pace: BlockPace, now: number): number {
    if (pace.checkedAt === 0) {
        return 0;
    }
    return Math.max(0, pace.checkedAt + pace.intervalMs - now);
}

export function noteHeight(pace: BlockPace, height: number, now: number): BlockPace {
    if (pace.height === null || height > pace.height) {
        const blocks = pace.height === null ? 0 : height - pace.height;
        let intervalMs = pace.intervalMs;
        if (blocks > 0 && now > pace.advancedAt) {
            intervalMs = clampInterval((now - pace.advancedAt) / blocks);
        }
        return { height, advancedAt: now, checkedAt: now, intervalMs };
    }
    return {
        ...pace,
        checkedAt: now,
        intervalMs: clampInterval(pace.intervalMs * 2),
    };
}

/** A failed height read waits out the current gap, then backs off. */
export function noteMissedHeight(pace: BlockPace, now: number): BlockPace {
    if (pace.checkedAt === 0) {
        return { ...pace, checkedAt: now };
    }
    return {
        ...pace,
        checkedAt: now,
        intervalMs: clampInterval(pace.intervalMs * 2),
    };
}

function clampInterval(ms: number): number {
    if (!Number.isFinite(ms)) {
        return MIN_BLOCK_INTERVAL_MS;
    }
    return Math.min(MAX_BLOCK_INTERVAL_MS, Math.max(MIN_BLOCK_INTERVAL_MS, Math.round(ms)));
}
