import type { ControlBits } from "./deck.js";

export const DECK_SIZE = 52;
export const CONTROL_BITS = 249;

export function randomIndex(bound: number): number {
    const limit = Math.floor(0x1_0000_0000 / bound) * bound;
    const buffer = new Uint32Array(1);
    for (;;) {
        crypto.getRandomValues(buffer);
        if (buffer[0] < limit) {
            return buffer[0] % bound;
        }
    }
}

export function randomPermutationIndices(n: number = DECK_SIZE): number[] {
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = randomIndex(i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

export function shuffleDeck<T>(deck: readonly T[]): { shuffled: T[]; control: ControlBits } {
    const indices = randomPermutationIndices(deck.length);
    const perm = new Array<number>(deck.length);
    indices.forEach((src, dst) => {
        perm[src] = dst;
    });
    const control = permutationToWaksmanBits(perm);
    const shuffled = indices.map((src) => deck[src]);
    return { shuffled, control };
}

export function permutationToWaksmanBits(perm: readonly number[]): ControlBits {
    if (perm.length !== DECK_SIZE || !isValidPermutation(perm)) {
        throw new Error(`not a valid permutation of 0..${DECK_SIZE}`);
    }
    const ctrl = new Array<boolean>(CONTROL_BITS).fill(false);
    const offset = { value: 0 };
    setCtrl(perm, ctrl, offset);
    return ctrl as unknown as ControlBits;
}

function setCtrl(perm: readonly number[], ctrl: boolean[], offset: { value: number }): void {
    const n = perm.length;

    if (n <= 1) {
        return;
    }

    if (n === 2) {
        ctrl[offset.value++] = perm[0] === 1;
        return;
    }

    const topN = Math.ceil(n / 2);
    const bottomN = Math.floor(n / 2);
    const outEnd = 2 * (topN - 1);

    const inv = new Array<number>(n).fill(0);
    for (let src = 0; src < n; src++) {
        inv[perm[src]] = src;
    }

    const asgn: (boolean | null)[] = new Array(n).fill(null);

    if (n % 2 === 0) {
        asgn[inv[n - 2]] = true;
        asgn[inv[n - 1]] = false;
    } else {
        asgn[inv[n - 1]] = true;
        asgn[n - 1] = true;
    }

    const queue: [number, boolean][] = [];
    asgn.forEach((a, s) => {
        if (a !== null) {
            queue.push([s, a]);
        }
    });
    let qi = 0;

    for (;;) {
        while (qi < queue.length) {
            const [s, a] = queue[qi++];

            if (s < 2 * bottomN) {
                const partner = s ^ 1;
                if (asgn[partner] === null) {
                    asgn[partner] = !a;
                    queue.push([partner, !a]);
                }
            }

            const d = perm[s];
            if (d < outEnd) {
                const srcOfPaired = inv[d ^ 1];
                if (asgn[srcOfPaired] === null) {
                    asgn[srcOfPaired] = !a;
                    queue.push([srcOfPaired, !a]);
                }
            }
        }

        let next = -1;
        for (let i = 0; i < bottomN; i++) {
            if (asgn[2 * i] === null) {
                next = i;
                break;
            }
        }
        if (next < 0) {
            break;
        }
        asgn[2 * next] = true;
        queue.push([2 * next, true]);
    }

    const swap = new Array<boolean>(bottomN);
    for (let i = 0; i < bottomN; i++) {
        swap[i] = asgn[2 * i] === false;
        ctrl[offset.value++] = swap[i];
    }

    const topIn: number[] = [];
    const bottomIn: number[] = [];
    for (let i = 0; i < bottomN; i++) {
        if (!swap[i]) {
            topIn.push(2 * i);
            bottomIn.push(2 * i + 1);
        } else {
            topIn.push(2 * i + 1);
            bottomIn.push(2 * i);
        }
    }
    if (n % 2 !== 0) {
        topIn.push(n - 1);
    }

    const topPerm = topIn.map((src) => {
        const d = perm[src];
        return d < outEnd ? Math.floor(d / 2) : topN - 1;
    });
    const bottomPerm = bottomIn.map((src) => {
        const d = perm[src];
        return d < outEnd ? Math.floor(d / 2) : bottomN - 1;
    });

    setCtrl(topPerm, ctrl, offset);
    setCtrl(bottomPerm, ctrl, offset);

    for (let i = 0; i < topN - 1; i++) {
        ctrl[offset.value++] = asgn[inv[2 * i]] === false;
    }
}

function isValidPermutation(perm: readonly number[]): boolean {
    const seen = new Array<boolean>(perm.length).fill(false);
    return perm.every((d) => {
        if (!Number.isInteger(d) || d < 0 || d >= perm.length || seen[d]) {
            return false;
        }
        seen[d] = true;
        return true;
    });
}
