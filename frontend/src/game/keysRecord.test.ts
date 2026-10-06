import { describe, expect, it } from "vitest";
import { sameScalar, secretsFromRecord } from "./keysRecord.js";

describe("secretsFromRecord", () => {
    it("reads structured wallet fields", () => {
        expect(
            secretsFromRecord({
                recordView: { fields: { secret: "9scalar", secret_inv: "11scalar" } },
            }),
        ).toEqual({ secret: "9scalar", secretInv: "11scalar" });
    });

    it("reads Aleo plaintext without matching secret_inv as secret", () => {
        expect(
            secretsFromRecord({
                plaintext: "{ owner: aleo1abc.private, secret: 3scalar.private, secret_inv: 7scalar.private }",
            }),
        ).toEqual({ secret: "3scalar", secretInv: "7scalar" });
    });

    it("treats scalar suffixes as the same integer", () => {
        expect(sameScalar("11scalar", "11scalar.private")).toBe(true);
        expect(sameScalar("011scalar", "11scalar")).toBe(true);
        expect(sameScalar("11scalar", "12scalar")).toBe(false);
    });
});
