import { describe, expect, test } from "vitest";
import { fundMessage } from "./tempAccount.js";

describe("fundMessage", () => {
    test("binds the Ethereum payer, temp Aleo address, and issue time", () => {
        expect(fundMessage("0xabc", "aleo1xyz", "2026-09-27T00:00:00.000Z")).toBe(
            "Fund mental-poker temp Aleo account aleo1xyz from 0xabc at 2026-09-27T00:00:00.000Z",
        );
    });
});
