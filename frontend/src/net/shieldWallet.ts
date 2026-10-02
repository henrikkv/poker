/** Drop a leftover Shield session when local signing takes over. */
export async function disconnectShieldWallet(): Promise<void> {
    try {
        const { ShieldWalletAdapter } = await import("@provablehq/aleo-wallet-adapter-shield");
        const adapter = new ShieldWalletAdapter();
        await adapter.disconnect();
    } catch {
        // Not installed, already disconnected, or the extension ignored the request.
    }
}
