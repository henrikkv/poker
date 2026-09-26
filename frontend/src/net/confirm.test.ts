import { describe, expect, it } from "vitest";
import { explorerOutcome, isSuccessStatus, onchainId, onchainIdFromStatus, withTimeout } from "./confirm.js";

describe("confirm helpers", () => {
    it("recognizes on-chain ids and success statuses", () => {
        expect(onchainId("at1abc")).toBe("at1abc");
        expect(onchainId("tmp-1")).toBeUndefined();
        expect(onchainIdFromStatus({ id: "at1xyz", status: "pending" })).toBe("at1xyz");
        expect(onchainIdFromStatus({ transactionId: "shield_1", status: "pending" })).toBeUndefined();
        expect(isSuccessStatus("Accepted")).toBe(true);
        expect(isSuccessStatus("pending")).toBe(false);
    });

    it("treats an explorer transaction body as accepted", () => {
        expect(explorerOutcome({ id: "at1abc", type: "execute" })).toBe("accepted");
        expect(explorerOutcome({ status: "rejected" })).toBe("rejected");
        expect(explorerOutcome({})).toBeNull();
    });

    it("times out a hung promise", async () => {
        await expect(withTimeout(new Promise(() => undefined), 10, "wallet status")).rejects.toThrow(
            "wallet status timed out",
        );
    });
});
