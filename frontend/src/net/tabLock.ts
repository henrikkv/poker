/** One tab at a time so the same session cannot submit two joins. */
export async function withExclusiveLock<T>(name: string, work: () => Promise<T>): Promise<T> {
    const locks = globalThis.navigator?.locks;
    if (locks?.request) {
        return locks.request(name, work);
    }
    return work();
}
