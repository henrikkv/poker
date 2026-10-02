import { describe, expect, it } from "vitest";
import { parseGameId } from "./parseGameId.js";

describe("parseGameId", () => {
    it("parses a numeric game id", () => {
        expect(parseGameId(" 17 ")).toBe(17);
        expect(parseGameId("0")).toBe(0);
    });

    it("rejects names and empty input", () => {
        expect(parseGameId("")).toBeNull();
        expect(parseGameId("table-name")).toBeNull();
        expect(parseGameId("12abc")).toBeNull();
    });
});
