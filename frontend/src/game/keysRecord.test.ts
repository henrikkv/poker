import { describe, expect, it } from "vitest";
import { secretsFromRecord } from "./keysRecord.js";

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
});
