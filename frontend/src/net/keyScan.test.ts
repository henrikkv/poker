import { describe, expect, it } from "vitest";
import { secretsFromRecord } from "../game/keysRecord.js";
import { ownedRecordsAsWalletRecords, scanStartHeight } from "./keyScan.js";

describe("scanStartHeight", () => {
    it("keeps a week of blocks and never goes below zero", () => {
        expect(scanStartHeight(100_000, 60_480)).toBe(39_520);
        expect(scanStartHeight(10, 60_480)).toBe(0);
        expect(scanStartHeight(Number.NaN)).toBe(0);
    });
});

describe("ownedRecordsAsWalletRecords", () => {
    it("puts the newest Keys plaintext first", () => {
        const records = ownedRecordsAsWalletRecords([
            {
                block_height: 1,
                record_plaintext: "{ secret: 1scalar.private, secret_inv: 2scalar.private }",
            },
            {
                block_height: 9,
                record_plaintext: "{ secret: 3scalar.private, secret_inv: 4scalar.private }",
            },
        ]);
        expect(secretsFromRecord(records[0])).toEqual({ secret: "3scalar", secretInv: "4scalar" });
        expect(secretsFromRecord(records[1])).toEqual({ secret: "1scalar", secretInv: "2scalar" });
    });
});
