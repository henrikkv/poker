export function parseGameId(input: string): number | null {
    const value = input.trim();
    if (!/^\d+$/.test(value)) {
        return null;
    }
    const gameId = Number(value);
    if (!Number.isSafeInteger(gameId)) {
        return null;
    }
    return gameId;
}
