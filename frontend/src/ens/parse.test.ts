import { describe, expect, it } from "vitest";
import { encodeTablesRecord, looksLikeEnsName, parseGameRecord, parseJoinTarget, parseTablesRecord } from "./parse.js";

describe("looksLikeEnsName", () => {
    it("accepts dotted names", () => {
        expect(looksLikeEnsName("alice.eth")).toBe(true);
        expect(looksLikeEnsName("t42.mentalpoker.eth")).toBe(true);
    });

    it("rejects game ids and junk", () => {
        expect(looksLikeEnsName("17")).toBe(false);
        expect(looksLikeEnsName("alice")).toBe(false);
        expect(looksLikeEnsName("alice .eth")).toBe(false);
    });
});

describe("parseJoinTarget", () => {
    it("parses a numeric game id", () => {
        expect(parseJoinTarget(" 17 ")).toEqual({ kind: "gameId", gameId: 17 });
    });

    it("parses an ENS name", () => {
        expect(parseJoinTarget("Alice.eth")).toEqual({ kind: "ens", name: "alice.eth" });
    });

    it("returns null for empty or invalid input", () => {
        expect(parseJoinTarget("")).toBeNull();
        expect(parseJoinTarget("not a name")).toBeNull();
    });
});

describe("parseGameRecord", () => {
    it("reads a decimal game id", () => {
        expect(parseGameRecord("42")).toBe(42);
        expect(parseGameRecord(" 7 ")).toBe(7);
    });

    it("rejects missing or non-numeric values", () => {
        expect(parseGameRecord(null)).toBeNull();
        expect(parseGameRecord("alice.eth")).toBeNull();
    });
});

describe("parseTablesRecord", () => {
    it("reads a JSON list of game ids, newest last", () => {
        expect(parseTablesRecord("[2, 12, 19]")).toEqual([2, 12, 19]);
        expect(parseTablesRecord('["2", 12]')).toEqual([2, 12]);
        expect(encodeTablesRecord([2, 12, 12, -1])).toBe("[2,12]");
    });

    it("rejects missing or invalid values", () => {
        expect(parseTablesRecord(null)).toEqual([]);
        expect(parseTablesRecord("")).toEqual([]);
        expect(parseTablesRecord("{")).toEqual([]);
        expect(parseTablesRecord("12")).toEqual([]);
    });
});
