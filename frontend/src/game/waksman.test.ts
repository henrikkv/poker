import { describe, expect, it } from "vitest";
import { initializedDeck } from "./deck.js";
import { permutationToWaksmanBits, randomPermutationIndices, shuffleDeck } from "./waksman.js";

function simulate(deck: readonly number[], ctrl: readonly boolean[], offset: { value: number }): number[] {
    const n = deck.length;
    if (n <= 1) {
        return [...deck];
    }
    if (n === 2) {
        const swap = ctrl[offset.value++];
        return swap ? [deck[1], deck[0]] : [...deck];
    }

    const topN = Math.ceil(n / 2);
    const bottomN = Math.floor(n / 2);

    const topIn: number[] = [];
    const bottomIn: number[] = [];
    for (let i = 0; i < bottomN; i++) {
        const swap = ctrl[offset.value++];
        if (swap) {
            topIn.push(deck[2 * i + 1]);
            bottomIn.push(deck[2 * i]);
        } else {
            topIn.push(deck[2 * i]);
            bottomIn.push(deck[2 * i + 1]);
        }
    }
    if (n % 2 !== 0) {
        topIn.push(deck[n - 1]);
    }

    const topOut = simulate(topIn, ctrl, offset);
    const bottomOut = simulate(bottomIn, ctrl, offset);

    const result = new Array<number>(n).fill(0);
    for (let i = 0; i < topN - 1; i++) {
        const swap = ctrl[offset.value++];
        if (swap) {
            result[2 * i] = bottomOut[i];
            result[2 * i + 1] = topOut[i];
        } else {
            result[2 * i] = topOut[i];
            result[2 * i + 1] = bottomOut[i];
        }
    }

    if (n % 2 === 0) {
        result[n - 2] = topOut[topN - 1];
        result[n - 1] = bottomOut[bottomN - 1];
    } else {
        result[n - 1] = topOut[topN - 1];
    }
    return result;
}

function checkPerm(perm: number[]): void {
    const ctrl = permutationToWaksmanBits(perm);
    const offset = { value: 0 };
    const output = simulate(Array.from({ length: 52 }, (_, i) => i), ctrl, offset);
    expect(offset.value).toBe(249);
    perm.forEach((dst, src) => {
        expect(output[dst], `perm[${src}]=${dst}`).toBe(src);
    });
}

function randomPerm(): number[] {
    const indices = randomPermutationIndices(52);
    const perm = new Array<number>(52);
    indices.forEach((src, dst) => {
        perm[src] = dst;
    });
    return perm;
}

describe("permutationToWaksmanBits", () => {
    it("identity produces all-false control bits", () => {
        const perm = Array.from({ length: 52 }, (_, i) => i);
        const ctrl = permutationToWaksmanBits(perm);
        expect(ctrl.every((bit) => !bit)).toBe(true);
        checkPerm(perm);
    });

    it("reverse", () => {
        checkPerm(Array.from({ length: 52 }, (_, i) => 51 - i));
    });

    it("single swap", () => {
        const perm = Array.from({ length: 52 }, (_, i) => i);
        perm[0] = 1;
        perm[1] = 0;
        checkPerm(perm);
    });

    it("random permutations", () => {
        for (let i = 0; i < 200; i++) {
            checkPerm(randomPerm());
        }
    });

    it("rejects invalid permutations", () => {
        const perm = Array.from({ length: 52 }, () => 0);
        expect(() => permutationToWaksmanBits(perm)).toThrow();
    });
});

describe("shuffleDeck", () => {
    it("round-trips through the control bits", () => {
        const deck = initializedDeck();
        const { shuffled, control } = shuffleDeck(deck);
        const perm = new Array<number>(52);
        shuffled.forEach((card, dst) => {
            perm[deck.indexOf(card)] = dst;
        });
        expect(control).toEqual(permutationToWaksmanBits(perm));
        expect(new Set(shuffled).size).toBe(52);
    });
});
