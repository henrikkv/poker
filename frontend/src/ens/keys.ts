/** Text records this app reads and writes on ENSv2 (Sepolia). */
export const RECORD = {
    aleo: "network.aleo",
    game: "poker.game",
    tables: "poker.tables",
    program: "poker.program",
    seat: (id: 1 | 2 | 3) => `seat.${id}` as const,
    agentContext: "agent-context",
    agentEndpointWeb: "agent-endpoint[web]",
} as const;

export const POKER_PROGRAM = "mental_poker2.aleo";

export const TABLE_RECORD_KEYS = [
    RECORD.aleo,
    RECORD.game,
    RECORD.tables,
    RECORD.program,
    RECORD.seat(1),
    RECORD.seat(2),
    RECORD.seat(3),
    RECORD.agentContext,
    RECORD.agentEndpointWeb,
] as const;

export function tableRecordContext(gameId: number, tableName: string): string {
    return [
        "# Mental Poker table",
        "",
        `${tableName} is a mental-poker table on Aleo testnet.`,
        "These ENS records are only a public directory: game id, Aleo session",
        "address, and who sits where. Players still shuffle and bet on Aleo.",
        "",
        `Aleo program: ${POKER_PROGRAM}`,
        `Game id: ${gameId}`,
    ].join("\n");
}
